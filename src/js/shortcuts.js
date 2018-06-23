/**
 * URL Incrementer Shortcuts
 * 
 * @author Roy Six
 * @namespace
 */

var URLI = URLI || {};

URLI.Shortcuts = function () {

  const FLAG_KEY_NONE = 0x0, // 0000
        FLAG_KEY_ALT = 0x1, // 0001
        FLAG_KEY_CTRL = 0x2, // 0010
        FLAG_KEY_SHIFT = 0x4, // 0100
        FLAG_KEY_META = 0x8, // 1000
        FLAG_MOUSE_LEFT = 0x0, // 00
        FLAG_MOUSE_MIDDLE = 0x1, // 01
        FLAG_MOUSE_RIGHT = 0x2, // 10
        KEY_MODIFIER_CODE_ARRAY = [ // An array of the KeyboardEvent.code modifiers (used in the case of an assigned shortcut only being a key modifier, e.g. just the Shift key for Increment)
          "Alt", "AltLeft", "AltRight",
          "Control", "ControlLeft", "ControlRight",
          "Shift", "ShiftLeft", "ShiftRight",
          "Meta", "MetaLeft", "MetaRight"
        ];

  let items_ = {}; // storage items cache

  /**
   * Sets the items storage cache.
   * 
   * @param items the storage items
   * @public
   */
  function setItems(items) {
    items_ = items;
  }

  /**
   * A key up event listener for keyboard shortcuts.
   * 
   * Listens for increment, decrement, next, prev, clear, and auto keyboard shortcuts.
   * 
   * @param event the key event
   * @public
   */
  function keyListener(event) {
    if      (keyPressed(event, items_.keyIncrement)) { chrome.runtime.sendMessage({greeting: "performAction", action: "increment"}); }
    else if (keyPressed(event, items_.keyDecrement)) { chrome.runtime.sendMessage({greeting: "performAction", action: "decrement"}); }
    else if (keyPressed(event, items_.keyNext))      { chrome.runtime.sendMessage({greeting: "performAction", action: "next"}); }
    else if (keyPressed(event, items_.keyPrev))      { chrome.runtime.sendMessage({greeting: "performAction", action: "prev"}); }
    else if (keyPressed(event, items_.keyClear))     { chrome.runtime.sendMessage({greeting: "performAction", action: "clear"}); }
    else if (keyPressed(event, items_.keyAuto))      { chrome.runtime.sendMessage({greeting: "performAction", action: "auto"}); }
  }

  /**
   * A mouse up event listener for mouse button shortcuts.
   * 
   * Listens for increment, decrement, next, prev, clear, and auto mouse button shortcuts.
   * 
   * @param event the mouse button event
   * @public
   */
  function mouseListener(event) {
    if      (mousePressed(event, items_.mouseIncrement)) { chrome.runtime.sendMessage({greeting: "performAction", action: "increment"}); }
    else if (mousePressed(event, items_.mouseDecrement)) { chrome.runtime.sendMessage({greeting: "performAction", action: "decrement"}); }
    else if (mousePressed(event, items_.mouseNext))      { chrome.runtime.sendMessage({greeting: "performAction", action: "next"}); }
    else if (mousePressed(event, items_.mousePrev))      { chrome.runtime.sendMessage({greeting: "performAction", action: "prev"}); }
    else if (mousePressed(event, items_.mouseClear))     { chrome.runtime.sendMessage({greeting: "performAction", action: "clear"}); }
    else if (mousePressed(event, items_.mouseAuto))      { chrome.runtime.sendMessage({greeting: "performAction", action: "auto"}); }
  }

  /**
   * Checks if the key was pressed by first converting the event into a key [] and then
   * comparing the key against the specified actionKey.
   * 
   * @param event the key event
   * @param actionKey the action key to check (e.g. increment shortcut key)
   * @return boolean true if the key event matches the action key, false otherwise
   * @private
   */
  function keyPressed(event, actionKey) {
    // Old code: return (key && key.length !== 0 && (
    //         (key[0] && KEY_MODIFIER_STRING_MAP[key[1]]) || (
    //         !(event.altKey   ^ (key[0] & FLAG_KEY_ALT)       ) &&
    //         !(event.ctrlKey  ^ (key[0] & FLAG_KEY_CTRL)  >> 1) &&
    //         !(event.shiftKey ^ (key[0] & FLAG_KEY_SHIFT) >> 2) &&
    //         !(event.metaKey  ^ (key[0] & FLAG_KEY_META)  >> 3))) &&
    //     (event.code === key[1])
    // );
    const key = [
      (event.altKey   ? FLAG_KEY_ALT   : FLAG_KEY_NONE) | // 0001
      (event.ctrlKey  ? FLAG_KEY_CTRL  : FLAG_KEY_NONE) | // 0010
      (event.shiftKey ? FLAG_KEY_SHIFT : FLAG_KEY_NONE) | // 0100
      (event.metaKey  ? FLAG_KEY_META  : FLAG_KEY_NONE),  // 1000
      event.code
    ];
    console.log("URLI DEBUG: shortcuts.js keyPressed() event key=" + key + ", actionKey=" + actionKey);
    return key && actionKey && ((key[0] === actionKey[0] || KEY_MODIFIER_CODE_ARRAY.includes(key[1])) && key[1] === actionKey[1]);
  }

  /**
   * Checks if the mouse button was pressed by comparing the event against the
   * flags.
   * 
   * @param event the mouse event
   * @param actionMouse the action mouse button to check (e.g. increment shortcut mouse button)
   * @return boolean true if the mouse button event matches the action mouse button, false otherwise
   * @private
   */
  function mousePressed(event, actionMouse) {
    console.log("URLI DEBUG: shortcuts.js mousePressed() event.button=" + event.button + ", mouse=" + mouse);
    return (actionMouse !== -1 &&
      (event.button === FLAG_MOUSE_LEFT   && actionMouse === FLAG_MOUSE_LEFT) ||
      (event.button === FLAG_MOUSE_MIDDLE && actionMouse === FLAG_MOUSE_MIDDLE) ||
      (event.button === FLAG_MOUSE_RIGHT  && actionMouse === FLAG_MOUSE_RIGHT)
    );
  }

  // Return Public Functions
  return {
    setItems: setItems,
    keyListener: keyListener,
    mouseListener: mouseListener
  };
}();

