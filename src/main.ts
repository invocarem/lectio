import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/cormorant-garamond/600-italic.css";
import "@fontsource/source-sans-3/400.css";
import "@fontsource/source-sans-3/500.css";
import "@fontsource/source-sans-3/600.css";
import "@fontsource/source-sans-3/400-italic.css";
import "@fontsource/inconsolata/400.css";
import { initNative } from "./native";
import { initRouter } from "./router";
import { applyTheme } from "./theme";
import "./index.css";

// Stamp the resolved theme before the first paint/route render.
applyTheme();
void initNative();
initRouter();
