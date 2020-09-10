Filters = {};
Filters.global_canvas = null;
if (!window.Float32Array)
    Float32Array = Array;

Filters.filterImage = function(filter, canvas, var_args) {
    const context = canvas.getContext('2d');
    const args = [context.getImageData(0,0,canvas.width,canvas.height)];
    for (let i=2; i<arguments.length; i++) {
        args.push(arguments[i]);
    }
    return filter.apply(null, args);
};

Filters.grayscale = function(pixels, args) {
    const d = pixels.data;
    for (let i=0; i<d.length; i+=4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        // CIE luminance for the RGB
        // The human eye is bad at seeing red and blue, so we de-emphasize them.
        const v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        d[i] = d[i+1] = d[i+2] = v
    }
    return pixels;
};

Filters.brightness = function(pixels, adjustment) {
    const d = pixels.data;
    for (let i=0; i<d.length; i+=4) {
        d[i] += adjustment;
        d[i+1] += adjustment;
        d[i+2] += adjustment;
    }
    return pixels;
};

Filters.threshold = function(pixels, threshold) {
    const d = pixels.data;
    for (let i=0; i<d.length; i+=4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const v = (0.2126 * r + 0.7152 * g + 0.0722 * b >= threshold) ? 255 : 0;
        d[i] = d[i+1] = d[i+2] = v
    }
    return pixels;
};

Filters.tmpCanvas = document.createElement('canvas');
Filters.tmpCtx = Filters.tmpCanvas.getContext('2d');

Filters.createImageData = function(w,h) {
    return this.tmpCtx.createImageData(w,h);
};

Filters.convolute = function(pixels, weights, opaque) {
    const side = Math.round(Math.sqrt(weights.length));
    const halfSide = Math.floor(side / 2);
    const src = pixels.data;
    const sw = pixels.width;
    const sh = pixels.height;
    // pad output by the convolution matrix
    const w = sw;
    const h = sh;
    const output = Filters.createImageData(w, h);
    const dst = output.data;
    // go through the destination image pixels
    const alphaFac = opaque ? 1 : 0;
    for (let y=0; y<h; y++) {
        for (let x=0; x<w; x++) {
            const sy = y;
            const sx = x;
            const dstOff = (y * w + x) * 4;
            // calculate the weighed sum of the source image pixels that
            // fall under the convolution matrix
            let r = 0, g = 0, b = 0, a = 0;
            for (let cy=0; cy<side; cy++) {
                for (let cx=0; cx<side; cx++) {
                    const scy = sy + cy - halfSide;
                    const scx = sx + cx - halfSide;
                    if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                        const srcOff = (scy * sw + scx) * 4;
                        const wt = weights[cy * side + cx];
                        r += src[srcOff] * wt;
                        g += src[srcOff+1] * wt;
                        b += src[srcOff+2] * wt;
                        a += src[srcOff+3] * wt;
                    }
                }
            }
            dst[dstOff] = r;
            dst[dstOff+1] = g;
            dst[dstOff+2] = b;
            dst[dstOff+3] = a + alphaFac*(255-a);
        }
    }
    return output;
};


Filters.convoluteFloat32 = function(pixels, weights, opaque) {
    const side = Math.round(Math.sqrt(weights.length));
    const halfSide = Math.floor(side / 2);

    const src = pixels.data;
    const sw = pixels.width;
    const sh = pixels.height;

    const w = sw;
    const h = sh;
    const output = {
        width: w, height: h, data: new Float32Array(w * h * 4)
    };
    const dst = output.data;

    const alphaFac = opaque ? 1 : 0;

    for (let y=0; y<h; y++) {
        for (let x=0; x<w; x++) {
            const sy = y;
            const sx = x;
            const dstOff = (y * w + x) * 4;
            let r = 0, g = 0, b = 0, a = 0;
            for (let cy=0; cy<side; cy++) {
                for (let cx=0; cx<side; cx++) {
                    const scy = Math.min(sh - 1, Math.max(0, sy + cy - halfSide));
                    const scx = Math.min(sw - 1, Math.max(0, sx + cx - halfSide));
                    const srcOff = (scy * sw + scx) * 4;
                    const wt = weights[cy * side + cx];
                    r += src[srcOff] * wt;
                    g += src[srcOff+1] * wt;
                    b += src[srcOff+2] * wt;
                    a += src[srcOff+3] * wt;
                }
            }
            dst[dstOff] = r;
            dst[dstOff+1] = g;
            dst[dstOff+2] = b;
            dst[dstOff+3] = a + alphaFac*(255-a);
        }
    }
    return output;
};

Filters.sobel = function(px, args) {
    px = Filters.grayscale(px);
    const vertical = Filters.convoluteFloat32(px,
        [-1, -2, -1,
            0, 0, 0,
            1, 2, 1]);
    const horizontal = Filters.convoluteFloat32(px,
        [-1, 0, 1,
            -2, 0, 2,
            -1, 0, 1]);
    const id = Filters.createImageData(vertical.width, vertical.height);
    for (let i=0; i<id.data.length; i+=4) {
        const v = Math.abs(vertical.data[i]);
        id.data[i] = v;
        const h = Math.abs(horizontal.data[i]);
        id.data[i+1] = h;
        id.data[i+2] = (v+h)/4;
        id.data[i+3] = 255;
    }
    return id;
};

Filters.blur = function (pixels, args) {
    return Filters.filterImage(Filters.convolute, image,
        [ 1/9, 1/9, 1/9,
            1/9, 1/9, 1/9,
            1/9, 1/9, 1/9 ]
    );
};