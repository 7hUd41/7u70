// Applied before paint so the theme never flashes: the stored choice, else the OS preference; then the skin.
(function () {
  try {
    var t = localStorage.getItem("theme");
    if (t !== "light" && t !== "dark") t = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = t;
    var s = localStorage.getItem("skin");
    if (s && s !== "editorial") document.documentElement.dataset.skin = s;
  } catch {}
})();
