/**
 * fetch-photos.js — single source of truth for background photos.
 *
 * index.html loads this file with a plain <script src> tag (no modules,
 * no server) and calls getRandomPhoto() on every page load. Nothing about
 * photos is defined in the HTML: edit the list below and the page picks it
 * up the next time you open a tab.
 */

/* Your Unsplash Access Key. */
var UNSPLASH_ACCESS_KEY = "GzLsZoJtn2JVoS1xIOE1IJikGPgi650IM-E_Pn-pENs";

/* Topic -> the caption shown on screen. Edit freely; add or remove lines.
   `q` is what gets searched, `label` is what you see bottom-left. */
var TOPICS = [
  { q: "africa landscape background",          label: "Africa" },
  { q: "kenya savanna background",             label: "Kenya" },
  { q: "maldives mauritius background",        label: "Mauritius" },
  { q: "canary islands background",            label: "Canary Islands" },
  { q: "greece background",                    label: "Greece" },
  { q: "greece islands background",            label: "Greek Islands" },
  { q: "italy coast background",               label: "Italy" },
  { q: "italy amalfi background",              label: "Amalfi Coast, Italy" },
  { q: "spannish coast background",              label: "Spain" },
  { q: "spain canary islands background",      label: "Canary Islands, Spain" },
  { q: "south africa coast background",        label: "South Africa" },
  { q: "cape town south africa background", label: "Cape Town, South Africa"},
  { q: "lamu island kenya background",       label: "Lamu Island, Kenya"},
  { q: "tropical island background",           label: "Tropical Island" },
  { q: "kenya beach background",               label: "Kenya Beach" },  
  { q: "hawaii background",                    label: "Hawaii" },
  { q: "kauai hawaii background",              label: "Kauai, Hawaii" },
  { q: "surfing background",                   label: "Surf" },
  { q: "skateboarding background",             label: "Skate" },
  { q: "big sur california background",        label: "Big Sur, California" },
  { q: "california coast background",          label: "California" },
];

/* Favorited photos.
   Paste the contents of a downloaded favorites.json in here to seed the
   list; the heart in the page adds to it from there. Reading the .json
   file directly isn't possible when the page is opened from disk —
   Safari blocks fetch() on file:// URLs — so the list lives here. */
var FAVORITES = [];

/**
 * Fetch one random photo from one random topic.
 * Returns a Promise resolving to {url, label, by, link}.
 */
function getRandomPhoto() {
  var topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];

  function search(page) {
    var api = "https://api.unsplash.com/search/photos"
            + "?query=" + encodeURIComponent(topic.q)
            + "&per_page=30&page=" + page
            + "&orientation=landscape&content_filter=high";

    return fetch(api, {
      headers: { Authorization: "Client-ID " + UNSPLASH_ACCESS_KEY, "Accept-Version": "v1" }
    })
    .then(function (res) {
      if (res.status === 401) throw new Error("Unsplash rejected the access key");
      if (res.status === 403) throw new Error("Unsplash hourly rate limit reached (50/hr)");
      if (!res.ok) throw new Error("Unsplash HTTP " + res.status);
      return res.json();
    });
  }

  // One request per photo. 30 results is plenty to pick from, and page 1
  // always exists — asking for a random page risks landing past the end of
  // a narrow topic, and costs a second request against the hourly quota.
  return search(1)
  .then(function (data) {
    var results = (data && data.results) || [];
    if (!results.length) throw new Error('no results for "' + topic.q + '"');

    var p = results[Math.floor(Math.random() * results.length)];
    var urls = p.urls || {};

    // Background: cropped to fill the screen.
    var url = urls.raw
      ? urls.raw + "&auto=format&fit=crop&w=2400&q=80"
      : (urls.full || urls.regular);
    if (!url) throw new Error("no image url in result");

    // Thumbnail: the WHOLE photo, uncropped, just scaled down. Built from
    // the raw URL so no crop is ever baked in — `fit=max` never cuts the
    // image, it only shrinks it to fit inside the box.
    var thumb = urls.raw
      ? urls.raw + "&auto=format&fit=max&w=400&q=60"
      : (urls.small || urls.thumb || url);

    return {
      url:   url,
      thumb: thumb,
      label: topic.label,          // caption comes from the query that found it
      by:    (p.user && p.user.name) || "",
      link:  (p.links && p.links.html) || ""
    };
  });
}
