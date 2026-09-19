export type ThemePref = "light" | "dark";

const KEY = "lectio.theme";
const DARK_MQ = window.matchMedia("(prefers-color-scheme: dark)");

function osTheme(): ThemePref {
  return DARK_MQ.matches ? "dark" : "light";
}

/** Persisted light/dark choice; first visit follows the OS until the user toggles. */
export function themePref(): ThemePref {
  const stored = localStorage.getItem(KEY);
  if (stored === "light" || stored === "dark") return stored;
  return osTheme();
}

/**
 * Resolve the actual effective theme and stamp it on <html data-theme=…>.
 * The CSS keys all overrides off this attribute.
 */
export function applyTheme(): void {
  document.documentElement.setAttribute("data-theme", themePref());
  window.dispatchEvent(new CustomEvent("lectio:themechange"));
}

export function setThemePref(pref: ThemePref): void {
  localStorage.setItem(KEY, pref);
  applyTheme();
}

/** Flip light ↔ dark, returning the new preference. */
export function cycleTheme(): ThemePref {
  const next: ThemePref = themePref() === "dark" ? "light" : "dark";
  setThemePref(next);
  return next;
}

export function themeLabel(pref: ThemePref): string {
  return pref === "dark" ? "\u{1F319}" : "\u{2600}\u{FE0F}"; // 🌙 / ☀️
}

export function themeTooltip(pref: ThemePref): string {
  return pref === "dark"
    ? "Dark theme. Click for light."
    : "Light theme. Click for dark.";
}

// If the user has never toggled, keep the first-visit OS default in sync.
DARK_MQ.addEventListener("change", () => {
  const stored = localStorage.getItem(KEY);
  if (stored !== "light" && stored !== "dark") applyTheme();
});
