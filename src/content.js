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
                var needsLongWait = Math.abs(window.scrollY - top) > document.documentElement.clientHeight * window.devicePixelRatio * 2.5;
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
        if (document.getElementById('yabumi-for-chrome-selected-area-capturing-mask')) {
            return Promise.reject();
        }

        return new Promise(function (resolve, reject) {
            var originalUserSelect = document.body.style.webkitUserSelect;
            var mask = document.createElement('div');
            mask.style.zIndex = 2147483647; // maximum value
            mask.style.position = 'absolute';
            mask.style.top = 0;
            mask.style.left = 0;
            mask.style.width = document.documentElement.scrollWidth + 'px';
            mask.style.height = document.documentElement.scrollHeight + 'px';
            mask.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
            mask.style.cursor = 'crosshair';
            mask.id = 'yabumi-for-chrome-selected-area-capturing-mask';

            var selectedArea = document.createElement('div');
            selectedArea.style.position = 'relative';
            selectedArea.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
            selectedArea.style.visibility = 'hidden';
            mask.appendChild(selectedArea);

            var origin;

            mask.addEventListener('mousedown', function (event) {
                if (event.button !== 0) {
                    return;
                }

                window.addEventListener('mousemove', resizeSelectedArea);
                window.addEventListener('mouseup', fixSelectedArea);
                document.body.style.webkitUserSelect = 'none';
                origin = mouseEventToPoint(event);

                selectedArea.style.visibility = 'visible';
                selectedArea.style.top = origin.y + 'px';
                selectedArea.style.left = origin.x + 'px';
                selectedArea.style.width = 0;
                selectedArea.style.height = 0;
            });

            document.body.appendChild(mask);
            window.addEventListener('contextmenu', cancel);

            function fixSelectedArea (event) {
                if (event.button !== 0) {
                    return;
                }

                destruct();

                if (!origin) {
                    reject();
                    return;
                }

                var rect = pointsToRect(origin, mouseEventToPoint(event));

                if (rect.height * rect.width < 200) {
                    reject();
                    return;
                }

                rect.pixelRatio = window.devicePixelRatio;
                setTimeout(function () {resolve(rect);}, 200);
            }

            function resizeSelectedArea(event) {
                var rect = pointsToRect(origin, mouseEventToPoint(event));
                selectedArea.style.top = rect.top + 'px';
                selectedArea.style.left = rect.left + 'px';
                selectedArea.style.width = rect.width + 'px';
                selectedArea.style.height =rect.height + 'px';
            }

            function cancel(event) {
                destruct();
                reject();
                event.preventDefault();
            }

            function destruct() {
                window.removeEventListener('mousemove', resizeSelectedArea);
                window.removeEventListener('mouseup', fixSelectedArea);
                window.removeEventListener('contextmenu', cancel);
                document.body.removeChild(mask);
                document.body.style.webkitUserSelect = originalUserSelect;
            }

        });
    }

    function mouseEventToPoint(event) {
        return {
            x: Math.min(event.clientX, document.documentElement.clientWidth) + window.scrollX,
            y: Math.min(event.clientY, document.documentElement.clientHeight) + window.scrollY
        };
    }

    function pointsToRect(p1, p2) {
        return {
            top: Math.min(p1.y, p2.y),
            left: Math.min(p1.x, p2.x),
            width: Math.abs(p2.x - p1.x),
            height: Math.abs(p2.y - p1.y)
        }
    }
})();
