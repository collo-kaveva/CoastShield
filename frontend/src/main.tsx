// Entry point. Router, QueryClient and providers are wired in Phase 2.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <p>CoastShield scaffold: Phase 2 wires the app shell.</p>
  </StrictMode>,
);
