/**
 * URL Incrementer
 * @file increment-decrement.js
 * @author Roy Six
 * @license LGPL-3.0
 */

var IncrementDecrement = (() => {

  /**
   * Finds a selection in the url to increment or decrement depending on the preference:
   * "prefixes" (e.g. page=1 /1 =1), "lastnumber", "firstnumber", or "custom".
   *
   * @param url               the url to find the selection in
   * @param preference        the preferred strategy to use to find the selection
   * @param selectionCustom   the object with custom regular expression parameters
   * @param previousException true if this function encountered a previous exception, false otherwise
   * @returns {*} - {selection, selectionStart} or an empty selection if no selection found
   * @public
   */
  function findSelection(url, preference, selectionCustom, previousException) {
    try {
      if (preference === "custom" && selectionCustom) {
        const custom = new RegExp(selectionCustom.pattern, selectionCustom.flags).exec(url); // TODO: Validate custom regex with current url for alphanumeric selection
        if (custom && custom[selectionCustom.group]) { return {selection: custom[selectionCustom.group].substring(selectionCustom.index), selectionStart: custom.index + selectionCustom.index}; }
      }
      if (preference === "prefixes" || preference === "custom") {
        const page = /page=\d+/i.exec(url); // page= Lookbehind /(?<=page)=(\d+)/i
        if (page) { return {selection: page[0].substring(5), selectionStart: page.index + 5}; }
        const terms = /(?:(p|id|next)=\d+)(?!.*(p|id|next)=\d+)/i.exec(url); // p|id|next= Lookbehind /(?<=p|id|next)=(\d+)/i
        if (terms) { return {selection: terms[0].substring(terms[1].length + 1), selectionStart: terms.index + terms[1].length + 1}; }
        const prefixes = /(?:[=\/]\d+)(?!.*[=\/]\d+)/.exec(url); // =|/ TODO: Don't capture the = or / so substring(1) is no longer needed
        if (prefixes) { return {selection: prefixes[0].substring(1), selectionStart: prefixes.index + 1}; }
      }
      if (preference === "lastnumber" || preference === "prefixes" || preference === "custom") {
        const last = /\d+(?!.*\d+)/.exec(url);
        if (last) { return {selection: last[0], selectionStart: last.index}; }
      }
      if (preference === "firstnumber") {
        const first = /\d+/.exec(url);
        if (first) { return {selection: first[0], selectionStart: first.index}; }
      }
    } catch(e) {
      console.log("findSelection() - exception encountered:" + e);
      if (!previousException) { return findSelection(url, "firstnumber", selectionCustom, true); }
    }
    return {selection: "", selectionStart: -1};
  }

  /**
   * Validates the selection against the base and other parameters. Called by Popup and Saves.
   *
   * @param selection      the selection
   * @param base           the base
   * @param baseCase       the base case if the base is alphanumeric (11-36)
   * @param baseDateFormat the date format if the base is a date
   * @param baseCustom     the custom alphabet if the base is custom
   * @param leadingZeros   TODO
   * @returns {string} an empty string if validation passed, or an error message if validation failed
   * @public
   */
  function validateSelection(selection, base, baseCase, baseDateFormat, baseCustom, leadingZeros) {
    let error = "";
    switch (base) {
      case "date":
        const selectionDate = IncrementDecrementDate.incrementDecrementDate("increment", selection, 0, baseDateFormat);
        console.log("validateSelection() - selection=" + selection +", selectionDate=" + selectionDate);
        if (selectionDate !== selection) {
          error = chrome.i18n.getMessage("date_invalid_error");
        }
        break;
      case "custom":
        const selectionCustom = incrementDecrementBaseCustom("increment", selection, 0, baseCustom, leadingZeros);
        console.log("validateSelection() - selection=" + selection +", selectionCustom=" + selectionCustom);
        if (selectionCustom !== selection) {
          error = chrome.i18n.getMessage("base_custom_invalid_error");
        }
        break;
      default: // Base 2-36
        if (base < 2 || base > 36) {
          error = chrome.i18n.getMessage("base_invalid_error");
        } else if (!/^[a-z0-9]+$/i.test(selection)) {
          error = chrome.i18n.getMessage("selection_notalphanumeric_error");
        } else {
          const selectionInt = parseInt(selection, base);
          const selectionStr = selectionInt.toString(base);
          if (selectionInt >= Number.MAX_SAFE_INTEGER) {
            error = chrome.i18n.getMessage("selection_toolarge_error");
          } else if ((isNaN(selectionInt)) || (selection.toUpperCase() !== ("0".repeat(selection.length - selectionStr.length) + selectionStr.toUpperCase()))) {
            error = chrome.i18n.getMessage("selection_base_error");
          }
        }
        break;
    }
    return error;
  }

  /**
   * Handles an increment or decrement operation, acting as a controller.
   * The exact operation is dependant on the instance and can be a step thru URLs array or
   * incrementing / decrementing a URL depending on the the state of multi.
   *
   * @param action
   * @param instance
   * @public
   */
  function incrementDecrement(action, instance) {
    // If there is a urls array, step thru it, don't increment the URL (shuffle, multi range will have a urls array)
    if (instance.urls && instance.urls.length > 0) {
      IncrementDecrementArray.stepThruURLs(action, instance);
    }
    // If multi is enabled and doing a main action (no number), simultaneously increment multiple parts of the URL:
    else if (instance.multiEnabled && !/\d/.test(action)) {
      console.log("instance.multiEnabled=" + instance.multiEnabled + ", instance.mutliCount=" + instance.multiCount);
      for (let i = 1; i <= instance.multiCount; i++) {
        incrementDecrementURL(action + i, instance);
      }
    }
    // All Other Cases: Increment Decrement URL
    else {
      incrementDecrementURL(action, instance);
    }
  }

  /**
   * Increments or decrements a URL using an instance object that contains the URL
   * while performing error skipping.
   *
   * @param action               the action to perform (increment or decrement)
   * @param instance             the instance containing the URL and parameters used to increment or decrement
   * @param errorSkipRemaining   the number of times left to skip while performing this action
   * @public
   */
  function incrementDecrementErrorSkip(action, instance, errorSkipRemaining) {
    console.log("incrementDecrementErrorSkip() - instance.errorCodes=" + instance.errorCodes +", instance.errorCodesCustomEnabled=" + instance.errorCodesCustomEnabled + ", instance.errorCodesCustom=" + instance.errorCodesCustom  + ", errorSkipRemaining=" + errorSkipRemaining);
    incrementDecrement(action, instance);
    if (errorSkipRemaining > 0) {
      // fetch using credentials: same-origin to keep session/cookie state alive (to avoid redirect false flags e.g. after a user logs in to a website)
      // No need to check for CORS because we are running in the background in Enhanced Mode <all_urls> permissions)
      fetch(instance.url, { method: "HEAD", credentials: "same-origin" }).then(function(response) {
        if (response && response.status &&
            ((instance.errorCodes && (
            (instance.errorCodes.includes("404") && response.status === 404) ||
            (instance.errorCodes.includes("3XX") && ((response.status >= 300 && response.status <= 399) || response.redirected)) || // Note: 301,302,303,307,308 return response.status of 200 and must be checked by response.redirected
            (instance.errorCodes.includes("4XX") && response.status >= 400 && response.status <= 499) ||
            (instance.errorCodes.includes("5XX") && response.status >= 500 && response.status <= 599))) ||
            (instance.errorCodesCustomEnabled && instance.errorCodesCustom &&
            (instance.errorCodesCustom.includes(response.status + "") || (response.redirected && ["301", "302", "303", "307", "308"].some(redcode => instance.errorCodesCustom.includes(redcode))))))) { // response.status + "" because custom array stores string inputs
          console.log("incrementDecrementErrorSkip() - request.url= " + instance.url);
          console.log("incrementDecrementErrorSkip() - response.url=" + response.url);
          console.log("incrementDecrementErrorSkip() - skipping this URL because response.status was in errorCodes or response.redirected, response.status=" + response.status);
          if (!instance.autoEnabled) {
            Background.setBadge(instance.tabId, "skip", true, response.redirected ? "RED" : response.status + "");
          }
          // Recursively call this method again to perform the action again and skip this URL, decrementing errorSkipRemaining
          incrementDecrementErrorSkip(action, instance, errorSkipRemaining - 1);
        } else {
          console.log("incrementDecrementErrorSkip() - not attempting to skip this URL because response.status=" + response.status  + " and it was not in errorCodes. aborting and updating tab");
          if (instance.enabled) { // Don't store Quick Instances (Instance is never enabled in quick mode)
            Background.setInstance(instance.tabId, instance);
          }
          chrome.tabs.update(instance.tabId, {url: instance.url});
          chrome.runtime.sendMessage({greeting: "updatePopupInstance", instance: instance});
        }
      }).catch(e => {
        console.log("incrementDecrementErrorSkip() - a fetch() exception was caught:" + e);
        if (!instance.autoEnabled) {
          Background.setBadge(instance.tabId, "skip", true, "ERR");
        }
        // Recursively call this method again to perform the action again and skip this URL, decrementing errorSkipRemaining
        incrementDecrementErrorSkip(action, instance, errorSkipRemaining - 1);
      });
    } else {
      console.log("incrementDecrementErrorSkip() - we have exhausted the errorSkip attempts. aborting and updating tab ");
      if (instance.enabled) { // Don't store Quick Instances (Instance is never enabled in quick mode)
        Background.setInstance(instance.tabId, instance);
      }
      chrome.tabs.update(instance.tabId, {url: instance.url});
      chrome.runtime.sendMessage({greeting: "updatePopupInstance", instance: instance});
    }
  }

  /**
   * Increments or decrements a URL using an instance object that contains the URL.
   *
   * @param action   the action to perform (increment or decrement)
   * @param instance the instance containing the URL and parameters used to increment or decrement
   * @private
   */
  function incrementDecrementURL(action, instance) {
    IncrementDecrementMulti.multiPre(action, instance);
    const url = instance.url, selection = instance.selection, selectionStart = instance.selectionStart,
          interval = instance.interval, leadingZeros = instance.leadingZeros,
          base = instance.base, baseCase = instance.baseCase, baseDateFormat = instance.baseDateFormat, baseCustom = instance.baseCustom;
    let selectionmod;
    // Perform the increment or decrement operation depending on the base type
    switch(base) {
      case "date":
        selectionmod = IncrementDecrementDate.incrementDecrementDate(action, selection, interval, baseDateFormat);
        break;
      case "custom":
        selectionmod = incrementDecrementBaseCustom(action, selection, interval, baseCustom, leadingZeros);
        break;
      // case 2-36
      default:
        selectionmod = incrementDecrementAlphanumeric(action, selection, interval, base, baseCase, leadingZeros);
        break;
    }
    // Append: part 1 of the URL + modified selection + part 2 of the URL. (Note: We can't cache part1 and part2 at the beginning due to multi)
    const urlmod = url.substring(0, selectionStart) + selectionmod + url.substring(selectionStart + selection.length);
    IncrementDecrementMulti.multiPost(selectionmod, urlmod, instance);
    instance.url = urlmod;
    instance.selection = selectionmod;
  }

  /**
   * Performs a regular (alphanumeric) increment or decrement operation on the selection.
   *
   * @param action       the action (increment or decrement)
   * @param selection    the selected part to increment or decrement
   * @param interval     the amount to increment or decrement by
   * @param base         the base to use (the supported base range is 2-36, 10 is default/decimal)
   * @param baseCase     the base case to use for letters (lowercase or uppercase)
   * @param leadingZeros if true, pad with leading zeros, false don't pad
   * @returns {string} the modified selection after incrementing or decrementing it
   * @private
   */
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

  function incrementDecrementBaseCustom(action, selection, interval, alphabet, leadingZeros) {
    let selectionmod = "",
        base = alphabet.length,
        base10num = 0;
    // Part 1 Decode Base to Decimal
    for (let i = selection.length - 1, digit = 0; i >= 0; i--, digit++) {
      const num = alphabet.indexOf(selection[i]);
      base10num += num * (base ** digit);
      console.log("num=" + num);
      console.log("base10num=" + num);
    }
    console.log("base10num done decode=" + base10num);
    // Increment
    base10num += action.startsWith("increment") ? interval : -interval;
    // Part 2 Encode Decimal to Base
    if (base10num === 0) {
      selectionmod = alphabet[0];
    } else {
      while (base10num > 0) {
        const remainder = base10num % base;
        selectionmod = `${alphabet[remainder]}${selectionmod}`;
        base10num = Math.floor(base10num / base);
      }
    }
    // If selection starts with alphabet[0], pad with alphabet[0]s (the above algorithm disregards these and treats these as "Leading 0s")
    if (alphabet[0] !== '0' && selection.startsWith(alphabet[0]) && selection.length > selectionmod.length) {
      selectionmod = alphabet[0].repeat(new RegExp("^" + alphabet[0] + "+", "g").exec(selection)[0].length) + selectionmod;
    }
    // If Leading 0s, pad with 0s
    if (leadingZeros && selection.length > selectionmod.length) {
      selectionmod = "0".repeat(selection.length - selectionmod.length) + selectionmod;
    }
    console.log("base10num done encode=" + base10num);
    console.log("selectionmod=" + selectionmod);
    return selectionmod;
  }

  // Return Public Functions
  return {
    findSelection: findSelection,
    validateSelection: validateSelection,
    incrementDecrement: incrementDecrement,
    incrementDecrementErrorSkip: incrementDecrementErrorSkip
  };
})();

