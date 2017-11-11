/**
 * Youtube Comment Filter
 * @author Cawdabra
 * @license MIT
 */

"use strict";

(function() {
    var browser = browser || chrome;

    var DefaultSettings = {
        HIDE_FILTERED_COMMENTS: true,

        COMMENT_FILTER: [
            "*sent me here*"
        ].join("\n"),

        WORD_CENSOR: [
        ].join("\n")
    }

    function init() {
        self.removeEventListener("load", init);

        var ge = document.getElementById.bind(document);
        chrome.storage.local.get(null, function(items) {
            var error = chrome.runtime.lastError;
            if (error) {
                console.log("Error:", error);
            }
            else {
                if (items.hideFilteredComments === undefined) {
                    chrome.storage.local.set({ hideFilteredComments: DefaultSettings.HIDE_FILTERED_COMMENTS }, onSaveSetting);
                    ge("chk-hide-filtered-comments").checked = DefaultSettings.HIDE_FILTERED_COMMENTS;
                }
                else {
                    ge("chk-hide-filtered-comments").checked = items.hideFilteredComments;
                }

                if (items.commentFilter === undefined) {
                    chrome.storage.local.set({ commentFilter: DefaultSettings.COMMENT_FILTER }, onSaveSetting);
                    ge("txt-comment-filter").value = DefaultSettings.COMMENT_FILTER;
                }
                else {
                    ge("txt-comment-filter").value = items.commentFilter;
                }

                if (items.wordCensor === undefined) {
                    chrome.storage.local.set({ wordCensor: DefaultSettings.WORD_CENSOR }, onSaveSetting);
                    ge("txt-word-censor").value = DefaultSettings.WORD_CENSOR;
                }
                else {
                    ge("txt-word-censor").value = items.wordCensor;
                }
            }
        });

        ge("chk-hide-filtered-comments").addEventListener("change", onSettingChange);
        ge("txt-comment-filter").addEventListener("input", onSettingChange);
        ge("txt-word-censor").addEventListener("input", onSettingChange);
        ge("btn-reset-comment-filter").addEventListener("click", onResetCommentFilter);
        ge("btn-reset-word-censor").addEventListener("click", onResetWordCensor);
    }

    function onSettingChange(e) {
        var data = {};
        data[e.target.dataset.setting] = (e.target instanceof HTMLInputElement && e.target.type === "checkbox") ? e.target.checked : e.target.value;
        var setting = chrome.storage.local.set(data, onSaveSetting);
    }

    function onResetCommentFilter(e) {
        var setting = browser.storage.local.set({ commentFilter: DefaultSettings.COMMENT_FILTER }, function() {
            var error = chrome.runtime.lastError;
            if (error) {
                console.log("Error:", error);
            }
            else {
                document.getElementById("txt-comment-filter").value = DefaultSettings.COMMENT_FILTER;
            }
        });
    }

    function onResetWordCensor(e) {
        var setting = browser.storage.local.set({ wordCensor: DefaultSettings.WORD_CENSOR }, function() {
            var error = chrome.runtime.lastError;
            if (error) {
                console.log("Error:", error);
            }
            else {
                document.getElementById("txt-word-censor").value = DefaultSettings.WORD_CENSOR;
            }
        });
    }

    function onSaveSetting() {
        var error = chrome.runtime.lastError;
        if (error) {
            console.log("Error:", error);
        }
    }

    self.addEventListener("load", init);
}());