// Content Script Start: Cache items from storage and check if quick shortcuts or instance are enabled
chrome.storage.sync.get(null, function(items) {
  chrome.runtime.sendMessage({greeting: "getInstance"}, function(response) {
    console.log("URLI DEBUG: URLI.Shortcuts.chrome.runtime.sendMessage() response.instance=" + response.instance);
    URLI.Shortcuts.setItems(items);
    // Key
    if (items.keyEnabled && (items.keyQuickEnabled || (response.instance && (response.instance.enabled || response.instance.autoEnabled)))) {
      document.addEventListener("keyup", URLI.Shortcuts.keyListener);
    }
    // Mouse
    if (items.mouseEnabled && (items.mouseQuickEnabled || (response.instance && (response.instance.enabled || response.instance.autoEnabled)))) {
      document.addEventListener("mouseup", URLI.Shortcuts.mouseListener);
    }
  });
});

// Listen for requests from chrome.tabs.sendMessage (Extension Environment: Background / Popup)
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("URLI DEBUG: URLI.Shortcuts.chrome.runtime.onMessage() request.greeting=" + request.greeting);
  switch (request.greeting) {
    case "addKeyListener":
      document.addEventListener("keyup", URLI.Shortcuts.keyListener);
      break;
    case "removeKeyListener":
      document.removeEventListener("keyup", URLI.Shortcuts.keyListener);
      break;
    case "addMouseListener":
      document.addEventListener("mouseup", URLI.Shortcuts.mouseListener);
      break;
    case "removeMouseListener":
      document.removeEventListener("mouseup", URLI.Shortcuts.mouseListener);
      break;
    default:
      break;
  }
  sendResponse({});
});