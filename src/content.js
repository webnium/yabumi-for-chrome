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
})();
