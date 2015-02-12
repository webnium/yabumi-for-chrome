/*!
 * Yabumi for chrome
 *
 * Copyright (c) 2015 Webnium Inc.
 * Licensed under the MIT-License.
**/

chrome.browserAction.onClicked.addListener(doCaptureVisibleArea);
chrome.runtime.onInstalled.addListener(createContextMenus);

var ContextMenus = function () {
    var items = this.items = {};

    chrome.contextMenus.onClicked.addListener(function (info, tab) {
        items[info.menuItemId].onclick(info, tab);
    });
};

ContextMenus.prototype = {
    create: function (properties) {
        this.items[properties.id] = {
            onclick: properties.onclick
        };

        properties.onclick = null;
        chrome.contextMenus.create(properties);
    }
};

function createContextMenus() {
    var contextMenus = new ContextMenus();

    contextMenus.create({
        title: 'Capture visible area',
        id: 'capture-visible-area',
        contexts: ['page', 'browser_action'],
        onclick: doCaptureVisibleArea
    });

    contextMenus.create({
        title: 'Capture entire page',
        id: 'capture-entire-page',
        contexts: ['page', 'browser_action'],
        onclick: doCaptureEntirePage
    });
}

function doCaptureVisibleArea() {
    getCurrentTab()
        .then(executeContentScript)
        .then(captureVisibleArea)
        .then(uploadToYabumi)
        .catch(function (e) {
            console.log(e);
        });
}

function doCaptureEntirePage() {
    getCurrentTab()
        .then(executeContentScript)
        .then(captureEntirePage)
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
        chrome.tabs.executeScript(tab.id, {file: 'content.js'}, function () {
            resolve(tab)
        });
    });
}

// tab manipulation
function measureScreen(targetTab) {
    return new Promise(function (resolve, reject) {
        chrome.tabs.sendMessage(targetTab.id, {name: 'measureScreen'},
            function (screen) { if (screen) resolve(screen); reject(new Error('Cannot measure screen.'))});
    });
}

function measurePage(targetTab) {
    return new Promise(function (resolve, reject) {
        chrome.tabs.sendMessage(targetTab.id, {name: 'measurePage'},
            function (page) { if (page) resolve(page); reject(new Error('Cannot measure page.'))});
    });
}

function getScrollPosition(targetTab) {
    return new Promise(function (resolve, reject) {
        chrome.tabs.sendMessage(targetTab.id, {name: 'getScrollPosition'},
            function (position) { if (position) resolve(position); reject(new Error('Cannot scroll position.'))});
    });
}

function scrollTab(tab, left, top) {
    return new Promise(function (resolve) {
        chrome.tabs.sendMessage(tab.id, {name: 'scroll', args: [left, top]},
            function () {
                resolve();
            });
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
                        .then(function (dataUri) { return drawToCanvasContext(canvasContext, left, top, dataUri);})
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

