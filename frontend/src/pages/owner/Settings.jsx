import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Layout from "../../components/Layout";
import { Card, Button, Input } from "../../components/ui";
import { ownerApi } from "../../lib/api";
import { getErrorMessage } from "../../utils/error";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";

const DAY_LABELS = [
  { value: "0", label: "Mo" },
  { value: "1", label: "Di" },
  { value: "2", label: "Mi" },
  { value: "3", label: "Do" },
  { value: "4", label: "Fr" },
  { value: "5", label: "Sa" },
  { value: "6", label: "So" },
];

const DEFAULT_START = "07:30";
const DEFAULT_END = "18:00";

function emptyHoursPerDay() {
  return Object.fromEntries(
    DAY_LABELS.map(({ value }) => [value, { start: DEFAULT_START, end: DEFAULT_END }])
  );
}

function hoursPerDayFromSettings(s) {
  const hpd = s?.hours_per_day;
  if (hpd && typeof hpd === "object" && Object.keys(hpd).length > 0) {
    const out = {};
    for (const { value } of DAY_LABELS) {
      const day = hpd[value];
      if (day && typeof day === "object" && day.start && day.end) {
        out[value] = { start: String(day.start).slice(0, 5), end: String(day.end).slice(0, 5) };
      } else {
        out[value] = null;
      }
    }
    return out;
  }
  const start = timeToInputValue(s?.work_start) || DEFAULT_START;
  const end = timeToInputValue(s?.work_end) || DEFAULT_END;
  const days = (s?.working_days || "0,1,2,3,4").split(",").map((d) => d.trim()).filter(Boolean);
  return Object.fromEntries(
    DAY_LABELS.map(({ value }) => [
      value,
      days.includes(value) ? { start, end } : null,
    ])
  );
}

