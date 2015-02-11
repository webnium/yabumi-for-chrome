/*!
 * Yabumi for chrome
 *
 * Copyright (c) 2015 Webnium Inc.
 * Licensed under the MIT-License.
**/

chrome.browserAction.onClicked.addListener(doCaptureVisibleArea);

function doCaptureVisibleArea() {
    getCurrentTab()
        .then(executeContentScript)
        .then(captureVisibleArea)
        .then(uploadToYabumi)
        .catch(function (e) {
            console.log(e);
        });
}

function getCurrentTab() {
    return new Promise(function (resolve, reject) {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            if (typeof tabs[0] === 'undefined') {
                reject();
            }
            resolve(tabs[0]);
        });
    });
}

function executeContentScript(tab) {
    return new Promise(function (resolve) {
        chrome.tabs.executeScript(tab.id, {file: 'content.js'}, function () {resolve(tab)});
    });
}
function measureScreen(targetTab) {
    return new Promise(function (resolve, reject) {
        chrome.tabs.sendMessage(targetTab.id, {name: 'measureScreen'},
            function (screen) { if (screen) resolve(screen); reject(new Error('Cannot measure screen.'))});
    });
}

function captureVisibleArea(tab) {
    var canvasContext;

    return measureScreen(tab)
        .then(function (screen) {
            canvasContext = createCanvasContext(screen.width, screen.height);
        })
        .then(captureVisibleTab)
        .then(function (dataUri) { return drawToCanvasContext(canvasContext, 0, 0, dataUri);})
        .then(function () {
            return Promise.resolve(canvasContext.canvas.toDataURL('image/png'));
        });
}

function captureVisibleTab() {
    return new Promise(function (resolve) {
        chrome.tabs.captureVisibleTab(null, {format: 'png'}, function (dataUri) {resolve(dataUri)});
    });
}

function uploadToYabumi(dataUrl) {
    var xhr = new XMLHttpRequest();
    xhr.open('post', 'https://yabumi.cc/api/images.json', true);
    xhr.addEventListener('load', function () {
        if (xhr.status !== 201) {
            // TODO: send message to content script to show alert.
            return;
        }

        var response = JSON.parse(xhr.responseText);
        chrome.tabs.create({
            url: response.editUrl
        });
        saveToClipboard(response.url);
    });

    var formData = new window.FormData();
    formData.append('imagedata', dataURItoBlob(dataUrl), 'screen shot');

    xhr.send(formData);

    function dataURItoBlob(dataURI) {
        // convert base64/URLEncoded data component to raw binary data held in a string
        var byteString;
        if (dataURI.split(',')[0].indexOf('base64') >= 0)
            byteString = atob(dataURI.split(',')[1]);
        else
            byteString = unescape(dataURI.split(',')[1]);

        // separate out the mime component
        var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

        // write the bytes of the string to a typed array
        var ia = new Uint8Array(byteString.length);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        return new Blob([ia], {type:mimeString});
    }
}

function createCanvasContext(width, height) {
    var c = document.createElement('canvas');
    c.width = width;
    c.height = height;

    return c.getContext('2d');
}

function drawToCanvasContext(canvasContext, x, y, dataUri) {
    var img = new Image();
    var promise = new Promise(function (resolve) {
        img.onload = function () {
            canvasContext.drawImage(img, x, y);

            URL.revokeObjectURL(img.src);
            resolve();
        }
    });

    img.src = dataUri;

    return promise;
}

function saveToClipboard(string) {
    var textArea = document.createElement('textarea');
    document.body.appendChild(textArea);

    textArea.value = string;
    textArea.select();
    document.execCommand("copy");

    document.body.removeChild(textArea);
}
