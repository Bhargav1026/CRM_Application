import React, { type ReactElement, createContext, useContext, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Leads from "./pages/Leads";
import Dashboard from "./pages/Dashboard";
import LeadDetail from "./pages/LeadDetail";
import Nav from "./components/Nav";
import { Toaster } from "react-hot-toast";

/** -------------------------------
 *  Theme context (light / dark)
 *  ------------------------------- */
type Theme = "light" | "dark";
type ThemeContextType = { theme: Theme; toggleTheme: () => void };

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    if (saved) return saved;
    // system preference default
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    localStorage.setItem("theme", theme);
    // attach data attribute for CSS variables in App.css
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  const value = useMemo<ThemeContextType>(
    () => ({ theme, toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")) }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** -------------------------------
 *  Auth-protected wrapper
 *  ------------------------------- */
function Protected({ children }: { children: ReactElement }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <>
      <Nav />
      {/* Full-width background with centered content */}
      <main
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "24px 20px",
          display: "flex",
          justifyContent: "center",
          minHeight: "calc(100vh - 80px)",
        }}
      >
        {/* Content wrapper keeps screens readable on large monitors */}
        <div
          style={{
            width: "100%",
            maxWidth: 1120,
          }}
        >
          {children}
        </div>
      </main>
    </>
  );
}

function Public({ children }: { children: React.ReactNode }) {
  // Full-viewport centering for unauthenticated pages (e.g., Login)
  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      {children}
    </main>
  );
}

/** -------------------------------
 *  App routes
 *  ------------------------------- */
export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Public><Login /></Public>} />
            <Route path="/register" element={<Public><Register /></Public>} />
            <Route path="/" element={<Protected><Leads /></Protected>} />
            <Route path="/leads" element={<Protected><Leads /></Protected>} />
            <Route path="/leads/:id" element={<Protected><LeadDetail /></Protected>} />
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}