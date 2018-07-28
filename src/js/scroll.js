/**
 * URL Incrementer Scroll
 *
 * @author Roy Six
 * @namespace
 */

// todo
  //https://stackoverflow.com/questions/824349/modify-the-url-without-reloading-the-page
// https://stackoverflow.com/questions/3338642/updating-address-bar-with-new-url-without-hash-or-reloading-the-page

var URLI = URLI || {};

URLI.Scroll = function () {

  const PAGE_ID = "infy-scroll-page-"; // TODO unique name for the pages

  const PAGE_OFFSET = 10; // document.body.scrollHeight / 3; // todo this should not be a constant as the scrollHeight changes dynamically

  const SPACING = 0;

  function scrollChecker() {
    var hasScrollbar = document.body.clientHeight >= window.innerHeight;
    console.log("scrollChecker:"+ hasScrollbar);
    if (!hasScrollbar) {
      console.log("No scrollbar present, doing action!");
      chrome.runtime.sendMessage({greeting: "performAction", action: "next"});
    }
  }

  function scrollListener(event) {
    console.log("scrolling!");
    const offset = document.body.scrollHeight / PAGE_OFFSET;
    if ((window.innerHeight + window.scrollY + offset) >= document.body.scrollHeight) {
      console.log("Hit bottom of page");
      chrome.runtime.sendMessage({greeting: "performAction", action: "next"});
    }
  }

  /**
   * TODO
   *
   * We use the fetch equivalence of an xhr response document type
   * fetch equivalent code by Paul Irish
   * @see https://stackoverflow.com/questions/45512102/can-fetch-do-responsetype-document
   * @param instance
   */
  function scroll(instance) {
    switch (instance.scrollMode) {
      case "shadowDOM":
        scrollShadowDOM(instance);
        break;
      case "iframe":
        scrollIframe(instance);
        break;
      default:
        scrollIframe(instance);
        break;
    }
  }

  function scrollShadowDOM(instance) {
    i++;
    console.log("URLI.ScrollShadowDOM() - instance.url=" + instance.url + ", i=" + i);
    fetch(instance.url, { method: "GET", credentials: "same-origin" })
    // blob:
    /*
    .then(response => response.blob()).then(blob => {
    console.log("got a blob!");
    const objectURL = URL.createObjectURL(blob);
    const img = document.createElement("img");
    img.src = objectURL;
    shadowRoot.appendChild(img);
    document.body.appendChild(shadowRoot);
  });*/

      .then(response => response.text())
      .then(text => new DOMParser().parseFromString(text, "text/html"))
      .then(document2 => {
        const div = document.createElement("div");
        const shadowRoot = div.attachShadow({ mode: "open"});
        const slot = document.createElement("slot");
        slot.name = "" + (i);
        slot.appendChild(document2.head);
        slot.appendChild(document2.body);
        shadowRoot.appendChild(slot);
        document.body.appendChild(div);
        //document.body.appendChild(shadowRoot);

        // const slot = document.createElement("slot");
        // slot.name = "" + (++i);
        // slot.appendChild(document2.head);
        // //const spacer = document.createElement("div");
        // //spacer.style.marginTop = "2em";
        // //slot.appendChild(spacer);
        // slot.appendChild(document2.body);
        // //shadowRoot.appendChild(slot);
        // //shadowRoot.appendChild(document2.body);
        // const div = document.createElement("div");
        // for (let element of document2.body.children) {
        //   div.appendChild(element);
        // }
        // shadowRoot.appendChild(div);
        // document.body.appendChild(shadowRoot);
      });
  }

  function scrollIframe(instance) {
    i++;
    console.log("URLI.ScrollIframe() - instance.url=" + instance.url + ", i=" + i);
    const div = document.createElement("div");
    div.id = "" + (i);
    div.style.marginTop = SPACING + "px";
    const iframe = document.createElement("iframe");
    iframe.id = instance.domId = PAGE_ID + i;
    iframe.src = instance.url;
    iframe.style = "width: 100%; height: 100vh; border: 0; overflow: hidden; margin: 0; padding: 0; line-height: 0; display: block; opacity: 0; height: 0; transition: opacity 1.5s ease-in-out, height 3s ease-in-out";
    iframe.scrolling = "no";
    // @see https://meta.stackexchange.com/questions/155720/i-busted-the-stack-overflow-frame-buster-buster-buster
    // sandbox iframe to avoid "For security reasons, framing is not allowed; click OK to remove the frames."
    iframe.sandbox = "allow-same-origin allow-scripts";

    // @see https://stackoverflow.com/a/9163087
    iframe.onload = function() {
      //iframe.contentWindow.document.documentElement.style.overflow = iframe.contentWindow.document.body.style.overflow = "hidden";
      // style html and body overflow to hidden
      iframe.contentDocument.documentElement.style.overflow = iframe.contentDocument.body.style.overflow = "hidden";
      iframe.style.height = ""; // TODO is this needed?
      //iframe.style.height = iframe.contentWindow.document.body.scrollHeight + "px";
      iframe.style.height = iframe.contentDocument.body.scrollHeight + "px";
      iframe.style.opacity = "1";
      // iframe.contentWindow.scrollTo({
      //   top: 0,
      //   behavior: "smooth"
      // });
    };
    div.appendChild(iframe);
    document.body.appendChild(div);
    chrome.runtime.sendMessage({greeting: "setInstance", instance: instance});
  }

  // Return Public Functions
  return {
    // init: init,
    scrollChecker: scrollChecker,
    scrollListener: scrollListener,
    scroll: scroll
  };
}();

