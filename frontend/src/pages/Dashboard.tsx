import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Skeleton from "../components/Skeleton";

type DashboardData = {
  total_leads: number;
  total_activities?: number;
  new_leads_this_week?: number;
  closed_leads_this_month?: number;
  leads_by_status: Record<string, number> | Array<{ status?: string; name?: string; count?: number; value?: number }>;
  recent_activities: Array<{
    id: number;
    lead_id: number;
    type: string;
    title?: string;
    at?: string;            // backend may use "at"
    activity_date?: string; // or "activity_date"
  }>;
  // --- new richer metrics ---
  leads_by_source?: Record<string, number>;
  new_leads_today?: number;
  new_leads_7d?: number;
  new_leads_30d?: number;
  won_30d?: number;
  lost_30d?: number;
  win_rate_30d?: number; // 0..1
  activities_by_type_30d?: Record<string, number>;
  avg_activities_per_lead_30d?: number;
  leads_trend_8w?: Array<{ week_start: string; count: number }>;
  recent_leads?: Array<{ id: number; name: string; status: string; source: string; created_at: string }>;
};

export default function Dashboard() {
  const fadeIn = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

  const dashboardCSS = `
      :root {
        --card-bg: rgba(20,20,20,0.6);
        --card-border: rgba(255,255,255,0.12);
        --text: #eaeaea;
        --text-muted: rgba(235,235,245,0.7);
        --shadow: 0 6px 24px rgba(0,0,0,0.25);
        --shadow-lg: 0 14px 30px rgba(0,0,0,0.28);
      }
      body[data-theme="light"] {
        --card-bg: #ffffff;
        --card-border: rgba(0,0,0,0.08);
        --text: #111111;
        --text-muted: rgba(0,0,0,0.58);
        --shadow: 0 6px 24px rgba(0,0,0,0.10);
        --shadow-lg: 0 14px 30px rgba(0,0,0,0.12);
      }

      .pageWrap {
        min-height: calc(100vh - 80px);
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 48px 16px;
      }
      .centerWrap {
        width: 100%;
        display: grid;
        place-items: center;
      }
      .containerWrap {
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 32px;
        text-align: center;
        color: var(--text);
      }
      .kpiGrid {
        display: grid;
        grid-template-columns: minmax(260px, 360px) minmax(420px, 720px);
        gap: 24px;
        align-items: center;
        justify-content: center;
        justify-items: center;
        margin-inline: auto;
        width: 100%;
        max-width: 1100px;
      }
      @media (max-width: 1100px) {
        .kpiGrid {
          grid-template-columns: 1fr;
        }
      }
      .grid2 {
        display: grid;
        grid-template-columns: repeat(3, minmax(280px, 1fr));
        gap: 24px;
        width: 100%;
        max-width: 1100px;
        margin-inline: auto;
      }
      @media (max-width: 1100px) {
        .grid2 {
          grid-template-columns: 1fr;
        }
      }
    `;

  const [data, setData] = useState<DashboardData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<DashboardData>("/dashboard");
        setData(res.data);
      } catch (e: any) {
        if (e?.response?.status === 401) {
          localStorage.removeItem("token");
          nav("/login", { replace: true });
        } else {
          setErr(e?.response?.data?.detail || "Failed to load dashboard");
        }
      }
    })();
  }, [nav]);

  if (err) return <div style={{ padding: 24, color: "salmon" }}>{err}</div>;
  if (!data) return (
    <>
      <style>{fadeIn + dashboardCSS}</style>
      <div className="pageWrap">
        <div className="centerWrap">
          <div className="containerWrap">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
              <Skeleton width={220} height={38} />
            </div>

            {/* KPI Row (skeleton) */}
            <div className="kpiGrid">
              <div style={{ borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--card-bg)", boxShadow: "var(--shadow)", padding: 24, width: "100%", maxWidth: 360 }}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <Skeleton width={120} height={16} />
                    <div style={{ marginTop: 8 }}><Skeleton width={160} height={48} /></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                    <Skeleton height={28} />
                    <Skeleton height={28} />
                    <Skeleton height={28} />
                  </div>
                </div>
              </div>

              <div style={{ borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--card-bg)", boxShadow: "var(--shadow)", padding: 24, minHeight: 460, width: "100%", maxWidth: 720 }}>
                <Skeleton width={180} height={18} />
                <div style={{ marginTop: 16 }}>
                  <Skeleton height={380} />
                </div>
              </div>
            </div>

            {/* Metrics Row 2 (skeleton) */}
            <div className="grid2">
              <div style={{ borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--card-bg)", boxShadow: "var(--shadow)", padding: 24 }}>
                <Skeleton width={180} height={18} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 12 }}>
                  <Skeleton height={42} />
                  <Skeleton height={42} />
                  <Skeleton height={42} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 12 }}>
                  <Skeleton height={38} />
                  <Skeleton height={38} />
                  <Skeleton height={38} />
                </div>
                <div style={{ marginTop: 12 }}><Skeleton width={220} height={18} /></div>
              </div>

              <div style={{ borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--card-bg)", boxShadow: "var(--shadow)", padding: 24 }}>
                <Skeleton width={160} height={18} />
                <div style={{ marginTop: 12 }}><Skeleton height={260} /></div>
              </div>

              <div style={{ borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--card-bg)", boxShadow: "var(--shadow)", padding: 24 }}>
                <Skeleton width={160} height={18} />
                <div style={{ marginTop: 12 }}><Skeleton height={260} /></div>
              </div>
            </div>

            {/* Trend + recent leads (skeleton) */}
            <div className="grid2" style={{ marginTop: 8 }}>
              <div style={{ borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--card-bg)", boxShadow: "var(--shadow)", padding: 24 }}>
                <Skeleton width={200} height={18} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginTop: 12 }}>
                  <Skeleton height={68} />
                  <Skeleton height={68} />
                  <Skeleton height={68} />
                  <Skeleton height={68} />
                </div>
              </div>

              <div style={{ borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--card-bg)", boxShadow: "var(--shadow)", padding: 24, gridColumn: "span 2" }}>
                <Skeleton width={160} height={18} />
                <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  <Skeleton height={56} />
                  <Skeleton height={56} />
                  <Skeleton height={56} />
                </div>
              </div>
            </div>

            {/* Recent Activities (skeleton) */}
            <section style={{ borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--card-bg)", boxShadow: "var(--shadow)", padding: 24, width: "100%", maxWidth: 1100, margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <Skeleton width={160} height={18} />
                <Skeleton width={100} height={16} />
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <Skeleton height={62} />
                <Skeleton height={62} />
                <Skeleton height={62} />
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );

  let pieData: Array<{ name: string; value: number }> = [];
  const lbs: any = data.leads_by_status || {};
  if (Array.isArray(lbs)) {
    pieData = lbs.map((x: any) => ({
      name: (x.status ?? x.name ?? "unknown").toString(),
      value: Number(x.count ?? x.value ?? 0),
    }));
  } else {
    pieData = Object.entries(lbs).map(([name, value]) => ({ name, value: Number(value as any) }));
  }
  const COLORS = ["#8b5cf6", "#22c55e", "#60a5fa", "#f59e0b", "#ef4444", "#14b8a6"]; // purple/green/blue/orange/red/teal

  const srcData = Object.entries(data.leads_by_source || {}).map(([name, value]) => ({ name, value }));
  const actTypeData = Object.entries(data.activities_by_type_30d || {}).map(([name, value]) => ({ name, value }));
  const weeks = (data.leads_trend_8w || []).map(w => ({ label: w.week_start, value: w.count }));

  // --- Reusable styles ---
  const h2Style: React.CSSProperties = {
    fontSize: 32,
    fontWeight: 800,
    letterSpacing: 0.2,
    background: "linear-gradient(90deg, #a78bfa, #60a5fa)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    margin: 0,
    marginBottom: 8,
  };
  const card: React.CSSProperties = {
    borderRadius: 14,
    border: "1px solid var(--card-border)",
    background: "var(--card-bg)",
    boxSizing: "border-box",
    boxShadow: "var(--shadow)",
    transition: "transform .18s ease, box-shadow .22s ease",
    willChange: "transform",
    animation: "fadeIn 0.8s ease-in-out",
  };
  const sectionTitle: React.CSSProperties = { fontWeight: 700, marginBottom: 8 };

  return (
    <>
      <style>{fadeIn + dashboardCSS}</style>
      <div className="pageWrap">
        <div className="centerWrap">
          <div className="containerWrap">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
            <h2 style={h2Style}>Dashboard</h2>
          </div>

          {/* KPI Row */}
          <div className="kpiGrid">
            <div
              style={{ ...card, padding: 24, width: "100%", maxWidth: 360 }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-lg)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "none";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow)";
              }}
            >
              <div style={{ display:"grid", gap: 10 }}>
                <div>
                  <div style={{ opacity: 0.8 }}>Total Leads</div>
                  <div style={{ fontSize: 48, fontWeight: 800, marginTop: 4, textShadow: "0 0 10px #a78bfa", color: "var(--text)" }}>{data.total_leads}</div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap: 12 }}>
                  <div>
                    <div style={{ opacity: 0.8, fontSize: 12 }}>Total Activities</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{data.total_activities ?? 0}</div>
                  </div>
                  <div>
                    <div style={{ opacity: 0.8, fontSize: 12 }}>New This Week</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{data.new_leads_this_week ?? 0}</div>
                  </div>
                  <div>
                    <div style={{ opacity: 0.8, fontSize: 12 }}>Closed This Month</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{data.closed_leads_this_month ?? 0}</div>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{ ...card, padding: 24, minHeight: 460, width: "100%", maxWidth: 720 }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-lg)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "none";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow)";
              }}
            >
              <div style={sectionTitle}>Leads by Status</div>
              {pieData.length > 0 ? (
                <div style={{ width: "100%", height: 380 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 8, right: 8, bottom: 40, left: 8 }}>
                      <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={140} label>
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--text)" }}
                        labelStyle={{ color: "var(--text-muted)" }}
                        itemStyle={{ color: "var(--text)" }}
                      />
                      <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ color: "var(--text)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ opacity: 0.7, color: "var(--text-muted)" }}>No status data</div>
              )}
            </div>
          </div>

          {/* Metrics Row 2 */}
          <div className="grid2">
            {/* New leads & win-rate card */}
            <div
              style={{ ...card, padding: 24 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-lg)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "none"; (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow)"; }}
            >
              <div style={{ display:"grid", gap: 10 }}>
                <div style={{ ...sectionTitle, marginBottom: 4 }}>Recent Performance</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap: 12 }}>
                  <div>
                    <div style={{ opacity: 0.8, fontSize: 12 }}>New Today</div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>{data.new_leads_today ?? 0}</div>
                  </div>
                  <div>
                    <div style={{ opacity: 0.8, fontSize: 12 }}>New 7d</div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>{data.new_leads_7d ?? 0}</div>
                  </div>
                  <div>
                    <div style={{ opacity: 0.8, fontSize: 12 }}>New 30d</div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>{data.new_leads_30d ?? 0}</div>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap: 12, marginTop: 8 }}>
                  <div>
                    <div style={{ opacity: 0.8, fontSize: 12 }}>Won 30d</div>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{data.won_30d ?? 0}</div>
                  </div>
                  <div>
                    <div style={{ opacity: 0.8, fontSize: 12 }}>Lost 30d</div>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{data.lost_30d ?? 0}</div>
                  </div>
                  <div>
                    <div style={{ opacity: 0.8, fontSize: 12 }}>Win Rate 30d</div>
                    <div style={{ fontSize: 24, fontWeight: 800 }}>{Math.round(((data.win_rate_30d ?? 0) * 100))}%</div>
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ opacity: 0.8, fontSize: 12 }}>Avg activities / lead (30d)</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{(data.avg_activities_per_lead_30d ?? 0).toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Leads by Source (pie) */}
            <div
              style={{ ...card, padding: 24 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-lg)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "none"; (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow)"; }}
            >
              <div style={sectionTitle}>Leads by Source</div>
              {srcData.length > 0 ? (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={srcData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                        {srcData.map((entry, index) => (
                          <Cell key={`src-${index}-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--text)" }} />
                      <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ color: "var(--text)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ opacity: 0.7 }}>No source data</div>
              )}
            </div>

            {/* Activities by Type (pie) */}
            <div
              style={{ ...card, padding: 24 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-lg)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "none"; (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow)"; }}
            >
              <div style={sectionTitle}>Activities (30d)</div>
              {actTypeData.length > 0 ? (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={actTypeData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                        {actTypeData.map((entry, index) => (
                          <Cell key={`act-${index}-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--text)" }} />
                      <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ color: "var(--text)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ opacity: 0.7 }}>No recent activity data</div>
              )}
            </div>
          </div>

          {/* Weekly trend + recent leads */}
          <div className="grid2" style={{ marginTop: 8 }}>
            <div style={{ ...card, padding: 24 }}>
              <div style={sectionTitle}>Leads Trend (8 weeks)</div>
              {weeks.length > 0 ? (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                  {weeks.map((w, i) => (
                    <li key={i} style={{ border: "1px solid var(--card-border)", borderRadius: 10, padding: 12 }}>
                      <div style={{ opacity: 0.7, fontSize: 12 }}>{w.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 700 }}>{w.value}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ opacity: 0.7 }}>No trend data</div>
              )}
            </div>

            <div style={{ ...card, padding: 24, gridColumn: "span 2" }}>
              <div style={sectionTitle}>Recent Leads</div>
              {data.recent_leads && data.recent_leads.length > 0 ? (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
                  {data.recent_leads.map((rl) => (
                    <li key={rl.id} style={{ border: "1px solid var(--card-border)", borderRadius: 10, padding: 10, display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{rl.name}</div>
                        <div style={{ opacity: 0.75, fontSize: 12 }}>Source: {rl.source} • Status: {rl.status}</div>
                      </div>
                      <div style={{ opacity: 0.7, fontSize: 12 }}>{new Date(rl.created_at).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ opacity: 0.7 }}>No recent leads</div>
              )}
            </div>
          </div>

          {/* Recent Activities */}
          <section
            style={{ ...card, padding: 24, width: "100%", maxWidth: 1100, margin: "0 auto" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-lg)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = "none";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>Recent Activities</h3>
              <span style={{ fontSize: 12, opacity: 0.7, color: "var(--text-muted)" }}>{new Date().toLocaleDateString()}</span>
            </div>
            {data.recent_activities.length === 0 ? (
              <div style={{ opacity: 0.7, color: "var(--text-muted)" }}>No recent activity.</div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 16 }}>
                {data.recent_activities.map((a) => {
                  const when = a.activity_date ?? a.at;
                  return (
                    <li
                      key={a.id}
                      style={{
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 12,
                        padding: 12,
                        transition: "transform .15s ease, box-shadow .2s ease",
                        boxShadow: "0 3px 14px rgba(0,0,0,0.18)",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLLIElement).style.transform = "translateY(-2px)";
                        (e.currentTarget as HTMLLIElement).style.boxShadow = "0 8px 22px rgba(0,0,0,0.28)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLLIElement).style.transform = "none";
                        (e.currentTarget as HTMLLIElement).style.boxShadow = "0 3px 14px rgba(0,0,0,0.18)";
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <strong style={{ textTransform: "capitalize" }}>{a.type}</strong>
                          <span style={{ opacity: 0.8 }}> — {a.title || "—"}</span>
                        </div>
                        <small style={{ opacity: 0.8 }}>{when ? new Date(when).toLocaleString() : ""}</small>
                      </div>
                      <small style={{ opacity: 0.7 }}>Lead #{a.lead_id}</small>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          </div>
        </div>
      </div>
    </>
  );
}