var IncrementDecrementMulti = (() => {

  /**
   * Pre-handles a multi-incrementing instance before incrementDecrementURL().
   *
   * @param action   the action (increment or decrement, for multi, this may have a 2 or 3 at the end e.g. increment3)
   * @param instance the instance to handle
   * @public
   */
  function multiPre(action, instance) {
    if (instance && instance.multiEnabled) {
      // Set the current instance properties with the multi part's properties for incrementDecrementURL()
      const match = /\d+/.exec(action),
            part = match ? match[0] : "";
      // multiPart is stored later for multiPost() so we don't have to execute the above regex again
      instance.multiPart = part;
      instance.selection = instance.multi[part].selection;
      instance.selectionStart = instance.multi[part].selectionStart;
      instance.interval = instance.multi[part].interval;
      instance.base = instance.multi[part].base;
      instance.baseCase = instance.multi[part].baseCase;
      instance.baseDateFormat = instance.multi[part].baseDateFormat;
      instance.leadingZeros = instance.multi[part].leadingZeros;
    }
  }

  /**
   * Post-handles a multi-incrementing instance after incrementDecrementURL().
   *
   * @param selectionmod the modified selection
   * @param urlmod       the modified URL
   * @param instance     the instance to handle
   * @public
   */
  function multiPost(selectionmod, urlmod, instance) {
    if (instance && instance.multiEnabled) {
      // Update the multi selection part's to the new selection
      instance.multi[instance.multiPart].selection = selectionmod;
      // If after incrementing/decrementing, the url length changed update the other parts' selectionStart
      //if (instance.url && instance.url.length !== urlmod.length) {
        const urlLengthDiff = instance.url.length - urlmod.length; // Handles both positive and negative changes (e.g. URL became shorter or longer)
        const thisPartSelectionStart = instance.multi[instance.multiPart].selectionStart;
        console.log("multiPost() - part=" + instance.multiPart + ", urlLengthDiff=" + urlLengthDiff + "thisPartSelectionStart=" + thisPartSelectionStart);
        for (let i = 1; i <= instance.multiCount; i++) {
          if (i !== instance.multiPart) {
            // If the i part comes after this part in the URL, adjust the selectionStarts of the i part
            if (instance.multi[i].selectionStart > thisPartSelectionStart) {
              console.log("multiPost() - adjusted part" + i + "'s selectionStart from: " + instance.multi[i].selectionStart + " to:" + (instance.multi[i].selectionStart - urlLengthDiff));
              instance.multi[i].selectionStart = instance.multi[i].selectionStart - urlLengthDiff;
            }
            // Adjust the other multi parts' selections in case they overlap with this multiPart's selection
            if (instance.multi[i].selectionStart === thisPartSelectionStart && instance.multi[i].selection.length === instance.multi[instance.multiPart].selection.length + urlLengthDiff) {
              instance.multi[i].selection = selectionmod;
            } else {
              instance.multi[i].selection = urlmod.substring(instance.multi[i].selectionStart, instance.multi[i].selectionStart + instance.multi[i].selection.length);
            }
          }
        }
      //}
    }
  }

  // Return Public Functions
  return {
    multiPre: multiPre,
    multiPost: multiPost
  };
})();

