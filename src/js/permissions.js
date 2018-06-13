/**
 * URL Incrementer Permissions
 *
 * @author Roy Six
 * @namespace
 */

var URLI = URLI || {};

URLI.Permissions = function () {

  // This object contains all of the extension's optional permissions. Each permission contains:
  // 1) What storage keys to set, 2) The permission request, 3) The permission conflict to use instead if a conflict exists with another permission (optional), and  4) The script (optional)
  const PERMISSIONS = {
    "internalShortcuts": {
      "storageKey": "permissionsInternalShortcuts",
      "request": {permissions: ["declarativeContent"], origins: ["<all_urls>"]},
      "script": {js: ["js/shortcuts.js"]}
    },
    "download": {
      "storageKey": "permissionsDownload",
      "request": {permissions: ["declarativeContent", "downloads"], origins: ["<all_urls>"]},
      "requestConflict": {permissions: ["downloads"]}
    },
    "enhancedMode": {
      "storageKey": "permissionsEnhancedMode",
      "request": {permissions: ["declarativeContent"], origins: ["<all_urls>"]}
    }
  };

  /**
   * Requests a single permission.
   * If granted and a script needs to be added, adds a declarative content rule.
   * Then updates the permission key value in storage.
   *
   * @param permission the permission to request (a string in PERMISSIONS)
   * @param callback   the callback function to return execution to
   * @public
   */
  function requestPermissions(permission, callback) {
    chrome.permissions.request(PERMISSIONS[permission].request, function(granted) {
      if (granted) {
        if (PERMISSIONS[permission].script) {
          chrome.declarativeContent.onPageChanged.addRules([{
            conditions: [new chrome.declarativeContent.PageStateMatcher()],
            actions: [new chrome.declarativeContent.RequestContentScript(PERMISSIONS[permission].script)]
          }]);
        }
        chrome.storage.sync.set({[PERMISSIONS[permission].storageKey]: true}, function() {
          if (callback) { callback(true); }
        });
      } else { if (callback) { callback(false); } }
    });
  }

  /**
   * Removes a single permission.
   * If necessary, removes the script and declarative content rule. Then checks to see if a conflict exists
   * with another permission that might share this permission. If a conflict exists, the permission is not removed.
   * Then updates the permission key value in storage.
   *
   * @param permission the permission to remove (a string in PERMISSIONS)
   * @param callback   the callback function to return execution to 
   * @public
   */
  function removePermissions(permission, callback) {
    // Script:
    if (chrome.declarativeContent && PERMISSIONS[permission].script) {
      chrome.declarativeContent.onPageChanged.getRules(undefined, function(rules) {
        for (let i = 0; i < rules.length; i++) {
          if (rules[i].actions[0].js[0] === PERMISSIONS[permission].script.js[0]) {
            //console.log("URLI DEBUG: removePermissions() Removing rule " + rules[i]);
            chrome.declarativeContent.onPageChanged.removeRules([rules[i].id], function() {});
          }
        }
      });
    }
    // Remove:
    chrome.storage.sync.get(null, function(items) {
      if ((permission === "internalShortcuts" && !items.permissionsEnhancedMode && !items.permissionsDownload) ||
          (permission === "download" && !items.permissionsInternalShortcuts && !items.permissionsEnhancedMode) ||
          (permission === "enhancedMode" && !items.permissionsInternalShortcuts && !items.permissionsDownload)) {
        chrome.permissions.remove(PERMISSIONS[permission].request, function(removed) { if (removed) { } });
      } else if (PERMISSIONS[permission].requestConflict) {
        chrome.permissions.remove(PERMISSIONS[permission].requestConflict, function(removed) { if (removed) { } });
      }
    });
    chrome.storage.sync.set({[PERMISSIONS[permission].storageKey]: false}, function() {
      if (callback) { callback(true); }
    });
  }

  /**
   * Removes all the extension's optional permissions.
   *
   * @param callback the callback function to return execution to
   * @public
   */
  function removeAllPermissions(callback) {
    if (chrome.declarativeContent) {
      chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {});
    }
    chrome.permissions.remove({ permissions: ["declarativeContent", "downloads"], origins: ["<all_urls>"]}, function(removed) { if (removed) { if (callback) { callback(true); } } });
  }

  // Return Public Functions
  return {
    requestPermissions: requestPermissions,
    removePermissions: removePermissions,
    removeAllPermissions: removeAllPermissions
  };
}();