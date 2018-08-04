/**
 * URL Incrementer Increment Decrement
 * 
 * @author Roy Six
 * @namespace
 */

var URLI = URLI || {};

URLI.IncrementDecrement = function () {

  /**
   * Finds a selection in the url to increment or decrement depending on the preference.
   *
   * "Prefixes" Preference:
   * Looks for terms and common prefixes that come before numbers, such as
   * page=, pid=, p=, next=, =, and /. Example URLs with prefixes (= and /):
   * http://www.google.com?page=1234
   * http://www.google.com/1234
   *
   * "Last Number" Preference:
   * Uses the last number in the url.
   *
   * "First Number": Preference:
   * Uses the first number in the url.
   *
   * If no numbers exist in the URL, returns an empty selection.
   *
   * @param url        the url to find the selection in
   * @param preference the preferred strategy to use to find the selection
   * @param custom     the JSON object with custom regular expression parameters
   * @return JSON object {selection, selectionStart}
   * @public
   */
  function findSelection(url, preference, custom) {
    let selectionProps;
    try {
      // Regular Expressions:
      // Firefox: Lookbehind is not supported yet in FF as of Version 61 (Supported in Chrome 62+) so using convoluted alternatives, lookbehinds are in comments below
      const repag = /page=\d+/, // RegExp to find a number with "page=" TODO: replace with lookbehind regex /(?<=page)=(\d+)/
            reter = /(?:(p|id|next)=\d+)/, // RegExp to find numbers with common terms like "id=" TODO: replace with lookbehind regex /(?<=p|id|next)=(\d+)/
            repre = /(?:[=\/]\d+)(?!.*[=\/]\d+)/, // RegExp to find the last number with a prefix (= or /) TODO: Don't capture the = or / so substring(1) is no longer needed
            relas = /\d+(?!.*\d+)/, // RegExg to find the last number in the url
            refir = /\d+/, // RegExg to find the first number in the url
            recus = preference === "custom" && custom ? new RegExp(custom.pattern, custom.flags) : undefined, // RegExp Custom (if set by user) TODO: Validate custom regex with current url for alphanumeric selection
      // Matches:
            mapag = repag.exec(url),
            mater = reter.exec(url),
            mapre = repre.exec(url),
            malas = relas.exec(url),
            mafir = refir.exec(url),
            macus = recus ? recus.exec(url) : undefined;
      console.log("URLI.IncrementDecrement.findSelection() - matches: pag=" + mapag + ", ter=" + mater + ", pre=" + mapre + ", las=" + malas + ", fir=" + mafir + ", cus=" + macus);
      selectionProps =
        preference === "prefixes" ?
          mapag ? {selection: mapag[0].substring(5), selectionStart: mapag.index + 5} :
          mater ? {selection: mater[0].substring(mater[1].length + 1), selectionStart: mater.index + mater[1].length + 1} :
          mapre ? {selection: mapre[0].substring(1), selectionStart: mapre.index + 1} :
          malas ? {selection: malas[0], selectionStart: malas.index} :
          {selection: "", selectionStart: -1} :
        preference === "lastnumber" ?
          malas ? {selection: malas[0], selectionStart: malas.index} :
          {selection: "", selectionStart: -1} :
        preference === "firstnumber" ?
          mafir ? {selection: mafir[0], selectionStart: mafir.index} :
          {selection: "", selectionStart: -1} :
        preference === "custom" ?
          macus && macus[custom.group] ? {selection: macus[custom.group].substring(custom.index), selectionStart: macus.index + custom.index} :
          mapag ? {selection: mapag[0].substring(5), selectionStart: mapag.index + 5} :
          mater ? {selection: mater[0].substring(mater[1].length), selectionStart: mater.index + mater[1].length} :
          mapre ? {selection: mapre[0].substring(1), selectionStart: mapre.index + 1} :
          malas ? {selection: malas[0], selectionStart: malas.index} :
          {selection: "", selectionStart: -1} :
        {selection: "", selectionStart: -1};
    } catch(e) {
      console.log("URLI.IncrementDecrement.findSelection() - exception encountered:" + e);
      selectionProps = {selection: "", selectionStart: -1};
    }
    return selectionProps;
  }

  /**
   * Modifies the URL by either incrementing or decrementing it using
   * an instance object that contains contains the following properties:
   *
   * 1. url            the URL that will be modified
   * 2. selection      the selected part in the URL to modify
   * 3. selectionStart the starting index of the selection in the URL
   * 4. interval       the amount to increment or decrement
   * 5. base           the base to use (the supported base range is 2-36)
   * 6. baseCase       the case to use for letters (lowercase or uppercase)
   * 7. leadingZeros   if true, pad with leading zeros, false don't pad
   * 8. dateFormat     the date format mask to use when the selection is a date
   *
   * @param action   the action to perform (increment or decrement)
   * @param instance the instance containing the parameters used to increment or decrement
   * @public
   */
  function modifyURL(action, instance) {
    multiPre(action, instance);
    const url = instance.url, selection = instance.selection, selectionStart = instance.selectionStart,
          interval = instance.interval, base = instance.base, baseCase = instance.baseCase, leadingZeros = instance.leadingZeros, dateFormat = instance.baseDateFormat;
    let selectionmod;
    switch(base) {
      case "date":
        selectionmod = incrementDecrementDate(action, selection, interval, dateFormat);
        break;
      default:
        selectionmod = incrementDecrementAlphanumeric(action, selection, interval, base, baseCase, leadingZeros);
        break;
    }
    // Append: part 1 of the URL + modified selection + part 2 of the URL
    // TODO: cache urlpart1, urlpart2 earlier?
    const urlmod = url.substring(0, selectionStart) + selectionmod + url.substring(selectionStart + selection.length);
    multiPost(selectionmod, urlmod, instance);
    instance.url = urlmod;
    instance.selection = selectionmod;
  }

  function incrementDecrementAlphanumeric(action, selection, interval, base, baseCase, leadingZeros) {
    let selectionmod;
    const selectionint = parseInt(selection, base); // parseInt base range is 2-36
    // Increment or decrement the selection; if increment is above Number.MAX_SAFE_INTEGER or decrement is below 0, set to upper or lower bounds
    selectionmod = action.startsWith("increment") ? (selectionint + interval <= Number.MAX_SAFE_INTEGER ? selectionint + interval : Number.MAX_SAFE_INTEGER).toString(base) :
                   action.startsWith("decrement") ? (selectionint - interval >= 0 ? selectionint - interval : 0).toString(base) :
                   "";
    // If Leading 0s, pad with 0s
    if (leadingZeros && selection.length > selectionmod.length) {
      selectionmod = "0".repeat(selection.length - selectionmod.length) + selectionmod;
    }
    // If Alphanumeric, convert case
    if (/[a-z]/i.test(selectionmod)) {
      selectionmod = baseCase === "lowercase" ? selectionmod.toLowerCase() : baseCase === "uppercase" ? selectionmod.toUpperCase() : selectionmod;
    }
    return selectionmod;
  }

  /**
   * TODO
   *
   * Legend -   y: year, m: month, d: day, h: hour, i: minute, s: second, l: millisecond
   * Patterns - yyyy | yy, mm | m, dd | d, hh | h, ii | i, ss | s, ll | l
   * Examples - mm/dd/yyyy, dd-m-yyyy, mm/yy, hh/mm/ss
   *
   * @param action
   * @param selection
   * @param interval
   * @param dateFormat
   * @returns {string | *}
   */
  function incrementDecrementDate(action, selection, interval, dateFormat) {
    const regex = /(y+)|(m+)|(d+)|(h+)|(i+)|(l+)|([^ymdhisl]+)/g;
    const match = dateFormat.match(regex);

    // y, not Y (Week Year)
    let lowestDatePart = dateFormat.includes("d") ? "day" : dateFormat.includes("m") ? "month" : dateFormat.includes("y") ? "year": "";


    selection;


    let selectionmod;
    const date = new Date(selection);
    date.setDate(date.getDate() + 1);
    selectionmod = date.toString();
    return selectionmod;
  }

  /**
   * Modifies the URL by either incrementing or decrementing the specified
   * selection and performs error skipping.
   *
   * @param action               the action to perform (increment or decrement)
   * @param instance             the instance containing the URL properties
   * @param errorSkipRemaining   the number of times left to skip while performing this action
   * @param errorCodeEncountered whether or not an error code has been encountered yet while performing this action
   * @public
   */
  function modifyURLAndSkipErrors(action, instance, context, errorSkipRemaining, errorCodeEncountered) {
    console.log("URLI.IncrementDecrement.modifyURLAndSkipErrors() - instance.errorCodes=" + instance.errorCodes +", instance.errorCodesCustomEnabled=" + instance.errorCodesCustomEnabled + ", instance.errorCodesCustom=" + instance.errorCodesCustom  + ", errorSkipRemaining=" + errorSkipRemaining);
    const origin = document.location.origin,
          urlOrigin = new URL(instance.url).origin;
    console.log("origin=" + origin);
    console.log("urlorigin=" + urlOrigin);
    const sender = { "tab": { "id": instance.tabId } };
    const response = {};
    // If Custom URLs or Shuffle URLs, use the urls array to increment or decrement, don't call IncrementDecrement.modifyURL
    if ((instance.customURLs || instance.shuffleURLs) && instance.urls && instance.urls.length > 0) {
      stepThruURLs(action, instance);
    } else {
      modifyURL(action, instance);
    }
console.log("after stepThruURLs and modifyURL");
    // We check that the current page's origin matches the instance's URL origin as we otherwise cannot use fetch due to CORS
    if ((context === "background" || (origin === urlOrigin)) && errorSkipRemaining > 0) {
      console.log("about to do fetch");
      // fetch using credentials: same-origin to keep session/cookie state alive (to avoid redirect false flags e.g. after a user logs in to a website)
      fetch(instance.url, { method: "HEAD", credentials: "same-origin" }).then(function(response) {
        console.log("response.redirected=" + response.redirected);
        console.log("instance.url===response.url" + instance.url === response.url);
        console.log("instance.url=" + instance.url);
        console.log("response.url=" + response.url);
        if (response && response.status &&
            ((instance.errorCodes && (
            (instance.errorCodes.includes("404") && response.status === 404) ||
            (instance.errorCodes.includes("3XX") && ((response.status >= 300 && response.status <= 399) || response.redirected)) || // Note: 301,302,303,307,308 return response.status of 200 and must be checked by response.redirected
            (instance.errorCodes.includes("4XX") && response.status >= 400 && response.status <= 499) ||
            (instance.errorCodes.includes("5XX") && response.status >= 500 && response.status <= 599))) ||
            (instance.errorCodesCustomEnabled && instance.errorCodesCustom &&
            (instance.errorCodesCustom.includes(response.status + "") || (response.redirected && ["301", "302", "303", "307", "308"].some(redcode => instance.errorCodesCustom.includes(redcode))))))) { // response.status + "" because custom array stores string inputs
          console.log("URLI.IncrementDecrement.modifyURLAndSkipErrors() - request.url= " + instance.url);
          console.log("URLI.IncrementDecrement.modifyURLAndSkipErrors() - response.url=" + response.url);
          console.log("URLI.IncrementDecrement.modifyURLAndSkipErrors() - skipping this URL because response.status was in errorCodes or response.redirected, response.status=" + response.status);
          // setBadgeSkipErrors, but only need to send message the first time an errorCode is encountered
          // if (!errorCodeEncountered) {
          //   chrome.runtime.sendMessage({greeting: "setBadgeSkipErrors", "errorCode": response.redirected ? "RED" : response.status, "instance": instance});
          // }
          // TODO: Test sending this message multiple times?
          const request = {greeting: "setBadgeSkipErrors", "errorCode": response.redirected ? "RED" : response.status, "instance": instance};
          if (context === "background") { URLI.Background.messageListener(request, sender, response); }
          else { chrome.runtime.sendMessage(request); }
          // Recursively call this method again to perform the action again and skip this URL, decrementing errorSkipRemaining and setting errorCodeEncountered to true
          modifyURLAndSkipErrors(action, instance, context, errorSkipRemaining - 1, true);
        } else {
          console.log("URLI.IncrementDecrement.modifyURLAndSkipErrors() - not attempting to skip this URL because response.status=" + response.status  + " and it was not in errorCodes. aborting and updating tab");
          const request = {greeting: "incrementDecrementSkipErrors", "instance": instance};
          if (context === "background") { URLI.Background.messageListener(request, sender, response); }
          else { chrome.runtime.sendMessage(request);}
        }
      }).catch(e => {
        console.log("URLI.IncrementDecrement.modifyURLAndSkipErrors() - a fetch() exception was caught:" + e);
        const request1 = {greeting: "setBadgeSkipErrors", "errorCode": "ERR", "instance": instance};
        const request2 = {greeting: "incrementDecrementSkipErrors", "instance": instance};
        if (context === "background") { URLI.Background.messageListener(request1, sender, response); URLI.Background.messageListener(request2, sender, response); }
        else { chrome.runtime.sendMessage(request1); chrome.runtime.sendMessage(request2); }
      });
    } else {
      console.log("URLI.IncrementDecrement.modifyURLAndSkipErrors() - " + (context === "context-script" && origin !== urlOrigin ? "the instance's URL origin does not match this page's URL origin" : "we have exhausted the errorSkip attempts") + ". aborting and updating tab ");
      const request = {greeting: "incrementDecrementSkipErrors", "instance": instance};
      if (context === "background") { URLI.Background.messageListener(request, sender, response); }
      else { chrome.runtime.sendMessage(request); }
    }
  }

  /**
   * Steps to the next or previous position in the URLs array.
   * This is used instead of modifyURL, for example when there is a URLs array (e.g. when Shuffle Mode is enabled).
   *
   * @param action   the action (increment moves forward, decrement moves backward in the array)
   * @param instance the instance containing the URLs array
   * @public
   */
  function stepThruURLs(action, instance) {
    console.log("URLI.IncrementDecrement.precalculateURLs() - performing increment/decrement on the urls array...");
    const urlsLength = instance.urls.length;
    console.log("URLI.IncrementDecrement.precalculateURLs() - action === instance.autoAction=" + (action === instance.autoAction) + ", action=" + action);
    console.log("URLI.IncrementDecrement.precalculateURLs() - instance.urlsCurrentIndex + 1 < urlsLength=" + (instance.urlsCurrentIndex + 1 < urlsLength) +", instance.urlsCurrentIndex=" + instance.urlsCurrentIndex + ", urlsLength=" + urlsLength);
    // Get the urlProps object from the next or previous position in the urls array and update the instance
    const urlProps =
      (!instance.autoEnabled && action === "increment") || (action === instance.autoAction) ?
        instance.urls[instance.urlsCurrentIndex + 1 < urlsLength ? !instance.autoEnabled || instance.customURLs ? ++instance.urlsCurrentIndex : instance.urlsCurrentIndex++ : urlsLength - 1] :
        instance.urls[instance.urlsCurrentIndex - 1 >= 0 ? !instance.autoEnabled ? --instance.urlsCurrentIndex : instance.urlsCurrentIndex-- : 0];
    instance.url = urlProps.urlmod;
    instance.selection = urlProps.selectionmod;
  }

  /**
   * Pre-calculates an array of URLs.
   *
   * @param instance
   * @returns {{urls: Array, currentIndex: number}}
   */
  function precalculateURLs(instance) {
    console.log("URLI.IncrementDecrement.precalculateURLs() - precalculating URLs for an instance that is " + (instance.toolkitEnabled ?  "toolkitEnabled" : instance.autoEnabled ? "autoEnabled" : "normal"));
    let urls = [], currentIndex = 0;
    if (instance.toolkitEnabled || instance.customURLs || instance.shuffleURLs) {
      // Custom URLs are treated the same in all modes
      if (instance.customURLs) {
        urls = buildCustomURLs(instance);
        currentIndex = -1; // Start the index at -1 because 0 will be the first URL in the custom URLs array
      } else if (instance.toolkitEnabled) {
        urls = buildURLs(instance, instance.toolkitAction, instance.toolkitQuantity);
      } else if (instance.autoEnabled) {
        urls = buildURLs(instance, instance.autoAction, instance.autoTimes);
      } else {
        const shuffleLimit = URLI.Background.getItems().shuffleLimit;
        const urlsIncrement = buildURLs(instance, "increment", shuffleLimit / 2);
        const urlsDecrement = buildURLs(instance, "decrement", shuffleLimit / 2);
        const urlOriginal = [{"urlmod": instance.url, "selectionmod": instance.selection}];
        currentIndex = urlsDecrement.length;
        urls = [...urlsDecrement, ...urlOriginal, ...urlsIncrement];
      }
    }
    return {"urls": urls, "currentIndex": currentIndex};
  }

  function buildURLs(instance, action, limit) {
    console.log("URLI.IncrementDecrement.buildURLs() - instance.url=" + instance.url + ", instance.selection=" + instance.selection + ", action=" + action + ", limit=" + limit);
    const urls = [],
          url = instance.url,
          selection = instance.selection;
    // If Toolkit Generate URLs first include the original URL for completeness and include it in the limit
    if (instance.toolkitEnabled && instance.toolkitTool === "generate-links") {
      urls.push({"urlmod": url, "selectionmod": selection});
      limit--;
    }
    for (let i = 0; i < limit; i++) {
      modifyURL(action, instance);
      urls.push({"urlmod": instance.url, "selectionmod": instance.selection});
      const selectionint = parseInt(instance.selection, instance.base);
      if (selectionint <= 0 || selectionint >= Number.MAX_SAFE_INTEGER) {
        break;
      }
    }
    // Reset instance url and selection after calling modifyURL():
    instance.url = url;
    instance.selection = selection;
    if (instance.shuffleURLs) {
      shuffle(urls);
    }
    return urls;
  }

  function buildCustomURLs(instance) {
    const urls = [];
    for (let url of instance.urls) {
      // Only need to construct an object the first time TODO: Should we construct the objects this from the get-go in popup's instance.urls array so we don't have to do this?
      if (instance.autoRepeatCount === 0) {
        urls.push({"urlmod": url, "selectionmod": ""});
      } else {
        urls.push(url);
      }
    }
    if (instance.shuffleURLs) {
      shuffle(urls);
    }
    return urls;
  }

  /**
   * Shuffles an array into random indices using the Durstenfeld shuffle, a computer-optimized version of Fisher-Yates.
   * Note: This function is written by Laurens Holst.
   *
   * @param array the array to shuffle
   * @see https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#The_modern_algorithm
   * @see https://stackoverflow.com/a/12646864
   * @private
   */
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]; // eslint-disable-line no-param-reassign
    }
    return array;
  }

  /**
   * Pre-handles a multi-incrementing instance before modifyURL().
   *
   * @param action   the action (increment or decrement, for multi, this may have a 2 or 3 at the end e.g. increment3)
   * @param instance the instance to handle
   * @private
   */
  function multiPre(action, instance) {
    if (instance && instance.multiEnabled) {
      // Set the current instance properties with the multi part's properties for modifyURL()
      const match = /\d+/.exec(action),
            part = match ? match[0] : "1"; // an "increment" action without a number at the end (e.g. increment#) is always 1
      instance.multiPart = part; // Stored later for multiPost() so we don't have to execute the above regex again
      instance.selection = instance["selection" + part];
      instance.selectionStart = instance["selectionStart" + part];
      instance.interval = instance["interval" + part];
      instance.base = instance["base" + part];
      instance.baseCase = instance["baseCase" + part];
      instance.leadingZeros = instance["leadingZeros" + part];
    }
  }

  /**
   * Post-handles a multi-incrementing instance after modifyURL().
   *
   * @param selectionmod the modified selection
   * @param urlmod       the modified URL
   * @param instance     the instance to handle
   * @private
   */
  function multiPost(selectionmod, urlmod, instance) {
    if (instance && instance.multiEnabled) {
      // Update the selection part's to the new selection and selectionStart
      instance["selection" + instance.multiPart] = selectionmod;
      // If after incrementing/decrementing, the url length changed update the other parts' selectionStart
      if (instance.url && instance.url.length !== urlmod.length) {
        const urlLengthDiff = instance.url.length - urlmod.length; // Handles both positive and negative changes (e.g. URL became shorter or longer)
        const thisPartSelectionStart = instance["selectionStart" + instance.multiPart];
        console.log("URLI.IncrementDecrement.multiPost() - part=" + instance.multiPart + ", urlLengthDiff=" + urlLengthDiff + "thisPartSelectionStart=" + thisPartSelectionStart);
        // If this part isn't the last part, adjust the selectionStarts of the other parts that come later in the URL
        for (let i = 1; i <= instance.multi; i++) {
          if (i !== instance.multiPart && instance["selectionStart" + i] > thisPartSelectionStart) {
            console.log("URLI.IncrementDecrement.multiPost() - adjusted part" + i + "'s selectionStart from: " + instance["selectionStart" + i] + " to:" + instance["selectionStart" + i] - urlLengthDiff);
            instance["selectionStart" + i] = instance["selectionStart" + i] - urlLengthDiff;
          }
        }
      }
    }
  }

  // Return Public Functions
  return {
    findSelection: findSelection,
    modifyURL: modifyURL,
    modifyURLAndSkipErrors: modifyURLAndSkipErrors,
    stepThruURLs: stepThruURLs,
    precalculateURLs: precalculateURLs
  };
}();