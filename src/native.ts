import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

/** Dark status-bar text on parchment; no-op in the browser. */
export async function initNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: "#f4ead8" });
  } catch {
    /* plugin unavailable */
  }

  try {
    await SplashScreen.hide();
  } catch {
    /* plugin unavailable */
  }
}
