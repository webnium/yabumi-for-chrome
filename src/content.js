/*!
 * Yabumi for chrome
 *
 * Copyright (c) 2015 Webnium Inc.
 * Licensed under the MIT-License.
 **/
(function () {
    if (window.yabumiForChrome) {
        return; // already initialized
    }

    window.yabumiForChrome = {
        f: {
            measureScreen: function (callback) {
                callback({
                    width: document.documentElement.clientWidth,
                    height: document.documentElement.clientHeight,
                    pixelRatio: window.devicePixelRatio
                });
            },
            measurePage: function (callback) {
                callback({
                    width: document.documentElement.scrollWidth,
                    height: document.documentElement.scrollHeight,
                    pixelRatio: window.devicePixelRatio
                });
            },
            enforceSelectArea: function (callback) {
                getSelectedArea()
                    .then(callback, callback);

                return true;
            },
            getScrollPosition: function (callback) {
                callback({
                    top: window.scrollY,
                    left: window.scrollX
                });
            },
            scroll: function (callback, left, top) {
                var needsLongWait = Math.abs(window.scrollY - top) > document.documentElement.clientHeight * 3;
                window.scroll(left, top);

                setTimeout(callback, needsLongWait ? 100 : 20);
                return true;
            }
        }
    };

    chrome.runtime.onMessage.addListener(function (message, sender, callback) {
        var args = message.args || [];
        args.unshift(callback);
        return window.yabumiForChrome.f[message.name].apply(null, args);
    });

    function getSelectedArea() {
        return new Promise(function (resolve, reject) {
            var mask = document.createElement('div');
            mask.style.zIndex = 100000;
            mask.style.position = 'absolute';
            mask.style.top = 0;
            mask.style.left = 0;
            mask.style.width = document.documentElement.scrollWidth + 'px';
            mask.style.height = document.documentElement.scrollHeight + 'px';
            mask.style.backgroundColor = 'rbga(0, 0, 0, 0)';
            mask.style.cursor = 'crosshair';

            var selectedArea = document.createElement('div');
            selectedArea.style.position = 'relative';
            selectedArea.backgroundColor = 'rbga(0, 0, 0, 0.3)';
            selectedArea.style.visibility = 'hidden';
            mask.appendChild(selectedArea);

            var origin;

            mask.addEventListener('mousedown', function (event) {
                if (event.button !== 0) {
                    return;
                }

                mask.addEventListener('mousemove', resizeSelectedArea);
                window.addEventListener('mouseup', fixSelectedArea);
                origin = {
                    x: event.clientX,
                    y: event.clientY
                };
            });


            function fixSelectedArea (event) {
                if (event.button !== 0) {
                    return;
                }

                window.removeEventListener('mouseup', fixSelectedArea);
                document.body.removeChild(mask);

                if (!origin) {
                    reject();
                    return;
                }

                resolve({
                    top: Math.min(origin.y, event.clientY),
                    left: Math.min(origin.x, event.clientX),
                    width: Math.abs(event.clientX - origin.x),
                    height: Math.abs(event.clientY - origin.y),
                    pixelRatio: window.devicePixelRatio
                });
            }

            function resizeSelectedArea(event) {
                event.preventDefault();
                console.log(event);
            }

            mask.addEventListener('contextmenu', function (event) {
                window.removeEventListener('mouseup', fixSelectedArea);
                document.body.removeChild(mask);
                event.preventDefault();
                reject();
            });

            document.body.appendChild(mask);
        });
    }
})();
