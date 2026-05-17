import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { FinwiseDataProvider } from "./context/FinwiseDataProvider.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <FinwiseDataProvider>
          <App />
        </FinwiseDataProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
