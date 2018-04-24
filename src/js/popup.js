/**
 * URL Incrementer Popup
 * 
 * @author Roy Six
 * @namespace
 */

var URLI = URLI || {};

URLI.Popup = URLI.Popup || function () {

  var instance = {}, // Tab instance cache
      items_ = {}, // Storage items cache
      DOM = {}; // Map to cache DOM elements: key=id, value=element

  /**
   * Loads the DOM content needed to display the popup page.
   * 
   * DOMContentLoaded will fire when the DOM is loaded. Unlike the conventional
   * "load", it does not wait for images and media.
   * 
   * @public
   */
  function DOMContentLoaded() {
    var ids = document.querySelectorAll("[id]"),
        i18ns = document.querySelectorAll("[data-i18n]"),
        el,
        i;
    // Cache DOM elements
    for (i = 0; i < ids.length; i++) {
      el = ids[i];
      DOM["#" + el.id] = el;
    }
    // Set i18n (internationalization) text from messages.json
    for (i = 0; i < i18ns.length; i++) {
      el = i18ns[i];
      el[el.dataset.i18n] = chrome.i18n.getMessage(el.id.replace(/-/g, '_'));
    }
    // Add Event Listeners to the DOM elements
    DOM["#increment-input"].addEventListener("click", clickIncrement);
    DOM["#decrement-input"].addEventListener("click", clickDecrement);
    DOM["#clear-input"].addEventListener("click", clickClear);
    DOM["#setup-input"].addEventListener("click", toggleView);
    DOM["#accept-button"].addEventListener("click", setup);
    DOM["#cancel-button"].addEventListener("click", toggleView);
    DOM["#options-button"].addEventListener("click", function() { chrome.runtime.openOptionsPage(); });
    DOM["#url-textarea"].addEventListener("mouseup", selectURL);
    DOM["#url-textarea"].addEventListener("keyup", selectURL);
    DOM["#url-textarea"].addEventListener("touchend", selectURL);
    // DOM["#url-textarea"].addEventListener("select", selectURL); TODO: This causes a nasty bug with trying to use the checkbox unfortunately
    DOM["#base-select"].addEventListener("change", function() { DOM["#base-case"].className = +this.value > 10 ? "display-block fade-in" : "display-none"; });
    DOM["#auto-action-select"].addEventListener("change", function() { DOM["#auto-extras"].className = this.value !== "" ? "display-block fade-in" : "display-none"; });
    // Initialize popup content
    chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
      chrome.storage.sync.get(null, function(items) {
        items_ = items;
        chrome.runtime.getBackgroundPage(function(backgroundPage) {
          instance = backgroundPage.URLI.Background.getInstance(tabs[0].id);
          if (!instance) {
            instance = backgroundPage.URLI.Background.buildInstance(instance, tabs[0], items_);
          }
          updateControls();
          DOM["#setup-input"].className = items_.animationsEnabled ? "hvr-grow" : "";
          DOM["#url-textarea"].value = instance.url;
          DOM["#selection-input"].value = instance.selection;
          DOM["#selection-start-input"].value = instance.selectionStart;
          DOM["#interval-input"].value = instance.interval;
          DOM["#base-select"].value = instance.base;
          DOM["#base-case"].className = instance.base > 10 ? "display-block fade-in" : "display-none";
          DOM["#base-case-lowercase-input"].checked = instance.baseCase === "lowercase";
          DOM["#base-case-uppercase-input"].checked = instance.baseCase === "uppercase";
          DOM["#leading-zeros-input"].checked = instance.leadingZeros;
          DOM["#auto"].className = items_.permissionsGranted ? "column" : "display-none";
          DOM["#auto-extras"].className = items_.permissionsGranted && instance.autoAction !== "" ? "display-block fade-in" : "display-none";
          DOM["#auto-action-select"].value = instance.autoAction;
          DOM["#auto-times-input"].value = instance.autoTimes;
          DOM["#auto-seconds-input"].value = instance.autoSeconds;
          if (!instance.enabled) {
            toggleView.call(DOM["#setup-input"]);
          }
        });
      });
    });
  }

  /**
   * Updates this tab by incrementing the URL if the instance is enabled.
   * 
   * @private
   */
  function clickIncrement() {
    if (instance.enabled) {
      if (items_.animationsEnabled) {
        URLI.UI.clickHoverCss(this, "hvr-push-click");
      }
      chrome.runtime.getBackgroundPage(function(backgroundPage) {
        backgroundPage.URLI.Background.updateTab(instance, "increment", "popup", function(result) {
          instance = result;
        });
      });
    }
  }

  /**
   * Updates this tab by decrementing the URL if the instance is enabled.
   * 
   * @private
   */
  function clickDecrement() {
    if (instance.enabled) {
      if (items_.animationsEnabled) {
        URLI.UI.clickHoverCss(this, "hvr-push-click");
      }
      chrome.runtime.getBackgroundPage(function(backgroundPage) {
        backgroundPage.URLI.Background.updateTab(instance, "decrement", "popup", function(result) {
          instance = result;
        });
      });
    }
  }

  /**
   * Clears and deletes this tab's instance if it is enabled.
   * 
   * @private
   */
  function clickClear() {
    if (instance.enabled) {
      instance.enabled = false;
      updateControls();
      if (items_.animationsEnabled) {
        URLI.UI.clickHoverCss(this, "hvr-push-click");
      }
      chrome.runtime.getBackgroundPage(function(backgroundPage) {
        backgroundPage.URLI.Background.deleteInstance(instance.tabId);
      });
      if (items_.permissionsGranted && items_.keyEnabled && !items_.keyQuickEnabled) {
          chrome.tabs.sendMessage(instance.tabId, {greeting: "removeKeyListener"});
      }
      if (items_.permissionsGranted && items_.mouseEnabled && !items_.mouseQuickEnabled) {
          chrome.tabs.sendMessage(instance.tabId, {greeting: "removeMouseListener"});
      }
      if (instance.autoAction !== "") {
        chrome.tabs.sendMessage(instance.tabId, {greeting: "clearAutoTimeout"});
      }
    }
  }

  /**
   * Toggles the popup between the controls and setup views.
   * 
   * @private
   */
  function toggleView() {
    switch (this.id) {
      case "setup-input": // Hide controls, show setup
        DOM["#controls"].className = "fade-out display-none";
        DOM["#setup"].className = "display-block fade-in";
        DOM["#url-textarea"].value = instance.url;
        DOM["#url-textarea"].setSelectionRange(instance.selectionStart, instance.selectionStart + instance.selection.length);
        DOM["#url-textarea"].focus();
        DOM["#selection-input"].value = instance.selection;
        DOM["#selection-start-input"].value = instance.selectionStart;
        break;
      case "accept-button": // Hide setup, show controls
      case "cancel-button":
        DOM["#setup"].className = "fade-out display-none";
        DOM["#controls"].className = "display-block fade-in";
        updateControls(); // Needed to reset hover.css click effect
        break;
      default:
        break;
    }
  }

  /**
   * Updates the control images based on whether the instance is enabled.
   * 
   * @private
   */
  function updateControls() {
    var className = instance.enabled ? items_.animationsEnabled ? "hvr-grow"  : "" : "disabled";
    DOM["#increment-input"].className = className;
    DOM["#decrement-input"].className = className;
    DOM["#clear-input"].className = className;
  }
  
  /**
   * Sets up the instance in increment decrement mode. First validates user input for any
   * errors, then saves and enables the instance, then toggles the view back to
   * the controls.
   * 
   * @private
   */
  function setup() {
    var url = DOM["#url-textarea"].value,
        selection = DOM["#selection-input"].value,
        selectionStart = +DOM["#selection-start-input"].value,
        interval = +DOM["#interval-input"].value,
        base = +DOM["#base-select"].value,
        baseCase = DOM["#base-case-uppercase-input"].checked ? "uppercase" : DOM["#base-case-lowercase-input"].checked ? "lowercase" : undefined,
        selectionParsed = parseInt(selection, base).toString(base),
        leadingZeros = DOM["#leading-zeros-input"].checked,
        autoAction = DOM["#auto-action-select"].value,
        autoTimes = +DOM["#auto-times-input"].value,
        autoSeconds = +DOM["#auto-seconds-input"].value,
        errors = [ // [0] = selection errors and [1] = interval errors
          selection === "" ? chrome.i18n.getMessage("selection_blank_error") :
          url.indexOf(selection) === -1 ? chrome.i18n.getMessage("selection_notinurl_error") :
          !/^[a-z0-9]+$/i.test(selection) ? chrome.i18n.getMessage("selection_notalphanumeric_error") :
          selectionStart < 0 || url.substr(selectionStart, selection.length) !== selection ? chrome.i18n.getMessage("selectionstart_invalid_error") :
          parseInt(selection, base) >= Number.MAX_SAFE_INTEGER ? chrome.i18n.getMessage("selection_toolarge_error") :
          isNaN(parseInt(selection, base)) || selection.toUpperCase() !== ("0".repeat(selection.length - selectionParsed.length) + selectionParsed.toUpperCase()) ? chrome.i18n.getMessage("selection_base_error") : "",
          interval <= 0 ? chrome.i18n.getMessage("interval_invalid_error") :
          autoAction !== "" && (autoTimes < 1 || autoTimes > 1000) ? chrome.i18n.getMessage("auto_times_invalid_error") :
          autoAction !== "" && (autoSeconds < 2 || autoSeconds > 100) ? chrome.i18n.getMessage("auto_seconds_invalid_error") :
          ""
        ];
    // We can tell there was an error if some of the array slots weren't empty
    if (errors.some(function(error) { return error !== ""; })) {
      errors.unshift(chrome.i18n.getMessage("oops_error"));
      URLI.UI.generateAlert(errors);
    } else {
      chrome.runtime.getBackgroundPage(function(backgroundPage) {
        instance.enabled = true;
        instance.selection = selection;
        instance.selectionStart = selectionStart;
        instance.interval = interval;
        instance.base = base;
        instance.baseCase = baseCase;
        instance.leadingZeros = leadingZeros;
        instance.autoAction = autoAction;
        instance.autoTimes = autoTimes;
        instance.autoSeconds = autoSeconds;
        backgroundPage.URLI.Background.setInstance(instance.tabId, instance);
        // If permissions granted, send message to content script:
        if (items_.permissionsGranted && items_.keyEnabled && !items_.quickKeyEnabled) {
          chrome.tabs.sendMessage(instance.tabId, {greeting: "addKeyListener"});
        }
        if (items_.permissionsGranted && items_.mouseEnabled && !items_.quickMouseEnabled) {
          chrome.tabs.sendMessage(instance.tabId, {greeting: "addMouseListener"});
        }
        if (items_.permissionsGranted && instance.autoAction !== "") {
          chrome.tabs.sendMessage(instance.tabId, {greeting: "setAutoTimeout", instance: instance});
        }
        toggleView.call(DOM["#accept-button"]);
      });
    }
  }

  /**
   * Handle URL selection on mouseup and keyup events. Saves the selectionStart
   * to a hidden input and updates the selection input to the selected text and
   * checks the leading zeros checkbox based on leading zeros present.
   * 
   * @private
   */
  function selectURL() {
    DOM["#selection-input"].value = window.getSelection().toString();
    DOM["#selection-start-input"].value = DOM["#url-textarea"].selectionStart;
    DOM["#leading-zeros-input"].checked = DOM["#selection-input"].value.charAt(0) === '0' && DOM["#selection-input"].value.length > 1;
  }

  // Return Public Functions
  return {
    DOMContentLoaded: DOMContentLoaded
  };
}();

document.addEventListener("DOMContentLoaded", URLI.Popup.DOMContentLoaded);