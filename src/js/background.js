/**
 * URL Incrementer Background
 *
 * @author Roy Six
 * @namespace
 */

const URLI = URLI || {};

URLI.Background = URLI.Background || function () {

  // SDV: Storage Default Values
  const SDV = {
    "internalShortcutsEnabled": false,
    "autoEnabled": false,
    "downloadEnabled": false,
    "quickEnabled": true,
    "iconColor": "dark",
    "iconFeedbackEnabled": false,
    "animationsEnabled": true,
    "popupSettingsCanOverwrite": true,
    "selectionPriority": "prefixes", "interval": 1, "leadingZerosPadByDetection": true, "base": 10, "baseCase": "lowercase",
    "selectionCustom": {url: "", pattern: "", flags: "", group: 0, index: 0},
    "linksPriority": "attributes", "sameDomainPolicy": true,
    "keyEnabled": true, "keyQuickEnabled": true, "keyIncrement": [5, 38], "keyDecrement": [5, 40], "keyNext": [], "keyPrev": [], "keyClear": [],
    "mouseEnabled": false, "mouseQuickEnabled": false, "mouseIncrement": 0, "mouseDecrement": 0, "mouseNext": 0, "mousePrev": 0, "mouseClear": 0,
    "autoAction": "increment", "autoTimes": 10, "autoSeconds": 5, "autoWait": false,
    "downloadStrategy": "types", "downloadTypes": ["jpg"], "downloadSelector": "[src*='.jpg' i],[href*='.jpg' i]", "downloadIncludes": "", "downloadLimit": 10
  };

  const instances = new Map(); // TODO: Use storage and make background an event page

  /**
   * Gets the storage default values (SDV).
   *
   * @return the storage default values (SDV)
   * @public
   */
  function getSDV() {
    return SDV;
  }

  /**
   * Gets all the tab instances.
   *
   * @return {Map<tabId, instance>} the tab instances
   * @public
   */
  function getInstances() {
    return instances;
  }

  /**
   * Gets the tab's instance.
   * 
   * @param tabId the tab id to lookup this instance by
   * @return instance the tab's instance
   * @public
   */
  function getInstance(tabId) {
    return instances.get(tabId);
  }

  /**
   * Sets the tab's instance.
   * 
   * @param tabId    the tab id to lookup this instance by
   * @param instance the instance to set
   * @public
   */
  function setInstance(tabId, instance) {
    instances.set(tabId, instance);
  }

  /**
   * Deletes the tab's instance.
   *
   * @param tabId the tab id to lookup this instance by
   * @public
   */
  function deleteInstance(tabId) {
    instances.delete(tabId);
  }

  /**
   * Builds/Updates an instance with default values.
   * 
   * @param instance the instance, if any, to continue building off of
   * @param tab      the tab properties (id, url) to set this instance with
   * @param items    the storage items used to build the default instance
   * @return instance the newly built instance
   * @public
   */
  function buildInstance(instance, tab, items) {
    var selectionProps;
    if (tab) {
      if (!instance) {
        instance = {};
        instance.enabled = false;
        instance.interval = items.interval;
        instance.base = items.base;
        instance.baseCase = items.baseCase;
        instance.linksPriority = items.linksPriority;
        instance.sameDomainPolicy = items.sameDomainPolicy;
        instance.autoEnabled = false;
        instance.autoAction = items.autoAction;
        instance.autoTimes = items.autoTimes;
        instance.autoSeconds = items.autoSeconds;
        instance.autoWait = items.autoWait;
        instance.downloadEnabled = false;
        instance.downloadStrategy = items.downloadStrategy;
        instance.downloadTypes = items.downloadTypes;
        instance.downloadSelector = items.downloadSelector;
        instance.downloadIncludes = items.downloadIncludes;
        instance.downloadLimit = items.downloadLimit;
    }
      selectionProps = URLI.IncrementDecrement.findSelection(tab.url, items.selectionPriority, items.selectionCustom);
      instance.tabId = tab.id;
      instance.url = tab.url;
      instance.selection = selectionProps.selection;
      instance.selectionStart = selectionProps.selectionStart;
      instance.leadingZeros = items.leadingZerosPadByDetection && selectionProps.selection.charAt(0) === '0' && selectionProps.selection.length > 1;
    }
    return instance;
  }

  /**
   * Updates the instance's tab based on the desired action.
   * 
   * @param instance the instance for this tab
   * @param action   the operation (e.g. increment or decrement)
   * @param caller   String indicating who called this function (e.g. command)
   * @param callback the function callback (optional)
   * @public
   */
  function updateTab2(instance, action, caller, callback) {
    var urlProps,
        code;
    switch (action) {
      case "increment":
      case "decrement":
        urlProps = URLI.IncrementDecrement.modifyURL(instance.url, instance.selection, instance.selectionStart, instance.interval, instance.base, instance.baseCase, instance.leadingZeros, action);
        instance.url = urlProps.urlmod;
        instance.selection = urlProps.selectionmod;
        chrome.tabs.update(instance.tabId, {url: instance.url});
        if (instance.enabled) { // Instance is never enabled in quick mode
          setInstance(instance.tabId, instance);
        }
        if (callback) {
          callback(instance);
        }
        break;
      case "next":
      case "prev":
        chrome.tabs.executeScript(instance.tabId, {file: "js/next-prev.js", runAt: "document_end"}, function() {
          code = "URLI.NextPrev.getURL(" + JSON.stringify(action) + ", " + JSON.stringify(instance.linksPriority) + ", " + JSON.parse(instance.sameDomainPolicy) + ");";
          chrome.tabs.executeScript(instance.tabId, {code: code, runAt: "document_end"}, function(results){
            if (results && results[0]) {
              chrome.tabs.update(instance.tabId, {url: results[0]});
            }
            if (callback) {
              callback(instance);
            }
          });
        });
        break;
    }
    // Icon Feedback
    chrome.storage.sync.get(null, function(items) {
      if (items.iconFeedbackEnabled) {
        chrome.browserAction.setBadgeText({text: action === "increment" ? "+" : action === "decrement" ? "-" : action === "next" ? ">" : action === "prev" ? "<" : ".", tabId: instance.tabId});
      }
    });
    // // Download
    // if (instance && instance.enabled && instance.downloadEnabled) {
    //   chrome.tabs.executeScript(instance.tabId, {file: "js/download.js", runAt: "document_end"}, function() {
    //     code = "URLI.Download.downloadXYZ(document);";//, " +  JSON.stringify(instance.downloadSelector) + ");";
    //     console.log("code=" + code);
    //     chrome.tabs.executeScript(instance.tabId, {code: code, runAt: "document_end"}, function (results) {
    //       console.log("results=");
    //       console.log(results);
    //       if (callback) {
    //         console.log("download callback executescript");
    //         callback(instance);
    //       }
    //     });
    //   });
    // }

  }
  function updateTab(instance, action, caller, callback) {
        if (instance && instance.enabled && instance.downloadEnabled) {
          chrome.tabs.executeScript(instance.tabId, {file: "js/download.js", runAt: "document_end"}, function() {
          code = "URLI.Download.downloadx(" + JSON.stringify(instance.downloadSelector) + ");";
          //code = "URLI.Download.setProperties(" + JSON.stringify(instance.downloadSelector) + ");";
          console.log("code=" + code);
          chrome.tabs.executeScript(instance.tabId, {code: code, runAt: "document_end"}, function (results) {
            if (results && results[0]) {
            console.log("results=" + results);
           console.log("results[0]" + results[0]);
           console.log("resuls length" + results[0].length);
           
           var urls = results[0];
           for (var i = 0; i < urls.length; i++ ) {
                        url = urls[i]; //link.src ? link.src : link.href ? link.href : ""
             console.log("url=" + url);
             console.log(chrome);
             chrome.downloads.download({url: url});
           }
           }
           updateTab2(instance, action, caller, callback);
         });
          });
    }
     else {
       updateTab2(instance, action, caller, callback)
     }
  }
  

  // Return Public Functions
  return {
    getSDV: getSDV,
    getInstances: getInstances,
    getInstance: getInstance,
    setInstance: setInstance,
    deleteInstance: deleteInstance,
    buildInstance: buildInstance,
    updateTab: updateTab
  };
}();

