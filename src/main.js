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
        title: chrome.i18n.getMessage('uploadThisImage'),
        id: 'upload-this-image',
        contexts: ['image'],
        onclick: doUploadClickedImage
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

function doUploadClickedImage(info) {
    loadImage(info.srcUrl)
        .then(uploadToYabumi, onCaptureFailure)
        .catch(onUploadFailure);
}

function onCaptureFailure(e) {
    chrome.notifications.create('', {
        type: 'basic',
        title: 'Yabumi for Chrome',
        message: chrome.i18n.getMessage('captureFailed'),
        contextMessage: typeof e === 'string' ? e :chrome.i18n.getMessage('captureFailedContextMessage'),
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

function captureVisibleArea(tab) {
    var canvasContext;

    return measureScreen(tab)
        .then(function (screen) {
            canvasContext = createCanvasContext(screen.width * screen.pixelRatio, screen.height * screen.pixelRatio);
        })
        .then(captureVisibleTab)
        .then(function (dataUri) { return drawToCanvasContext(canvasContext, 0, 0, dataUri);})
        .then(function () {
            return Promise.resolve({blob: dataURItoBlob(canvasContext.canvas.toDataURL('image/png')), title: 'screen shot: ' + tab.title});
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

            if (page.width * page.height === 0) {
                return Promise.reject({'message': 'blank page or something'});
            }

            if (page.width * page.pixelRatio > 32767 || page.height * page.pixelRatio > 32767 || page.width * page.height * page.pixelRatio * page.pixelRatio> 268435456) {
                return Promise.reject(chrome.i18n.getMessage('pageSizeTooLarge'));
            }

            canvasContext = createCanvasContext(page.width * page.pixelRatio, page.height * page.pixelRatio);

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
                        .then(drawToCanvasContext.bind(null, canvasContext, left * page.pixelRatio, top * page.pixelRatio))
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
            return Promise.resolve({blob: dataURItoBlob(canvasContext.canvas.toDataURL('image/png')), title: 'screen shot: ' + tab.title});
        });
}

function captureVisibleTab() {
    return new Promise(function (resolve) {
        chrome.tabs.captureVisibleTab(null, {format: 'png'}, function (dataUri) {resolve(dataUri)});
    });
}

function loadImage(url) {

    var xhr = new XMLHttpRequest();
    xhr.open('get', url);
    xhr.responseType = 'blob';
    var promise = new Promise(function (resolve, reject) {xhr.addEventListener('load', function () {
        if (xhr.status !== 200) {
            reject();
        }

        resolve({blob: xhr.response, title: 'copy of: ' + url})
    })});

    xhr.send();

    return promise;
}

function uploadToYabumi(image) {
    var xhr = new XMLHttpRequest();
    xhr.open('post', 'https://yabumi.cc/api/images.json', true);
    xhr.setRequestHeader('X-Yabumi-Client',
        'YabumiForChrome/' + chrome.runtime.getManifest().version + ' '
        + window.navigator.userAgent.match(/Mozilla\/5.0 (\([^)]+\))/)[1] + ' '
        + window.navigator.userAgent.match( /Chrome\/[^ ]+/)[0]
    );

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

    chrome.storage.sync.get(defaultOptions, function (options) {
        var formData = new window.FormData();
        formData.append('imagedata', image.blob);
        formData.append('expiresAt', options.defaultDuration ? new Date(Date.now() + options.defaultDuration).toISOString() : null);
        formData.append('name', image.title);

        xhr.send(formData);
    });

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
