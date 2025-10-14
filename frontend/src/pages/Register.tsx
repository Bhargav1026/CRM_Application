// src/pages/Register.tsx
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../api/axios";

type Form = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm: string;
};

const REGISTER_URL = "/users/register"; // <-- adjust in Step 2 if your API differs

export default function Register() {
  const { register, handleSubmit, formState, setError } = useForm<Form>({
    mode: "onSubmit",
    defaultValues: { first_name: "", last_name: "", email: "", password: "", confirm: "" },
  });
  const navigate = useNavigate();

  const onSubmit = handleSubmit(async (values) => {
    if (values.password !== values.confirm) {
      setError("confirm", { message: "Passwords do not match" });
      return;
    }
    // We'll finish wiring this in Step 2
    try {
      const payload = {
        first_name: values.first_name.trim(),
        last_name:  values.last_name.trim(),
        email:      values.email.trim().toLowerCase(),
        password:   values.password,
      };
      await api.post(REGISTER_URL, payload);
      toast.success("Account created successfully! Please log in.");
      navigate("/login", { replace: true });
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Registration failed";
      toast.error(msg);
      setError("root", { message: msg });
    }
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        className="card"
        style={{
          padding: 40,
          maxWidth: 500,
          width: "100%",
          boxSizing: "border-box",
          backgroundColor: "var(--card-bg, #fff)",
          color: "var(--text-color, #000)",
          borderRadius: 8,
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 12 }}>Create your account</h2>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
          <input
            autoFocus
            placeholder="First name *"
            {...register("first_name", { required: "Required" })}
            style={{
              backgroundColor: "var(--input-bg, #fff)",
              color: "var(--input-text, #000)",
              border: "1px solid var(--input-border, #ccc)",
              borderRadius: 4,
              padding: "8px 12px",
            }}
          />
          <input
            placeholder="Last name *"
            {...register("last_name", { required: "Required" })}
            style={{
              backgroundColor: "var(--input-bg, #fff)",
              color: "var(--input-text, #000)",
              border: "1px solid var(--input-border, #ccc)",
              borderRadius: 4,
              padding: "8px 12px",
            }}
          />
          <input
            placeholder="Email *"
            type="email"
            {...register("email", { required: "Required", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email" } })}
            style={{
              backgroundColor: "var(--input-bg, #fff)",
              color: "var(--input-text, #000)",
              border: "1px solid var(--input-border, #ccc)",
              borderRadius: 4,
              padding: "8px 12px",
            }}
          />
          <input
            placeholder="Password *"
            type="password"
            {...register("password", { required: "Required", minLength: { value: 6, message: "Min 6 chars" } })}
            style={{
              backgroundColor: "var(--input-bg, #fff)",
              color: "var(--input-text, #000)",
              border: "1px solid var(--input-border, #ccc)",
              borderRadius: 4,
              padding: "8px 12px",
            }}
          />
          <input
            placeholder="Confirm password *"
            type="password"
            {...register("confirm", { required: "Required" })}
            style={{
              backgroundColor: "var(--input-bg, #fff)",
              color: "var(--input-text, #000)",
              border: "1px solid var(--input-border, #ccc)",
              borderRadius: 4,
              padding: "8px 12px",
            }}
          />

          {formState.errors.root?.message && (
            <div style={{ color: "salmon" }}>{formState.errors.root.message}</div>
          )}
          {formState.errors.first_name && <small style={{ color: "salmon" }}>{formState.errors.first_name.message}</small>}
          {formState.errors.last_name && <small style={{ color: "salmon" }}>{formState.errors.last_name.message}</small>}
          {formState.errors.email && <small style={{ color: "salmon" }}>{formState.errors.email.message}</small>}
          {formState.errors.password && <small style={{ color: "salmon" }}>{formState.errors.password.message}</small>}
          {formState.errors.confirm && <small style={{ color: "salmon" }}>{formState.errors.confirm.message}</small>}

          <button
            type="submit"
            disabled={formState.isSubmitting}
            style={{
              backgroundColor: "#7c3aed",
              color: "white",
              border: "none",
              borderRadius: 6,
              padding: "10px 16px",
              cursor: formState.isSubmitting ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              boxShadow: "none",
            }}
            onMouseEnter={e => {
              if (!formState.isSubmitting) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#9d4edd";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 8px #b794f4";
              }
            }}
            onMouseLeave={e => {
              if (!formState.isSubmitting) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#7c3aed";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }
            }}
            onFocus={e => {
              if (!formState.isSubmitting) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#9d4edd";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 12px #b794f4";
              }
            }}
            onBlur={e => {
              if (!formState.isSubmitting) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#7c3aed";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }
            }}
          >
            {formState.isSubmitting ? "Creating..." : "Create account"}
          </button>
        </form>

        <div style={{ marginTop: 12, opacity: 0.8 }}>
          Already have an account?{" "}
          <Link
            to="/login"
            style={{
              color: "#7c3aed",
              textDecoration: "none",
              fontWeight: "500",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline";
              (e.currentTarget as HTMLAnchorElement).style.textShadow = "0 0 6px #a78bfa";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none";
              (e.currentTarget as HTMLAnchorElement).style.textShadow = "none";
            }}
            onFocus={e => {
              (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline";
              (e.currentTarget as HTMLAnchorElement).style.textShadow = "0 0 8px #a78bfa";
            }}
            onBlur={e => {
              (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none";
              (e.currentTarget as HTMLAnchorElement).style.textShadow = "none";
            }}
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}