function timeToInputValue(t) {
  if (!t) return "09:00";
  const s = typeof t === "string" ? t : String(t);
  return s.slice(0, 5);
}

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hoursPerDay, setHoursPerDay] = useState(emptyHoursPerDay());
  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [passwordNew, setPasswordNew] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [notificationEmails, setNotificationEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [emailsSaving, setEmailsSaving] = useState(false);
  const [blockedList, setBlockedList] = useState([]);
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayNote, setHolidayNote] = useState("");

  const loadBlockedList = () => {
    ownerApi
      .getBlockedDates()
      .then((b) => setBlockedList(Array.isArray(b) ? b : []))
      .catch(() => setBlockedList([]));
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      ownerApi.getSettings(),
      ownerApi.getBlockedDates().catch(() => []),
    ])
      .then(([s, blk]) => {
        setHoursPerDay(hoursPerDayFromSettings(s));
        const emails = Array.isArray(s.notification_emails) ? s.notification_emails : [];
        setNotificationEmails(emails);
        setBlockedList(Array.isArray(blk) ? blk : []);
      })
      .catch(() => {
        toast.error("Einstellungen konnten nicht geladen werden.");
      })
      .finally(() => setLoading(false));
  }, []);

  const setDayOpen = (value, open) => {
    setHoursPerDay((prev) => ({
      ...prev,
      [value]: open ? { start: DEFAULT_START, end: DEFAULT_END } : null,
    }));
  };

  const setDayHours = (value, field, val) => {
    setHoursPerDay((prev) => {
      const day = prev[value];
      if (!day) return prev;
      return { ...prev, [value]: { ...day, [field]: val } };
    });
  };

  const payload = () => {
    const openDays = DAY_LABELS.filter(({ value }) => hoursPerDay[value]).map(({ value }) => value);
    const first = openDays[0];
    const firstDay = first != null ? hoursPerDay[first] : null;
    const start = firstDay?.start?.slice(0, 5) || DEFAULT_START;
    const end = firstDay?.end?.slice(0, 5) || DEFAULT_END;
    return {
      work_start: start.length === 5 ? start + ":00" : start,
      work_end: end.length === 5 ? end + ":00" : end,
      working_days: openDays.join(","),
      notification_emails: notificationEmails,
      hours_per_day: hoursPerDay,
    };
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      await ownerApi.updateSettings(payload());
      toast.success("Einstellungen gespeichert.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Speichern fehlgeschlagen."));
    } finally {
      setSaving(false);
    }
  };

  const addNotificationEmail = () => {
    const email = (newEmail || "").trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Bitte gültige E-Mail-Adresse eingeben.");
      return;
    }
    if (notificationEmails.includes(email)) {
      toast.error("Diese E-Mail ist bereits in der Liste.");
      return;
    }
    setNotificationEmails((prev) => [...prev, email]);
    setNewEmail("");
  };

  const removeNotificationEmail = (email) => {
    setNotificationEmails((prev) => prev.filter((e) => e !== email));
  };

  const handleSaveNotificationEmails = async (e) => {
    e?.preventDefault();
    setEmailsSaving(true);
    try {
      await ownerApi.updateSettings(payload());
      toast.success("E-Mail-Liste gespeichert.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Speichern fehlgeschlagen."));
    } finally {
      setEmailsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e?.preventDefault();
    if (passwordNew !== passwordConfirm) {
      toast.error("Neues Passwort und Bestätigung stimmen nicht überein.");
      return;
    }
    if (passwordNew.length < 6) {
      toast.error("Neues Passwort muss mindestens 6 Zeichen haben.");
      return;
    }
    setPasswordSaving(true);
    try {
      await ownerApi.changePassword(passwordCurrent, passwordNew);
      toast.success("Passwort geändert.");
      setPasswordCurrent("");
      setPasswordNew("");
      setPasswordConfirm("");
    } catch (err) {
      toast.error(getErrorMessage(err, "Passwortänderung fehlgeschlagen."));
    } finally {
      setPasswordSaving(false);
    }
  };

  const addHolidayDay = async (e) => {
    e?.preventDefault();
    if (!holidayDate) {
      toast.error("Bitte ein Datum wählen.");
      return;
    }
    try {
      await ownerApi.addBlockedDate({ date: holidayDate, note: holidayNote.trim() || undefined });
      toast.success("Tag wurde als geschlossen gespeichert.");
      setHolidayNote("");
      loadBlockedList();
    } catch (err) {
      toast.error(getErrorMessage(err, "Speichern fehlgeschlagen."));
    }
  };

  const removeBlocked = async (id) => {
    if (!window.confirm("Diesen geschlossenen Tag entfernen?")) return;
    try {
      await ownerApi.deleteBlockedDate(id);
      toast.success("Entfernt.");
      loadBlockedList();
    } catch (err) {
      toast.error(getErrorMessage(err, "Löschen fehlgeschlagen."));
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
          <h3 className="settings-form__section">Öffnungszeiten pro Tag</h3>
          <p className="settings-form__hint">Für jeden Wochentag können Sie geöffnet lassen oder eigene Zeiten eintragen. Leer = geschlossen.</p>
          <div className="settings-form__per-day">
            {DAY_LABELS.map(({ value, label }) => {
              const day = hoursPerDay[value];
              const isOpen = day != null;
              return (
                <div key={value} className="settings-form__per-day-row">
                  <label className="settings-form__day">
                    <input
                      type="checkbox"
                      checked={isOpen}
                      onChange={(e) => setDayOpen(value, e.target.checked)}
                    />
                    <span>{label}</span>
                  </label>
                  {isOpen ? (
                    <>
                      <Input
                        type="time"
                        value={day.start}
                        onChange={(e) => setDayHours(value, "start", e.target.value)}
                        aria-label={`${label} Beginn`}
                      />
                      <Input
                        type="time"
                        value={day.end}
                        onChange={(e) => setDayHours(value, "end", e.target.value)}
                        aria-label={`${label} Ende`}
                      />
                    </>
                  ) : (
                    <span className="text-muted">Geschlossen</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="settings-form__actions">
            <Button type="submit" loading={saving}>Speichern</Button>
          </div>
        </form>
      </Card>

      <Card className="settings-form__card">
        <h3 className="settings-form__section">Geschlossene Tage (Feiertage)</h3>
        <p className="settings-form__hint">
          An diesen Tagen sind keine Online-Buchungen und keine Termine möglich. Mitarbeiter können zusätzlich selbst ganze Tage sperren (werden hier mit angezeigt).
        </p>
        <form onSubmit={addHolidayDay} className="settings-form">
          <div className="settings-form__row" style={{ alignItems: "flex-end", gap: "0.5rem", flexWrap: "wrap" }}>
            <Input
              label="Datum"
              type="date"
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.target.value)}
            />
            <Input
              label="Notiz (optional)"
              type="text"
              value={holidayNote}
              onChange={(e) => setHolidayNote(e.target.value)}
              placeholder="z. B. Weihnachten"
            />
            <Button type="submit">Hinzufügen</Button>
          </div>
        </form>
        {blockedList.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0 0" }}>
            {[...blockedList]
              .sort((a, b) => (a.block_date || "").localeCompare(b.block_date || ""))
              .map((row) => (
                <li
                  key={row.id}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem", flexWrap: "wrap" }}
                >
                  <span style={{ flex: 1 }}>
                    {format(parseISO(row.block_date), "EEEE, d. MMM yyyy", { locale: de })}
                    {row.kind === "holiday" && " · Feiertag"}
                    {row.kind === "worker_block" && row.creator_username && ` · Mitarbeiter: ${row.creator_username}`}
                    {row.note && ` — ${row.note}`}
                  </span>
                  <Button type="button" variant="secondary" onClick={() => removeBlocked(row.id)}>
                    Entfernen
                  </Button>
                </li>
              ))}
          </ul>
        )}
      </Card>

      <Card className="settings-form__card">
        <h3 className="settings-form__section">E-Mail-Benachrichtigungen</h3>
        <p className="settings-form__hint">
          Diese E-Mail-Adressen erhalten bei jeder neuen Buchung eine Benachrichtigung mit den wichtigsten Daten (Kunde, Dienstleistung, Datum, Uhrzeit).
        </p>
        <form onSubmit={handleSaveNotificationEmails} className="settings-form">
          <div className="settings-form__row" style={{ alignItems: "flex-end", gap: "0.5rem", flexWrap: "wrap" }}>
            <Input
              label="E-Mail hinzufügen"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="z.B. team@beispiel.de"
            />
            <Button type="button" onClick={addNotificationEmail}>Hinzufügen</Button>
          </div>
          {notificationEmails.length > 0 && (
            <ul className="settings-form__list" style={{ listStyle: "none", padding: 0, margin: "1rem 0 0" }}>
              {notificationEmails.map((email) => (
                <li key={email} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{ flex: 1 }}>{email}</span>
                  <Button type="button" variant="secondary" onClick={() => removeNotificationEmail(email)}>Entfernen</Button>
                </li>
              ))}
            </ul>
          )}
          <div className="settings-form__actions" style={{ marginTop: "1rem" }}>
            <Button type="submit" loading={emailsSaving}>Liste speichern</Button>
          </div>
        </form>
      </Card>

      <Card className="settings-form__card">
        <h3 className="settings-form__section">Passwort ändern</h3>
        <p className="settings-form__hint">Ändern Sie Ihr Anmeldepasswort. Empfohlen nach dem ersten Login.</p>
        <form onSubmit={handlePasswordSubmit} className="settings-form">
          <Input
            label="Aktuelles Passwort"
            type="password"
            value={passwordCurrent}
            onChange={(e) => setPasswordCurrent(e.target.value)}
            required
            disabled={passwordSaving}
            autoComplete="current-password"
          />
          <Input
            label="Neues Passwort (min. 6 Zeichen)"
            type="password"
            value={passwordNew}
            onChange={(e) => setPasswordNew(e.target.value)}
            required
            disabled={passwordSaving}
            autoComplete="new-password"
          />
          <Input
            label="Neues Passwort bestätigen"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
            disabled={passwordSaving}
            autoComplete="new-password"
          />
          <div className="settings-form__actions">
            <Button type="submit" loading={passwordSaving} disabled={passwordSaving}>
              Passwort ändern
            </Button>
          </div>
        </form>
      </Card>
    </Layout>
  );
}
