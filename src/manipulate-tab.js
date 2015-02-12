/*!
 * Yabumi for chrome
 *
 * Copyright (c) 2015 Webnium Inc.
 * Licensed under the MIT-License.
 **/
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
