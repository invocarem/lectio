import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.invocarem.lectio",
  appName: "Lectio",
  webDir: "dist",
  ios: {
    contentInset: "never",
    preferredContentMode: "mobile",
    scheme: "Lectio",
  },
  plugins: {
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#f4ead8",
    },
    SplashScreen: {
      backgroundColor: "#f4ead8",
      launchAutoHide: true,
      launchShowDuration: 0,
    },
  },
};

export default config;
