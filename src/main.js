/*!
 * Yabumi for chrome
 *
 * Copyright (c) 2015 Webnium Inc.
 * Licensed under the MIT-License.
**/

chrome.browserAction.onClicked.addListener(doDefaultAction);
chrome.runtime.onInstalled.addListener(ContextMenus.create);

ContextMenus.setItems([
    {
        title: chrome.i18n.getMessage('captureVisibleArea'),
        id: 'capture-visible-area',
        contexts: ['page', 'image', 'browser_action'],
        onclick: doCaptureVisibleArea
    },
    {
        title: chrome.i18n.getMessage('captureEntirePage'),
        id: 'capture-entire-page',
        contexts: ['page', 'image', 'browser_action'],
        onclick: doCaptureEntirePage
    },
    {
        type: 'separator',
        id: 'separator',
        contexts: ['page', 'image', 'browser_action']
    },
    {
        title: chrome.i18n.getMessage('history'),
        id: 'history',
        contexts: ['page', 'image', 'browser_action'],
        onclick: function () {
            chrome.tabs.create({url: 'https://yabumi.cc/me.html'});
        }
    }
]);

function doDefaultAction () {
    chrome.storage.sync.get(defaultOptions, function (options) {
        switch (options.defaultAction) {
            case 'captureEntirePage':
                doCaptureEntirePage();
                break;
            case 'captureVisibleArea':
            default:
                doCaptureVisibleArea();
        }
    });
}

function doCaptureVisibleArea() {
    doCapture(captureVisibleArea);
}

function doCaptureEntirePage() {
    doCapture(captureEntirePage);
}

function doCapture(capture) {
    getCurrentTab()
        .then(executeContentScript)
        .then(capture)
        .then(uploadToYabumi, onCaptureFailure)
        .catch(onUploadFailure);
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

function captureEntirePage(tab) {
    var canvasContext;
    return Promise.all([measureScreen(tab), measurePage(tab), getScrollPosition(tab)])
        .then(function (values) {
            var top = 0;
            var left = 0;
            var screen = values[0];
            var page = values[1];
            var scroll = values[2];

            canvasContext = createCanvasContext(page.width, page.height);

            function _forward() {
                if (left + screen.width >= page.width) {
                    left = 0;
                    top = Math.min(top + screen.height, page.height - screen.height);
                } else {
                    left = Math.min(left + screen.width, page.width - screen.width);
                }
            }

            function _hasNext() {
                return top + screen.height < page.height || left + screen.width < page.width;
            }

            return new Promise(function (resolve, reject) {
                (function _loop() {
                    scrollTab(tab, left, top)
                        .then(captureVisibleTab)
                        .then(drawToCanvasContext.bind(null, canvasContext, left, top))
                        .then(function () {
                            if (_hasNext()) {
                                _forward();
                                _loop();
                            } else {
                                resolve();
                            }
                        }, reject);
                })();
            })
                .then(scrollTab.bind(null, tab, scroll.left, scroll.top));
        })
        .then(function () {
            return Promise.resolve(canvasContext.canvas.toDataURL('image/png'));
        });
}

function onCaptureFailure(e) {
    chrome.notifications.create('', {
        type: 'basic',
        title: 'Yabumi for Chrome',
        message: chrome.i18n.getMessage('captureFailed'),
        iconUrl: 'img/icon128.png'
    }, function () {});
    console.log(e);
}

function onUploadFailure(e) {
    chrome.notifications.create('', {
        type: 'basic',
        title: 'Yabumi for Chrome',
        message: chrome.i18n.getMessage('uploadFailed'),
        iconUrl: 'img/icon128.png'
    }, function () {});
    console.log(e);
}

function captureVisibleTab() {
    return new Promise(function (resolve) {
        chrome.tabs.captureVisibleTab(null, {format: 'png'}, function (dataUri) {resolve(dataUri)});
    });
}

function uploadToYabumi(dataUrl) {
    var xhr = new XMLHttpRequest();
    xhr.open('post', 'https://yabumi.cc/api/images.json', true);

    var promise = new Promise(function (resolve, reject) {
        xhr.addEventListener('load', function () {
            if (xhr.status !== 201) {
                reject();
                return;
            }

            var response = JSON.parse(xhr.responseText);
            chrome.tabs.create({
                url: response.editUrl
            });
            saveToClipboard(response.url);
            resolve(response);
        });
    });

    var formData = new window.FormData();
    formData.append('imagedata', dataURItoBlob(dataUrl), 'screen shot');

    xhr.send(formData);

    return promise;
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
