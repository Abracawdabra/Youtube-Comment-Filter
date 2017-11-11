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
    COMMENT_TEXT: "div.comment-renderer > div.comment-renderer-content > div.comment-renderer-text-content",
    REPLY: "section.comment-thread-renderer > div.comment-replies-renderer",
    REPLY_TEXT: "div.comment-renderer > div.comment-renderer-content > div.comment-renderer-text-content",
    UNLOADED_DISCUSSION: "div#watch-discussion",
    LOADED_DISCUSSION: "div#comment-section-renderer-items",
    UNEXPANDED_REPLIES: "div.comment-replies-renderer .yt-uix-expander-body.comment-replies-renderer-pages"
};

var MobileSelectors = {
    COMMENT: "div.koya-komponent-binding",
    COMMENT_TEXT: "div._mldc div._mdec > span._mzgc > span",
    REPLY: "div._mwdc",
    REPLY_TEXT: "div._mdec > span._mzgc > span",
    UNLOADED_DISCUSSION: "div._midc._mgnb._mfnb",
    LOADED_DISCUSSION: "div._midc._mgnb._mfnb",     // Parent of this
    UNEXPANDED_REPLIES: "div._mkdc > div.koya-komponent-binding"
};

var gDeviceType = void 0;
var gSelectors = void 0;

var gDiscussionObserver = void 0;
var gDiscussionElement = void 0;
var gDiscussionsLoaded = false;

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

            gDiscussionObserver = new MutationObserver(discussionObserverCallback);
            gDiscussionObserver.observe(discussion_element, { childList: true });
        }
    }
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
    for(var i=0; i<comment_elements.length; ++i) {
    }
}

init();
