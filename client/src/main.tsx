import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

/**
 * StrictMode intentionally double-invokes render + effects in development only.
 * Session `/v1/auth/me` is deduped in AuthService for concurrent calls.
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
