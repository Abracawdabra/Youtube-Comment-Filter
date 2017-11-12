/**
 * Youtube Comment Filter
 * @author Cawdabra
 * @license MIT
 */

chrome.webNavigation.onHistoryStateUpdated.addListener(function(details) {
    if (details.frameId === 0) {
        chrome.tabs.get(details.tabId, function(tab) {
            if (tab.url === details.url) {
                chrome.tabs.executeScript(null, { file: "/content_scripts/yt_comment_filter.js" });
            }
        })
    }
});
