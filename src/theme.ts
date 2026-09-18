export type ThemePref = "system" | "light" | "dark";

const KEY = "lectio.theme";
const DARK_MQ = window.matchMedia("(prefers-color-scheme: dark)");

const CYCLE: ThemePref[] = ["system", "light", "dark"];

/** Persisted user preference; defaults to following the OS. */
export function themePref(): ThemePref {
  const stored = localStorage.getItem(KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

/**
 * Resolve the actual effective theme and stamp it on <html data-theme=…>.
 * The CSS keys all overrides off this attribute, so a manual toggle can
 * always force light or dark regardless of the OS setting.
 */
export function applyTheme(): void {
  const pref = themePref();
  const dark = pref === "dark" || (pref === "system" && DARK_MQ.matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  // Let native layers (e.g. status bar) react to the resolved theme.
  window.dispatchEvent(new CustomEvent("lectio:themechange"));
}

export function setThemePref(pref: ThemePref): void {
  localStorage.setItem(KEY, pref);
  applyTheme();
}

/** Advance system → light → dark → system, returning the new preference. */
export function cycleTheme(): ThemePref {
  const next = CYCLE[(CYCLE.indexOf(themePref()) + 1) % CYCLE.length];
  setThemePref(next);
  return next;
}

/** Compact icon/label used by the timeline toggle button. */
export function themeLabel(pref: ThemePref): string {
  switch (pref) {
    case "dark":
      return "\u{1F319}"; // 🌙
    case "light":
      return "\u{2600}\u{FE0F}"; // ☀️
    default:
      return "\u{2699}\u{FE0F}"; // ⚙️  (follows the OS)
  }
}

export function themeTooltip(pref: ThemePref, dark: boolean): string {
  const mode = pref === "system" ? (dark ? "dark" : "light") : pref;
  const label =
    pref === "light" ? "Light" : pref === "dark" ? "Dark" : "System";
  return `Theme: ${label} (${mode}). Click to switch.`;
}

// Keep a "system" pref in sync with live OS changes (handles theme toggling
// while the app is open). applyTheme() is a no-op cost otherwise.
DARK_MQ.addEventListener("change", () => applyTheme());
