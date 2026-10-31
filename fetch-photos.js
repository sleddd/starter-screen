/**
 * fetch-photos.js — single source of truth for background photos.
 *
 * index.html loads this file with a plain <script src> tag (no modules,
 * no server) and calls getRandomPhoto() on every page load. Nothing about
 * photos is defined in the HTML: edit the list below and the page picks it
 * up the next time you open a tab.
 */

/* Your Unsplash Access Key. */
var UNSPLASH_ACCESS_KEY = "i3F6HGaeCMQW7nnXEen3rHLv-QUTtpeTMbEt2J8QjUA";

/* Topic -> the caption shown on screen. Edit freely; add or remove lines.
   `q` is what gets searched, `label` is what you see bottom-left.
   Topics with a `season` only show up during that season (northern
   hemisphere) and make up about 45% of photos while it's on; the rest come
   from the year-round nature, paradise and hawaii lists. */
var TOPICS = [
  // ---------- year-round: landscapes ----------
  { q: "mountain landscape",                   label: "nature" },
  { q: "mountain peaks sunset",                label: "nature" },
  { q: "sunrise over mountains",               label: "nature" },
  { q: "alpine lake",                          label: "nature" },
  { q: "mountain lake reflection",             label: "nature" },
  { q: "mountain valley view",                 label: "nature" },
  { q: "dolomites landscape",                  label: "nature" },
  { q: "swiss alps landscape",                 label: "nature" },
  { q: "patagonia mountains",                  label: "nature" },
  { q: "norway fjord",                         label: "nature" },
  { q: "lofoten islands",                      label: "nature" },
  { q: "new zealand landscape",                label: "nature" },
  { q: "banff lake",                           label: "nature" },
  { q: "yosemite valley",                      label: "nature" },
  { q: "scottish highlands landscape",         label: "nature" },
  { q: "alaska mountains",                     label: "nature" },
  { q: "glacier lake mountains",               label: "nature" },
  { q: "iceland landscape",                    label: "nature" },
  { q: "iceland waterfall",                    label: "nature" },
  { q: "waterfall mountain landscape",         label: "nature" },
  { q: "green valley mountains",               label: "nature" },
  { q: "rolling green hills",                  label: "nature" },
  { q: "big sur coast",                        label: "nature" },
  { q: "cliffs ocean coastline",               label: "nature" },
  { q: "blue sky mountain landscape",          label: "nature" },

  // ---------- year-round: tropical & paradise ----------
  { q: "tropical island mountains",            label: "paradise" },
  { q: "tropical beach mountains",             label: "paradise" },
  { q: "turquoise lagoon mountains",           label: "paradise" },
  { q: "bora bora lagoon",                     label: "paradise" },
  { q: "moorea tahiti",                        label: "paradise" },
  { q: "seychelles beach",                     label: "paradise" },
  { q: "phi phi islands",                      label: "paradise" },
  { q: "el nido palawan",                      label: "paradise" },
  { q: "tropical coast cliffs",                label: "paradise" },
  { q: "palm trees sunset beach",              label: "paradise" },
  { q: "tropical waterfall jungle",            label: "paradise" },
  { q: "bali rice terraces",                   label: "paradise" },

  // ---------- year-round: hawaii ----------
  { q: "na pali coast",                        label: "hawaii" },
  { q: "kauai landscape",                      label: "hawaii" },
  { q: "maui coastline",                       label: "hawaii" },
  { q: "oahu mountains",                       label: "hawaii" },
  { q: "hawaii coast mountains",               label: "hawaii" },
  { q: "road to hana",                         label: "hawaii" },
  { q: "hawaii waterfall",                     label: "hawaii" },
  { q: "hawaii sunset ocean",                  label: "hawaii" },
  { q: "big island hawaii coast",              label: "hawaii" },

  // ---------- autumn (Sep - Nov) ----------
  { q: "autumn mountain landscape",            label: "autumn", season: "autumn" },
  { q: "fall colors mountain",                 label: "autumn", season: "autumn" },
  { q: "autumn valley view",                   label: "autumn", season: "autumn" },
  { q: "autumn lake reflection",               label: "autumn", season: "autumn" },
  { q: "autumn lake mountains",                label: "autumn", season: "autumn" },
  { q: "aspen mountain landscape",             label: "autumn", season: "autumn" },
  { q: "new england fall foliage",             label: "autumn", season: "autumn" },
  { q: "autumn river valley",                  label: "autumn", season: "autumn" },
  { q: "autumn waterfall",                     label: "autumn", season: "autumn" },
  { q: "autumn hills landscape",               label: "autumn", season: "autumn" },
  { q: "dolomites autumn",                     label: "autumn", season: "autumn" },

  // ---------- winter (Dec - Feb) ----------
  { q: "snowy mountain landscape",             label: "winter", season: "winter" },
  { q: "snow covered mountains sunrise",       label: "winter", season: "winter" },
  { q: "frozen lake mountains",                label: "winter", season: "winter" },
  { q: "winter mountain valley",               label: "winter", season: "winter" },
  { q: "lapland winter landscape",             label: "winter", season: "winter" },

  // ---------- spring (Mar - May) ----------
  { q: "cherry blossom landscape",             label: "spring", season: "spring" },
  { q: "wildflower meadow mountains",          label: "spring", season: "spring" },
  { q: "green valley spring",                  label: "spring", season: "spring" },

  // ---------- summer (Jun - Aug) ----------
  { q: "alpine meadow summer",                 label: "summer", season: "summer" },
  { q: "lavender field sunset",                label: "summer", season: "summer" },
  { q: "summer lake mountains",                label: "summer", season: "summer" }
];

