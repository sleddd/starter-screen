/**
 * prefs-to-js.js — copies prefs.json into prefs.js as `window.PREFS = {...}`.
 *
 * Browsers won't let a page opened from disk read a .json file, but they all
 * load a .js file through a <script> tag. index.html loads prefs.js, so every
 * browser (Safari included) gets the same favorites and settings.
 *
 * Runs automatically whenever prefs.json changes (macOS LaunchAgent
 * com.mymomentum.prefs). By hand:  node prefs-to-js.js
 */

var fs = require("node:fs");
var path = require("node:path");

var src = path.join(__dirname, "prefs.json");
var out = path.join(__dirname, "prefs.js");

var prefs;
try {
  prefs = JSON.parse(fs.readFileSync(src, "utf8"));
} catch (e) {
  // Half-written or broken file: leave the last good prefs.js alone.
  console.error("prefs.json unreadable, prefs.js not updated:", e.message);
  process.exit(0);
}

var js = "/* Generated from prefs.json by prefs-to-js.js. Don't edit; edit prefs.json. */\n" +
         "window.PREFS = " + JSON.stringify(prefs, null, 2) + ";\n";

var tmp = out + ".tmp";
fs.writeFileSync(tmp, js);
fs.renameSync(tmp, out);
