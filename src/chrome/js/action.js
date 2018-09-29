/**
 * URL Incrementer
 * @file action.js
 * @author Roy Six
 * @license LGPL-3.0
 */

var URLI = URLI || {};

URLI.Action = function () {

  /**
   * Performs an action.
   *
   * @param action   the action (e.g. increment)
   * @param caller   String indicating who called this function (e.g. command, popup, content script)
   * @param instance the instance for this tab
   * @param items    the storage items (optional)
   * @param callback the function callback (optional)
   * @public
   */
  async function performAction(action, caller, instance, items, callback) {
    console.log("URLI.Action.performAction() - action=" + action + ", caller=" + caller + ", instance=" + instance);
    items = items ? items : await EXT.Promisify.getItems();

    let actionPerformed = false;
    // Pre-Perform Action:
    // Handle AUTO
    if (instance.autoEnabled) {
      console.log("prePerformAction instance is auto enabled");
      // Get the most recent instance from Background in case auto has been paused
      instance = URLI.Background.getInstance(instance.tabId);
      // Handle autoTimes
      if (instance.autoAction === action) {
        instance.autoTimes--;
      } else if ((instance.autoTimes < instance.autoTimesOriginal) &&
        ((instance.autoAction === "increment" || instance.autoAction === "decrement") && (action === "increment" || action === "decrement")) ||
        ((instance.autoAction === "next" || instance.autoAction === "prev") && (action === "next" || action === "prev"))) {
        instance.autoTimes++;
      }
      // Prevents a rare race condition:
      // If the user tries to manually perform the auto action when times is at 0 but before the page has loaded and auto has cleared itself
      if (instance.autoTimes < 0) {
        console.log("URLI.Action.performAction() - auto rare race condition encountered, about to clear. instance.autoTimes=" + instance.autoTimes);
        action = "clear";
      }
    }
    // Handle DOWNLOAD
    if (instance.downloadEnabled) {
      // If download enabled auto not enabled, send a message to the popup to update the download preview (if it's open)
      if (!instance.autoEnabled && (["increment", "decrement", "next", "prev"].includes(action))) {
        chrome.tabs.onUpdated.addListener(URLI.Background.tabUpdatedListener);
      }
    }
    // Action:
    switch (action) {
      case "increment":  case "decrement":
      case "increment1": case "decrement1":
      case "increment2": case "decrement2":
      case "increment3": case "decrement3":
        // Error Skipping:
        if ((instance.errorSkip > 0 && (instance.errorCodes && instance.errorCodes.length > 0) ||
          (instance.errorCodesCustomEnabled && instance.errorCodesCustom && instance.errorCodesCustom.length > 0)) &&
          (items.permissionsEnhancedMode)) {
          actionPerformed = incrementDecrementErrorSkip(action, instance, items);
        }
        // Regular:
        else {
          actionPerformed = incrementDecrement(action, instance);
        }
        break;
      case "next": case "prev":
        actionPerformed = nextPrev(action, instance, items);
        break;
      case "clear":
        actionPerformed = clear(caller, instance, items, callback);
        break;
      case "return":
        actionPerformed = returnToStart(caller, instance);
        break;
      case "toolkit":
        actionPerformed = toolkit(instance);
        break;
      case "auto":
        actionPerformed = auto(instance);
        break;
      case "download":
        actionPerformed = download(instance, callback);
        break;
      default:
        break;
    }
    // // Post-Perform Action:
    // Icon Feedback if action was performed and other conditions are met (e.g. we don't show feedback if auto is enabled)
    if (items.iconFeedbackEnabled && actionPerformed && !(instance.autoEnabled || (caller === "auto" && instance.autoRepeat) || caller === "popupClearBeforeSet" || caller === "tabRemovedListener")) {
      URLI.Background.setBadge(instance.tabId, action, true);
    }
  }

  /**
   * Performs a regular increment or decrement action (without error skipping) and then updates the URL.
   *
   * @param action   the action (increment or decrement)
   * @param instance the instance for this tab
   * @private
   */
  function incrementDecrement(action, instance) {
    let actionPerformed = false;
    // If URLI didn't find a selection, we can't increment or decrement
    if (instance.customURLs || (instance.selection !== "" && instance.selectionStart >= 0)) {
      actionPerformed = true;
      URLI.IncrementDecrement.incrementDecrement(action, instance);
      if (instance.enabled) { // Don't store Quick Instances (Instance is never enabled in quick mode)
        URLI.Background.setInstance(instance.tabId, instance);
      }
      chrome.tabs.update(instance.tabId, {url: instance.url});
      chrome.runtime.sendMessage({greeting: "updatePopupInstance", instance: instance}, function(response) { if (chrome.runtime.lastError) {} });
    }
    return actionPerformed;
  }

  /**
   * Performs an increment or decrement action while also skipping errors.
   *
   * @param action   the action (increment or decrement)
   * @param instance the instance for this tab
   * @param items    the storage items
   * @private
   */
  function incrementDecrementErrorSkip(action, instance, items) {
    let actionPerformed = false;
    // If URLI didn't find a selection, we can't increment or decrement
    if (instance.customURLs || (instance.selection !== "" && instance.selectionStart >= 0)) {
      actionPerformed = true;
      URLI.IncrementDecrement.incrementDecrementErrorSkip(action, instance, instance.errorSkip);
    }
    return actionPerformed;
  }

  /**
   * Performs a next or prev action.
   *
   * @param action   the action (e.g. next or prev)
   * @param instance the instance for this tab
   * @param items    the storage items
   * @private
   */
  function nextPrev(action, instance, items) {
    let actionPerformed = true;
    chrome.tabs.executeScript(instance.tabId, {file: "/js/next-prev.js", runAt: "document_end"}, function() {
      const code = "URLI.NextPrev.findNextPrevURL(" +
        JSON.stringify(action) + ", " +
        JSON.stringify(action === "next" ? items.nextPrevKeywordsNext : items.nextPrevKeywordsPrev) + "," +
        JSON.stringify(items.nextPrevLinksPriority) + ", " +
        JSON.stringify(items.nextPrevSameDomainPolicy) + ");";
      chrome.tabs.executeScript(instance.tabId, {code: code, runAt: "document_end"}, function(results) {
        if (results && results[0]) {
          const url = results[0];
          chrome.tabs.update(instance.tabId, {url: url});
          // Only save next prev instances that are auto enabled and doing auto next or prev:
          if (instance.autoEnabled && (instance.autoAction === "next" || instance.autoAction === "prev")) {
            console.log("URLI.Action.nextPrev() - setting instance in background");
            instance.url = url;
            URLI.Background.setInstance(instance.tabId, instance);
          }
          chrome.runtime.sendMessage({greeting: "updatePopupInstance", instance: instance}, function(response) { if (chrome.runtime.lastError) {} });
        }
      });
    });
    return actionPerformed;
  }

  /**
   * Performs a clear action.
   *
   * @param caller   String indicating who called this function (e.g. command, popup, content script)
   * @param instance the instance for this tab
   * @param items    the storage items
   * @param callback the function callback (optional) - called by popup clear before set
   * @private
   */
  function clear(caller, instance, items, callback) {
    let actionPerformed = false;
    // Prevents a clear badge from displaying if there is no instance (e.g. in quick shortcuts mode)
    if (instance.enabled || instance.autoEnabled || instance.downloadEnabled) {
      actionPerformed = true;
    }
    URLI.Background.deleteInstance(instance.tabId);
    // If caller is not a manual clear by the user, don't remove key/mouse listeners or reset multi or delete save
    if (caller !== "popupClearBeforeSet" && caller !== "tabRemovedListener" && caller !== "auto" /*&& instance.enabled*/) {
      //instance.multiCount = 0; TODO... multi ?
      if (items.permissionsInternalShortcuts && items.keyEnabled && !items.keyQuickEnabled) {
        chrome.tabs.sendMessage(instance.tabId, {greeting: "removeKeyListener"});
      }
      if (items.permissionsInternalShortcuts && items.mouseEnabled && !items.mouseQuickEnabled) {
        chrome.tabs.sendMessage(instance.tabId, {greeting: "removeMouseListener"});
      }
      if (!instance.enabled && instance.saveFound) { // Don't delete saved URLs if the instance is also enabled
        instance.saveFound = false;
        URLI.SaveURLs.deleteURL(instance.url, "clear");
      }
    }
    if (instance.autoEnabled) {
      URLI.Auto.stopAutoTimer(instance, caller);
    }
    // Handle AUTO Repeat
    if (instance.autoEnabled && instance.autoRepeat && caller === "auto") {
      URLI.Auto.repeatAutoTimer(JSON.parse(JSON.stringify(instance))); // Create a new deep copy of the instance for the repeat
    }
    // For callers like popup that still need the instance, disable all states and reset autoTimes
    else {
      instance.enabled = instance.multiEnabled = instance.downloadEnabled = instance.autoEnabled = instance.autoPaused = false;
      instance.autoTimes = instance.autoTimesOriginal;
      if (callback) {
        callback(instance);
      } else {
        chrome.runtime.sendMessage({greeting: "updatePopupInstance", instance: instance}, function(response) { if (chrome.runtime.lastError) {} });
      }
    }
    return actionPerformed;
  }

  /**
   * Performs a return action, returning back to the instance's starting URL.
   *
   * @param caller   String indicating who called this function (e.g. command, popup, content script)
   * @param instance the instance for this tab
   * @private
   */
  function returnToStart(caller, instance) {
    let actionPerformed = false;
    if (instance.enabled && instance.startingURL) {
      actionPerformed = true;
      // Auto Case 1: If Auto is calling return, it is completing a repeat loop
      if (caller === "auto") {
        instance.autoRepeating = false;
      }
      // Auto Case 2: User is performing return while auto is on
      if (instance.autoEnabled && caller !== "auto") {
        instance.autoTimes = instance.autoTimesOriginal;
      }
      instance.url = instance.startingURL;
      instance.selection = instance.startingSelection;
      instance.selectionStart = instance.startingSelectionStart;
      // Multi:
      if (instance.multiEnabled) {
        for (let i = 1; i <= instance.multiCount; i++) {
          instance.multi[i].selection = instance.multi[i].startingSelection;
          instance.multi[i].selectionStart = instance.multi[i].startingSelectionStart;
        }
      }
      // URLs Array:
      instance.urlsCurrentIndex = instance.startingURLsCurrentIndex;
      chrome.tabs.update(instance.tabId, {url: instance.startingURL});
      if (instance.enabled) {
        URLI.Background.setInstance(instance.tabId, instance);
      }
      chrome.runtime.sendMessage({greeting: "updatePopupInstance", instance: instance}, function(response) { if (chrome.runtime.lastError) {} });
    }
    return actionPerformed;
  }

  /**
   * Performs a toolkit action. The instance's toolkit tool, action, and quantity are used.
   *
   * @param instance the instance for this tab
   * @private
   */
  function toolkit(instance) {
    let actionPerformed = true;
    switch (instance.toolkitTool) {
      case "crawl":
        if (chrome.windows && chrome.windows.create) { // Firefox Android: chrome.windows not supported
          chrome.windows.create({url: chrome.runtime.getURL("/html/popup.html"), type: "popup", width: 550, height: 550}, function(window) {
            instance.tabId = window.tabs[0].id;
            URLI.Background.setInstance(instance.tabId, instance);
          });
        } else {
          // TODO
        }
        break;
      case "tabs":
        for (const url of instance.urls) {
          chrome.tabs.create({"url": url.urlmod, "active": false});
        }
        break;
    }
    return actionPerformed;
  }

  /**
   * Performs an auto action (the auto action is either a pause or resume only).
   *
   * @param instance the instance for this tab
   * @private
   */
  function auto(instance) {
    let actionPerformed = false;
    if (instance && instance.autoEnabled) {
      URLI.Auto.pauseOrResumeAutoTimer(instance);
      instance = URLI.Background.getInstance(instance.tabId); // Get the updated pause or resume state set by auto
      chrome.runtime.sendMessage({greeting: "updatePopupInstance", instance: instance}, function(response) { if (chrome.runtime.lastError) {} });
      actionPerformed = true;
    }
    return actionPerformed;
  }

  /**
   * Performs a download action.
   *
   * @param instance the instance for this tab
   * @param callback the function callback (optional) - called by auto
   * @private
   */
  function download(instance, callback) {
    let actionPerformed = false;
    if (instance.downloadEnabled) {
      actionPerformed = true;
      chrome.tabs.executeScript(instance.tabId, {file: "/js/download.js", runAt: "document_end"}, function() {
        const code = "URLI.Download.findDownloadURLs(" +
          JSON.stringify(instance.downloadStrategy) + ", " +
          JSON.stringify(instance.downloadExtensions) + ", " +
          JSON.stringify(instance.downloadTags) + ", " +
          JSON.stringify(instance.downloadAttributes) + ", " +
          JSON.stringify(instance.downloadSelector) + ", " +
          JSON.stringify(instance.downloadIncludes) + ", " +
          JSON.stringify(instance.downloadExcludes) + ");";
        chrome.tabs.executeScript(instance.tabId, {code: code, runAt: "document_end"}, function (results) {
          if (results && results[0]) {
            let downloads = results[0];
            // If this is the starting URL, handle the manually selected and unselected items the user specified
            if (instance.url === instance.startingURL) {
              // Selecteds: Remove duplicates first and then add to downloads
              if (instance.downloadMSelecteds && instance.downloadMSelecteds.length > 0) {
                // instance.downloadSelecteds = instance.downloadSelecteds.filter(function(selected) {
                //   return downloads.some(function(download) {
                //     return download.url !== selected;
                //   });
                // });
                // for (let selected of instance.downloadSelecteds) {
                //   downloads.push({"url": selected});
                // }
                downloads.push(...instance.downloadMSelecteds);
              }
              // Unselecteds: Remove any unselectds from downloads
              if (instance.downloadMUnselecteds && instance.downloadMUnselecteds.length > 0) {
                downloads = downloads.filter(function(download) {
                  return !instance.downloadMUnselecteds.some(function(munselected) {
                    return download.url === munselected.url;
                  });
                });
              }
              // TODO remove duplicates if exist (they shouldn't)?
              //downloadPreviewCache[otherId] = downloadPreviewCache[otherId].filter((object, index) => index === downloadPreviewCache[otherId].findIndex(obj => JSON.stringify(obj) === JSON.stringify(object)));
              //const uniqueArray = arrayOfObjects.filter((object,index) => index === arrayOfObjects.findIndex(obj => JSON.stringify(obj) === JSON.stringify(object)));
            }
            for (let download of downloads) {
              console.log("URLI.Action.download() - downloading url=" + download.url + " ... ");
              const params = instance.downloadSubfolder && download.filenameAndExtension && download.filename && download.extension ? { url: download.url, filename: instance.downloadSubfolder + "/" + download.filenameAndExtension } : { url: download.url};
              chrome.downloads.download(params, function(downloadId) {
                if (chrome.runtime.lastError && instance.downloadSubfolder) {
                  chrome.downloads.download({url: download.url});
                }
                chrome.downloads.search({id: downloadId}, function(results) {
                  const downloadItem = results ? results[0] : undefined;
                  if (downloadItem) {
                    const bytesInAMegabyte = 1048576;
                    if (downloadItem.totalBytes > 0 && (
                        (!isNaN(instance.downloadMinMB) && instance.downloadMinMB > 0 ? (instance.downloadMinMB * bytesInAMegabyte) > downloadItem.totalBytes : false) ||
                        (!isNaN(instance.downloadMaxMB) && instance.downloadMaxMB > 0 ? (instance.downloadMaxMB * bytesInAMegabyte) < downloadItem.totalBytes : false)
                      )) {
                      console.log("URLI.Action.download() - canceling download because downloadItem.totalbytes=" + downloadItem.totalBytes + " and instance.MinMB bytes=" + (instance.downloadMinMB * bytesInAMegabyte) + " or instance.MaxMB bytes=" + (instance.downloadMaxMB * bytesInAMegabyte));
                      chrome.downloads.cancel(downloadId);
                    }
                  }
                });
              });
            }
            // Subfolder Increment after downloads
            if (instance.downloadSubfolder) {
              instance.downloadSubfolder = instance.downloadSubfolder.replace(/\d+/, function(match) {
                const matchp1 = (Number(match) + 1) + "";
                return "0".repeat(match.length - matchp1.length) + matchp1;
              });
              console.log("instance.downloadSubfolder=" + instance.downloadSubfolder);
              URLI.Background.setInstance(instance.tabId, instance);
            }
          }
          if (callback) {
            callback(instance);
          }
        });
      });
    }
    return actionPerformed;
  }

  // Return Public Functions
  return {
    performAction: performAction
  };
}();