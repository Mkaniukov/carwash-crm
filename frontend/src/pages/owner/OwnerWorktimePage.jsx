import { useEffect, useState } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { de } from "date-fns/locale";
import toast from "react-hot-toast";
import Layout from "../../components/Layout";
import { Card } from "../../components/ui";
import { ownerApi } from "../../lib/api";

export default function OwnerWorktimePage() {
  const [entries, setEntries] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workerId, setWorkerId] = useState("");
  const [month, setMonth] = useState(() => new Date());

  useEffect(() => {
    ownerApi.getWorkers().then((w) => setWorkers(Array.isArray(w) ? w : [])).catch(() => setWorkers([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { year: month.getFullYear(), month: month.getMonth() + 1 };
    if (workerId) params.worker_id = workerId;
    ownerApi
      .getWorktime(params)
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => {
        toast.error("Arbeitszeiten konnten nicht geladen werden.");
        setEntries([]);
      })
      .finally(() => setLoading(false));
  }, [month, workerId]);

  return (
    <Layout role="owner">
      <h1 className="page-title">Arbeitszeit</h1>

      <Card className="worktime-filters">
        <div className="worktime-filters__row">
          <label>
            <span className="input-label">Mitarbeiter</span>
            <select
              className="input-field"
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
              style={{ minWidth: 160 }}
            >
              <option value="">Alle</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>{w.username}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="input-label">Monat</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setMonth((m) => subMonths(m, 1))}
              >
                ←
              </button>
              <span>{format(month, "MMMM yyyy", { locale: de })}</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setMonth((m) => addMonths(m, 1))}
              >
                →
              </button>
            </div>
          </label>
        </div>
      </Card>

      {loading ? (
        <Card><p className="text-muted">Lade…</p></Card>
      ) : entries.length === 0 ? (
        <Card><p className="text-muted">Keine Einträge.</p></Card>
      ) : (
        <Card>
          <table className="worktime-table">
            <thead>
              <tr>
                <th>Mitarbeiter</th>
                <th>Datum</th>
                <th>Beginn</th>
                <th>Ende</th>
                <th>Pause (Min)</th>
                <th>Stunden</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>{e.worker_username || "—"}</td>
                  <td>{e.date}</td>
                  <td>{e.start_time ? format(new Date(e.start_time), "HH:mm") : "—"}</td>
                  <td>{e.end_time ? format(new Date(e.end_time), "HH:mm") : "—"}</td>
                  <td>{e.pause_minutes ?? 0}</td>
                  <td>{e.total_hours != null ? `${e.total_hours} h` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </Layout>
  );
}
