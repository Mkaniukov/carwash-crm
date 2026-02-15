import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Layout from "../../components/Layout";
import { Card, Button, Input } from "../../components/ui";
import { ownerApi } from "../../lib/api";
import { getErrorMessage } from "../../utils/error";

const DAY_LABELS = [
  { value: "0", label: "Mo" },
  { value: "1", label: "Di" },
  { value: "2", label: "Mi" },
  { value: "3", label: "Do" },
  { value: "4", label: "Fr" },
  { value: "5", label: "Sa" },
  { value: "6", label: "So" },
];

function timeToInputValue(t) {
  if (!t) return "09:00";
  const s = typeof t === "string" ? t : String(t);
  return s.slice(0, 5);
}

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("18:00");
  const [workingDays, setWorkingDays] = useState(["0", "1", "2", "3", "4"]);

  useEffect(() => {
    ownerApi
      .getSettings()
      .then((s) => {
        setWorkStart(timeToInputValue(s.work_start));
        setWorkEnd(timeToInputValue(s.work_end));
        const days = (s.working_days || "0,1,2,3,4").split(",").map((d) => d.trim()).filter(Boolean);
        setWorkingDays(days.length ? days : ["0", "1", "2", "3", "4"]);
      })
      .catch(() => {
        toast.error("Einstellungen konnten nicht geladen werden.");
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleDay = (value) => {
    setWorkingDays((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value].sort()
    );
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      await ownerApi.updateSettings({
        work_start: workStart.length === 5 ? workStart + ":00" : workStart,
        work_end: workEnd.length === 5 ? workEnd + ":00" : workEnd,
        working_days: workingDays.join(","),
      });
      toast.success("Einstellungen gespeichert.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Speichern fehlgeschlagen."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout role="owner">
        <h1 className="page-title">Einstellungen</h1>
        <Card><p className="text-muted">Lade…</p></Card>
      </Layout>
    );
  }

  return (
    <Layout role="owner">
      <h1 className="page-title">Einstellungen</h1>

      <Card>
        <form onSubmit={handleSubmit} className="settings-form">
          <h3 className="settings-form__section">Öffnungszeiten</h3>
          <div className="settings-form__row">
            <Input
              label="Arbeitsbeginn"
              type="time"
              value={workStart}
              onChange={(e) => setWorkStart(e.target.value)}
            />
            <Input
              label="Arbeitsende"
              type="time"
              value={workEnd}
              onChange={(e) => setWorkEnd(e.target.value)}
            />
          </div>

          <h3 className="settings-form__section">Arbeitstage</h3>
          <p className="settings-form__hint">Wählen Sie die Tage, an denen Sie geöffnet haben.</p>
          <div className="settings-form__days">
            {DAY_LABELS.map(({ value, label }) => (
              <label key={value} className="settings-form__day">
                <input
                  type="checkbox"
                  checked={workingDays.includes(value)}
                  onChange={() => toggleDay(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          <div className="settings-form__actions">
            <Button type="submit" loading={saving}>Speichern</Button>
          </div>
        </form>
      </Card>
    </Layout>
  );
}
