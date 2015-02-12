/*!
 * Yabumi for chrome
 *
 * Copyright (c) 2015 Webnium Inc.
 * Licensed under the MIT-License.
 **/
(function (){
    function init() {
        document.querySelector('title').textContent = chrome.i18n.getMessage('yabumiForChromeOptions');
        flagrate.createElement('h1')
            .update(chrome.i18n.getMessage('yabumiForChromeOptions'))
            .insertTo(document.body);

        chrome.storage.sync.get(
            defaultOptions,
            function (options) {
                var form = flagrate.createForm({
                    fields: [
                        {
                            key: 'defaultAction',
                            label: chrome.i18n.getMessage('optionDefaultAction'),
                            text: chrome.i18n.getMessage('optionDefaultActionDescription'),
                            input: {
                                type: 'radios',
                                val: options.defaultAction,
                                items: [
                                    {label: chrome.i18n.getMessage('captureVisibleArea'), value: 'captureVisibleArea'},
                                    {label: chrome.i18n.getMessage('captureEntirePage'), value: 'captureEntirePage'}
                                ]
                            }
                        }
                    ]
                })
                    .insertTo(document.body);

                var notify = flagrate.createNotify({
                    title: 'Yabumi for Chrome',
                    disableDesktopNotify: true
                });
                var saveButton = flagrate.createButton({
                    color: '@blue',
                    label: chrome.i18n.getMessage('saveOptions'),
                    onSelect: function () {
                        saveButton.disable();
                        chrome.storage.sync.set(
                            form.getResult(),
                            function () {
                                notify.create({
                                    icon: 'img/icon48.png',
                                    text: chrome.i18n.getMessage('optionsSaved')
                                });
                                saveButton.enable();
                            }
                        );
                    }
                }).insertTo(document.body);
            });
    }

    document.addEventListener('DOMContentLoaded', init);
})();