/* Never show these. The thumbs-down button adds to this list for you (it's
   saved in prefs.json as "blocked", and the gear menu can undo entries);
   anything typed here is blocked too.
     photos: Unsplash photo ids            topics: a `q` from the list above
     labels: a whole caption (e.g. "hawaii") words:  any word in a photo's
                                                     description, e.g. "fog" */
var BLOCKED = { photos: [], topics: [], labels: [], words: [] };

/* Starting favorites, used only when a browser has none saved yet.
   Saved favorites and settings live in prefs.json (browsers read it
   through prefs.js). */
var FAVORITES = [];

/**
 * Fetch one random photo from one random topic.
 * Returns a Promise resolving to {url, label, by, link}.
 */
function currentSeason() {
  var m = new Date().getMonth();          // 0 = January
  return m >= 2 && m <= 4 ? "spring" : m >= 5 && m <= 7 ? "summer"
       : m >= 8 && m <= 10 ? "autumn" : "winter";
}

/* Pick a topic: ~45% from this season's list; otherwise year-round, split
   evenly between its labels (nature / paradise / hawaii) however long each
   list is. */
function pickTopic() {
  var season = currentSeason(), seasonal = [], byLabel = {}, bl = blockList();
  TOPICS.forEach(function (t) {
    if (topicBlocked(t, bl)) return;
    if (!t.season) (byLabel[t.label] = byLabel[t.label] || []).push(t);
    else if (t.season === season) seasonal.push(t);
  });
  var list = seasonal, labels = Object.keys(byLabel);
  if (labels.length && (!seasonal.length || Math.random() >= 0.45)) {
    list = byLabel[labels[Math.floor(Math.random() * labels.length)]];
  }
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
}

/* The thumbs-down list: BLOCKED above plus what's been saved from the page
   (localStorage "sp_blocked", mirrored from prefs.json). */
function blockList() {
  var saved = readJSON("sp_blocked", {}), bl = {};
  ["photos", "topics", "labels", "words"].forEach(function (k) {
    bl[k] = (BLOCKED[k] || []).concat(Array.isArray(saved[k]) ? saved[k] : []);
  });
  var words = bl.words.filter(Boolean).map(function (w) {
    return String(w).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  });
  bl.wordRe = words.length ? new RegExp("\\b(" + words.join("|") + ")s?\\b", "i") : null;
  return bl;
}
function topicBlocked(t, bl) {
  return bl.topics.indexOf(t.q) !== -1 || bl.labels.indexOf(t.label) !== -1 ||
         !!(bl.wordRe && bl.wordRe.test(t.q));
}
function isBlocked(photo, bl) {
  bl = bl || blockList();
  return bl.photos.indexOf(photo.id || photo.url) !== -1 ||
         (photo.topic && bl.topics.indexOf(photo.topic) !== -1) ||
         (photo.label && bl.labels.indexOf(photo.label) !== -1) ||
         !!(bl.wordRe && bl.wordRe.test((photo.desc || "") + " " + (photo.topic || "")));
}

/* Only proper desktop wallpapers: big, wide, editor-picked, in colour, and
   scenery with no people, cities, deserts or canyons. Unsplash
   has no "no people" switch, so this reads each photo's description and its
   URL slug (e.g. "a-woman-walking-on-a-beach-...") for giveaway words. */
