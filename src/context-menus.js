/*!
 * Yabumi for chrome
 *
 * Copyright (c) 2015 Webnium Inc.
 * Licensed under the MIT-License.
 **/

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

