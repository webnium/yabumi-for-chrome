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
                    height: document.documentElement.clientHeight
                });
            }
        }
    };

    chrome.runtime.onMessage.addListener(function (message, sender, callback) {
        var args = message.args || [];
        args.unshift(callback);
        window.yabumiForChrome.f[message.name].apply(null, args);
    });
})();