// https://stackoverflow.com/questions/23208134/avoid-dynamically-injecting-the-same-script-multiple-times-when-using-chrome-tab?rq=1
if (!window.contentScriptInjected) {
  contentScriptInjected = true;
  init();
}

var i = i ? i : 1;

function init() {
  console.log("" + contentScriptInjected);
  console.log("doing init!");
  //console.log("hello scrolling... i=" + i);
  //const el = document.createElement("div");

  //document.body.appendChild(shadowRoot);
  // const slot = document.createElement("div");
  // slot.innerHTML = document.body.innerHTML;
  // slot.id = "" + (++i);
  //slot.appendChild(document.head);
  //slot.appendChild(document.body);
  //shadowRoot.appendChild(slot);
  //document.head = document.createElement("head");
  //document.body = document.createElement("body");
  //shadowRoot = document.body.attachShadow({ mode: "open"});
  //const div = document.createElement("div");
  //document.body.appendChild(div);
  //shadowRoot = div.attachShadow({ mode: "open"});
  //shadowRoot = div;
  // const style = document.createElement("style");
  // style.type = "text/css";
  // style.appendChild(document.createTextNode("::-webkit-scrollbar {\n" +
  //   "    width: 0px;\n" +
  //   "    height: 0px;\n" +
  //   "}"));
  // style.appendChild(document.createTextNode("iframe::-webkit-scrollbar {\n" +
  //   "    width: 0px;\n" +
  //   "    height: 0px;\n" +
  //   "}"));
  // document.head.appendChild(style);
  //shadowRoot.appendChild(slot);
  //document.body.innerHTML = slot.innerHTML;
  //body.createElement("div");

  //document.body.appendChild(shadowRoot);
  //shadowRoot.appendChild(document2.body);

  // var offset = document.body.scrollHeight / 3; //0; // document.body.scrollHeight / 3;
  // window.onscroll = function(event) {
  //   console.log("scrolling!");
  //   if ((window.innerHeight + window.scrollY + offset) >= document.body.scrollHeight) {
  //     console.log("Hit bottom of page");
  //     //request();
  //     chrome.runtime.sendMessage({greeting: "performAction", action: "increment"});
  //   }
  // };


  // Listen for requests from chrome.tabs.sendMessage (Extension Environment: Background / Popup)
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log("URLI.Scroll.chrome.runtime.onMessage() - request.greeting=" + request.greeting);
    switch (request.greeting) {
      case "addScrollListener":
        window.removeEventListener("scroll", URLI.Scroll.scrollListener);
        window.addEventListener("scroll", URLI.Scroll.scrollListener);
        break;
      case "removeScrollListener":
        window.removeEventListener("scroll", URLI.Scroll.scrollListener);
        break;
      case "scroll":
        URLI.Scroll.scroll(request.instance);
        break;
      default:
        break;
    }
    sendResponse({});
  });


// Content Script Start: Cache items from storage and check if quick shortcuts or instance are enabled
  chrome.runtime.sendMessage({greeting: "shouldActivateScroll"}, function(response) {

    if (response && response.shouldActivateScrollAnswer) {
      window.removeEventListener("scroll", URLI.Scroll.scrollListener);
      window.addEventListener("scroll", URLI.Scroll.scrollListener);
      URLI.Scroll.scrollChecker();
      console.log("activating auto scroll for this url!");
      // activate scrolling...
    }

    // console.log("URLI.Shortcuts.chrome.runtime.sendMessage() - response.instance=" + response.instance);
    // URLI.Shortcuts.setItems(response.items);
    // // Key
    // if (response.items.keyEnabled && (response.items.keyQuickEnabled || (response.instance && (response.instance.enabled || response.instance.autoEnabled)))) {
    //   console.log("URLI.Shortcuts.chrome.runtime.sendMessage() - adding keyListener");
    //   document.addEventListener("keyup", URLI.Shortcuts.keyListener);
    // }
    // // Mouse
    // if (response.items.mouseEnabled && (response.items.mouseQuickEnabled || (response.instance && (response.instance.enabled || response.instance.autoEnabled)))) {
    //   console.log("URLI.Shortcuts.chrome.runtime.sendMessage() - adding mouseListener");
    //   document.addEventListener("mouseup", URLI.Shortcuts.mouseListener);
    // }
  });
}