var NOT_SCENERY = new RegExp("\\b(" + [
  // people
  "man", "men", "woman", "women", "person", "persons", "people", "guy", "guys",
  "lady", "ladies", "boy", "boys", "girl", "girls", "child", "children", "kids?",
  "baby", "family", "crowd", "couple(?! of)", "friends", "tourists?", "hikers?",
  "divers?", "swimmers?", "surfers?", "climbers?", "models?", "portrait",
  "selfie", "silhouette", "hands?", "feet", "wedding", "bride",
  // cities and buildings
  "city", "cities", "cityscape", "skyline", "skyscrapers?", "buildings?",
  "downtown", "urban", "streets?", "towns?", "village", "traffic",
  "roofs?", "rooftops?", "houses", "neighbou?rhoods?", "residential", "suburbs?",
  "suburban", "grid", "blocks", "apartments?", "roads? intersection", "intersections?",
  "parking", "highways?", "freeway", "harbou?r", "port", "marina",
  "cars?", "text", "logo", "signs?", "cross", "statue",
  // deserts and canyons
  "deserts?", "canyons?", "dunes?", "arid", "mesas?", "badlands", "cactus", "cacti",
  // not colour photos / not scenery
  "grayscale", "gray scale", "black and white", "monochrome", "underwater"
].join("|") + ")\\b", "i");

/* Landscapes only: a view with depth, not the inside of a forest, a
   close-up, a top-down aerial, or a flat strip of sand and sea.
   - LANDSCAPE: the description must name something you'd see in a vista.
   - AERIAL / CLOSE: shot from above, or too close to be a view.
   - SHORELINE + DEPTH: beach and ocean shots need something with height. */
