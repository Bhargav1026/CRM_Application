import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../App"; // theme context from App.tsx
import "../App.css";

/**
 * Top navigation bar — full‑width and fixed to the top of the viewport.
 * It renders via a portal into `document.body`, so it is NOT constrained
 * by any centered containers in pages. This guarantees the bar spans
 * the entire window. Right-side actions are aligned to the end.
 */
export default function Nav() {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const logoUrl = "/cher_logo.jpeg"; // served from /public

  const [menuOpen, setMenuOpen] = useState(false);

  // lock body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const closeMenuAndNavigate = (to: string) => {
    setMenuOpen(false);
    navigate(to);
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `chip${isActive ? " active" : ""}`;

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const header = (
    <header className="site-nav" role="banner">
      <div className="site-nav__content" aria-label="Primary navigation">
        {/* Left: brand + primary links */}
        <div className="nav-left">
          <button
            type="button"
            className="menu-btn"
            aria-label="Toggle menu"
            aria-controls="mobile-menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="menu-bar" />
            <span className="menu-bar" />
            <span className="menu-bar" />
          </button>
          <NavLink to="/" end className="brand chip" aria-label="Cher CRM – Home">
            <img src={logoUrl} alt="Cher CRM" className="brand__logo" />
            <span className="brand__text">Cher CRM</span>
          </NavLink>
          <div className="nav-inline-links">
            <NavLink to="/" end className={linkClass} onClick={() => setMenuOpen(false)}>
              Leads
            </NavLink>
            <NavLink to="/dashboard" className={linkClass} onClick={() => setMenuOpen(false)}>
              Dashboard
            </NavLink>
          </div>
        </div>

        {/* spacer removed */}

        {/* Right: actions */}
        <div className="nav-right">
          <button
            type="button"
            onClick={toggleTheme}
            className={`chip${theme === "dark" ? " primary" : ""}`}
            aria-label="Toggle color theme"
            title="Toggle color theme"
          >
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="chip primary"
            aria-label="Logout"
            title="Logout"
          >
            Logout
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav id="mobile-menu" className="mobile-panel" aria-label="Mobile navigation">
          <a className="chip block" onClick={() => closeMenuAndNavigate("/")}>Leads</a>
          <a className="chip block" onClick={() => closeMenuAndNavigate("/dashboard")}>Dashboard</a>
          <div className="divider" />
          <button type="button" className="chip block" onClick={toggleTheme}>
            {theme === "dark" ? "☀️ Light Theme" : "🌙 Dark Theme"}
          </button>
          <button type="button" className="chip block danger" onClick={handleLogout}>
            Logout
          </button>
        </nav>
      )}
    </header>
  );

  return createPortal(header, document.body);
}