// Listen for installation changes and do storage/extension initialization work
chrome.runtime.onInstalled.addListener(function(details) {
  // New Installations: Setup storage and open Options Page in a new tab
  if (details.reason === "install") {
    chrome.storage.sync.clear(function() {
      chrome.storage.sync.set(URLI.Background.getSDV(), function() {
        chrome.runtime.openOptionsPage();
      });
    });
  }
  // Update Installations (Version 4.0 and Below): Reset storage and remove all optional permissions
  if (details.reason === "update") {
    chrome.storage.sync.clear(function() {
      chrome.storage.sync.set(URLI.Background.getSDV(), function() {
        if (chrome.declarativeContent) {
          chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {});
        }
        chrome.permissions.remove({ permissions: ["declarativeContent"], origins: ["<all_urls>"]}, function(removed) { });
      });
    });
  }
});

// Listen for requests from chrome.runtime.sendMessage (Content Scripts Environment auto.js, shortcuts.js)
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  var instance;
  switch (request.greeting) {
    case "getInstance":
      sendResponse({instance: URLI.Background.getInstance(sender.tab.id)});
      break;
    case "setInstance":
      URLI.Background.setInstance(sender.tab.id, request.instance);
      break;
    case "deleteInstance":
      if (items_.internalShortcutsEnabled && items_.keyEnabled && !items_.keyQuickEnabled) {
          chrome.tabs.sendMessage(sender.tabId, {greeting: "removeKeyListener"});
      }
      if (items_.internalShortcutsEnabled && items_.mouseEnabled && !items_.mouseQuickEnabled) {
          chrome.tabs.sendMessage(sender.tabId, {greeting: "removeMouseListener"});
      }
      if (items_.internalShortcutsEnabled && URLI.Background.getInstance(sender.tab.id).autoEnabled) {
        chrome.tabs.sendMessage(sender.tabId, {greeting: "clearAutoTimeout"});
      }
      URLI.Background.deleteInstance(sender.tab.id);
      break;
    case "updateTab":
      instance = URLI.Background.getInstance(sender.tab.id);
      if (!instance && sender.tab && request.items) {
        instance = URLI.Background.buildInstance(undefined, sender.tab, request.items);
      }
      URLI.Background.updateTab(instance, request.action);
      break;
    case "closePopup":
      chrome.extension.getViews({type: "popup", windowId: sender.tab.windowId}).forEach(function(popup) { popup.close(); });
      break;
    default:
      break;
  }
  sendResponse({});
});

// Listen for commands (Chrome shortcuts) and perform the command's action
chrome.commands.onCommand.addListener(function(command) {
  chrome.storage.sync.get(null, function(items) {
    if (!items.internalShortcutsEnabled && (command === "increment" || command === "decrement" || command === "next" || command === "prev" || command === "clear")) {
      chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
        var instance = URLI.Background.getInstance(tabs[0].id);
        if ((command === "increment" || command === "decrement" || command === "next" || command === "prev") && (items.quickEnabled || (instance && instance.enabled))) {
          if (!instance && items.quickEnabled) {
            instance = URLI.Background.buildInstance(undefined, tabs[0], items);
          }
          URLI.Background.updateTab(instance, command);
        } else if (command === "clear" && instance && instance.enabled) {
          URLI.Background.deleteInstance(tabs[0].id);
        }
      });
    }
  });
});