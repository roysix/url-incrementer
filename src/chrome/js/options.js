/**
 * URL Incrementer Options
 * 
 * @author Roy Six
 * @namespace
 */

var URLI = URLI || {};

URLI.Options = function () {

  const DOM = {}, // Map to cache DOM elements: key=id, value=element
        FLAG_KEY_NONE  = 0x0, // 0000
        FLAG_KEY_ALT   = 0x1, // 0001
        FLAG_KEY_CTRL  = 0x2, // 0010
        FLAG_KEY_SHIFT = 0x4, // 0100
        FLAG_KEY_META  = 0x8, // 1000
        KEY_MODIFIER_CODE_ARRAY = [ // An array of the KeyboardEvent.code modifiers
          "Alt", "AltLeft", "AltRight",
          "Control", "ControlLeft", "ControlRight",
          "Shift", "ShiftLeft", "ShiftRight",
          "Meta", "MetaLeft", "MetaRight"
        ],
        NUMBERS = ["oN3", "tW0", "thR33", "f0uR", "f1V3", "s1X", "s3VeN", "e1GhT", "n1N3", "t3N"],
        FACES = ["≧☉_☉≦", "(⌐■_■)♪", "(ᵔᴥᵔ)", "◉_◉", "(+__X)"];

  let key = {}, // Reusable key to store the key's event modifiers and code on keydown for keyup
      timeouts = {}; // Reusable global timeouts for input changes to fire after the user stops typing

  /**
   * Loads the DOM content needed to display the options page.
   * 
   * DOMContentLoaded will fire when the DOM is loaded. Unlike the conventional
   * "load", it does not wait for images and media.
   * 
   * @public
   */
  function DOMContentLoaded() {
    const ids = document.querySelectorAll("[id]"),
          i18ns = document.querySelectorAll("[data-i18n]");
    // Cache DOM elements
    for (let element of ids) {
      DOM["#" + element.id] = element;
    }
    // Set i18n (internationalization) text from messages.json
    for (let element of i18ns) {
      element[element.dataset.i18n] = chrome.i18n.getMessage(element.id.replace(/-/g, '_').replace(/\*.*/, ''));
    }
    // Add Event Listeners to the DOM elements
    DOM["#internal-shortcuts-enable-button"].addEventListener("click", function() { URLI.Permissions.requestPermissions("internalShortcuts", function(granted) { if (granted) { populateValuesFromStorage("internalShortcuts"); chrome.runtime.sendMessage({"greeting": "addContentScriptListener"}); } }) });
    DOM["#browser-shortcuts-enable-button"].addEventListener("click", function() { URLI.Permissions.removePermissions("internalShortcuts", function(removed) { if (removed) { populateValuesFromStorage("internalShortcuts"); chrome.runtime.sendMessage({"greeting": "removeContentScriptListener"}); } }) });
    DOM["#browser-shortcuts-quick-enable-input"].addEventListener("change", function () { chrome.storage.sync.set({"quickEnabled": this.checked}); });
    DOM["#browser-shortcuts-button"].addEventListener("click", function() { chrome.tabs.update({url: "chrome://extensions/shortcuts"}); });
    DOM["#mixed-shortcuts-mode-input"].addEventListener("change", function () { chrome.storage.sync.set({"shortcutsMixedMode": this.checked}); });
    DOM["#key-quick-enable-input"].addEventListener("change", function () { chrome.storage.sync.set({"keyQuickEnabled": this.checked}); });
    DOM["#mouse-quick-enable-input"].addEventListener("change", function () { chrome.storage.sync.set({"mouseQuickEnabled": this.checked}); });
    DOM["#mouse-click-speed-input"].addEventListener("change", function () { chrome.storage.sync.set({"mouseClickSpeed": +this.value >= 100 && +this.value <= 1000 ? +this.value : 400}); });
    DOM["#key-increment-input"].addEventListener("keydown", function (event) { setKey(event); writeInput(this, key); });
    DOM["#key-decrement-input"].addEventListener("keydown", function (event) { setKey(event); writeInput(this, key); });
    DOM["#key-next-input"].addEventListener("keydown", function (event) { setKey(event); writeInput(this, key); });
    DOM["#key-prev-input"].addEventListener("keydown", function (event) { setKey(event); writeInput(this, key); });
    DOM["#key-clear-input"].addEventListener("keydown", function (event) { setKey(event); writeInput(this, key); });
    DOM["#key-return-input"].addEventListener("keydown", function (event) { setKey(event); writeInput(this, key); });
    DOM["#key-auto-input"].addEventListener("keydown", function (event) { setKey(event); writeInput(this, key); });
    DOM["#key-increment-input"].addEventListener("keyup", function () { chrome.storage.sync.set({"keyIncrement": key}, function() { setKeyEnabled(); }); });
    DOM["#key-decrement-input"].addEventListener("keyup", function () { chrome.storage.sync.set({"keyDecrement": key}, function() { setKeyEnabled(); }); });
    DOM["#key-next-input"].addEventListener("keyup", function () { chrome.storage.sync.set({"keyNext": key}, function() { setKeyEnabled(); }); });
    DOM["#key-prev-input"].addEventListener("keyup", function () { chrome.storage.sync.set({"keyPrev": key}, function() { setKeyEnabled(); }); });
    DOM["#key-clear-input"].addEventListener("keyup", function () { chrome.storage.sync.set({"keyClear": key}, function() { setKeyEnabled(); }); });
    DOM["#key-return-input"].addEventListener("keyup", function () { chrome.storage.sync.set({"keyReturn": key}, function() { setKeyEnabled(); }); });
    DOM["#key-auto-input"].addEventListener("keyup", function () { chrome.storage.sync.set({"keyAuto": key}, function() { setKeyEnabled(); }); });
    DOM["#key-increment-clear-input"].addEventListener("click", function () { chrome.storage.sync.set({"keyIncrement": null}, function() { setKeyEnabled(); }); writeInput(DOM["#key-increment-input"], null); });
    DOM["#key-decrement-clear-input"].addEventListener("click", function () { chrome.storage.sync.set({"keyDecrement": null}, function() { setKeyEnabled(); }); writeInput(DOM["#key-decrement-input"], null); });
    DOM["#key-next-clear-input"].addEventListener("click", function () { chrome.storage.sync.set({"keyNext": null}, function() { setKeyEnabled(); }); writeInput(DOM["#key-next-input"], null); });
    DOM["#key-prev-clear-input"].addEventListener("click", function () { chrome.storage.sync.set({"keyPrev": null}, function() { setKeyEnabled(); }); writeInput(DOM["#key-prev-input"], null); });
    DOM["#key-clear-clear-input"].addEventListener("click", function () { chrome.storage.sync.set({"keyClear": null}, function() { setKeyEnabled(); }); writeInput(DOM["#key-clear-input"], null); });
    DOM["#key-return-clear-input"].addEventListener("click", function () { chrome.storage.sync.set({"keyReturn": null}, function() { setKeyEnabled(); }); writeInput(DOM["#key-return-input"], null); });
    DOM["#key-auto-clear-input"].addEventListener("click", function () { chrome.storage.sync.set({"keyAuto": null}, function() { setKeyEnabled(); }); writeInput(DOM["#key-auto-input"], null); });
    DOM["#mouse-increment-select"].addEventListener("change", function() { setMouse(this, undefined, "mouseIncrement", true); });
    DOM["#mouse-decrement-select"].addEventListener("change", function() { setMouse(this, undefined, "mouseDecrement", true); });
    DOM["#mouse-next-select"].addEventListener("change", function() { setMouse(this, undefined, "mouseNext", true); });
    DOM["#mouse-prev-select"].addEventListener("change", function() { setMouse(this, undefined, "mousePrev", true); });
    DOM["#mouse-clear-select"].addEventListener("change", function() { setMouse(this, undefined, "mouseClear", true); });
    DOM["#mouse-return-select"].addEventListener("change", function() { setMouse(this, undefined, "mouseReturn", true); });
    DOM["#mouse-auto-select"].addEventListener("change", function() { setMouse(this, undefined, "mouseAuto", true); });
    DOM["#mouse-increment-clicks-input"].addEventListener("change", function() { setMouse(undefined, this, "mouseIncrement", false); });
    DOM["#mouse-decrement-clicks-input"].addEventListener("change", function() { setMouse(undefined, this, "mouseDecrement", false); });
    DOM["#mouse-next-clicks-input"].addEventListener("change", function() { setMouse(undefined, this, "mouseNext", false); });
    DOM["#mouse-prev-clicks-input"].addEventListener("change", function() { setMouse(undefined, this, "mousePrev", false); });
    DOM["#mouse-clear-clicks-input"].addEventListener("change", function() { setMouse(undefined, this, "mouseClear", false); });
    DOM["#mouse-return-clicks-input"].addEventListener("change", function() { setMouse(undefined, this, "mouseReturn", false); });
    DOM["#mouse-auto-clicks-input"].addEventListener("change", function() { setMouse(undefined, this, "mouseAuto", false); });
    DOM["#icon-color-radio-dark"].addEventListener("change", changeIconColor);
    DOM["#icon-color-radio-light"].addEventListener("change", changeIconColor);
    DOM["#icon-color-radio-rainbow"].addEventListener("change", changeIconColor);
    DOM["#icon-color-radio-urli"].addEventListener("change", changeIconColor);
    DOM["#icon-feedback-enable-input"].addEventListener("change", function () { chrome.storage.sync.set({"iconFeedbackEnabled": this.checked}); });
    DOM["#popup-button-size-input"].addEventListener("change", function () { if (+this.value >= 16 && +this.value <= 64) { chrome.storage.sync.set({"popupButtonSize": +this.value});
      DOM["#popup-button-size-img"].style = "width:" + (+this.value) + "px; height:" + (+this.value) + "px;"; } });
    DOM["#popup-button-size-img"].addEventListener("click", function () { if (DOM["#popup-animations-enable-input"].checked) { URLI.UI.clickHoverCss(this, "hvr-push-click"); } });
    DOM["#popup-animations-enable-input"].addEventListener("change", function () { chrome.storage.sync.set({"popupAnimationsEnabled": this.checked});
      DOM["#popup-button-size-img"].className = this.checked ? "hvr-grow" : "" });
    //DOM["#popup-settings-can-overwrite-input"].addEventListener("change", function () { chrome.storage.sync.set({"popupSettingsCanOverwrite": this.checked}); });
    //DOM["#popup-open-setup-input"].addEventListener("change", function () { chrome.storage.sync.set({"popupOpenSetup": this.checked}); });
    DOM["#saved-urls-preselect-input"].addEventListener("change", function () { chrome.storage.local.set({"savePreselect": this.checked}); });
    DOM["#saved-urls-delete-button"].addEventListener("click", function() { deleteSavedURL(); });
    DOM["#saved-urls-add-button"].addEventListener("click", function() { DOM["#saved-urls-partial"].className = "display-block fade-in"; DOM["#saved-urls-partial-url-textarea"].value = DOM["#saved-urls-partial-errors"].textContent = ""; });
    DOM["#saved-urls-partial-cancel-button"].addEventListener("click", function() { DOM["#saved-urls-partial"].className = "display-none"; });
    DOM["#saved-urls-partial-save-button"].addEventListener("click", function() { addSavedURLPartial(); });
    DOM["#selection-select"].addEventListener("change", function() { DOM["#selection-custom"].className = this.value === "custom" ? "display-block fade-in" : "display-none"; chrome.storage.sync.set({"selectionPriority": this.value}); });
    DOM["#selection-custom-save-button"].addEventListener("click", function () { customSelection("save"); });
    DOM["#selection-custom-test-button"].addEventListener("click", function() { customSelection("test"); });
    DOM["#interval-input"].addEventListener("change", function () { chrome.storage.sync.set({"interval": +this.value > 0 ? +this.value : 1}); });
    DOM["#leading-zeros-pad-by-detection-input"].addEventListener("change", function() { chrome.storage.sync.set({ "leadingZerosPadByDetection": this.checked}); });
    DOM["#base-select"].addEventListener("change", function() {
      DOM["#base-case"].className = +this.value > 10 ? "display-block fade-in" : "display-none";
      DOM["#base-date"].className = this.value === "date" ? "display-block fade-in" : "display-none";
      DOM["#base-custom"].className = this.value === "custom" ? "display-block fade-in" : "display-none";
      chrome.storage.sync.set({"base": +this.value > 10 ? +this.value : this.value});
    });
    DOM["#base-case-lowercase-input"].addEventListener("change", function() { chrome.storage.sync.set({"baseCase": this.value}); });
    DOM["#base-case-uppercase-input"].addEventListener("change", function() { chrome.storage.sync.set({"baseCase": this.value}); });
    DOM["#base-date-format-input"].addEventListener("input", function() { updateTextInputDynamically(this.id, "baseDateFormat", "value"); });
    DOM["#base-custom-input"].addEventListener("input", function() { updateTextInputDynamically(this.id, "baseCustom", "value"); });
    DOM["#shuffle-limit-input"].addEventListener("change", function () { chrome.storage.sync.set({"shuffleLimit": +this.value > 0 ? +this.value : 1}); });
    DOM["#error-skip-input"].addEventListener("change", function() { if (+this.value >= 0 && +this.value <= 100) { chrome.storage.sync.set({"errorSkip": +this.value }); } });
    DOM["#error-codes-404-input"].addEventListener("change", updateErrorCodes);
    DOM["#error-codes-3XX-input"].addEventListener("change", updateErrorCodes);
    DOM["#error-codes-4XX-input"].addEventListener("change", updateErrorCodes);
    DOM["#error-codes-5XX-input"].addEventListener("change", updateErrorCodes);
    DOM["#error-codes-custom-enabled-input"].addEventListener("change", function() { chrome.storage.sync.set({"errorCodesCustomEnabled": this.checked}); DOM["#error-codes-custom"].className = this.checked ? "display-block fade-in" : "display-none"; });
    DOM["#error-codes-custom-input"].addEventListener("input", function() { updateTextInputDynamically(this.id, "errorCodesCustom", "array-split-all"); });
    DOM["#next-prev-keywords-next-textarea"].addEventListener("input", function() { updateTextInputDynamically(this.id, "nextPrevKeywordsNext", "array-split-nospace"); });
    DOM["#next-prev-keywords-prev-textarea"].addEventListener("input", function() { updateTextInputDynamically(this.id, "nextPrevKeywordsPrev", "array-split-nospace"); });
    DOM["#next-prev-links-priority-select"].addEventListener("change", function () { chrome.storage.sync.set({"nextPrevLinksPriority": this.value}); });
    DOM["#next-prev-same-domain-policy-enable-input"].addEventListener("change", function() { chrome.storage.sync.set({"nextPrevSameDomainPolicy": this.checked}); });
    DOM["#next-prev-popup-buttons-input"].addEventListener("change", function() { chrome.storage.sync.set({"nextPrevPopupButtons": this.checked}); });
    DOM["#download-enable-button"].addEventListener("click", function() { URLI.Permissions.requestPermissions("download", function(granted) { if (granted) { populateValuesFromStorage("download"); } }) });
    DOM["#download-disable-button"].addEventListener("click", function() { URLI.Permissions.removePermissions("download", function(removed) { if (removed) { populateValuesFromStorage("download"); } }) });
    DOM["#enhanced-mode-enable-button"].addEventListener("click", function() { URLI.Permissions.requestPermissions("enhancedMode", function(granted) { if (granted) { populateValuesFromStorage("enhancedMode"); } }) });
    DOM["#enhanced-mode-disable-button"].addEventListener("click", function() { URLI.Permissions.removePermissions("enhancedMode", function(removed) { if (removed) { populateValuesFromStorage("enhancedMode"); } }) });
    DOM["#urli-input"].addEventListener("click", clickURLI);
    DOM["#reset-options-button"].addEventListener("click", resetOptions);
    DOM["#manifest-name"].textContent = chrome.runtime.getManifest().name;
    DOM["#manifest-version"].textContent = chrome.runtime.getManifest().version;
    // Populate all values from storage
    populateValuesFromStorage("all");
  }

  /**
   * Populates the options form values from the extension storage.
   *
   * @param values which values to populate, e.g. "all" for all or "xyz" for only xyz values (with fade-in effect)
   * @private
   */
  function populateValuesFromStorage(values) {
    chrome.storage.sync.get(null, function(items) {
      chrome.storage.local.get(null, function(localItems) {
        if (values === "all" || values === "internalShortcuts") {
          DOM["#browser-shortcuts"].className = !items.permissionsInternalShortcuts ? values === "internalShortcuts" ? "display-block fade-in" : "display-block" : "display-none";
          DOM["#internal-shortcuts"].className = items.permissionsInternalShortcuts ? values === "internalShortcuts" ? "display-block fade-in" : "display-block" : "display-none";
        }
        if (values === "all" || values === "download") {
          DOM["#download-disable-button"].className = items.permissionsDownload ? values === "download" ? "display-block fade-in" : "display-block" : "display-none";
          DOM["#download-enable-button"].className = !items.permissionsDownload ? values === "download" ? "display-block fade-in" : "display-block" : "display-none";
          DOM["#download-settings-enable"].className = items.permissionsDownload ? values === "download" ? "display-block fade-in" : "display-block" : "display-none";
          DOM["#download-settings-disable"].className = !items.permissionsDownload ? values === "download" ? "display-block fade-in" : "display-block" : "display-none";
        }
        if (values === "all" || values === "enhancedMode") {
          DOM["#enhanced-mode-disable-button"].className = items.permissionsEnhancedMode ? values === "enhancedMode" ? "display-block fade-in" : "display-block" : "display-none";
          DOM["#enhanced-mode-enable-button"].className = !items.permissionsEnhancedMode ? values === "enhancedMode" ? "display-block fade-in" : "display-block" : "display-none";
          DOM["#enhanced-mode-enable"].className = items.permissionsEnhancedMode ? values === "enhancedMode" ? "display-block fade-in" : "display-block" : "display-none";
          DOM["#enhanced-mode-disable"].className = !items.permissionsEnhancedMode ? values === "enhancedMode" ? "display-block fade-in" : "display-block" : "display-none";
        }
        if (values === "all" || values === "savedURLs") {
          DOM["#saved-urls-delete-button"].className = localItems.saves && localItems.saves.length > 0 ? "fade-in" : "display-none";
          buildSavedURLsSelect(localItems.saves);
        }
        if (values === "all") {
          DOM["#browser-shortcuts-quick-enable-input"].checked = items.quickEnabled;
          DOM["#mixed-shortcuts-mode-input"].checked = items.shortcutsMixedMode;
          DOM["#key-quick-enable-input"].checked = items.keyQuickEnabled;
          DOM["#mouse-quick-enable-input"].checked = items.mouseQuickEnabled;
          DOM["#key-enable-img"].className = items.keyEnabled ? "display-inline" : "display-none";
          DOM["#mouse-enable-img"].className = items.mouseEnabled ? "display-inline" : "display-none";
          DOM["#mouse-click-speed-input"].value = items.mouseClickSpeed;
          writeInput(DOM["#key-increment-input"], items.keyIncrement);
          writeInput(DOM["#key-decrement-input"], items.keyDecrement);
          writeInput(DOM["#key-next-input"], items.keyNext);
          writeInput(DOM["#key-prev-input"], items.keyPrev);
          writeInput(DOM["#key-clear-input"], items.keyClear);
          writeInput(DOM["#key-return-input"], items.keyReturn);
          writeInput(DOM["#key-auto-input"], items.keyAuto);
          DOM["#mouse-increment-select"].value = items.mouseIncrement ? items.mouseIncrement.button : -1;
          DOM["#mouse-decrement-select"].value = items.mouseDecrement ? items.mouseDecrement.button : -1;
          DOM["#mouse-next-select"].value = items.mouseNext ? items.mouseNext.button : -1;
          DOM["#mouse-prev-select"].value = items.mousePrev ? items.mousePrev.button : -1;
          DOM["#mouse-clear-select"].value = items.mouseClear ? items.mouseClear.button : -1;
          DOM["#mouse-return-select"].value = items.mouseReturn ? items.mouseReturn.button : -1;
          DOM["#mouse-auto-select"].value = items.mouseAuto ? items.mouseAuto.button : -1;
          DOM["#mouse-increment-clicks-input"].value = items.mouseIncrement ? items.mouseIncrement.clicks : 1;
          DOM["#mouse-decrement-clicks-input"].value = items.mouseDecrement ? items.mouseDecrement.clicks : 1;
          DOM["#mouse-next-clicks-input"].value = items.mouseNext ? items.mouseNext.clicks : 1;
          DOM["#mouse-prev-clicks-input"].value = items.mousePrev ? items.mousePrev.clicks : 1;
          DOM["#mouse-clear-clicks-input"].value = items.mouseClear ? items.mouseClear.clicks : 1;
          DOM["#mouse-return-clicks-input"].value = items.mouseReturn ? items.mouseReturn.clicks : 1;
          DOM["#mouse-auto-clicks-input"].value = items.mouseAuto ? items.mouseAuto.clicks : 1;
          DOM["#icon-color-radio-" + items.iconColor].checked = true;
          DOM["#icon-feedback-enable-input"].checked = items.iconFeedbackEnabled;
          DOM["#popup-button-size-input"].value = items.popupButtonSize;
          DOM["#popup-button-size-img"].style = "width:" + items.popupButtonSize + "px; height:" + items.popupButtonSize + "px;";
          DOM["#popup-button-size-img"].className = items.popupAnimationsEnabled ? "hvr-grow" : "";
          DOM["#popup-animations-enable-input"].checked = items.popupAnimationsEnabled;
          //DOM["#popup-open-setup-input"].checked = items.popupOpenSetup;
          //DOM["#popup-settings-can-overwrite-input"].checked = items.popupSettingsCanOverwrite;
          DOM["#saved-urls-preselect-input"].checked = localItems.savePreselect;
          DOM["#selection-select"].value = items.selectionPriority;
          DOM["#selection-custom"].className = items.selectionPriority === "custom" ? "display-block" : "display-none";
          DOM["#selection-custom-url-textarea"].value = items.selectionCustom.url;
          DOM["#selection-custom-pattern-input"].value = items.selectionCustom.pattern;
          DOM["#selection-custom-flags-input"].value = items.selectionCustom.flags;
          DOM["#selection-custom-group-input"].value = items.selectionCustom.group;
          DOM["#selection-custom-index-input"].value = items.selectionCustom.index;
          DOM["#interval-input"].value = items.interval;
          DOM["#leading-zeros-pad-by-detection-input"].checked = items.leadingZerosPadByDetection;
          DOM["#base-select"].value = items.base;
          DOM["#base-case"].className = items.base > 10 ? "display-block" : "display-none";
          DOM["#base-case-lowercase-input"].checked = items.baseCase === "lowercase";
          DOM["#base-case-uppercase-input"].checked = items.baseCase === "uppercase";
          DOM["#base-date"].className = items.base === "date" ? "display-block" : "display-none";
          DOM["#base-date-format-input"].value = items.baseDateFormat;
          DOM["#base-custom"].className = items.base === "custom" ? "display-block" : "display-none";
          DOM["#base-custom-input"].value = items.baseCustom;
          DOM["#shuffle-limit-input"].value = items.shuffleLimit;
          DOM["#error-skip-input"].value = items.errorSkip;
          DOM["#error-codes-404-input"].checked = items.errorCodes.includes("404");
          DOM["#error-codes-3XX-input"].checked = items.errorCodes.includes("3XX");
          DOM["#error-codes-4XX-input"].checked = items.errorCodes.includes("4XX");
          DOM["#error-codes-5XX-input"].checked = items.errorCodes.includes("5XX");
          DOM["#error-codes-custom-enabled-input"].checked = items.errorCodesCustomEnabled;
          DOM["#error-codes-custom"].className = items.errorCodesCustomEnabled ? "display-block" : "display-none";
          DOM["#error-codes-custom-input"].value = items.errorCodesCustom;
          DOM["#next-prev-keywords-next-textarea"].value = items.nextPrevKeywordsNext;
          DOM["#next-prev-keywords-prev-textarea"].value = items.nextPrevKeywordsPrev;
          DOM["#next-prev-links-priority-select"].value = items.nextPrevLinksPriority;
          DOM["#next-prev-same-domain-policy-enable-input"].checked = items.nextPrevSameDomainPolicy;
          DOM["#next-prev-popup-buttons-input"].checked = items.nextPrevPopupButtons;
        }
      });
    });
  }

  /**
   * Changes the extension icon color in the browser's toolbar (browserAction).
   *
   * @private
   */
  function changeIconColor() {
    // Firefox Android: chrome.browserAction.setIcon() not supported
    if (!chrome.browserAction.setIcon) {
      return;
    }
    // Possible values may be: dark, light, rainbow, or urli
    chrome.browserAction.setIcon({
      path : {
        "16": "/img/icons/" + this.value + "/16.png",
        "24": "/img/icons/" + this.value + "/24.png",
        "32": "/img/icons/" + this.value + "/32.png"
      }
    });
    chrome.storage.sync.set({"iconColor": this.value});
  }

  /**
   * Sets the enabled state of key shortcuts.
   * 
   * @private
   */
  function setKeyEnabled() {
    chrome.storage.sync.get(null, function(items) {
      const enabled = items.keyIncrement || items.keyDecrement || items.keyNext || items.keyPrev || items.keyClear || items.keyReturn || items.keyAuto;
      chrome.storage.sync.set({"keyEnabled": enabled}, function() {
        DOM["#key-enable-img"].className = enabled ? "display-inline" : "display-none";
      });
    });
  }

  /**
   * Sets the enabled state of mouse button shortcuts.
   * 
   * @private
   */
  function setMouseEnabled() {
    chrome.storage.sync.get(null, function(items) {
      const enabled =  items.mouseIncrement || items.mouseDecrement || items.mouseNext || items.mousePrev || items.mouseClear || items.mouseReturn || items.mouseAuto;
      chrome.storage.sync.set({"mouseEnabled": enabled}, function() {
        DOM["#mouse-enable-img"].className = enabled ? "display-inline" : "display-none";
      });
    });
  }

  /**
   * Sets the key that was pressed on a keydown event. This is needed afterwards
   * to write the key to the input value and save the key to storage on keyup.
   * 
   * @param event the key event fired
   * @private
   */
  function setKey(event) {
    event.preventDefault();
    // Set key modifiers as the event modifiers OR'd together and the key code as the KeyboardEvent.code
    key = { "modifiers":
      (event.altKey ? FLAG_KEY_ALT : FLAG_KEY_NONE) | // 0001
      (event.ctrlKey ? FLAG_KEY_CTRL : FLAG_KEY_NONE) | // 0010
      (event.shiftKey ? FLAG_KEY_SHIFT : FLAG_KEY_NONE) | // 0100
      (event.metaKey ? FLAG_KEY_META : FLAG_KEY_NONE),  // 1000
      "code": event.code
    };
  }

  function setMouse(buttonInput, clicksInput, storageKey, updateMouseEnabled) {
    buttonInput = buttonInput ? buttonInput : DOM["#" + clicksInput.id.replace("clicks-input", "select")];
    clicksInput = clicksInput ? clicksInput : DOM["#" + buttonInput.id.replace("select", "clicks-input")];
    const mouse = +buttonInput.value < 0 ? null : { "button": +buttonInput.value, "clicks": +clicksInput.value};
    clicksInput.value = mouse ? clicksInput.value : 1;
    chrome.storage.sync.set({ [storageKey]: mouse}, function() { if (updateMouseEnabled) { setMouseEnabled(); }});
  }

  /**
   * Writes the key(s) that were pressed to the text input.
   * 
   * @param input the input to write to
   * @param key the key object to write
   * @private
   */
  function writeInput(input, key) {
    // Write the input value based on the key event modifier bits and key code
    // Note1: KeyboardEvent.code will output the text-representation of the key code, e.g.  the key "A" would output "KeyA"
    // Note2: If the key code is in the KEY_MODIFIER_CODE_ARRAY (e.g. Alt, Ctrl), it is not written a second time
    let text = "";
    if (!key) { text = chrome.i18n.getMessage("key_notset_option"); }
    else {
      if ((key.modifiers & FLAG_KEY_ALT))        { text += "Alt + ";   }
      if ((key.modifiers & FLAG_KEY_CTRL)  >> 1) { text += "Ctrl + ";  }
      if ((key.modifiers & FLAG_KEY_SHIFT) >> 2) { text += "Shift + "; }
      if ((key.modifiers & FLAG_KEY_META)  >> 3) { text += "Meta + ";  }
      if (key.code && !KEY_MODIFIER_CODE_ARRAY.includes(key.code)) { text += key.code; }
    }
    input.value = text;
  }

  /**
   * Builds out the saved URLs select HTML.
   *
   * @param saves the saved URLs to build from
   * @private
   */
  function buildSavedURLsSelect(saves) {
    if (saves && saves.length > 0) {
      const select = document.createElement("select");
      let count = 1;
      select.id = "saved-urls-select";
      select.className = "display-block fade-in";
      for (let save of saves) {
        const option = document.createElement("option");
        option.dataset.hash = save.hash;
        option.textContent = (count++) + " -" +
          " hash: " + save.hash.substring(0, 10) + "..." +
          " [" + save.type + "]" +
          " sel:" + (save.type === "exact" ? save.selectionStart : save.selectionPriority) +
          " int: " + (save.interval < 100000 ? save.interval : save.interval.toString().substring(0, 5) + "...") +
          " base: " + save.base;
        select.appendChild(option);
      }
      DOM["#saved-urls-select-div"].replaceChild(select, DOM["#saved-urls-select-div"].firstChild);
    } else {
      DOM["#saved-urls-select-div"].replaceChild(document.createElement("div"), DOM["#saved-urls-select-div"].firstChild);
    }
    DOM["#saved-urls-quantity"].textContent = " (" + (saves ? saves.length: 0) + "):";
  }

  function deleteSavedURL() {
    const select = document.getElementById("saved-urls-select"), // Dynamically Generated Select, so can't use DOM Cache
          option = select.options[select.selectedIndex],
          hash = option.dataset.hash;
    chrome.storage.local.get(null, function(localItems) {
      const saves = localItems.saves;
      if (saves && saves.length > 0) {
        for (let i = 0; i < saves.length; i++) {
          if (saves[i].hash === hash) {
            console.log("URLI.Options.deleteSave() - deleting Saved URL with type=" + saves[i].type + ", hash=" + saves[i].hash);
            saves.splice(i, 1);
            chrome.storage.local.set({saves: saves}, function() {
              populateValuesFromStorage("savedURLs");
            });
            break;
          }
        }
      }
    });
  }

  async function addSavedURLPartial() {
    const url = DOM["#saved-urls-partial-url-textarea"].value;
    if (!url || url.length < 0) {
      DOM["#saved-urls-partial-errors"].textContent = chrome.i18n.getMessage("saved_urls_partial_url_error");
    } else {
      const backgroundPage = await EXT.Promisify.getBackgroundPage();
      // Part 1: Check if this URL has already been saved, if it has remove the existing save
      const saves = await backgroundPage.URLI.SaveURLs.deleteURL(url, "addPartialURL");
      // Part 2: Put this URL into the saves array and save it to local storage
      const salt = backgroundPage.URLI.Cryptography.generateSalt(),
            hash = await backgroundPage.URLI.Cryptography.calculateHash(url, salt),
            items = await EXT.Promisify.getItems();
      if (items.selectionCustom && items.selectionCustom.url) {
        items.selectionCustom.url = "";
      }
      // Put this new entry at the end of the array (push) because it's a partial save
      saves.push({
        "type": "partial", "hash": hash, "salt": salt, "urllength": url.length,
        "selectionPriority": items.selectionPriority, "selectionCustom": items.selectionCustom, "interval": items.interval, "leadingZerosPadByDetection": items.leadingZerosPadByDetection,
        "base": items.base, "baseCase": items.baseCase , "baseDateFormat": items.baseDateFormat, "baseCustom": items.baseCustom, "errorSkip": items.errorSkip
      });
      chrome.storage.local.set({"saves": saves}, function() {
        populateValuesFromStorage("savedURLs");
        DOM["#saved-urls-partial"].className = "display-none";
      });
    }
  }

  /**
   * Updates the error codes for error skip by examining if each checkbox is checked (on change event).
   *
   * @private
   */
  function updateErrorCodes() {
    chrome.storage.sync.set({"errorCodes":
      [DOM["#error-codes-404-input"].checked ? DOM["#error-codes-404-input"].value : "",
       DOM["#error-codes-3XX-input"].checked ? DOM["#error-codes-3XX-input"].value : "",
       DOM["#error-codes-4XX-input"].checked ? DOM["#error-codes-4XX-input"].value : "",
       DOM["#error-codes-5XX-input"].checked ? DOM["#error-codes-5XX-input"].value : ""]
    });
  }

  /**
   * This function is called as the user is typing in a text input or textarea that is updated dynamically.
   * We don't want to call chrome.storage after each key press, as it's an expensive procedure, so we set a timeout delay.
   *
   * @private
   */
  function updateTextInputDynamically(domId, storageKey, storageValueType) {
    console.log("URLI.Options.updateTextInputDynamically() - about to clearTimeout and setTimeout... domId=" + domId + ", storageKey=" + storageKey);
    clearTimeout(timeouts[domId]);
    timeouts[domId] = setTimeout(function() {
      chrome.storage.sync.set({ [storageKey]:
          storageValueType === "value" ? DOM["#" + domId].value :
          storageValueType.startsWith("array") ? DOM["#" + domId].value ? DOM["#" + domId].value.split(storageValueType === "array-split-all" ? /[, \n]+/ : /[,\n]/).filter(Boolean) : [] : undefined
      });
    }, 1000);
  }

  /**
   * Validates the custom selection regular expression fields and then performs the desired action.
   * 
   * @param action the action to perform (test or save)
   * @private
   */
  async function customSelection(action) {
    const url = DOM["#selection-custom-url-textarea"].value,
          pattern = DOM["#selection-custom-pattern-input"].value,
          flags = DOM["#selection-custom-flags-input"].value,
          group = +DOM["#selection-custom-group-input"].value,
          index = +DOM["#selection-custom-index-input"].value;
    let regexp,
        matches,
        selection,
        selectionStart;
    try {
      regexp = new RegExp(pattern, flags);
      matches = regexp.exec(url);
      if (!pattern || !matches) {
        throw chrome.i18n.getMessage("selection_custom_match_error");
      }
      if (group < 0) {
        throw chrome.i18n.getMessage("selection_custom_group_error");
      }
      if (index < 0) {
        throw chrome.i18n.getMessage("selection_custom_index_error");
      }
      if (!matches[group]) {
        throw chrome.i18n.getMessage("selection_custom_matchgroup_error");
      }
      selection = matches[group].substring(index);
      if (!selection || selection === "") {
        throw chrome.i18n.getMessage("selection_custom_matchindex_error");
      }
      selectionStart = matches.index + index;
      if (selectionStart > url.length || selectionStart + selection.length > url.length) {
        throw chrome.i18n.getMessage("selection_custom_matchindex_error");
      }
      // TODO:
      const backgroundPage = await EXT.Promisify.getBackgroundPage(),
        base = isNaN(DOM["#base-select"].value) ? DOM["#base-select"].value : +DOM["#base-select"].value,
        baseCase = DOM["#base-case-uppercase-input"].checked ? DOM["#base-case-uppercase-input"].value : DOM["#base-case-lowercase-input"].checked,
        baseDateFormat = DOM["#base-date-format-input"].value,
        baseCustom = DOM["#base-custom-input"].value,
        leadingZeros = selection.startsWith("0") && selection.length > 1;
      if (backgroundPage.URLI.IncrementDecrement.validateSelection(selection, base, baseCase, baseDateFormat, baseCustom, leadingZeros)) {
        throw url.substring(selectionStart, selectionStart + selection.length) + " " + chrome.i18n.getMessage("selection_custom_matchnotvalid_error");
      }
      // if (!/^[a-z0-9]+$/i.test(url.substring(selectionStart, selectionStart + selection.length))) {
      //   throw url.substring(selectionStart, selectionStart + selection.length) + " " + chrome.i18n.getMessage("selection_custom_matchnotalphanumeric_error");
      // }

    } catch (e) {
      DOM["#selection-custom-message-span"].textContent = e;
      return;
    }
    if (action === "test") {
      DOM["#selection-custom-message-span"].textContent = chrome.i18n.getMessage("selection_custom_test_success");
      DOM["#selection-custom-url-textarea"].setSelectionRange(selectionStart, selectionStart + selection.length);
      DOM["#selection-custom-url-textarea"].focus();
    } else if (action === "save") {
      DOM["#selection-custom-message-span"].textContent = chrome.i18n.getMessage("selection_custom_save_success");
      chrome.storage.sync.set({"selectionCustom": { "url": url, "pattern": pattern, "flags": flags, "group": group, "index": index }});
    }
  }

  /**
   * Resets the options by clearing the storage and setting it with the default storage values, removing any extra
   * permissions, and finally re-populating the options input values from storage again.
   *
   * @private
   */
  function resetOptions() {
    chrome.runtime.getBackgroundPage(function(backgroundPage) {
      chrome.storage.sync.clear(function() {
        chrome.storage.sync.set(backgroundPage.URLI.Background.getSDV(), function() {
          chrome.storage.local.clear(function() {
            chrome.storage.local.set(backgroundPage.URLI.Background.getLSDV(), function() {
              console.log("URLI.Options.resetOptions() - removing all permissions...");
              URLI.Permissions.removeAllPermissions();
              changeIconColor.call(DOM["#icon-color-radio-dark"]);
              populateValuesFromStorage("all");
              chrome.runtime.sendMessage({"greeting": "removeContentScriptListener"});
              URLI.UI.generateAlert([chrome.i18n.getMessage("reset_options_message")]);
            });
          });
        });
      });
    });
  }

  /**
   * Function that is called when our favorite URL Incrementer is clicked!
   *
   * @private
   */
  function clickURLI() {
    const face = " " + FACES[Math.floor(Math.random() * FACES.length)],
          value = +this.dataset.value + 1;
    this.dataset.value = value + "";
    URLI.UI.clickHoverCss(this, "hvr-buzz-out-click");
    URLI.UI.generateAlert([value <= 10 ? NUMBERS[value - 1] + " ..." : chrome.i18n.getMessage("urli_click_malfunctioning") + face]);
  }

  // Return Public Functions
  return {
    DOMContentLoaded: DOMContentLoaded
  };
}();

document.addEventListener("DOMContentLoaded", URLI.Options.DOMContentLoaded);