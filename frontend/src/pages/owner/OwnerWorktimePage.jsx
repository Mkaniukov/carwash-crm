import { useEffect, useState } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { de } from "date-fns/locale";
import toast from "react-hot-toast";
import Layout from "../../components/Layout";
import { Card, Button, Modal, Input } from "../../components/ui";
import { ownerApi } from "../../lib/api";
import { getErrorMessage } from "../../utils/error";

function toTimeStr(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return format(d, "HH:mm");
}
function toISO(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  return `${dateStr}T${timeStr}:00`;
}

export default function OwnerWorktimePage() {
  const [entries, setEntries] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workerId, setWorkerId] = useState("");
  const [month, setMonth] = useState(() => new Date());
  const [editEntry, setEditEntry] = useState(null);
  const [editForm, setEditForm] = useState({ start_time: "", end_time: "", pause_minutes: "" });
  const [editSaving, setEditSaving] = useState(false);

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

  const openEdit = (e) => {
    setEditEntry(e);
    setEditForm({
      start_time: toTimeStr(e.start_time),
      end_time: toTimeStr(e.end_time),
      pause_minutes: String(e.pause_minutes ?? 0),
    });
  };

  const submitEdit = async () => {
    if (!editEntry) return;
    const start = toISO(editEntry.date, editForm.start_time);
    const end = editForm.end_time ? toISO(editEntry.date, editForm.end_time) : "";
    const pause = parseInt(editForm.pause_minutes, 10);
    if (!start) {
      toast.error("Beginn eingeben.");
      return;
    }
    setEditSaving(true);
    try {
      await ownerApi.updateWorktime(editEntry.id, {
        start_time: start,
        end_time: end || undefined,
        pause_minutes: Number.isNaN(pause) ? undefined : pause,
      });
      toast.success("Eintrag aktualisiert.");
      setEditEntry(null);
      setLoading(true);
      const params = { year: month.getFullYear(), month: month.getMonth() + 1 };
      if (workerId) params.worker_id = workerId;
      ownerApi.getWorktime(params).then((data) => setEntries(Array.isArray(data) ? data : [])).finally(() => setLoading(false));
    } catch (err) {
      toast.error(getErrorMessage(err, "Speichern fehlgeschlagen."));
    } finally {
      setEditSaving(false);
    }
  };

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
                <th></th>
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
                  <td>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>Bearbeiten</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal
        open={!!editEntry}
        onClose={() => setEditEntry(null)}
        title="Arbeitszeit bearbeiten"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditEntry(null)}>Abbrechen</Button>
            <Button loading={editSaving} onClick={submitEdit}>Speichern</Button>
          </>
        }
      >
        {editEntry && (
          <div className="checkin-form__row">
            <Input
              label="Beginn (HH:mm)"
              value={editForm.start_time}
              onChange={(e) => setEditForm((f) => ({ ...f, start_time: e.target.value }))}
              placeholder="09:00"
            />
            <Input
              label="Ende (HH:mm, leer = offen)"
              value={editForm.end_time}
              onChange={(e) => setEditForm((f) => ({ ...f, end_time: e.target.value }))}
              placeholder="17:00"
            />
            <Input
              label="Pause (Minuten)"
              type="number"
              min="0"
              max="480"
              value={editForm.pause_minutes}
              onChange={(e) => setEditForm((f) => ({ ...f, pause_minutes: e.target.value }))}
            />
          </div>
        )}
      </Modal>
    </Layout>
  );
}