var LANDSCAPE = /\b(mountains?|hills?|hillside|valley|lakes?|river|cliffs?|sky|horizon|islands?|bay|fjord|waterfalls?|falls|peaks?|meadow|fields?|landscape|scenery|scenic|view|vista|glacier|volcano|sunset|sunrise|clouds?|coast|coastline|lagoon|terraces?)\b/i;
var AERIAL_OR_CLOSE = /\b(aerial|drone|bird'?s eye|top view|from above|overhead|close up|closeup|macro|trunks?|bark|bokeh|shallow focus)\b/i;
var SHORELINE = /\b(beach|beaches|shore|seashore|seaside|shoreline|sand|ocean|sea|waves?)\b/i;
var HAS_HEIGHT = /\b(mountains?|hills?|cliffs?|islands?|rocks?|rocky|boulders?|palms?|palm trees?|peaks?|volcano|headland)\b/i;
function isLandscape(desc) {
  if (!LANDSCAPE.test(desc) || AERIAL_OR_CLOSE.test(desc)) return false;
  if (SHORELINE.test(desc) && !HAS_HEIGHT.test(desc)) return false;
  return true;
}

/* Palm trees are fine as part of a beach or island scene, but not on their
   own (e.g. "green coconut trees under blue sky"). */
var PALMS = /\b(palms?|palm trees?|coconut( trees?)?)\b/i;
var SCENE = /\b(beach|beaches|sea|seashore|seaside|shore|shoreline|coast|coastline|ocean|water|lagoon|island|bay|cove|sand|mountains?|hills?|valley|waterfall|lake|river|sunset|sunrise|horizon)\b/i;
function onlyPalms(desc) { return PALMS.test(desc) && !SCENE.test(desc); }

/* Well-exposed, colourful photos only: no dark, foggy, washed-out,
   overexposed or moody shots.
   Each result carries a "blurhash" (a tiny blurred preview); its first
   colour is the photo's true average colour. Gloomy shots are dark or
   nearly colourless; good desktop photos are bright AND colourful.
   Tuned on real results: fog forests and grey storm mountains score under
   0.12 saturation, sunny valleys and beaches 0.18+. */
var GLOOMY = /\b(fog|fogs|foggy|mist|misty|haze|hazy|moody|dark|darkness|gloomy|overcast|storm|stormy|night|infrared|overexposed|high key|faded)\b/i;
var MIN_BRIGHTNESS = 0.45;   // 0 = black, 1 = white
var MAX_BRIGHTNESS = 0.82;   // above this reads as blown-out / overexposed
var MIN_COLOUR     = 0.15;   // 0 = grey, 1 = fully saturated

var B83 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~";
function averageColour(p) {
  var h = p.blur_hash, rgb;
  if (h && h.length >= 6) {
    var v = 0;
    for (var i = 2; i < 6; i++) v = v * 83 + B83.indexOf(h[i]);
    rgb = [v >> 16, (v >> 8) & 255, v & 255];
  } else {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(p.color || "");
    if (!m) return null;
    rgb = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  }
  return rgb;
}
function brightEnough(p) {
  var rgb = averageColour(p);
  if (!rgb) return true;
  function lin(c) { c /= 255; return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }
  var bright = Math.pow(.2126 * lin(rgb[0]) + .7152 * lin(rgb[1]) + .0722 * lin(rgb[2]), 1 / 2.2);
  var max = Math.max.apply(null, rgb), min = Math.min.apply(null, rgb);
  var colour = max ? (max - min) / max : 0;
  if (bright < MIN_BRIGHTNESS || bright > MAX_BRIGHTNESS) return false;  // too dark / overexposed
  if (colour < MIN_COLOUR) return false;                                // grey, washed out
  if (bright > .7 && colour < .2) return false;                         // bright and colourless: hazy, blown highlights
  return true;
}

function describe(p) {
  var slugs = p.alternative_slugs ? Object.keys(p.alternative_slugs).map(function (k) { return p.alternative_slugs[k]; }) : [];
  return [p.alt_description, p.description, p.slug].concat(slugs)
    .filter(Boolean).join(" ").replace(/-/g, " ");
}

/* Editor-picked only. Unsplash's editors hand-pick photos to feature on
   the site (promoted_at) or accept them into curated topics such as Nature
   and Wallpapers (topic_submissions: approved). In practice that's the line
   between proper landscape photography and phone snapshots. */
function editorPicked(p) {
  if (p.promoted_at) return true;
  var ts = p.topic_submissions || {};
  return Object.keys(ts).some(function (k) { return ts[k] && ts[k].status === "approved"; });
}

function bestPhotos(results) {
  var best = results.filter(function (p) {
    var ratio = p.width / p.height, desc = describe(p);
    return editorPicked(p) && p.width >= 3000 &&
           ratio >= 1.3 && ratio <= 2.4 && brightEnough(p) &&
           !NOT_SCENERY.test(desc) && !GLOOMY.test(desc) && !onlyPalms(desc) &&
           isLandscape(desc);
  });
  best.sort(function (a, b) { return b.likes - a.likes; });
  return best.slice(0, 10);   // empty -> the page tries another topic
}

/* Turn an Unsplash result into what the page shows. */
function toPhoto(p, topic) {
  var urls = p.urls || {};

  // Background: cropped to fill the screen, sized to this display
  // (retina included), up to 4K.
  var w = Math.min(3840, Math.max(2400, Math.round(screen.width * (window.devicePixelRatio || 1))));
  var url = urls.raw
    ? urls.raw + "&auto=format&fit=crop&w=" + w + "&q=85"
    : (urls.full || urls.regular);
  if (!url) return null;

  // Thumbnail: the WHOLE photo, uncropped, just scaled down. Built from
  // the raw URL so no crop is ever baked in — `fit=max` never cuts the
  // image, it only shrinks it to fit inside the box.
  var thumb = urls.raw
    ? urls.raw + "&auto=format&fit=max&w=400&q=60"
    : (urls.small || urls.thumb || url);

  return {
    id:    p.id,
    url:   url,
    thumb: thumb,
    label: topic.label,          // caption comes from the query that found it
    topic: topic.q,
    desc:  describe(p),          // for the thumbs-down word list
    by:    (p.user && p.user.name) || "",
    link:  (p.links && p.links.html) || ""
  };
}

/* Spare good photos from earlier searches. Each search yields up to 10
   keepers but only one is shown; the rest wait here, so most skips cost no
   request against Unsplash's 50-per-hour limit. Photos are served only once
   the stock spans 3+ topics (so you don't get ten alpine lakes in a row),
   and expire after 3 days to keep things fresh. */
var POOL_KEY = "photo_pool", POOL_DAYS = 3, POOL_MAX = 60;

/* No repeats: every photo shown is remembered (last 500) and never picked
   again, from a search or from the pool. */
var SEEN_KEY = "photo_seen", SEEN_MAX = 500;
function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "null") || fallback; } catch (e) { return fallback; }
}
function writeJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}
function seenIds() { return readJSON(SEEN_KEY, []); }
function markSeen(photo) {
  var id = photo.id || photo.url, seen = seenIds().filter(function (x) { return x !== id; });
  seen.push(id);
  writeJSON(SEEN_KEY, seen.slice(-SEEN_MAX));
}
function isSeen(photo, seen) { return seen.indexOf(photo.id || photo.url) !== -1; }

