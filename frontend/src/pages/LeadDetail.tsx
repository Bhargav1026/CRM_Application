import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";

interface Activity {
  id: number;
  activity_type?: string;
  type?: string;
  title?: string;
  notes?: string;
  duration?: number;
  created_at?: string;
  at?: string;
  activity_date?: string;
}

interface Lead {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
  source: string;
  property_interest?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  location?: string | null;
  assigned_to?: string | null;
  notes?: string | null;
  owner_name?: string | null;
}

type ActivityForm = {
  activity_type: "call" | "meeting" | "email" | "note";
  title: string;
  notes?: string;
  duration?: number;
  activity_date: string; // YYYY-MM-DD
};

type LeadUpdateForm = {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  status: "new" | "contacted" | "qualified" | "won" | "lost";
  source?: string;
  property_interest?: string;
  budget_min?: number;
  budget_max?: number;
  location?: string;
  assigned_to?: string;
  notes?: string;
};

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletingLead, setDeletingLead] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [leadRes, actRes] = await Promise.all([
        api.get(`/leads/${id}`),
        api.get(`/leads/${id}/activities`),
      ]);

      setLead(leadRes.data);
      const L = leadRes.data as Lead;

      resetLead({
        first_name: L.first_name,
        last_name: L.last_name,
        email: L.email || "",
        phone: L.phone || "",
        status: (L.status as any) || "new",
        source: L.source || "",
        property_interest:
          L.property_interest === null || L.property_interest === undefined
            ? ""
            : String(L.property_interest),
        budget_min:
          L.budget_min === null || L.budget_min === undefined
            ? undefined
            : Number(L.budget_min),
        budget_max:
          L.budget_max === null || L.budget_max === undefined
            ? undefined
            : Number(L.budget_max),
        location: L.location || "",
        assigned_to: L.assigned_to || "",
        notes: L.notes || "",
      });

      // newest first
      const dateOf = (a: Activity) => a.activity_date || a.at || a.created_at || "";
      const sorted = [...(actRes.data as Activity[])].sort((a, b) => {
        const ta = new Date(dateOf(a) || 0).getTime();
        const tb = new Date(dateOf(b) || 0).getTime();
        return tb - ta;
      });
      setActivities(sorted);
    } catch (e: any) {
      if (e?.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
        return;
      }
      setError(e?.response?.data?.detail || "Failed to load lead details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const today = new Date().toISOString().slice(0, 10);

  const { register, handleSubmit, reset, watch, formState: { isSubmitting, errors } } = useForm<ActivityForm>({
    defaultValues: { activity_type: "call", title: "", notes: "", duration: undefined, activity_date: today },
    mode: "onSubmit",
  });

  const selectedType = watch("activity_type");

  const {
    register: regLead,
    handleSubmit: submitLead,
    reset: resetLead,
    formState: { isSubmitting: savingLead },
  } = useForm<LeadUpdateForm>({
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      status: "new",
      source: "",
      property_interest: "",
      budget_min: undefined,
      budget_max: undefined,
      location: "",
      assigned_to: "",
      notes: "",
    },
    mode: "onSubmit",
  });

  const onAddActivity = async (values: ActivityForm) => {
    try {
      await api.post(`/leads/${id}/activities`, values);
      toast.success("Activity added");
      reset();
      await load();
    } catch (e: any) {
      if (e?.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
        return;
      }
      const msg = e?.response?.data?.detail || "Failed to add activity.";
      toast.error(msg);
      setError(msg);
    }
  };

  const onUpdateLead = async (values: LeadUpdateForm) => {
    try {
      // sanitize numeric fields (avoid sending NaN)
      const cleaned: LeadUpdateForm = {
        ...values,
        property_interest:
          values.property_interest && values.property_interest.trim() !== ""
            ? values.property_interest.trim()
            : undefined,
        budget_min:
          typeof values.budget_min === "number" && !Number.isNaN(values.budget_min)
            ? values.budget_min
            : undefined,
        budget_max:
          typeof values.budget_max === "number" && !Number.isNaN(values.budget_max)
            ? values.budget_max
            : undefined,
        // make sure strings exist instead of undefined
        location: values.location ?? "",
        assigned_to: values.assigned_to ?? "",
        notes: values.notes ?? "",
      };

      await api.put(`/leads/${id}`, cleaned);
      toast.success("Lead updated");
      setEditMode(false);
      await load();
    } catch (e: any) {
      if (e?.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
        return;
      }
      toast.error(e?.response?.data?.detail || "Failed to update lead");
    }
  };

  const onDeleteLead = async () => {
    if (!id) return;
    try {
      setDeletingLead(true);
      await api.delete(`/leads/${id}`);
      toast.success("Lead deleted");
      navigate("/leads", { replace: true });
    } catch (e: any) {
      if (e?.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
        return;
      }
      toast.error(e?.response?.data?.detail || "Failed to delete lead");
    } finally {
      setDeletingLead(false);
      setConfirmingDelete(false);
    }
  };

  const typeOf = (a: Activity) => a.activity_type || a.type || "activity";

  // Theme awareness
  const readThemeIsLight = () => {
    if (typeof document === "undefined") return false;
    const bodyTheme = document.body?.dataset?.theme;
    const htmlTheme = document.documentElement?.dataset?.theme;
    const theme = (bodyTheme || htmlTheme || "").toLowerCase().trim();
    if (theme === "light") return true;
    if (theme === "dark") return false;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
  };
  const [isLight, setIsLight] = React.useState<boolean>(readThemeIsLight());
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const update = () => setIsLight(readThemeIsLight());
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.body, { attributes: true, attributeFilter: ["data-theme"] });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const mqHandler = () => update();
    mq.addEventListener ? mq.addEventListener("change", mqHandler) : mq.addListener(mqHandler);
    return () => {
      obs.disconnect();
      mq.removeEventListener ? mq.removeEventListener("change", mqHandler) : mq.removeListener(mqHandler);
    };
  }, []);

  const page: React.CSSProperties = {
    minHeight: "calc(100vh - 80px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "32px 16px",
    width: "100%",
  };
  const container: React.CSSProperties = {
    width: "min(1100px, 92vw)",
    margin: "0 auto",
    display: "grid",
    gap: 20,
    justifyItems: "stretch",
  };
  const card: React.CSSProperties = {
    borderRadius: 14,
    border: isLight ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.10)",
    background: isLight ? "rgba(255,255,255,0.9)" : "rgba(18,18,18,0.75)",
    backdropFilter: "saturate(160%) blur(10px)",
    boxShadow: isLight ? "0 10px 24px rgba(0,0,0,0.08)" : "0 8px 26px rgba(0,0,0,0.45)",
  };
  const headerRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };
  const primaryBtn: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "linear-gradient(90deg, #8b5cf6, #6d28d9)",
    color: "#fff",
    cursor: "pointer",
  };
  const inputStyle: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 10,
    border: isLight ? "1px solid rgba(0,0,0,0.12)" : "1px solid rgba(255,255,255,0.16)",
    background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)",
    color: "inherit",
  };
  const fullWidthCard: React.CSSProperties = {
    ...card,
    padding: 18,
    width: "100%",
  };

  if (loading) return <div style={{ padding: 24, textAlign: "center" }}>Loading…</div>;
  if (error) {
    return (
      <div style={{ padding: 24, color: "salmon" }}>
        {error}
        <div>
          <button onClick={() => navigate("/leads")} style={{ marginTop: 12 }}>
            ← Back to Leads
          </button>
        </div>
      </div>
    );
  }
  if (!lead) {
    return (
      <div style={{ padding: 24 }}>
        Lead not found.
        <div>
          <button onClick={() => navigate("/leads")} style={{ marginTop: 12 }}>
            ← Back to Leads
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={page}>
      <div style={container}>
        <div style={headerRow}>
          <div style={{ flex: 1 }}>
            <button onClick={() => navigate("/leads")}>← Back to Leads</button>
          </div>
          <h2 style={{ margin: 0, textAlign: "center", flex: 1 }}>
            {lead.first_name} {lead.last_name}
          </h2>
          <div style={{ display: "flex", gap: 8, flex: 1, justifyContent: "flex-end" }}>
            {editMode ? (
              // Only a single Cancel in header while editing
              <button
                onClick={() => {
                  setEditMode(false);
                  resetLead();
                }}
                className="btn"
              >
                Cancel
              </button>
            ) : (
              <>
                <button onClick={() => setEditMode(true)} className="btn">Edit</button>
                <button onClick={() => setConfirmingDelete(true)} className="btn danger">Delete</button>
              </>
            )}
          </div>
        </div>

        {/* Lead info (view/edit) */}
        {editMode ? (
          <section style={{ ...fullWidthCard, display: "grid", gap: 10 }}>
            <form
              onSubmit={submitLead(onUpdateLead)}
              style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
            >
              <input placeholder="First name *" {...regLead("first_name", { required: true })} style={inputStyle} />
              <input placeholder="Last name *" {...regLead("last_name", { required: true })} style={inputStyle} />
              <input placeholder="Email" type="email" {...regLead("email")} style={inputStyle} />
              <input placeholder="Phone" {...regLead("phone")} style={inputStyle} />
              <select {...regLead("status", { required: true })} style={inputStyle}>
                <option value="new">new</option>
                <option value="contacted">contacted</option>
                <option value="qualified">qualified</option>
                <option value="won">won</option>
                <option value="lost">lost</option>
              </select>
              <input placeholder="Source" {...regLead("source")} style={inputStyle} />

              {/* property_interest is a string */}
              <input
                placeholder="Property interest"
                type="text"
                {...regLead("property_interest", {
                  setValueAs: (v) => (typeof v === "string" ? v.trim() : v),
                })}
                style={inputStyle}
              />

              <input placeholder="Budget min" type="number" {...regLead("budget_min", { valueAsNumber: true })} style={inputStyle} />
              <input placeholder="Budget max" type="number" {...regLead("budget_max", { valueAsNumber: true })} style={inputStyle} />
              <input placeholder="Location" {...regLead("location")} style={inputStyle} />
              <input placeholder="Assigned to" {...regLead("assigned_to")} style={inputStyle} />
              <textarea placeholder="Notes" {...regLead("notes")} style={{ ...inputStyle, minHeight: 60 }} />

              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
                {/* Only ONE save inside the form */}
                <button type="submit" disabled={savingLead} style={primaryBtn}>
                  {savingLead ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section style={{ ...fullWidthCard, display: "grid", gap: 6 }}>
            <div><strong>Email:</strong> {lead.email}</div>
            <div><strong>Phone:</strong> {lead.phone}</div>
            <div><strong>Status:</strong> {lead.status}</div>
            <div><strong>Source:</strong> {lead.source}</div>
            <div><strong>Owner:</strong> {lead.owner_name || lead.assigned_to || "—"}</div>
            <div><strong>Property interest:</strong> {lead.property_interest && lead.property_interest !== "" ? lead.property_interest : "—"}</div>
            <div><strong>Budget min:</strong> {lead.budget_min ?? "—"}</div>
            <div><strong>Budget max:</strong> {lead.budget_max ?? "—"}</div>
            <div><strong>Location:</strong> {lead.location || "—"}</div>
            <div><strong>Assigned to:</strong> {lead.assigned_to || "—"}</div>
            <div><strong>Notes:</strong> {lead.notes || "—"}</div>
          </section>
        )}

        {confirmingDelete && (
          <section style={fullWidthCard}>
            <div style={{ marginBottom: 10 }}>Delete this lead? This will soft-delete it.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn danger" onClick={onDeleteLead} disabled={deletingLead}>
                {deletingLead ? "Deleting…" : "Confirm Delete"}
              </button>
              <button className="btn" onClick={() => setConfirmingDelete(false)}>Cancel</button>
            </div>
          </section>
        )}

        {/* Activities list */}
        <section style={fullWidthCard}>
          <h3 style={{ marginTop: 0 }}>Activities</h3>
          {activities.length === 0 ? (
            <div style={{ opacity: 0.8 }}>No activities yet.</div>
          ) : (
            <ul style={{ listStyle: "none", paddingLeft: 0, display: "grid", gap: 10 }}>
              {activities.map((a) => (
                <li
                  key={a.id}
                  style={{
                    border: isLight ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    padding: 12,
                    transition: "transform .15s ease, box-shadow .2s ease",
                    boxShadow: isLight ? "0 2px 10px rgba(0,0,0,0.06)" : "0 3px 14px rgba(0,0,0,0.35)",
                    background: isLight ? "rgba(255,255,255,0.9)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLLIElement).style.transform = "translateY(-2px)";
                    (e.currentTarget as HTMLLIElement).style.boxShadow = isLight
                      ? "0 8px 22px rgba(0,0,0,0.13)"
                      : "0 8px 22px rgba(0,0,0,0.5)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLLIElement).style.transform = "none";
                    (e.currentTarget as HTMLLIElement).style.boxShadow = isLight
                      ? "0 2px 10px rgba(0,0,0,0.06)"
                      : "0 3px 14px rgba(0,0,0,0.35)";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <strong style={{ textTransform: "capitalize" }}>{typeOf(a)}</strong>
                      <span style={{ opacity: 0.8 }}> — {a.title || "—"}</span>
                      {a.duration ? <span style={{ opacity: 0.7 }}> ({a.duration} min)</span> : null}
                      <div style={{ marginTop: 6, opacity: 0.9 }}>{a.notes}</div>
                    </div>
                    <small style={{ opacity: 0.8 }}>
                      {a.activity_date || a.at || a.created_at
                        ? new Date(a.activity_date || a.at || a.created_at || "").toLocaleString()
                        : ""}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Add activity */}
        <section style={fullWidthCard}>
          <h3 style={{ marginTop: 0 }}>Add Activity</h3>
          <form onSubmit={handleSubmit(onAddActivity)} style={{ display: "grid", gap: 10, maxWidth: 520 }}>
            <select {...register("activity_type", { required: "Please select an activity type" })} style={inputStyle}>
              <option value="call">call</option>
              <option value="meeting">meeting</option>
              <option value="email">email</option>
              <option value="note">note</option>
            </select>
            {errors.activity_type && <small style={{ color: "salmon" }}>{errors.activity_type.message as string}</small>}
            <input type="date" {...register("activity_date", { required: "Activity date is required" })} style={inputStyle} />
            {errors.activity_date && <small style={{ color: "salmon" }}>{errors.activity_date.message as string}</small>}
            <input placeholder="Title" {...register("title", { required: "Title is required" })} style={inputStyle} />
            {errors.title && <small style={{ color: "salmon" }}>{errors.title.message as string}</small>}
            <textarea placeholder="Notes" {...register("notes")} style={{ ...inputStyle, minHeight: 80 }} />
            <input
              type="number"
              placeholder="Duration (min)"
              {...register("duration", {
                valueAsNumber: true,
                validate: (v) => {
                  if (selectedType === "call") {
                    if (v === undefined || v === null || Number.isNaN(v)) return "Duration is required for calls";
                    if (typeof v !== "number" || v <= 0) return "Duration must be a positive number";
                  }
                  return true;
                },
              })}
              style={inputStyle}
            />
            {errors.duration && <small style={{ color: "salmon" }}>{errors.duration.message as string}</small>}
            <div>
              <button type="submit" disabled={isSubmitting} style={primaryBtn}>
                {isSubmitting ? "Adding…" : "Add Activity"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}