/*!
 * Yabumi for chrome
 *
 * Copyright (c) 2015 Webnium Inc.
 * Licensed under the MIT-License.
**/

chrome.browserAction.onClicked.addListener(function () {
    var targetTab;
    var canvasContext;

    getCurrentTab()
        .then(function (tab) {
            targetTab = tab;
            return Promise.resolve(tab);
        })
        .then(executeContentScript)
        .then(measureScreen)
        .then(function (screen) {
            canvasContext = createCanvasContext(screen.width, screen.height);

            return new Promise(function (resolve) {
                chrome.tabs.captureVisibleTab(null, {format: 'png'}, function (dataUri) {resolve(dataUri)});
            });
        })
        .then(function (dataUri) {
            var img = new Image();
            var promise = new Promise(function (resolve) {
                img.onload = function () {
                    canvasContext.drawImage(img, 0, 0);

                    URL.revokeObjectURL(img.src);
                    resolve();
                }
            });

            img.src = dataUri;

            return promise;
        })
        .then(function () {
            uploadToYabumi(canvasContext.canvas.toDataURL('image/png'));
        })
        .catch(function (e) {
            console.log(e);
        });

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

    function uploadToYabumi(dataUrl) {
        var xhr = new XMLHttpRequest();
        xhr.open('post', 'https://yabumi.cc/api/images.json', true);
        xhr.addEventListener('load', function () {
            if (xhr.status !== 201) {
                // TODO: send message to content script to show alert.
                return;
            }

            chrome.tabs.create({
                url: JSON.parse(xhr.responseText).editUrl
            });
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
});