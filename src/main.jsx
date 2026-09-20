import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import App from "./app/App.jsx";
import { LanguageProvider } from './lib/i18n';

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LanguageProvider><App /></LanguageProvider>
  </StrictMode>
);
