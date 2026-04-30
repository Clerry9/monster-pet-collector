import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

if (import.meta.env.DEV) {
  await import("./lib/hmrGuard");
}

createRoot(document.getElementById("root")!).render(<App />);
