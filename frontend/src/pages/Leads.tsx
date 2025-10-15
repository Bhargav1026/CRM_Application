import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import api from "../api/axios";
import type { Lead } from "../types";
import Skeleton from "../components/Skeleton";

type LeadPage = { items: Lead[]; total: number; page: number; size: number };

// --- Form Types ---
export type LeadForm = {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  status: "new" | "contacted" | "qualified" | "won" | "lost";
  source?: string;
  property_interest?: string;
  budget_min?: number | undefined;
  budget_max?: number | undefined;
  location?: string;
  assigned_to?: string;
  notes?: string;
};

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // edit/delete state
  const [editing, setEditing] = useState<Lead | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  // create modal toggle
  const [showCreate, setShowCreate] = useState(false);

  // responsive: switch to cards on small screens
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 700);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const navigate = useNavigate();
  const goDashboard = () => navigate("/dashboard");

  // --- RHF instances ---
  const createForm = useForm<LeadForm>({
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

  const editForm = useForm<LeadForm>({
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

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const params: Record<string, string> = {};
      if (q.trim()) params.q = q.trim();
      if (status) params.status = status;
      if (source.trim()) params.source = source.trim();
      if (minBudget.trim()) params.min_budget = String(parseInt(minBudget, 10));
      if (maxBudget.trim()) params.max_budget = String(parseInt(maxBudget, 10));
      params.page = String(page);
      params.page_size = String(size);

      const res = await api.get<LeadPage>("/leads", { params });
      setLeads(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (e: any) {
      if (e?.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
      } else {
        setErr(e?.response?.data?.detail || "Failed to load leads");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size]);

  // --- Create Lead ---
  const onCreate = createForm.handleSubmit(async (values) => {
    try {
      await api.post("/leads", values);
      setShowCreate(false);
      createForm.reset();
      // After creating, go back to first page to see the new item easily
      setPage(1);
      await load();
    } catch (e: any) {
      createForm.setError("root", { message: e?.response?.data?.detail || "Failed to create lead" });
    }
  });

  // --- Edit Lead ---
  const openEdit = (lead: Lead) => {
    setEditing(lead);
    editForm.reset({
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: (lead as any).email || "",
      phone: (lead as any).phone || "",
      status: lead.status as LeadForm["status"],
      source: (lead as any).source || "",
      property_interest: (lead as any).property_interest || "",
      budget_min: (lead as any).budget_min ?? undefined,
      budget_max: (lead as any).budget_max ?? undefined,
      location: (lead as any).location || "",
      assigned_to: (lead as any).assigned_to || "",
      notes: (lead as any).notes || "",
    });
  };

  const onUpdate = editForm.handleSubmit(async (values) => {
    if (!editing) return;
    try {
      await api.put(`/leads/${editing.id}`, values);
      setEditing(null);
      await load();
    } catch (e: any) {
      editForm.setError("root", { message: e?.response?.data?.detail || "Failed to update lead" });
    }
  });

  // --- Delete Lead ---
  const confirmDelete = (id: number) => {
    setDeletingId(id);
    setDeleteErr(null);
  };

  const deleteLead = async () => {
    if (deletingId == null) return;
    try {
      setDeleting(true);
      await api.delete(`/leads/${deletingId}`);
      setDeletingId(null);
      // if the page becomes empty after delete, move back a page
      if (leads.length === 1 && page > 1) setPage((p) => p - 1);
      await load();
    } catch (e: any) {
      setDeleteErr(e?.response?.data?.detail || "Failed to delete lead");
    } finally {
      setDeleting(false);
    }
  };

  const exportCsv = async () => {
    try {
      const params: Record<string, string> = {};
      if (q.trim()) params.q = q.trim();
      if (status) params.status = status;
      if (source.trim()) params.source = source.trim();
      if (minBudget.trim()) params.min_budget = String(parseInt(minBudget, 10));
      if (maxBudget.trim()) params.max_budget = String(parseInt(maxBudget, 10));
      const res = await api.get("/leads/export.csv", { params, responseType: "blob" });
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "leads.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "Failed to export CSV");
    }
  };

  return (
    <div className="page" style={{ overflowX: "hidden", width: "100%" }}>
      <div style={{ maxWidth: "1200px", margin: "24px auto 0", padding: "0 16px" }}>
        <div
          className="row"
          style={{
            gap: 12,
            marginBottom: 16,
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            width: "100%"
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h1 style={{ margin: 0 }}>Leads</h1>
            <small style={{ opacity: 0.8 }}>({total})</small>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={goDashboard}>Dashboard</button>
            <button className="btn primary" onClick={() => setShowCreate((v) => !v)}>
              {showCreate ? "Close" : "+ Add Lead"}
            </button>
          </div>
        </div>

        {showCreate && (
          <form
            onSubmit={onCreate}
            className="card"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
              padding: 14,
              marginBottom: 16,
              maxWidth: "100%",
            }}
          >
            <input placeholder="First name *" {...createForm.register("first_name", { required: true })} style={{ width: "100%" }} />
            <input placeholder="Last name *" {...createForm.register("last_name", { required: true })} style={{ width: "100%" }} />
            <select {...createForm.register("status", { required: true })} style={{ width: "100%" }}>
              <option value="new">new</option>
              <option value="contacted">contacted</option>
              <option value="qualified">qualified</option>
              <option value="won">won</option>
              <option value="lost">lost</option>
            </select>
            <input placeholder="Email" type="email" {...createForm.register("email")} style={{ width: "100%" }} />
            <input placeholder="Phone" {...createForm.register("phone")} style={{ width: "100%" }} />
            <input placeholder="Source" {...createForm.register("source")} style={{ width: "100%" }} />
            <input placeholder="Property interest" {...createForm.register("property_interest")} style={{ width: "100%" }} />
            <input placeholder="Budget min" type="number" {...createForm.register("budget_min", { valueAsNumber: true })} style={{ width: "100%" }} />
            <input placeholder="Budget max" type="number" {...createForm.register("budget_max", { valueAsNumber: true })} style={{ width: "100%" }} />
            <input placeholder="Location" {...createForm.register("location")} style={{ width: "100%" }} />
            <input placeholder="Assigned to" {...createForm.register("assigned_to")} style={{ width: "100%" }} />
            <textarea placeholder="Notes" {...createForm.register("notes")} style={{ width: "100%", minHeight: 64 }} />
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, alignItems: "center" }}>
              <button className="btn primary" type="submit" disabled={createForm.formState.isSubmitting}>
                {createForm.formState.isSubmitting ? "Creating..." : "Create Lead"}
              </button>
              {createForm.formState.errors.root?.message && (
                <div style={{ color: "salmon" }}>{createForm.formState.errors.root.message}</div>
              )}
            </div>
          </form>
        )}

        {editing && (
          <form
            onSubmit={onUpdate}
            className="card"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
              padding: 14,
              marginBottom: 16,
              maxWidth: "100%",
              background: "var(--surface-1, #0f1115)",
            }}
          >
            <div style={{ gridColumn: "1 / -1", fontWeight: 600 }}>
              Editing: {editing.first_name} {editing.last_name}
            </div>
            <input placeholder="First name *" {...editForm.register("first_name", { required: true })} style={{ width: "100%" }} />
            <input placeholder="Last name *" {...editForm.register("last_name", { required: true })} style={{ width: "100%" }} />
            <select {...editForm.register("status", { required: true })} style={{ width: "100%" }}>
              <option value="new">new</option>
              <option value="contacted">contacted</option>
              <option value="qualified">qualified</option>
              <option value="won">won</option>
              <option value="lost">lost</option>
            </select>
            <input placeholder="Email" type="email" {...editForm.register("email")} style={{ width: "100%" }} />
            <input placeholder="Phone" {...editForm.register("phone")} style={{ width: "100%" }} />
            <input placeholder="Source" {...editForm.register("source")} style={{ width: "100%" }} />
            <input placeholder="Property interest" {...editForm.register("property_interest")} style={{ width: "100%" }} />
            <input placeholder="Budget min" type="number" {...editForm.register("budget_min", { valueAsNumber: true })} style={{ width: "100%" }} />
            <input placeholder="Budget max" type="number" {...editForm.register("budget_max", { valueAsNumber: true })} style={{ width: "100%" }} />
            <input placeholder="Location" {...editForm.register("location")} style={{ width: "100%" }} />
            <input placeholder="Assigned to" {...editForm.register("assigned_to")} style={{ width: "100%" }} />
            <textarea placeholder="Notes" {...editForm.register("notes")} style={{ width: "100%", minHeight: 64 }} />
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, alignItems: "center" }}>
              <button className="btn primary" type="submit" disabled={editForm.formState.isSubmitting}>
                {editForm.formState.isSubmitting ? "Updating..." : "Save Changes"}
              </button>
              <button className="btn" type="button" onClick={() => setEditing(null)}>Cancel</button>
              {editForm.formState.errors.root?.message && (
                <div style={{ color: "salmon" }}>{editForm.formState.errors.root.message}</div>
              )}
            </div>
          </form>
        )}

        <form
          className="row"
          style={{ gap: 8, marginBottom: 18, flexWrap: "wrap" }}
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            load();
          }}
          aria-label="Lead filters"
        >
          <input
            aria-label="Search by name or email"
            placeholder="Search name/email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ flex: "1 1 360px", minWidth: 220 }}
          />
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ flex: "0 1 260px", minWidth: 180, maxWidth: 340 }}
          >
            <option value="">All</option>
            <option value="new">new</option>
            <option value="contacted">contacted</option>
            <option value="qualified">qualified</option>
            <option value="won">won</option>
            <option value="lost">lost</option>
          </select>
          <input
            aria-label="Filter by source"
            placeholder="Source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            style={{ flex: "0 1 220px", minWidth: 160 }}
          />
          <input
            aria-label="Min budget"
            placeholder="Min budget"
            type="number"
            inputMode="numeric"
            value={minBudget}
            onChange={(e) => setMinBudget(e.target.value)}
            style={{ width: 140 }}
          />
          <input
            aria-label="Max budget"
            placeholder="Max budget"
            type="number"
            inputMode="numeric"
            value={maxBudget}
            onChange={(e) => setMaxBudget(e.target.value)}
            style={{ width: 140 }}
          />
          <button className="btn" type="submit" disabled={loading} aria-label="Apply filters">
            {loading ? "Loading..." : "Apply"}
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setQ("");
              setStatus("");
              setSource("");
              setMinBudget("");
              setMaxBudget("");
              setPage(1);
              load();
            }}
            aria-label="Reset filters"
          >
            Reset
          </button>
          <button
            className="btn"
            type="button"
            onClick={exportCsv}
            aria-label="Export CSV"
          >
            Export CSV
          </button>
        </form>

        {err && (
          <div role="status" aria-live="polite" style={{ color: "salmon", marginBottom: 8 }}>
            {err}
          </div>
        )}

        {isMobile ? (
          // --- Mobile: Card list view ---
          <div style={{ display: "grid", gap: 10 }}>
            {leads.map((l) => (
              <div
                key={l.id}
                className="card lead-card"
                onClick={() => navigate(`/leads/${l.id}`)}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: "var(--surface-2, #16181d)",
                  border: "1px solid var(--surface-3, #23262b)",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  rowGap: 6,
                  columnGap: 10,
                  alignItems: "center",
                  width: "100%",
                  maxWidth: "100%",
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
              >
                <div style={{ gridColumn: "1 / -1", fontWeight: 600, fontSize: 16 }}>
                  {l.first_name} {l.last_name}
                </div>
                <div style={{ opacity: 0.9 }}>
                  <div style={{ fontSize: 13 }}>Email</div>
                  <div style={{ fontSize: 14, overflowWrap: "anywhere", wordBreak: "break-word" }}>{(l as any).email || "-"}</div>
                </div>
                <div style={{ opacity: 0.9 }}>
                  <div style={{ fontSize: 13 }}>Phone</div>
                  <div style={{ fontSize: 14 }}>{(l as any).phone || "-"}</div>
                </div>
                <div style={{ opacity: 0.9 }}>
                  <div style={{ fontSize: 13 }}>Owner</div>
                  <div style={{ fontSize: 14 }}>{(l as any).owner_name || (l as any).assigned_to || "-"}</div>
                </div>
                <div style={{ gridColumn: "1 / 2", marginTop: 6 }}>
                  <span
                    className={`pill pill--${l.status}`}
                    style={{
                      background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                      color: '#fff',
                      boxShadow: '0 0 10px rgba(34, 197, 94, 0.7)',
                      borderRadius: '999px',
                      padding: '4px 10px',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      fontSize: 12,
                    }}
                  >
                    {l.status}
                  </span>
                </div>
                <div style={{ justifySelf: "end", display: "flex", gap: 8 }}>
                  <button
                    className="btn"
                    aria-label={`Edit ${l.first_name} ${l.last_name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(l);
                    }}
                    disabled={deleting || deletingId === l.id}
                  >
                    Edit
                  </button>
                  <button
                    className="btn danger"
                    aria-label={`Delete ${l.first_name} ${l.last_name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete(l.id);
                    }}
                    disabled={deleting && deletingId === l.id}
                    title="Soft delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {loading && leads.length === 0 && (
              <>
                <div className="card" style={{ padding: 14 }}>
                  <Skeleton width={180} height={18} />
                  <div style={{ marginTop: 10 }}><Skeleton height={22} /></div>
                  <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <Skeleton height={16} />
                    <Skeleton height={16} />
                    <Skeleton height={16} />
                  </div>
                </div>
                <div className="card" style={{ padding: 14 }}>
                  <Skeleton width={180} height={18} />
                  <div style={{ marginTop: 10 }}><Skeleton height={22} /></div>
                  <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <Skeleton height={16} />
                    <Skeleton height={16} />
                    <Skeleton height={16} />
                  </div>
                </div>
                <div className="card" style={{ padding: 14 }}>
                  <Skeleton width={180} height={18} />
                  <div style={{ marginTop: 10 }}><Skeleton height={22} /></div>
                  <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <Skeleton height={16} />
                    <Skeleton height={16} />
                    <Skeleton height={16} />
                  </div>
                </div>
              </>
            )}
            {leads.length === 0 && !loading && (
              <div className="card" style={{ padding: 12 }}>No leads match your filters.</div>
            )}
          </div>
        ) : (
          // --- Desktop / tablet: Table view ---
          <div
            className="table-wrap"
            style={{
              overflowX: "auto",
              background: "var(--surface-1, #0f1115)",
              borderRadius: 12,
              padding: 12
            }}
          >
            <table style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th align="left">Name</th>
                  <th align="left">Email</th>
                  <th align="left">Phone</th>
                  <th align="left">Status</th>
                  <th align="left">Source</th>
                  <th align="left">Owner</th>
                  <th align="left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr
                    key={l.id}
                    style={{ borderTop: "1px solid #2b2b2b", cursor: "pointer" }}
                    onClick={() => navigate(`/leads/${l.id}`)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    title="Open lead details"
                  >
                    <td>
                      {l.first_name} {l.last_name}
                    </td>
                    <td>{(l as any).email || "-"}</td>
                    <td>{(l as any).phone || "-"}</td>
                    <td>
                      <span
                        className={`pill pill--${l.status}`}
                        style={{
                          background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                          color: '#fff',
                          boxShadow: '0 0 10px rgba(34, 197, 94, 0.7)',
                          borderRadius: '999px',
                          padding: '4px 10px',
                          fontWeight: 600,
                          textTransform: 'capitalize'
                        }}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td>{(l as any).source || "-"}</td>
                    <td>{(l as any).owner_name || (l as any).assigned_to || "-"}</td>
                    <td>
                      <button
                        className="btn"
                        aria-label={`Edit ${l.first_name} ${l.last_name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(l);
                        }}
                        disabled={deleting || deletingId === l.id}
                        style={{ marginRight: 6 }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn danger"
                        aria-label={`Delete ${l.first_name} ${l.last_name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(l.id);
                        }}
                        disabled={deleting && deletingId === l.id}
                        title="Soft delete"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {loading && leads.length === 0 && (
                  <>
                    {[0,1,2,3,4].map((i) => (
                      <tr key={`sk-${i}`} style={{ borderTop: "1px solid #2b2b2b" }}>
                        <td><Skeleton width={140} height={16} /></td>
                        <td><Skeleton width={180} height={16} /></td>
                        <td><Skeleton width={120} height={16} /></td>
                        <td><Skeleton width={80} height={16} /></td>
                        <td><Skeleton width={100} height={16} /></td>
                        <td><Skeleton width={120} height={16} /></td>
                        <td><Skeleton width={100} height={28} /></td>
                      </tr>
                    ))}
                  </>
                )}
                {leads.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7}>No leads match your filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        <div
          className="row"
          style={{ marginTop: 14, alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "space-between" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="btn"
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={loading || page <= 1}
              aria-label="Previous page"
            >
              ← Prev
            </button>
            <span style={{ opacity: 0.8 }}>
              Page <b>{page}</b>
            </span>
            <button
              className="btn"
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={loading || page * size >= total}
              aria-label="Next page"
            >
              Next →
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label htmlFor="per-page" style={{ opacity: 0.8 }}>Per page</label>
            <select
              id="per-page"
              value={size}
              onChange={(e) => { setSize(parseInt(e.target.value, 10)); setPage(1); }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
            <span style={{ opacity: 0.8 }}>
              Showing <b>{leads.length}</b> of <b>{total}</b>
            </span>
          </div>
        </div>

        {deletingId != null && (
          <div className="card" style={{ marginTop: 12, padding: 12 }}>
            <div style={{ marginBottom: 8 }}>
              Delete this lead? This is a soft-delete in our API and can be recreated later.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn danger" onClick={deleteLead} disabled={deleting}>
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
              <button className="btn" onClick={() => setDeletingId(null)}>Cancel</button>
              {deleteErr && <div style={{ color: "salmon" }}>{deleteErr}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}