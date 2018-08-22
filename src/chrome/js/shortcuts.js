/**
 * URL Incrementer Shortcuts
 * 
 * @author Roy Six
 * @namespace
 */


//if (window.URLI && window.URLI.Shortcuts) { return; }

var URLI = URLI || {};

URLI.Shortcuts = function () {

  const FLAG_KEY_ALT   = 0x1, // 0001
        FLAG_KEY_CTRL  = 0x2, // 0010
        FLAG_KEY_SHIFT = 0x4, // 0100
        FLAG_KEY_META  = 0x8; // 1000

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
    else if (keyPressed(event, items_.keyReturn))    { chrome.runtime.sendMessage({greeting: "performAction", action: "return"}); }
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
    else if (mousePressed(event, items_.mouseReturn))    { chrome.runtime.sendMessage({greeting: "performAction", action: "return"}); }
    else if (mousePressed(event, items_.mouseAuto))      { chrome.runtime.sendMessage({greeting: "performAction", action: "auto"}); }
  }

  /**
   * Checks if the key was pressed by comparing the event against the flags
   * using bitwise operators and checking if the key code matches.
   * 
   * @param event the key event
   * @param key the action key to check (e.g. increment shortcut key)
   * @return boolean true if the key event matches the action key, false otherwise
   * @private
   */
  function keyPressed(event, key) {
    console.log("URLI.Shortcuts.keyPressed() - event.code=" + event.code + ", actionKey=" + key);
    return key && event.code === key.code &&
      (!(event.altKey   ^ (key.modifiers & FLAG_KEY_ALT)       ) &&
       !(event.ctrlKey  ^ (key.modifiers & FLAG_KEY_CTRL)  >> 1) &&
       !(event.shiftKey ^ (key.modifiers & FLAG_KEY_SHIFT) >> 2) &&
       !(event.metaKey  ^ (key.modifiers & FLAG_KEY_META)  >> 3));
  }

  /**
   * Checks if the mouse button was pressed.
   * 
   * @param event the mouse event
   * @param mouse the action mouse button to check (e.g. increment shortcut mouse button)
   * @return boolean true if the mouse button event matches the action mouse button, false otherwise
   * @private
   */
  function mousePressed(event, mouse) {
    console.log("URLI.Shortcuts.mousePressed() - event.button=" + event.button + ", event.detail=" + event.detail + ", actionMouse=" + mouse);
    return mouse && event.button === mouse.button && event.detail === mouse.clicks;
  }

  // Return Public Functions
  return {
    setItems: setItems,
    keyListener: keyListener,
    mouseListener: mouseListener
  };
}();

// Listen for requests from chrome.tabs.sendMessage (Extension Environment: Background / Popup)
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("URLI.Shortcuts.chrome.runtime.onMessage() - request.greeting=" + request.greeting);
  switch (request.greeting) {
    case "setItems":
      URLI.Shortcuts.setItems(request.items);
      break;
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

// Content Script starts by sending a message to check if internal shortcuts should be enabled (e.g. quick shortcuts, saved url, enabled instance)
chrome.runtime.sendMessage({greeting: "checkInternalShortcuts"});