// Applied before paint so the theme never flashes: the stored choice, else the OS preference; then the skin.
(function () {
  try {
    var t = localStorage.getItem("theme");
    if (t !== "light" && t !== "dark") t = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = t;
    var s = localStorage.getItem("skin");
    if (s && s !== "editorial") document.documentElement.dataset.skin = s;
    // The language is a URL segment: first on site pages (/fr), last on articles (/netbox/install/fr).
    var langs = ["en", "fr"];
    var segs = location.pathname.split("/").filter(Boolean);
    for (var i = 0; i < segs.length; i++) if (langs.indexOf(segs[i]) >= 0) { document.documentElement.lang = segs[i]; break; }
  } catch {}
})();
