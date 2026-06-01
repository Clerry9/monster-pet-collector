import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "./lib/hmrGuard";
import { applyA11yPrefs } from "./lib/a11yPrefs";
import { applyUiScale } from "./lib/uiScale";
import { registerServiceWorker } from "./lib/swRegister";

applyA11yPrefs();
applyUiScale();
registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
