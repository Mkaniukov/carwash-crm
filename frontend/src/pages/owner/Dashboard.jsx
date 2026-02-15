import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { Card } from "../../components/ui";
import { ownerApi } from "../../lib/api";
import { getErrorMessage } from "../../utils/error";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];
const SOURCE_LABELS = { website: "Website", worker: "Mitarbeiter", phone: "Telefon" };

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    ownerApi
      .getAnalytics()
      .then(setData)
      .catch((err) => setError(getErrorMessage(err, "Dashboard konnte nicht geladen werden.")))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout role="owner">
        <h1 className="page-title">Dashboard</h1>
        <div className="stats-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}><div className="skeleton" style={{ height: 80 }} /></Card>
          ))}
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout role="owner">
        <h1 className="page-title">Dashboard</h1>
        <Card><p className="text-error">{error}</p></Card>
      </Layout>
    );
  }

  const revenueToday = Number(data.revenue_today) || 0;
  const revenueMonth = Number(data.revenue_month) || 0;
  const avgTicket = Number(data.average_ticket) || 0;
  const completed = Number(data.completed_bookings) || 0;
  const total = Number(data.total_bookings) || 0;
  const cancelRate = Number(data.cancel_rate_percent) || 0;
  const revenueByWorker = data.revenue_by_worker || {};
  const revenueBySource = data.revenue_by_source || {};
  const mostPopular = data.most_popular_service || "—";

  const stats = [
    { label: "Umsatz heute", value: `€${revenueToday}`, highlight: true },
    { label: "Umsatz diesen Monat", value: `€${revenueMonth}`, highlight: true },
    { label: "Ø Einnahmen pro Termin", value: `€${avgTicket}`, highlight: false },
    { label: "Erledigte Termine", value: String(completed), highlight: false },
    { label: "Alle Termine (gesamt)", value: String(total), highlight: false },
    { label: "Stornoquote", value: `${cancelRate}%`, highlight: cancelRate > 20 },
  ];

  const workerChartData = Object.entries(revenueByWorker).map(([name, value]) => ({
    name: name || "—",
    value: Number(value) || 0,
  }));

  const sourceChartData = Object.entries(revenueBySource).map(([key, value]) => ({
    name: SOURCE_LABELS[key] || key,
    value: Number(value) || 0,
  }));

  return (
    <Layout role="owner">
      <h1 className="page-title">Dashboard</h1>

      <div className="stats-grid">
        {stats.map((s) => (
          <Card key={s.label} className={s.highlight ? "stat-card--highlight" : ""}>
            <div className="stat-card">
              <span className="stat-card__label">{s.label}</span>
              <span className="stat-card__value">{s.value}</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="dashboard-charts">
        <Card className="dashboard-chart-card">
          <h3 className="dashboard-chart-title">Umsatz nach Mitarbeiter</h3>
          <div className="chart-container">
            {workerChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={workerChartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `€${v}`} />
                  <Tooltip formatter={(v) => [`€${v}`, "Umsatz"]} />
                  <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} name="Umsatz" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted" style={{ padding: 24 }}>Noch keine Umsatzdaten nach Mitarbeiter.</p>
            )}
          </div>
        </Card>

        <Card className="dashboard-chart-card">
          <h3 className="dashboard-chart-title">Umsatz nach Quelle</h3>
          <div className="chart-container chart-container--pie">
            {sourceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={sourceChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, value }) => (value ? `${name}: €${value}` : name)}
                  >
                    {sourceChartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`€${v}`, "Umsatz"]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted" style={{ padding: 24 }}>Noch keine Umsatzdaten nach Quelle.</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="dashboard-chart-card" style={{ marginTop: 16 }}>
        <h3 className="dashboard-chart-title">Beliebtester Service</h3>
        <p className="stat-card__value" style={{ fontSize: "1.25rem", marginTop: 8 }}>{mostPopular}</p>
      </Card>
    </Layout>
  );
}