/* Same search, different photos: the first search of a topic reads page 1
   and notes how many pages it has; later searches pick a random page among
   the first five, so a topic doesn't keep landing on the same few shots. */
var PAGES_KEY = "topic_pages";

/* After a 403 (hourly limit), leave Unsplash alone for a while. */
var BLOCKED_KEY = "unsplash_blocked_until", BLOCK_MINUTES = 20;
function pageFor(topic) {
  var known = readJSON(PAGES_KEY, {})[topic.q];
  return known ? 1 + Math.floor(Math.random() * Math.min(known, 5)) : 1;
}
function rememberPages(topic, total) {
  var pages = readJSON(PAGES_KEY, {});
  pages[topic.q] = total || 1;
  writeJSON(PAGES_KEY, pages);
}

function readPool() {
  try {
    var pool = JSON.parse(localStorage.getItem(POOL_KEY) || "[]");
    var cutoff = Date.now() - POOL_DAYS * 864e5;
    return pool.filter(function (x) { return x && x.photo && x.added > cutoff; });
  } catch (e) { return []; }
}
function writePool(pool) {
  try { localStorage.setItem(POOL_KEY, JSON.stringify(pool.slice(-POOL_MAX))); } catch (e) {}
}
var lastTopic = null;
function fromPool() {
  var seen = seenIds();
  var bl = blockList();
  var pool = readPool().filter(function (x) { return !isSeen(x.photo, seen) && !isBlocked(x.photo, bl); }), topics = {};
  pool.forEach(function (x) { topics[x.photo.topic] = true; });
  if (Object.keys(topics).length < 3) return null;
  var choices = pool.filter(function (x) { return x.photo.topic !== lastTopic; });
  if (!choices.length) return null;
  var pick = choices[Math.floor(Math.random() * choices.length)];
  writePool(pool.filter(function (x) { return x !== pick; }));
  return pick.photo;
}

function getRandomPhoto() {
  var pooled = fromPool();
  if (pooled) { lastTopic = pooled.topic; markSeen(pooled); return Promise.resolve(pooled); }

  var topic = pickTopic();
  if (!topic) return Promise.reject(new Error("every topic is blocked (thumbs-down list)"));

  function search(page) {
    // Over the hourly limit recently: don't ask again yet. Every refused
    // request still counts, so retrying only keeps the limit pinned at zero.
    if (Date.now() < readJSON(BLOCKED_KEY, 0)) {
      return Promise.reject(new Error("Unsplash hourly rate limit reached (50/hr), waiting"));
    }
    var api = "https://api.unsplash.com/search/photos"
            + "?query=" + encodeURIComponent(topic.q)
            + "&per_page=30&page=" + page
            + "&orientation=landscape&content_filter=high&order_by=relevant";

    return fetch(api, {
      headers: { Authorization: "Client-ID " + UNSPLASH_ACCESS_KEY, "Accept-Version": "v1" }
    })
    .then(function (res) {
      if (res.status === 401) throw new Error("Unsplash rejected the access key");
      if (res.status === 403 || res.status === 429) {
        writeJSON(BLOCKED_KEY, Date.now() + BLOCK_MINUTES * 60e3);
        throw new Error("Unsplash hourly rate limit reached (50/hr)");
      }
      if (!res.ok) throw new Error("Unsplash HTTP " + res.status);
      return res.json();
    });
  }

  // One request per search. 30 results (the most Unsplash allows) gives the
  // quality filters enough to choose from.
  return search(pageFor(topic))
  .then(function (data) {
    if (data && data.total_pages) rememberPages(topic, data.total_pages);
    var seen = seenIds(), bl = blockList();
    var photos = bestPhotos((data && data.results) || [])
      .map(function (p) { return toPhoto(p, topic); })
      .filter(function (ph) { return ph && !isSeen(ph, seen) && !isBlocked(ph, bl); });
    if (!photos.length) throw new Error('no good photos for "' + topic.q + '"');

    var i = Math.floor(Math.random() * photos.length);
    var shown = photos.splice(i, 1)[0];

    // keep the rest for later skips (skipping any already waiting)
    var pool = readPool(), have = {}, now = Date.now();
    pool.forEach(function (x) { have[x.photo.url] = true; });
    photos.forEach(function (ph) { if (!have[ph.url]) pool.push({ photo: ph, added: now }); });
    writePool(pool);

    lastTopic = topic.q;
    markSeen(shown);
    return shown;
  });
}
