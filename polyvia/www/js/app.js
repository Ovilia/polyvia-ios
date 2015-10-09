var canvas = document.getElementById('main-canvas');
setCanvasSize();
var ctx = canvas.getContext('2d');

var renderSize = null;



// generate with new image
function generate(imgSrc, cnt) {
    renderSize = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    getVertices(imgSrc, cnt, function(vertices) {
        var triangles = Delaunay.triangulate(vertices);
        renderTriangles(vertices, triangles);
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
function renderTriangles(vertices, triangles) {
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

        // draw the vertices
        // ctx.fillStyle = 'rgb(255, 255, 0)';
        // ctx.fillRect(a[0], a[1], 1, 1);
        // ctx.fillRect(b[0], b[1], 1, 1);
        // ctx.fillRect(c[0], c[1], 1, 1);
    }
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