var IncrementDecrementDate = (() => {

  const mmm = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const mmmm = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

  /**
   * Performs an increment decrement operation on the date selection string.
   *
   * Legend -   y: year, m: month, d: day, h: hour, i: minute, s: second, l: millisecond
   * Patterns - yyyy | yy, mmmm | mmm | mm | m, dd | d, hh | h, ii | i, ss | s, ll | l
   * Examples - mm/dd/yyyy, dd-m-yyyy, mm/yy, hh:mm:ss
   *
   * @param action
   * @param selection
   * @param interval
   * @param dateFormat
   * @returns {string | *}
   * @public
   */
  function incrementDecrementDate(action, selection, interval, dateFormat) {
    console.log("incrementDecrementDate() - action=" + action + ", selection=" + selection + ", interval=" + interval + ", dateFormat=" + dateFormat);
    let selection2 = "";
    try {
      const parts = splitdateparts(selection, dateFormat);
      const date = str2date(parts.strParts, parts.dateFormatParts);
      const date2 = incdecdate(action, date, dateFormat, interval);
      selection2 = date2str(date2, dateFormat, parts.dateFormatParts);
    } catch(e) {
      console.log("IncrementDecrement.incrementDecrementDate() - exception encountered=" + e);
      selection2 = "DateError";
    }
    return selection2;
  }

  function splitdateparts(str, dateFormat) {
    const regexp = /(y+)|(m+)|(Mm+)|(M+)|(d+)|(h+)|(i+)|(l+)|([^ymMdhisl]+)/g;
    const matches = dateFormat.match(regexp);
    let delimiters = "";
    for (const match of matches) {
      if (/^(?![ymMdhisl])/.exec(match)) {
        delimiters += (delimiters ? "|" : "") + match;
      }
    }
    let dateFormatParts = [], strParts = [];
    if (delimiters !== "") {
      const delimitersregexp = new RegExp(delimiters, "g");
      dateFormatParts = dateFormat.split(delimitersregexp).filter(Boolean);
      strParts = str.split(delimitersregexp).filter(Boolean);
    } else {
      // Variable widths not allowed without delimiters: mmmm, Mmmm, MMMM, m, d, h, i, s, l
      dateFormatParts = matches;
      for (let i = 0, currPos = 0; i < dateFormatParts.length; i++) {
        strParts[i] = str.substr(currPos, dateFormatParts[i].length);
        currPos += dateFormatParts[i].length;
      }
    }
    return { "dateFormatParts": dateFormatParts, "strParts": strParts };
  }

  function str2date(strParts, dateFormatParts) {
    const now = new Date();
    const mapParts = new Map([["y", now.getFullYear()], ["m", now.getMonth() + 1], ["d", 15], ["h", 12], ["i", 0], ["s", 0], ["l", 0]]);
    for (let i = 0; i < dateFormatParts.length; i++) {
      switch(dateFormatParts[i]) {
        case "yyyy": mapParts.set("y", strParts[i]); break;
        case "yy":   mapParts.set("y", parseInt(strParts[i]) >= 70 ? "19" + strParts[i] : "20" + strParts[i]); break;
        case "mmmm": case "Mmmm": case"MMMM": mapParts.set("m", mmmm.findIndex(m => m === strParts[i].toLowerCase()) + 1); break;
        case "mmm": case"Mmm": case"MMM": mapParts.set("m", mmm.findIndex(m => m === strParts[i].toLowerCase()) + 1); break;
        case "mm":   mapParts.set("m", strParts[i]); break;
        case "m":    mapParts.set("m", strParts[i]); break;
        case "dd":   mapParts.set("d", strParts[i]); break;
        case "d":    mapParts.set("d", strParts[i]); break;
        case "hh":   mapParts.set("h", strParts[i]); break;
        case "h":    mapParts.set("h", strParts[i]); break;
        case "ii":   mapParts.set("i", strParts[i]); break;
        case "i":    mapParts.set("i", strParts[i]); break;
        case "ss":   mapParts.set("s", strParts[i]); break;
        case "s":    mapParts.set("s", strParts[i]); break;
        case "ll":   mapParts.set("l", strParts[i]); break;
        case "l":    mapParts.set("l", strParts[i]); break;
        default: break;
      }
    }
    return new Date(mapParts.get("y"), mapParts.get("m") - 1, mapParts.get("d"), mapParts.get("h"), mapParts.get("i"), mapParts.get("s"), mapParts.get("l"));
  }

  // @see https://stackoverflow.com/a/39196460
  function incdecdate(action, date, dateFormat, interval) {
    interval = action.startsWith("increment") ? interval : -interval;
    const lowestregexp = /(l|(s|i|h|d|M|m|y(?!.*m))(?!.*M)(?!.*d)(?!.*h)(?!.*i)(?!.*s)(?!.*l))/;
    const lowestmatch = lowestregexp.exec(dateFormat)[0];
    switch(lowestmatch) {
      case "l": date.setMilliseconds(date.getMilliseconds() + interval); break;
      case "s": date.setSeconds(date.getSeconds() + interval); break;
      case "i": date.setMinutes(date.getMinutes() + interval); break;
      case "h": date.setHours(date.getHours() + interval); break;
      case "d": date.setDate(date.getDate() + interval); break;
      case "m": case "M": date = new Date(date.getFullYear(), date.getMonth() + interval); break;
      case "y": date.setFullYear(date.getFullYear() + interval); break;
      default: break;
    }
    return date;
  }

  function date2str(date, dateFormat, dateFormatParts) {
    let str = dateFormat;
    for (let i = 0; i < dateFormatParts.length; i++) {
      switch (dateFormatParts[i]) {
        case "yyyy": str = str.replace(dateFormatParts[i], date.getFullYear()); break;
        case "yy":   str = str.replace(dateFormatParts[i], (date.getFullYear() + "").substring(2)); break;
        case "mmmm": str = str.replace(dateFormatParts[i], mmmm[date.getMonth()]); break;
        case "Mmmm": str = str.replace(dateFormatParts[i], mmmm[date.getMonth()][0].toUpperCase() + mmmm[date.getMonth()].substring(1)); break;
        case "MMMM": str = str.replace(dateFormatParts[i], mmmm[date.getMonth()].toUpperCase()); break;
        case "mmm":  str = str.replace(dateFormatParts[i], mmm[date.getMonth()]); break;
        case "Mmm":  str = str.replace(dateFormatParts[i], mmm[date.getMonth()][0].toUpperCase() + mmm[date.getMonth()].substring(1)); break;
        case "MMM":  str = str.replace(dateFormatParts[i], mmm[date.getMonth()].toUpperCase()); break;
        case "mm":   str = str.replace(dateFormatParts[i], (date.getMonth() + 1) < 10 ? "0" + (date.getMonth() + 1) : (date.getMonth() + 1)); break;
        case "m":    str = str.replace(dateFormatParts[i], date.getMonth() + 1); break;
        case "dd":   str = str.replace(dateFormatParts[i], date.getDate() < 10 ? "0" + date.getDate() : date.getDate()); break;
        case "d":    str = str.replace(dateFormatParts[i], date.getDate()); break;
        case "hh":   str = str.replace(dateFormatParts[i], date.getHours() < 10 ? "0" + date.getHours() : date.getHours()); break;
        case "h":    str = str.replace(dateFormatParts[i], date.getHours()); break;
        case "ii":   str = str.replace(dateFormatParts[i], date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes()); break;
        case "i":    str = str.replace(dateFormatParts[i], date.getMinutes()); break;
        case "ss":   str = str.replace(dateFormatParts[i], date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds()); break;
        case "s":    str = str.replace(dateFormatParts[i], date.getSeconds()); break;
        case "ll":   str = str.replace(dateFormatParts[i], "0".repeat(3 - (date.getMilliseconds() + "").length) + date.getMilliseconds()); break;
        case "l":    str = str.replace(dateFormatParts[i], date.getMilliseconds()); break;
        default: break;
      }
    }
    return str;
  }

  // Return Public Functions
  return {
    incrementDecrementDate: incrementDecrementDate
  };
})();

