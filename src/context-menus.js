/*!
 * Yabumi for chrome
 *
 * Copyright (c) 2015 Webnium Inc.
 * Licensed under the MIT-License.
 **/

var ContextMenus = {
    items: {},
    callbacks: {},
    setItems: function (items) {
        items.forEach(function (item) {
            ContextMenus.callbacks[item.id] = item.onclick;
            item.onclick = null;
            ContextMenus.items[item.id] = item;
        });
    },
    create: function () {
        Object.keys(ContextMenus.items).forEach(
            function (key) {
                var properties = ContextMenus.items[key];

                chrome.contextMenus.create(properties);
            }
        );
    }
};

chrome.contextMenus.onClicked.addListener(function (info, tab) {
    ContextMenus.callbacks[info.menuItemId](info, tab);
});
