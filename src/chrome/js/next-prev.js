/**
 * URL Incrementer
 * @file next-prev.js
 * @author Roy Six
 * @license LGPL-3.0
 */

var NextPrev = (() => {

  // The urls object stores important, attributes, and innerHTML links that were found
  const urls = {
    "important":  { "relAttribute": new Map() },
    "attributes": { "equals": new Map(), "startsWith": new Map(), "includes": new Map() },
    "innerHTML":  { "equals": new Map(), "startsWith": new Map(), "includes": new Map() }
  };

  /**
   * Finds the next or prev URL based on the keywords.
   *
   * @param keywords   the next or prev keywords list to use
   * @param priority   the link priority to use: attributes or innerHTML
   * @param sameDomain whether to enforce the same domain policy
   * @returns {string} the next or prev url
   * @public
   */
  function findNextPrevURL(keywords, priority, sameDomain) {
    console.log("findNextPrevURL() - keywords=" + keywords + ", priority=" + priority + ", sameDomain=" + sameDomain);
    const priority2 = priority === "attributes" ? "innerHTML" : "attributes",
          algorithms = [ // Note: the order matters, the highest priority algorithms are first when they are iterated below
            { "type": "important", "subtypes": ["relAttribute"] },
            { "type": priority,    "subtypes": ["equals"] },
            { "type": priority2,   "subtypes": ["equals"] },
            { "type": priority,    "subtypes": ["startsWith", "includes"] }, // Combined for priority on keywords over subtypes
            { "type": priority2,   "subtypes": ["startsWith", "includes"] }
          ];
    buildURLs(keywords, sameDomain);
    for (const algorithm of algorithms) {
      const url = traverseResults(algorithm.type, algorithm.subtypes, keywords);
      if (url) { return url; }
    }
    return "";
  }

  /**
   * Traverses the urls results object to see if a URL was found. e.g. urls[attributes][equals][next]
   *
   * @param type     the link type to use: important, attributes or innerHTML
   * @param subtypes the subtypes to use: relAttribute, equals, startsWith, includes
   * @param keywords the ordered list of keywords sorted in priority
   * @returns {string} the url (if found)
   * @private
   */
  function traverseResults(type, subtypes, keywords) {
    for (const keyword of keywords) {
      for (const subtype of subtypes) {
        if (urls[type][subtype].has(keyword)) {
          console.log("traverseResults() - a next/prev link was found:" +  type + " - " + subtype + " - " + keyword + " - " + urls[type][subtype].get(keyword));
          return urls[type][subtype].get(keyword);
        }
      }
    }
    return "";
  }

  /**
   * Builds the urls results object by parsing all link and anchor elements.
   * 
   * @param keywords   the next or prev keywords list to use
   * @param sameDomain whether to enforce the same domain policy
   * @private
   */
  function buildURLs(keywords, sameDomain) {
    // Note: The following DOM elements contain links: link, a, area, and base
    const elements = document.querySelectorAll("link[href], a[href], area[href]"),
          hostname = window.location.hostname;
    for (const element of elements) {
      try { // Check if URL is in same domain if enabled, wrap in try/catch in case of exceptions with URL object
        const url = new URL(element.href);
        if (sameDomain && url.hostname !== hostname) {
          continue;
        }
        parseText(keywords, "innerHTML", element.href, element.innerHTML.trim().toLowerCase(), "");
        for (const attribute of element.attributes) {
          parseText(keywords, "attributes", element.href, attribute.nodeValue.trim().toLowerCase(), attribute.nodeName.toLowerCase());
        }
      } catch (e) {
        console.log("parseElements() - exception caught:" + e);
      }
    }
  }

  /**
   * Parses an element's text for keywords that might indicate a next or prev link.
   * Adds the link to the urls map if a match is found.
   *
   * @param keywords  the next or prev keywords list to use
   * @param type      the type of element text: attributes or innerHTML
   * @param href      the URL to set this link to
   * @param text      the element's text to parse keywords from
   * @param attribute attribute's node name if it's needed
   * @private
   */
  function parseText(keywords, type, href, text, attribute) {
    // Iterate over this direction's keywords and build out the urls object's maps
    for (const keyword of keywords) {
      if (attribute && attribute === "rel" && text === keyword) { // important e.g. rel="next" or rel="prev"
        urls.important.relAttribute.set(keyword, href);
      } else if (text === keyword) {
        urls[type].equals.set(keyword, href);
      } else if (text.startsWith(keyword)) {
        urls[type].startsWith.set(keyword, href);
      } else if (text.includes(keyword)) {
        urls[type].includes.set(keyword, href);
      }
    }
  }

  // Return Public Functions
  return {
    findNextPrevURL: findNextPrevURL
  };
})();