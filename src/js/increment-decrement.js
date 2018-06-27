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
    // Regular Expressions:
    const reter = /(?<=page|pid|p|next|id)=(\d+)/, // RegExp to find numbers with more common terms like "page="
          repre = /(?:[=\/]\d+)(?!.*[=\/]\d+)/, // RegExp to find the last number with a prefix (= or /) TODO: Don't capture the = or / so substring(1) is no longer needed
          relas = /\d+(?!.*\d+)/, // RegExg to find the last number in the url
          refir = /\d+/, // RegExg to find the first number in the url
          recus = preference === "custom" && custom ? new RegExp(custom.pattern, custom.flags) : undefined, // RegExp Custom (if set by user)
    // Matches:
          mater = reter.exec(url),
          mapre = repre.exec(url),
          malas = relas.exec(url),
          mafir = refir.exec(url),
          macus = recus ? recus.exec(url) : undefined;
    //console.log("URLI DEBUG: findSelection() matches: ter=" + mater + ", pre=" + mapre + ", las=" + malas + ", fir=" + mafir + ", cus=" + macus);
    // TODO: Validate custom regex with current url for alphanumeric selection
    return preference === "prefixes" ?
              mater ? {selection: mater[1], selectionStart: mater.index + 1} :
              mapre ? {selection: mapre[0].substring(1), selectionStart: mapre.index + 1} :
              malas ? {selection: malas[0], selectionStart: malas.index} :
              {selection: "", selectionStart: -1} :
           preference === "lastnumber" ?
              malas ? {selection: malas[0], selectionStart: malas.index} :
              mater ? {selection: mater[1], selectionStart: mater.index + 1} :
              mapre ? {selection: mapre[0].substring(1), selectionStart: mapre.index + 1} :
              {selection: "", selectionStart: -1} :
           preference === "firstnumber" ?
              mafir ? {selection: mafir[0], selectionStart: mafir.index} :
              mater ? {selection: mater[1], selectionStart: mater.index + 1} :
              mapre ? {selection: mapre[0].substring(1), selectionStart: mapre.index + 1} :
              {selection: "", selectionStart: -1} :
           preference === "custom" ?
              macus && macus[custom.group] ? {selection: macus[custom.group].substring(custom.index), selectionStart: macus.index + custom.index} :
              mater ? {selection: mater[1], selectionStart: mater.index + 1} :
              mapre ? {selection: mapre[0].substring(1), selectionStart: mapre.index + 1} :
              malas ? {selection: malas[0], selectionStart: malas.index} :
              {selection: "", selectionStart: -1} :
          {selection: "", selectionStart: -1};
  }

  /**
   * Modifies the URL by either incrementing or decrementing the specified
   * selection.
   *
   * @param action         the action to perform (increment or decrement)
   * @param url            the URL that will be modified
   * @param selection      the selected part in the URL to modify
   * @param selectionStart the starting index of the selection in the URL
   * @param interval       the amount to increment or decrement
   * @param base           the base to use (the supported base range is 2-36)
   * @param baseCase       the case to use for letters (lowercase or uppercase)
   * @param leadingZeros   if true, pad with leading zeros, false don't pad
   * @return JSON object {urlmod: modified url, selectionmod: modified selection}
   * @public
   */
  function modifyURL(action, url, selection, selectionStart, interval, base, baseCase, leadingZeros) {
    let urlmod,
        selectionmod,
        selectionint = parseInt(selection, base); // parseInt base range is 2-36
    // Increment or decrement the selection; if decrement is negative, set to 0 (low bound)
    selectionmod = action === "increment" ? (selectionint + interval).toString(base) :
                   action === "decrement" ? (selectionint - interval >= 0 ? selectionint - interval : 0).toString(base) :
                   "";
    if (leadingZeros && selection.length > selectionmod.length) { // Leading 0s
      selectionmod = "0".repeat(selection.length - selectionmod.length) + selectionmod;
    }
    if (/[a-z]/i.test(selectionmod)) { // If Alphanumeric, convert case
      selectionmod = baseCase === "lowercase" ? selectionmod.toLowerCase() : baseCase === "uppercase" ? selectionmod.toUpperCase() : selectionmod;
    }
    // Append: part 1 of the URL + modified selection + part 2 of the URL
    urlmod = url.substring(0, selectionStart) + selectionmod + url.substring(selectionStart + selection.length);
    return {urlmod: urlmod, selectionmod: selectionmod};
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
  function modifyURLAndSkipErrors(action, instance, errorSkipRemaining, errorCodeEncountered) {
    const origin = document.location.origin,
          urlOrigin = new URL(instance.url).origin,
          urlProps = modifyURL(action, instance.url, instance.selection, instance.selectionStart, instance.interval, instance.base, instance.baseCase, instance.leadingZeros);
    instance.url = urlProps.urlmod;
    instance.selection = urlProps.selectionmod;
    // We check that the current page's origin matches the instance's URL origin as we otherwise cannot use fetch due to CORS
    if (origin === urlOrigin && errorSkipRemaining > 0 && instance.errorCodes && instance.errorCodes.length > 0) {
      fetch(urlProps.urlmod, { method: "HEAD" }).then(function(response) {
        if (response && response.status &&
            ((instance.errorCodes.includes("404") && response.status === 404) ||
            (instance.errorCodes.includes("3XX") && response.status >= 300 && response.status < 400) ||
            (instance.errorCodes.includes("4XX") && response.status >= 400 && response.status < 500) ||
            (instance.errorCodes.includes("5XX") && response.status >= 500 && response.status < 600))) {
          //console.log("URLI DEBUG: modifyURLAndSkipErrors() Attempting to skip this URL because response.status was in errorCodes");
          // setBadgeSkipErrors, but only need to send message the first time an errorCode is encountered
          if (!errorCodeEncountered) {
            chrome.runtime.sendMessage({greeting: "setBadgeSkipErrors", "errorCode": response.status, "instance": instance});
          }
          // Recursively call this method again to perform the action again and skip this URL, decrementing errorSkipRemaining and setting errorCodeEncoutnered to true
          modifyURLAndSkipErrors(action, instance, errorSkipRemaining - 1, true);
        } else {
          //console.log("URLI DEBUG: modifyURLAndSkipErrors() Not attempting to skip this URL because response.status was not in errorCodes. Aborting and updating tab");
          chrome.runtime.sendMessage({greeting: "incrementDecrementSkipErrors", "instance": instance});
        }
      });
    } else {
      //console.log("URLI DEBUG: modifyURLAndSkipErrors() " + (origin !== urlOrigin ? "The instance's URL origin does not match this page's URL origin" : "We have exhausted the errorSkip attempts"));
      chrome.runtime.sendMessage({greeting: "incrementDecrementSkipErrors", "instance": instance});
    }
  }

  // Return Public Functions
  return {
    findSelection: findSelection,
    modifyURL: modifyURL,
    modifyURLAndSkipErrors: modifyURLAndSkipErrors
  };
}();