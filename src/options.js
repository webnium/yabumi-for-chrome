/*!
 * Yabumi for chrome
 *
 * Copyright (c) 2015 Webnium Inc.
 * Licensed under the MIT-License.
 **/
(function (){
    function init() {
        document.querySelector('title').textContent = chrome.i18n.getMessage('yabumiForChromeOptions');
        var container = flagrate.createElement('div', {id: 'container'})
            .insertTo(document.body);
        flagrate.createElement('h1')
            .setStyle({color: '#888', marginLeft: '10px'})
            .update(chrome.i18n.getMessage('yabumiForChromeOptions'))
            .insertTo(container);

        chrome.storage.sync.get(
            defaultOptions,
            function (options) {
                var form = flagrate.createForm({
                    vertical: true,
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
                                    {label: chrome.i18n.getMessage('captureEntirePage'), value: 'captureEntirePage'},
                                    {label: chrome.i18n.getMessage('captureSelectedArea'), value: 'captureSelectedArea'}
                                ]
                            }
                        },
                        {
                            key: 'defaultDuration',
                            label: chrome.i18n.getMessage('optionDefaultDuration'),
                            text: chrome.i18n.getMessage('optionDefaultDurationDescription'),
                            input: {
                                type: 'radios',
                                val: options.defaultDuration,
                                items: [
                                    {label: chrome.i18n.getMessage('durationNMinutes', [3]), value: 1000 * 60 * 3},
                                    {label: chrome.i18n.getMessage('duration1hour'), value: 1000 * 60 * 60},
                                    {label: chrome.i18n.getMessage('durationNHours', [24]), value: 1000 * 60 * 60 * 24},
                                    {label: chrome.i18n.getMessage('durationNDays', [7]), value: 1000 * 60 * 60 * 24 * 7},
                                    {label: chrome.i18n.getMessage('durationNDays', [30]), value: 1000 * 60 * 60 * 24 * 30},
                                    {label: chrome.i18n.getMessage('durationNoLimit'), value: null}
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