var IncrementDecrementArray = (() => {

  /**
   * Steps to the next or previous position in the URLs array.
   * This is used instead of incrementDecrementURL, for example when there is a URLs array (e.g. when Shuffle Mode is enabled).
   *
   * @param action   the action (increment moves forward, decrement moves backward in the array)
   * @param instance the instance containing the URLs array
   * @public
   */
  function stepThruURLs(action, instance) {
    // console.log("stepThruURLs() - performing increment/decrement on the urls array...");
    const urlsLength = instance.urls.length;
   // console.log("stepThruURLs() - action === instance.autoAction=" + (action === instance.autoAction) + ", action=" + action);
   // console.log("stepThruURLs() - instance.urlsCurrentIndex + 1 < urlsLength=" + (instance.urlsCurrentIndex + 1 < urlsLength) +", instance.urlsCurrentIndex=" + instance.urlsCurrentIndex + ", urlsLength=" + urlsLength);
    // Get the urlProps object from the next or previous position in the urls array and update the instance
    const urlProps =
      (!instance.autoEnabled && action === "increment") || (action === instance.autoAction) ?
        instance.urls[instance.urlsCurrentIndex + 1 < urlsLength ? !instance.autoEnabled ? ++instance.urlsCurrentIndex : instance.urlsCurrentIndex++ : urlsLength - 1] :
        instance.urls[instance.urlsCurrentIndex - 1 >= 0 ? !instance.autoEnabled ? --instance.urlsCurrentIndex : instance.urlsCurrentIndex-- : 0];
    instance.url = urlProps.urlmod;
    instance.selection = urlProps.selectionmod;
  }

  /**
   * Pre-calculates an array of URLs.
   *
   * @param instance
   * @returns {{urls: Array, currentIndex: number}}
   * @public
   */
  function precalculateURLs(instance) {
    console.log("precalculateURLs() - precalculating URLs for an instance that is " + (instance.toolkitEnabled ?  "toolkitEnabled" : instance.autoEnabled ? "autoEnabled" : "normal"));
    let urls = [], currentIndex = 0;
    if (instance.multiRangeEnabled || instance.toolkitEnabled || instance.shuffleURLs) {
      // Custom URLs are treated the same in all modes
      if (instance.toolkitEnabled) {
        urls = buildURLs(instance, instance.toolkitAction, instance.toolkitQuantity);
      } else if (instance.autoEnabled) {
        urls = buildURLs(instance, instance.autoAction, instance.autoTimes);
      } else {
        const shuffleLimit = instance.shuffleLimit; // Promisify.getItems().shuffleLimit;
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
    console.log("buildURLs() - instance.url=" + instance.url + ", instance.selection=" + instance.selection + ", action=" + action + ", limit=" + limit);
    const urls = [],
          url = instance.url,
          selection = instance.selection;
    // If Toolkit Generate URLs first include the original URL for completeness and include it in the limit
    if (instance.toolkitEnabled && (instance.toolkitTool === "links" || instance.toolkitTool === "crawl")) {
      urls.push({"urlmod": url, "selectionmod": selection});
      limit--;
    }
    if (instance.multiEnabled && instance.multiRangeEnabled) {
      buildMultiRangeURLs(instance, action, urls);
    } else {
      for (let i = 0; i < limit; i++) {
        IncrementDecrement.incrementDecrement(action, instance);
        urls.push({"urlmod": instance.url, "selectionmod": instance.selection});
        // Only exit if base is numeric and beyond bounds
        if (!isNaN(instance.base)) {
          const selectionint = parseInt(instance.selection, instance.base);
          if (selectionint <= 0 || selectionint >= Number.MAX_SAFE_INTEGER) {
            break;
          }
        }
      }
    }
    if (instance.shuffleURLs) {
      shuffle(urls);
    }
    // Reset instance url and selection after calling incrementDecrement():
    instance.url = url;
    instance.selection = selection;
    return urls;
  }

  function buildMultiRangeURLs(instance, action, urls) {
    // Change each multi part's selectionStart to the non-range URL, then update the instance's url to the final non-range URL
    for (let i = 1; i <= instance.multiCount; i++) {
      const urlmod = instance.url.replace(instance.multi[i].range[0], instance.multi[i].range[1]);
      const selectionmod = instance.multi[i].range[1];
      IncrementDecrementMulti.multiPre(action + i, instance);
      IncrementDecrementMulti.multiPost(selectionmod, urlmod, instance);
      instance.multi[i].startingSelectionStart = instance.multi[i].selectionStart;
      instance.url = urlmod;
    }

    // Change the urls array first url to the non-range URL
    urls[0] =  { "urlmod": instance.url, "selectionmod": ""};

    // Build out the multi range urls array... this is EXTREMELY complicated
    const preurl1 = instance.url;
    for (let i = 0; i < instance.multi[1].times; i++) {
      const press1 = instance.multi[1].selectionStart;
      const press2 = instance.multi[2].selectionStart;
      const press3 = instance.multi[3].selectionStart;
      const preurl2 = instance.url;
      for (let j = 0; j < instance.multi[2].times; j++) {
        const preurl3 = instance.url;
        for (let k = 0; k < instance.multi[3].times - 1; k++) {
          IncrementDecrement.incrementDecrement(action + "3", instance);
          urls.push({"urlmod": instance.url, "selectionmod": instance.selection});
        }
        instance.url = preurl3;
        instance.multi[2].selectionStart = press2;
        if (j !== instance.multi[2].times - 1) {
          IncrementDecrement.incrementDecrement(action + "2", instance);
          urls.push({"urlmod": instance.url, "selectionmod": instance.selection});
        }
        instance.multi[3].selection = instance.multi[3].startingSelection;
      }
      instance.url = preurl2;
      instance.multi[2].selection = instance.multi[2].startingSelection;
      instance.multi[1].selectionStart = press1;
      instance.multi[2].selectionStart = press2;
      instance.multi[3].selectionStart = press3;
      if (i !== instance.multi[1].times - 1) {
        IncrementDecrement.incrementDecrement(action + "1", instance);
        urls.push({"urlmod": instance.url, "selectionmod": instance.selection});
      }
    }
    instance.url = preurl1;
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
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Return Public Functions
  return {
    stepThruURLs: stepThruURLs,
    precalculateURLs: precalculateURLs,
  };
})();