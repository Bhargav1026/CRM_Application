import { useAuth } from "../context/AuthContext";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { toast } from "react-hot-toast";

type Form = { email: string; password: string };

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ mode: "onSubmit" });

  const onSubmit = async (data: Form) => {
    setServerError(null);
    const id = toast.loading("Signing you in...");
    try {
      const form = new URLSearchParams();
      form.append("username", data.email);
      form.append("password", data.password);
      const res = await api.post("/users/login", form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      login(res.data.access_token);
      toast.success("Welcome back!", { id });
      navigate("/", { replace: true });
    } catch (err: any) {
      // try to surface FastAPI error message if available
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        "Login failed. Please check your email/password.";
      setServerError(String(detail));
      toast.error(String(detail), { id });
    }
  };

  // Prefer the copy in /public (recommended). If not present, we'll render a fallback glyph.
  const logoUrl = "/cher_logo.jpeg";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        width: "100%",
        minHeight: "100dvh",
        background:
          "radial-gradient(circle at 20% 15%, rgba(99,102,241,0.18), transparent 35%), linear-gradient(180deg,#0b0b0f,#14151a 60%,#0b0b0f)",
        color: "#fff",
        padding: "24px",
        boxSizing: "border-box"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(25,27,34,0.75)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          padding: "28px 24px",
          textAlign: "center",
          boxShadow: "0 10px 40px rgba(0,0,0,0.55)",
          backdropFilter: "blur(10px)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
          <img
            src={logoUrl}
            alt="Cher CRM Logo"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
            style={{
              width: 64,
              height: 64,
              objectFit: "contain",
              borderRadius: 10,
              background: "rgba(255,255,255,0.06)",
              padding: 6,
              filter: "drop-shadow(0 0 10px rgba(147,51,234,0.6))"
            }}
          />
          <span style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: 0.2 }}>Cher CRM</span>
        </div>

        <h2 style={{ fontSize: "1.6rem", marginBottom: 6 }}>Welcome Back</h2>
        <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.7)", marginBottom: 20 }}>
          Sign in to Cher CRM to continue
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            textAlign: "left",
          }}
        >
          <div>
            <input
              placeholder="Email"
              type="email"
              autoComplete="email"
              autoFocus
              {...register("email", { required: "Email is required" })}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                outline: "none",
              }}
            />
            {errors.email && (
              <small style={{ color: "salmon" }}>{errors.email.message}</small>
            )}
          </div>

          <div style={{ position: "relative" }}>
            <input
              placeholder="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              {...register("password", { required: "Password is required" })}
              style={{
                width: "100%",
                padding: "10px 42px 10px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.85)",
                cursor: "pointer",
                padding: 4,
              }}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
            {errors.password && (
              <small style={{ color: "salmon" }}>{errors.password.message}</small>
            )}
          </div>

          {serverError && (
            <small style={{ color: "salmon" }}>{serverError}</small>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: 10,
              background:
                "linear-gradient(90deg, rgba(99,102,241,1) 0%, rgba(147,51,234,1) 100%)",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              padding: "10px 14px",
              cursor: "pointer",
              fontWeight: 600,
              transition: "all 0.3s ease",
            }}
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <div style={{ marginTop: 12, opacity: 0.9 }}>
          Don’t have an account?{" "}
          <Link to="/register" style={{ color: "#a78bfa", fontWeight: 600 }}>
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}