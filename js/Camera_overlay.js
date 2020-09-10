function showPage() {
    document.getElementById("loader").style.display = "none";
    document.getElementById("canvasOutput").style.display = "block";
    document.getElementById("shutter_icon").style.display = "block";
    document.getElementById("button_UI").style.display = "block";
    document.getElementById("filter_btn").style.display = "block";
}

function findGetParameter(parameterName) {
    let result = null,
        tmp = [];
    location.search
        .substr(1)
        .split("&")
        .forEach(function (item) {
            tmp = item.split("=");
            if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
        });
    if (result === undefined) {
        result = "";
    }
    return result;
}

let use_back_camera;

let filters = [null, Filters.grayscale, Filters.brightness, Filters.convolute, Filters.threshold, Filters.convolute, Filters.sobel];
let filter_arg=90;
let filter_arguments = [null,null, filter_arg,  [1/9,1/9,1/9,1/9,1/9,1/9,1/9,1/9,1/9], filter_arg, [0,-1,0,-1,5,-1,0,-1,0], null];
let filter_in_use = 0;

function filter_button() {
    filter_in_use = (filter_in_use + 1)%filters.length;
}

window.addEventListener('orientationchange', function () {
    document.location.reload()
});


$('input[id=camid]').change(function () {
    if ($(this).is(':checked')) {
        window.location.href = document.location.origin + document.location.pathname + "?camid=back";

    } else {
        window.location.href = document.location.origin + document.location.pathname + "?camid=front";
    }
});


if (findGetParameter("camid") === "front") {
    use_back_camera = false;
    document.getElementById("camid").checked = false;
}
else {
    use_back_camera = true;
}
const click_animation = document.getElementById("click_animation");
const audio = document.getElementById("shutter");
const canvas = document.getElementById('canvasOutput');
const context = canvas.getContext('2d');
const video = document.createElement('video');
let overlay_ready = 0;
let video_ready = 0;
let height = 240;
let width = 320;
let aspectRatio = 1;

const overlay = new Image();
overlay.onload = function () {
    overlay_ready++;
};
overlay.src = "overlay/1.png";


let readyToPlay = false;
const eventNames = [
    'touchstart', 'touchend', 'touchmove', 'touchcancel',
    'click', 'mousedown', 'mouseup', 'mousemove',
    'keydown', 'keyup', 'keypress', 'scroll'
];
let play = function () {
    if (readyToPlay) {
        video.play();
        if (!video.paused) {
            eventNames.forEach(function (eventName) {
                window.removeEventListener(eventName, play, true);
            });
        }
    }
};

eventNames.forEach(function (eventName) {
    window.addEventListener(eventName, play, true);
});

const initProgress = function () {
    if (this.videoWidth !== 0) {
        aspectRatio = this.videoHeight / this.videoWidth;
        width = window.innerWidth;
        height = Math.round(width * aspectRatio);
        this.width = width;
        this.height = height;
        canvas.width = width;
        canvas.height = height;
    }
};
let success = function (stream) {
    video.addEventListener('loadedmetadata', initProgress, false);
    video.srcObject = stream;
    readyToPlay = true;
    video.setAttribute("playsinline", ""); // Latest iOS hack to force playing without user input and to prevent fullscreen
    play(); // Try playing without user input, should work on non-Android Chrome
    video_ready++;
};

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {facingMode: use_back_camera ? "environment" : "user"}
}).then(success, function (err) {
    console.error("An error occurred! " + err);
});

function updateFrame() {
    if (video_ready && overlay_ready) {
        showPage();
        context.drawImage(video, 0, 0, width, height);
        if (filter_in_use) {
            let idata = Filters.filterImage(filters[filter_in_use], canvas, filter_arguments[filter_in_use]);
            context.putImageData(idata, 0, 0);
        }
        const ov_width = window.innerWidth;
        const ov_height = ov_width * 1162 / 2048;
        context.drawImage(overlay, 0, height - ov_height, ov_width, ov_height);
    }
    requestAnimationFrame(updateFrame);
}

requestAnimationFrame(updateFrame);

document.getElementById("shutter_icon").onclick = function () {
    click_animation.classList.add("lds-hourglass");
    click_animation.style.display = "block";
    audio.play();
    setTimeout(function () {
        click_animation.classList.remove("lds-hourglass");
        click_animation.style.display = "block";
    }, 1200);
    let date = new Date();
    let filename = "Selfie-" +
        date.getFullYear() + "-" +
        date.getMonth() + "-" +
        date.getDay() + "-" +
        date.getHours() + "-" +
        date.getMinutes() + "-" +
        date.getSeconds() + ".png";
    canvas.toBlob(function (blob) {
        saveAs(blob, filename);
    });
};

window.onresize = function () {
    if (!video_ready || !overlay_ready) return;
    width = window.innerWidth;
    height = Math.round(width * aspectRatio);
    video.width = width;
    video.height = height;
    canvas.width = width;
    canvas.height = height;
};