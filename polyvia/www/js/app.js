var canvas = document.getElementById('main-canvas');
setCanvasSize();
var ctx = canvas.getContext('2d');

var renderSize = null;
var imgSrc = null;

// parameters used for background rendering when image is not selected
var background = {
    animationHandler: null
};

function log(txt) {
    var d = document.getElementById('log');
    d.innerHTML = d.innerHTML + '<br>' +txt;
}



// init when page loaded
function init() {
    renderRandomBackground();
    i18n();
}



// call when click upload button
function uploadImage() {
    var input = document.getElementById('uploadInput');
    input.addEventListener('change', function() {
        var file = input.files[0];

        var reader = new FileReader();
        reader.onload = function(e) {
            imgSrc = e.target.result;
            generate(e.target.result, 1000, function(){
              $('#control-panel').hide();
            });
        };
        reader.readAsDataURL(file);
    });
    input.click();
}



// generate with new image
function generate(imgSrc, cnt, callback) {
    renderSize = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    getVertices(imgSrc, cnt, function(vertices) {
        var triangles = Delaunay.triangulate(vertices);
        renderTriangles(vertices, triangles, callback);
    });
}



// draw image to canvas, and get selected vertices 
function getVertices(imgSrc, cnt, callback) {
    var image = new Image();
    // image.crossOrigin = 'Anonymous';
    image.onload = function() {
        // update render size
        renderSize = getRenderSize(image.width, image.height,
                window.innerWidth, window.innerHeight);
        setCanvasSize();

        // render original image
        ctx.drawImage(image, 0, 0, renderSize.w, renderSize.h);

        // read content of canvas
        var origin = ctx.getImageData(0, 0, renderSize.w, renderSize.h);

        // edge detection
        var sobel = tracking.Image.sobel(origin.data, renderSize.w,
                    renderSize.h);
        var sobelGray = tracking.Image.grayscale(sobel, renderSize.w,
                    renderSize.h);

        // four corners as vertices
        var vertices = [[0, 0], [renderSize.w, 0],
                [renderSize.w, renderSize.h], [0, renderSize.h]];

        // randomly select vertices on the edges
        var theshold = 100;
        var plen = sobelGray.length;
        for (var selectedCnt = 0, loops = 0;
                selectedCnt < cnt && loops < cnt * 10; ++selectedCnt) {
            var id = Math.floor(Math.random() * plen);
            if (sobelGray[id] > theshold || Math.random() > 0.995) {
                // is edge, select
                var y = Math.floor(id / renderSize.w);
                var x = id % renderSize.w;
                vertices.push([x, y]);
            } else {
                // try another time
                --selectedCnt;
            }
        }

        // call callback
        if (callback) {
            callback(vertices);
        }
    };
    image.src = imgSrc;
}



// render triangles with colors
function renderTriangles(vertices, triangles, callback) {
    for(var i = triangles.length - 1; i > 2; i -= 3) {
        // positions of three vertices
        var a = [vertices[triangles[i]][0], 
                vertices[triangles[i]][1]];
        var b = [vertices[triangles[i - 1]][0], 
                vertices[triangles[i - 1]][1]];
        var c = [vertices[triangles[i - 2]][0], 
                vertices[triangles[i - 2]][1]];

        // fill with color in center of gravity
        var x = (a[0] + b[0] + c[0]) / 3;
        var y = (a[1] + b[1] + c[1]) / 3;
        var pixel = ctx.getImageData(x, y, 1, 1).data;
        var rgba = 'rgba(' + pixel[0] + ', ' + pixel[1] + ', '
                + pixel[2] + ',' + pixel[3] + ')';
        ctx.fillStyle = rgba;

        // draw the triangle
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.lineTo(c[0], c[1]);
        ctx.closePath();
        ctx.fill();
    }

    if(callback)
      callback();
}



// set up canvas according to renderSize
function setCanvasSize() {
    if (renderSize) {
        canvas.width = canvas.style.width = renderSize.w;
        canvas.height = canvas.style.height = renderSize.h;
    } else {
        canvas.width = canvas.style.width = window.innerWidth;
        canvas.height = canvas.style.height = window.innerHeight;
    }
}



