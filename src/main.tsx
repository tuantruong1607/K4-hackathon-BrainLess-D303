import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import App from "./App";
import LoginPage from "./LoginPage";
import "./styles.css";

function Root() {
  const { user, isLoading, isGuest } = useAuth();

  if (isLoading) {
    return (
      <div className="app-loader">
        <div className="ambient ambient-one" aria-hidden="true" />
        <div className="ambient ambient-two" aria-hidden="true" />
        <div className="loader-spinner" />
      </div>
    );
  }

  // Show classroom if logged in OR browsing as guest
  if (user || isGuest) {
    return <App />;
  }

  return <LoginPage />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </StrictMode>,
);
