import { useEffect, useState } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { de } from "date-fns/locale";
import toast from "react-hot-toast";
import Layout from "../../components/Layout";
import { Card, Button, Modal, Input } from "../../components/ui";
import { workerApi } from "../../lib/api";
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

export default function WorkerTimePage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => new Date());
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [editForm, setEditForm] = useState({ start_time: "", end_time: "", pause_minutes: "" });
  const [editSaving, setEditSaving] = useState(false);

  const load = () => {
    setLoading(true);
    workerApi
      .workTimeList({ year: month.getFullYear(), month: month.getMonth() + 1 })
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => {
        toast.error("Arbeitszeiten konnten nicht geladen werden.");
        setEntries([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), [month]);

  const handleStart = async () => {
    setStarting(true);
    try {
      await workerApi.workTimeStart();
      toast.success("Arbeitsbeginn erfasst.");
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Fehler."));
    } finally {
      setStarting(false);
    }
  };

  const handleEnd = async () => {
    setEnding(true);
    try {
      await workerApi.workTimeEnd(0);
      toast.success("Arbeitsende erfasst.");
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Fehler."));
    } finally {
      setEnding(false);
    }
  };

  const hasOpenToday = entries.some(
    (e) => e.date === format(new Date(), "yyyy-MM-dd") && e.end_time == null
  );

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
      await workerApi.workTimeUpdate(editEntry.id, {
        start_time: start,
        end_time: end || undefined,
        pause_minutes: Number.isNaN(pause) ? undefined : pause,
      });
      toast.success("Eintrag aktualisiert.");
      setEditEntry(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Speichern fehlgeschlagen."));
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <Layout role="worker">
      <h1 className="page-title">Arbeitszeit</h1>

      <Card className="worktime-actions">
        <div className="worktime-actions__row">
          <Button
            onClick={handleStart}
            loading={starting}
            disabled={starting || hasOpenToday}
            aria-label="Arbeitsbeginn erfassen"
          >
            Arbeitsbeginn
          </Button>
          <Button
            variant="secondary"
            onClick={handleEnd}
            loading={ending}
            disabled={ending || !hasOpenToday}
            aria-label="Arbeitsende erfassen"
          >
            Arbeitsende
          </Button>
        </div>
      </Card>

      <div className="worktime-nav">
        <Button variant="ghost" size="sm" onClick={() => setMonth((m) => subMonths(m, 1))}>←</Button>
        <span>{format(month, "MMMM yyyy", { locale: de })}</span>
        <Button variant="ghost" size="sm" onClick={() => setMonth((m) => addMonths(m, 1))}>→</Button>
      </div>

      {loading ? (
        <Card><p className="text-muted">Lade…</p></Card>
      ) : entries.length === 0 ? (
        <Card><p className="text-muted">Keine Einträge für diesen Monat.</p></Card>
      ) : (
        <Card>
          <table className="worktime-table">
            <thead>
              <tr>
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
