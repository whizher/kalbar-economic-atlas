(() => {
  const key = "atlas-theme";
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  let stored = null;

  try {
    const candidate = localStorage.getItem(key);
    stored = candidate === "light" || candidate === "dark" ? candidate : null;
  } catch {
    stored = null;
  }

  if (stored) root.dataset.theme = stored;
  root.classList.add("theme-ready");

  const current = () => root.dataset.theme ?? (media.matches ? "dark" : "light");
  const sync = () => {
    const dark = current() === "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.setAttribute("aria-pressed", String(dark));
      button.textContent = dark ? "Gunakan mode terang" : "Gunakan mode gelap";
    });
  };

  window.addEventListener("DOMContentLoaded", () => {
    sync();
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const next = current() === "dark" ? "light" : "dark";
        root.dataset.theme = next;
        try { localStorage.setItem(key, next); } catch { /* The chosen theme works for this page. */ }
        sync();
      });
    });
  });

  media.addEventListener("change", () => {
    if (!root.dataset.theme) sync();
  });
})();
