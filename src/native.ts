import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** Theme the status bar to match the resolved color theme; no-op in browser. */
async function applyStatusBar(): Promise<void> {
  if (!isNative()) return;
  try {
    const dark = document.documentElement.dataset.theme === "dark";
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: dark ? "#16110a" : "#f4ead8" });
  } catch {
    /* plugin unavailable */
  }
}

export async function initNative(): Promise<void> {
  if (!isNative()) return;

  try {
    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch {
    /* plugin unavailable */
  }

  await applyStatusBar();
  window.addEventListener("lectio:themechange", () => {
    void applyStatusBar();
  });

  try {
    await SplashScreen.hide();
  } catch {
    /* plugin unavailable */
  }
}
