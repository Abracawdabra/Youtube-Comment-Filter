/**
 * Youtube Comment Filter
 * @author Cawdabra <cawdabra@null.net>
 * @license MIT
 */

"use strict";

// How long to wait for node propagation to finish in milliseconds
var NODE_PROPAGATION_WAIT_PERIOD = 400;

var DesktopSelectors = {
    COMMENT: "section.comment-thread-renderer",
    COMMENT_TEXT: "div.comment-renderer > div.comment-renderer-content > div.comment-renderer-text > div.comment-renderer-text-content",
    REPLY: "section.comment-thread-renderer > div.comment-replies-renderer",
    REPLY_TEXT: "div.comment-renderer > div.comment-renderer-content > div.comment-renderer-text > div.comment-renderer-text-content",
    UNLOADED_DISCUSSION: "div#watch-discussion",
    LOADED_DISCUSSION: "div#comment-section-renderer-items",
    UNEXPANDED_REPLIES: "div.comment-replies-renderer .yt-uix-expander-body.comment-replies-renderer-pages"
};

var MobileSelectors = {
    COMMENT: "div.koya-komponent-binding:first-child",
    COMMENT_TEXT: "div._mldc div._mdec > span._mzgc",
    REPLY: "div._mwdc > div.koya-komponent-binding",
    REPLY_TEXT: "div._mdec > span._mzgc",
    UNLOADED_DISCUSSION: "div._midc._mgnb._mfnb",
    LOADED_DISCUSSION: "div._midc._mgnb._mfnb",     // Parent of this
    UNEXPANDED_REPLIES: "div._mkdc > div.koya-komponent-binding"
};

var gDeviceType = void 0;
var gSelectors = void 0;

var gDiscussionObserver = void 0;
var gDiscussionElement = void 0;
var gDiscussionsLoaded = false;

var gCommentFilterEnabled = void 0;
var gWordCensorEnabled = void 0;

var gCommentFilterRegExps = [];
var gCensoredWords = [];

var gCurrentCommentIndex = 0;

function init() {
    var desktop_video_regex = /(http|https):\/\/(www\.)?youtube.com\/watch\?.*/i;
    var mobile_video_regex = /(http|https):\/\/(www\.)?m\.youtube.com\/watch\?.*/i;
    if (desktop_video_regex.test(window.location.href)) {
        gDeviceType = "desktop";
        gSelectors = DesktopSelectors;
    }
    else if (mobile_video_regex.test(window.location.href)) {
        gDeviceType = "mobile";
        gSelectors = MobileSelectors;
    }

    if (gDeviceType) {
        var discussion_element = document.querySelector(gSelectors.UNLOADED_DISCUSSION);
        if (discussion_element) {
            if (gDeviceType === "mobile") {
                // Mobile requires the parent element since it has no unique selector
                discussion_element = discussion_element.parentElement;
            }

            gDiscussionElement = discussion_element;

            setupCommentFilter();
            setupWordCensor();

            gDiscussionObserver = new MutationObserver(discussionObserverCallback);
            gDiscussionObserver.observe(discussion_element, { childList: true });
        }
    }
}

function setupCommentFilter() {
    chrome.storage.local.get(["commentFilterEnabled", "commentFilter"], function(items) {
        var error = chrome.runtime.lastError;
        if (error) {
            console.log("Error:", error);
        }
        else {
            gCommentFilterEnabled = items.commentFilterEnabled;
            if (gCommentFilterEnabled) {
                gCommentFilterRegExps = [];
                var filters = items.commentFilter.split("\n");
                for (var i=0, f=void 0, ss_index=void 0,regex_str=void 0; i<filters.length; ++i) {
                    f = filters[i];
                    if (f.length > 2 && f[0] === "/" && f[f.length - 1] === "/") {
                        // Regular expression
                        gCommentFilterRegExps.push(new RegExp(f.substring(1, f.length - 1), "i"));
                    }
                    else {
                        // Literal with wildcards
                        regex_str = "";
                        ss_index = f.indexOf("*");
                        while (ss_index > -1) {
                            if (!(ss_index > 0 && f[ss_index - 1] === "\\")) {
                                regex_str += f.substring(0, ss_index) + ".*";
                            }

                            f = f.substring(ss_index + 1);
                            ss_index = f.indexOf("*");
                        }

                        regex_str += f;
                        if (regex_str !== "") {
                            gCommentFilterRegExps.push(new RegExp(regex_str, "i"));
                        }
                    }
                }
            }
        }
    });
}

function setupWordCensor() {
    chrome.storage.local.get(["wordCensorEnabled", "wordCensor"], function(items) {
        var error = chrome.runtime.lastError;
        if (error) {
            console.log("Error:", error);
        }
        else {
            gWordCensorEnabled = items.wordCensorEnabled;
            if (gWordCensorEnabled) {
                gCensoredWords = [];
                var words = item.wordCensor.split("\n");
                for (var i=0; i<words.length; ++i) {
                    gCensoredWords.push(words[i].toLowerCase());
                }
            }
        }
    });
}

function onDiscussionObserverTimeout(e) {
    if (gDeviceType === "desktop" && !gDiscussionsLoaded) {
        var discussion_element = document.querySelector(gSelectors.LOADED_DISCUSSION);
        if (discussion_element) {
            gDiscussionsLoaded = true;
            gDiscussionObserver.disconnect();

            gDiscussionElement = discussion_element;

            gDiscussionObserver = new MutationObserver(discussionObserverCallback);
            gDiscussionObserver.observe(discussion_element, { childList: true });
            processComments();
        }
    }
    else {
        processComments();
    }
}

function discussionObserverCallback(mutation) {
    var nodes_added = false;
    for (var i=0; i<mutation.length; ++i) {
        if (mutation[i].addedNodes.length > 0) {
            nodes_added = true;
            break;
        }
    }

    if (nodes_added) {
        setTimeout(onDiscussionObserverTimeout, NODE_PROPAGATION_WAIT_PERIOD);
    }
}

function processComments() {
    var comment_elements = Array.prototype.slice.call(gDiscussionElement.querySelectorAll(gSelectors.COMMENT), gCurrentCommentIndex);
    var element = void 0;
    var comment = void 0;
    for(var i=0; i<comment_elements.length; ++i) {
        element = comment_elements[i].querySelector(gSelectors.COMMENT_TEXT);
        if (element) {
            comment = element.innerHTML;
        }
    }
}

init();
