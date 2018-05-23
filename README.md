# URL Incrementer

URLI ("yur-lee") lets you "Increment" [+] a URL or go to the "Next" [>] URL. For example, if the URL has a "page=1" in it, URLI can get you to "page=2" quickly and conveniently. You can use it on gallery or thumbnail websites, forums, or any site that keeps its URLs organized sequentially. It has a ton of features, but it is a lightweight extension (under 300KB unzipped!) and its core increment functionality doesn't require any special permissions from you.

To start using URLI right away, click the extension icon and select the number in the URL you want to increment. You can then either toggle on AUTO if you want to let URLI Auto-Increment for you or just hit Accept and increment yourself by pressing the [+] button or via Keyboard Shortcuts. Tip!: URLI can also increment quickly via shortcuts, just make sure "Quick Shortcuts" is checked in the Options.

Features:
- Auto Incrementing
- Download** (Auto Incrementer Downloader) [Experimental] (Requires Extra Permissions)
- Increment [+] Decrement [-]
- Next [>] Prev [<]
- Chrome Shortcuts
- Internal Keyboard and Mouse Button Shortcuts (Requires Extra Permissions)
- Many Options (Alphanumeric Incrementing, Selection algorithms, Interval, Leading Zeros... and so much more)
- Safe, Open-Source, NO Ads, NO Bloat, and Requires NO permissions for core incrementing functionality

**Download is an optional and "experimental" feature that's intended to be used with Auto mode. URLI can use both its advanced Auto-Incrementing capabilities with a rudimentary Downloader to offer a one-of-a-kind Auto Incrementer Downloader! It's still rough around the edges, so I ask for your patience as I work hard to get it up to snuff. Thank you very much for understanding!

A note from me if you were using URLI prior to Version 5:
I really hope you like Version 5. I tried hard to go back to URLI's roots in 5.0 and undo the Version 3 issues that was not met with a lot of positivity.

I know this is going to sound cliche, but ... without "U" there is no URLI. Thank you for letting URLI play a small part in assisting you in your Chrome browser experience.

What's New in Version 5.0 (May 31, 2018)
- NEW Name: The extension name was changed from "URL Plus" back to "URL Incrementer" (URLI's original name!).
- NEW Look: New extension icon and more intuitive, color-coded circle buttons that match URLI's early versions! (Blue for Increment/Decrement, Green for Next/Prev, Red for Clear, Orange for Auto, and Purple for Download)
- NEW Auto Increment function: Supports Multiple Tabs and it also has Pause/Resume functionality! Hooray for no more manual incrementing! (Unless you still want to!)
- NEW Download (Auto Incrementer Downloader) function [Experimental]: Added to URLI so that with Auto, you can have your own "Auto Incrementer Downloader," combining URLI's sophisticated Auto Incrementing functionality with rudimentary Downloading! =) This feature is completely optional and requires your permissions to enable it.
- MANY options added: Change the extension icon, adjust the button sizes, get icon feedback when incrementing, and add Next Prev buttons to the Popup UI (...only if you want to!)
- MANY convenience enhancements: Now saves changes you make in Popup UI, automatically brings up the Setup panel if the URL hasn't been setup, and better support for selecting the part of the URL (now includes touch support!)
- IMPROVED Increment Decrement selection algorithm to look for common terms like "page=" first so the number pre-selected by URLI is more likely to be "correct"
- IMPROVED Next Prev functionality for MUCH better link accuracy (way better DOM parsing)
- IMPROVED Internal Shortcuts: Updated KeyboardEvent: "keyCode" to "code" and MouseEvent: "which" to "button" and also now supports modifier keys as shortcuts (e.g. "Shift" can be used by itself now)
- IMPROVED Permissions: Permissions for features (Internal Shortcuts, Next Prev, Download) are now modularized and separate so you can grant and enable only the features you want to
- IMPROVED Internal code: Better tab instance memory management (now using JavaScript Map instead of array) + numerous minor bugfixes
- NOTE: The options had to be reset due to this major update and the way URLI now modularizes permissions for each feature. I'm very sorry for the inconvenience!

Special Thanks:
NickMWPrince, Blue, Blue Chan, Will, Adam C, Coolio Wolfus

... and "U" for using "URLI"! :)