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
    REPLY: "div.comment-renderer",
    REPLY_TEXT: "div.comment-renderer-content > div.comment-renderer-text > div.comment-renderer-text-content",
    UNLOADED_DISCUSSION: "div#watch-discussion",
    LOADED_DISCUSSION: "div#comment-section-renderer-items",
    UNEXPANDED_REPLIES: "div.comment-replies-renderer .yt-uix-expander-body.comment-replies-renderer-pages"
};

var MobileSelectors = {
    COMMENT: "div._mkdc",
    COMMENT_TEXT: "div._mldc div._mdec > span._mzgc",
    REPLY: "div._mwdc > div.koya-komponent-binding",
    REPLY_TEXT: "div._mdec > span._mzgc",
    UNLOADED_DISCUSSION: "div._midc._mgnb._mfnb",       // Parent of this
    LOADED_DISCUSSION: "",                              // Not used since mobile uses the same element for unloaded and loaded
    UNEXPANDED_REPLIES: "div._mkdc > div.koya-komponent-binding"
};

var gDeviceType = void 0;
var gSelectors = void 0;

var gDiscussionObserver = void 0;
var gDiscussionElement = void 0;
var gDiscussionsLoaded = false;

var gReplyObservers = [];

var gCommentFilterRegExps = [];
var gWordCensorRegExps = [];

var gCurrentCommentIndex = 0;

// Settings
var gCommentFilterEnabled = void 0;
var gWordCensorEnabled = void 0;
var gHideFilteredComments = void 0;

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
    chrome.storage.local.get(["commentFilterEnabled", "commentFilter", "hideFilteredComments"], function(items) {
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

            gHideFilteredComments = items.hideFilteredComments;
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
                gWordCensorRegExps = [];
                var words = items.wordCensor.split("\n");
                var regex = void 0;
                for (var i=0; i<words.length; ++i) {
                    regex = new RegExp("\\b" + words[i] + "\\b", "ig");
                    regex.word = words[i];
                    gWordCensorRegExps.push(regex);
                }
            }
        }
    });
}

function discussionObserverCallback(mutation) {
    for (var i=0; i<mutation.length; ++i) {
        if (mutation[i].addedNodes.length > 0) {
            setTimeout(onDiscussionObserverTimeout, NODE_PROPAGATION_WAIT_PERIOD);
            break;
        }
    }
}

function onDiscussionObserverTimeout() {
    if (gDeviceType === "desktop" && !gDiscussionsLoaded) {
        var discussion_element = document.querySelector(gSelectors.LOADED_DISCUSSION);
        if (discussion_element) {
            gDiscussionsLoaded = true;
            gDiscussionObserver.disconnect();

            gDiscussionElement = discussion_element;

            gDiscussionObserver = new MutationObserver(discussionObserverCallback);
            gDiscussionObserver.observe(discussion_element, { childList: true });
            var comment_elements = Array.prototype.slice.call(gDiscussionElement.querySelectorAll(gSelectors.COMMENT), gCurrentCommentIndex);
            processComments(comment_elements, gSelectors.COMMENT_TEXT);
            gCurrentCommentIndex += comment_elements.length;
        }
    }
    else {
        var comment_elements = Array.prototype.slice.call(gDiscussionElement.querySelectorAll(gSelectors.COMMENT), gCurrentCommentIndex);
        processComments(comment_elements, gSelectors.COMMENT_TEXT);
        if (gDeviceType === "desktop") {
            gCurrentCommentIndex += comment_elements.length;
        }
    }
}

function unexpandedRepliesObserverCallback(mutation) {
    var nodes_added = false;
    var target = void 0;
    for (var i=0; i<mutation.length; ++i) {
        if (mutation[i].addedNodes.length > 0) {
            // Kill the observer
            target = mutation[i].target;
            target.ytfObserver.disconnect();
            delete target.ytfObserver;

            setTimeout(function() {
                processComments(Array.prototype.slice.call(target.querySelectorAll(gSelectors.REPLY)), gSelectors.REPLY_TEXT);
            }, NODE_PROPAGATION_WAIT_PERIOD);
            break;
        }
    }
}

function processComments(elements, text_selector) {
    var text_element = void 0;
    var comment = void 0;
    var comment_removed = void 0;
    var unexpanded_replies_element = void 0;
    var observer = void 0;
    var span = void 0;
    for(var i=0, j=void 0; i<elements.length; ++i) {
        text_element = elements[i].querySelector(text_selector);
        if (text_element) {
            comment_removed = false;
            comment = text_element.innerHTML;
            if (gCommentFilterEnabled) {
                for (j=0; j<gCommentFilterRegExps.length; ++j) {
                    if (gCommentFilterRegExps[j].test(comment)) {
                        if (gHideFilteredComments) {
                            elements[i].parentNode.removeChild(elements[i]);
                            text_element = null;
                        }
                        else {
                            text_element.style.display = "none";
                            span = document.createElement("span");
                            span.style.color = "red";
                            span.appendChild(document.createTextNode("Comment removed by filter."));
                            text_element.parentElement.appendChild(span);
                        }

                        comment_removed = true;
                        break;
                    }
                }

                if (gDeviceType === "mobile" && text_element) {
                    // Stupid mobile recreates the entire discussion stuff when loading more comments
                    processComments(Array.prototype.slice.call(elements[i].querySelectorAll(gSelectors.REPLY)), gSelectors.REPLY_TEXT);
                }
            }

            if (text_element) {
                if (gWordCensorEnabled && !comment_removed) {
                    for (j=0; j<gWordCensorRegExps.length; ++j) {
                        comment = comment.replace(gWordCensorRegExps[j], "*".repeat(gWordCensorRegExps[j].word.length));
                    }

                    if (text_element.innerHTML !== comment) {
                        span = document.createElement("span");
                        span.className = text_element.className;
                        span.innerHTML = comment;
                        text_element.style.display = "none";
                        text_element.className = "";
                        text_element.parentElement.appendChild(span);
                    }
                }

                unexpanded_replies_element = elements[i].querySelector(gSelectors.UNEXPANDED_REPLIES);
                if (unexpanded_replies_element) {
                    observer = new MutationObserver(unexpandedRepliesObserverCallback);
                    unexpanded_replies_element.ytfObserver = observer;
                    observer.observe(unexpanded_replies_element, { childList: true });
                }
            }
        }
    }
}

init();
