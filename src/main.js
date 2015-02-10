/*!
 * Yabumi for chrome
 *
 * Copyright (c) 2015 Webnium Inc.
 * Licensed under the MIT-License.
**/

chrome.browserAction.onClicked.addListener(function () {
    chrome.tabs.captureVisibleTab(null, {format: "png"}, function(dataUrl) {
        var png = dataURItoBlob(dataUrl);

        var xhr = new XMLHttpRequest();
        xhr.open('post', 'https://yabumi.cc/api/images.json', true);
        xhr.addEventListener('load', function () {
            if (xhr.status !== 201) {
                // TODO: send message to content script to show alert.
                return;
            }

            chrome.tabs.create({
                url: JSON.parse(xhr.responseText).editUrl
            });
        });

        var formData = new window.FormData();
        formData.append('imagedata', png, 'screen shot');

        xhr.send(formData);

        function dataURItoBlob(dataURI) {
            // convert base64/URLEncoded data component to raw binary data held in a string
            var byteString;
            if (dataURI.split(',')[0].indexOf('base64') >= 0)
                byteString = atob(dataURI.split(',')[1]);
            else
                byteString = unescape(dataURI.split(',')[1]);

            // separate out the mime component
            var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

            // write the bytes of the string to a typed array
            var ia = new Uint8Array(byteString.length);
            for (var i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }

            return new Blob([ia], {type:mimeString});
        }
    });
});