/* ---- Scoped styles injection (full‑width fixed bar + body offset) ---- */
const styleEl = document.createElement("style");
styleEl.textContent = `
  :root { 
    --nav-h: 56px; 
    --nav-surface: rgba(12,12,14,0.78);
    --nav-border: rgba(255,255,255,0.08);
    --chip-bg: rgba(255,255,255,0.04);
    --chip-bg-hover: rgba(255,255,255,0.08);
    --chip-border: rgba(255,255,255,0.12);
    --chip-text: #e7e8ea;
    --chip-active-bg: rgba(255,255,255,0.14);
    --brand-shadow: 0 2px 18px rgba(0,0,0,0.35);
  }

  /* Light theme overrides (works with system light as fallback) */
  @media (prefers-color-scheme: light) {
    :root {
      --nav-surface: rgba(255,255,255,0.78);
      --nav-border: rgba(0,0,0,0.10);
      --chip-bg: rgba(0,0,0,0.02);
      --chip-bg-hover: rgba(0,0,0,0.06);
      --chip-border: rgba(0,0,0,0.12);
      --chip-text: #16181d;
      --chip-active-bg: rgba(0,0,0,0.10);
      --brand-shadow: 0 2px 18px rgba(0,0,0,0.08);
    }
  }

  /* If the app toggles a data-theme attribute on <body>, honor it */
  body[data-theme="light"] {
    --nav-surface: rgba(255,255,255,0.78);
    --nav-border: rgba(0,0,0,0.10);
    --chip-bg: rgba(0,0,0,0.02);
    --chip-bg-hover: rgba(0,0,0,0.06);
    --chip-border: rgba(0,0,0,0.12);
    --chip-text: #16181d;
    --chip-active-bg: rgba(0,0,0,0.10);
    --brand-shadow: 0 2px 18px rgba(0,0,0,0.08);
  }
  body[data-theme="dark"] {
    --nav-surface: rgba(12,12,14,0.78);
    --nav-border: rgba(255,255,255,0.08);
    --chip-bg: rgba(255,255,255,0.04);
    --chip-bg-hover: rgba(255,255,255,0.08);
    --chip-border: rgba(255,255,255,0.12);
    --chip-text: #e7e8ea;
    --chip-active-bg: rgba(255,255,255,0.14);
    --brand-shadow: 0 2px 18px rgba(0,0,0,0.35);
  }

  /* Offset page content so it doesn't hide under the fixed bar */
  body { padding-top: var(--nav-h); }

  .site-nav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;      /* guarantees full window width */
    z-index: 1000;
    background: var(--nav-surface);
    backdrop-filter: saturate(160%) blur(8px);
    border-bottom: 1px solid var(--nav-border);
    height: var(--nav-h);
  }

  .site-nav__content {
    width: 100%;
    margin: 0;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between; /* left group at far left, right at far right */
    gap: 16px;
    box-sizing: border-box;
    height: 100%;
  }

  .nav-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .nav-right{ display: flex; align-items: center; gap: 10px; }

  /* ------------------- Unified button / chip style ------------------- */
  :root {
    --btn-bg1: #6f57ff;
    --btn-bg2: #915eff;
    --btn-shadow: 0 6px 18px rgba(111,87,255,0.28);
    --btn-shadow-hover: 0 8px 24px rgba(111,87,255,0.4);
  }

  .brand,
  .chip {
    background: linear-gradient(90deg, var(--btn-bg1), var(--btn-bg2));
    color: #fff;
    border: 1px solid transparent;
    border-radius: 14px;
    padding: 9px 16px;
    font-weight: 600;
    line-height: 1;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    box-shadow: var(--btn-shadow);
    transition: transform 80ms ease, box-shadow 140ms ease, filter 140ms ease;
  }

  .chip.block { width: auto; display: inline-flex; cursor: pointer; }

  .brand:hover,
  .chip:hover {
    filter: saturate(110%);
    box-shadow: var(--btn-shadow-hover);
  }

  .brand:focus-visible,
  .chip:focus-visible {
    outline: none;
    box-shadow: var(--btn-shadow-hover);
    filter: saturate(110%);
  }

  .brand:active,
  .chip:active {
    transform: translateY(1px);
    filter: saturate(115%);
  }

  /* Active state (e.g., active NavLink) – unify with hover look; no white ring */
  .chip.active,
  .brand.active {
    /* unify with hover look; no white ring */
    outline: none;
    box-shadow: var(--btn-shadow-hover);
    filter: saturate(110%);
  }

  /* Brand logo sizing, consistent across themes */
  .brand__logo {
    width: 28px;
    height: 28px;
    object-fit: contain;
    border-radius: 6px;
    flex: 0 0 auto;
    background: #fff; /* keeps the logo crisp atop gradient */
  }
  .brand__text { white-space: nowrap; }
  /* ---------- Responsive navbar ---------- */
  .menu-btn {
    display: none;
    width: 38px;
    height: 34px;
    border-radius: 10px;
    border: 1px solid var(--chip-border);
    background: var(--chip-bg);
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 0 8px;
  }
  .menu-bar {
    display: block;
    width: 18px;
    height: 2px;
    background: var(--chip-text);
    border-radius: 2px;
  }

  .nav-inline-links { display: flex; gap: 10px; align-items: center; }

  /* Slide-down mobile panel */
  .mobile-panel {
    position: fixed;
    top: var(--nav-h);
    left: 0;
    right: 0;
    z-index: 999;
    background: var(--nav-surface);
    backdrop-filter: saturate(160%) blur(8px);
    border-bottom: 1px solid var(--nav-border);
    padding: 12px;
    display: grid;
    gap: 10px;
    animation: panelIn 140ms ease-out;
  }
  .mobile-panel .chip.block {
    justify-content: center;
    width: 100%;
  }
  .mobile-panel .chip.block.danger {
    background: linear-gradient(90deg, #ff5b5b, #ff8a7a);
    box-shadow: 0 6px 18px rgba(255, 90, 90, 0.28);
  }
  .mobile-panel .divider {
    height: 1px;
    background: var(--nav-border);
    margin: 4px 0;
  }
  @keyframes panelIn {
    from { transform: translateY(-8px); opacity: 0; }
    to   { transform: translateY(0); opacity: 1; }
  }

  /* Breakpoints */
  @media (max-width: 1024px) {
    .site-nav__content { padding: 8px 10px; gap: 8px; }
    .brand__text { display: none; }         /* hide brand text earlier */
    .menu-btn { display: inline-flex; }     /* show hamburger earlier */
    .nav-inline-links { display: none; }    /* collapse inline links into the mobile panel */
    .nav-right .chip { padding: 8px 12px; }
  }
  @media (max-width: 560px) {
    .site-nav { height: 50px; }
    :root { --nav-h: 50px; }
    .nav-right { gap: 6px; }
    .chip, .brand { padding: 8px 10px; border-radius: 12px; }
    .nav-right .chip { padding: 6px 10px; font-size: 14px; }
    .menu-btn { width: 34px; height: 32px; }
    .menu-bar { width: 16px; }
  }
`;

if (!document.head.querySelector('[data-site-nav="1"]')) {
  styleEl.setAttribute("data-site-nav", "1");
  document.head.appendChild(styleEl);
}