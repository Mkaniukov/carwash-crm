import { useEffect, useState } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { de } from "date-fns/locale";
import toast from "react-hot-toast";
import Layout from "../../components/Layout";
import { Card, Button } from "../../components/ui";
import { workerApi } from "../../lib/api";
import { getErrorMessage } from "../../utils/error";

export default function WorkerTimePage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => new Date());
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);

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
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </Layout>
  );
}