// random background
function renderRandomBackground() {
    stopBackgroundAnimation();

    background.animationTime = 0;

    // set canvas to full screen
    renderSize = {
        w: window.innerWidth,
        h: window.innerHeight
    };
    setCanvasSize();

    // color vibration
    var jitter = 0.08;

    // add random vertices
    var vertices = [[0, 0], [renderSize.w, 0],
                [renderSize.w, renderSize.h], [0, renderSize.h]];
    background.vertices = vertices;
    for (var i = 0; i < 64; ++i) {
        vertices.push([
            Math.floor(renderSize.w * Math.random()),
            Math.floor(renderSize.h * Math.random())
        ]);
    }

    // triangulate
    var triangles = Delaunay.triangulate(vertices);
    background.triangles = triangles;

    // animation of color
    function tick() {
        var totalFrames = 50;
        if (background.animationTime < totalFrames) {
            renderBackground(background.animationTime / totalFrames);

            background.animationHandler = setTimeout(tick, 20);
            ++background.animationTime;
        }
    }
    tick();

    // render different color with given animation time
    // timeRatio is between [0, 1]. 1 when comes to end of animation
    function renderBackground(timeRatio) {
        // render background
        var c1 = [255, 210, 88];
        var c2 = [255, 88, 127];
        var grad = ctx.createLinearGradient(0, 0, 0, renderSize.h);
        grad.addColorStop(1, 'rgb(' + c1[0] + ',' + c1[1] + ',' + c1[2] + ')');
        grad.addColorStop(1 - timeRatio, 'rgb(' + c2[0] + ',' + c2[1] + ',' + c2[2] + ')');
        ctx.rect(0, 0, renderSize.w, renderSize.h);
        ctx.fillStyle = grad;
        ctx.fill();

        // render triangles
        for(var i = triangles.length - 1; i > 2; i -= 3) {
            // positions of three vertices
            var a = [vertices[triangles[i]][0], 
                    vertices[triangles[i]][1]];
            var b = [vertices[triangles[i - 1]][0], 
                    vertices[triangles[i - 1]][1]];
            var c = [vertices[triangles[i - 2]][0], 
                    vertices[triangles[i - 2]][1]];

            // fill with color in center of gravity
            var y = (Math.max(0, Math.min(1, (a[1] + b[1] + c[1]) / 3
                    / renderSize.h + Math.random() * jitter * 2 - jitter)))
                    * timeRatio;

            // blending two colors
            var color = [
                Math.floor(c1[0] * y + c2[0] * (1 - y)),
                Math.floor(c1[1] * y + c2[1] * (1 - y)),
                Math.floor(c1[2] * y + c2[2] * (1 - y))
            ];
            var rgb = 'rgb(' + color[0] + ', ' + color[1] + ', '
                    + color[2] + ')';
            ctx.fillStyle = rgb;

            // draw the triangle
            ctx.beginPath();
            ctx.moveTo(a[0], a[1]);
            ctx.lineTo(b[0], b[1]);
            ctx.lineTo(c[0], c[1]);
            ctx.closePath();
            ctx.fill();
        }
    }
}



// clear animation if has
function stopBackgroundAnimation() {
    if (background.animationHandler) {
        clearTimeout(background.animationHandler);
        background.animationHandler = null;
    }
}



function getRenderSize(iw, ih, cw, ch) {
    if (cw / ch > iw / ih) {
        /* |----------------------|
         * |    |************|    |
         * |    |************|    |
         * |    |************|    |
         * |    |************|    |
         * |----------------------|
         */
        // clip left and right part of the canvas
        var w = Math.floor(ch / ih * iw);
        var h = ch;
    } else {
        /* |----------------------|
         * |                      |
         * |----------------------|
         * |**********************|
         * |**********************|
         * |----------------------|
         * |                      |
         * |----------------------|
         */
        // clip top and bottom part of the canvas
        var w = cw;
        var h = Math.floor(cw / iw * ih);
    }
    return {
        w: w,
        h: h
    };
}

// Set text according UA's language preference
function i18n() {
    if(window.navigator.language=='zh-cn'){
        document.getElementById('upload-text').innerText='上传图片';
    }else{
        document.getElementById('upload-text').innerText='Upload An Image';
    }
}
