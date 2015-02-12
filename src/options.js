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

        var container = flagrate.createElement('div', {id: 'container'})
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
                    .insertTo(container);

                form.element.on('change', function (){
                    chrome.storage.sync.set(form.getResult());
                });
            });
    }

    document.addEventListener('DOMContentLoaded', init);
})();