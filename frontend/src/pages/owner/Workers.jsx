import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Layout from "../../components/Layout";
import { getErrorMessage } from "../../utils/error";
import { Card, Button, Input, Modal } from "../../components/ui";
import { ownerApi } from "../../lib/api";

export default function Workers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    username: "",
    password: "",
    work_start: "09:00",
    work_end: "18:00",
    days_off: "",
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    ownerApi
      .getWorkers()
      .then(setWorkers)
      .catch(() => {
        toast.error("Mitarbeiter konnten nicht geladen werden.");
        setWorkers([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      username: "",
      password: "",
      work_start: "09:00",
      work_end: "18:00",
      days_off: "",
    });
    setModalOpen(true);
  };

  const openEdit = (w) => {
    setEditing(w);
    setForm({
      username: w.username || "",
      password: "",
      work_start: w.work_start?.slice(0, 5) || "09:00",
      work_end: w.work_end?.slice(0, 5) || "18:00",
      days_off: Array.isArray(w.days_off) ? w.days_off.join(", ") : String(w.days_off || ""),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.username?.trim()) {
      toast.error("Benutzername ist erforderlich.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        username: form.username,
        work_start: form.work_start,
        work_end: form.work_end,
        days_off: form.days_off ? form.days_off.split(",").map((s) => s.trim()).filter(Boolean) : [],
      };
      if (form.password) body.password = form.password;
      if (editing) {
        await ownerApi.updateWorker(editing.id, body);
        toast.success("Mitarbeiter aktualisiert.");
      } else {
        if (!form.password) {
          toast.error("Passwort ist erforderlich.");
          setSaving(false);
          return;
        }
        body.password = form.password;
        await ownerApi.createWorker(body);
        toast.success("Mitarbeiter erstellt.");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Fehler beim Speichern."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Mitarbeiter wirklich entfernen?")) return;
    try {
      await ownerApi.deleteWorker(id);
      toast.success("Mitarbeiter gelöscht.");
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Löschen fehlgeschlagen."));
    }
  };

  return (
    <Layout role="owner">
      <div className="page-header">
        <h1 className="page-title">Mitarbeiter</h1>
        <Button onClick={openCreate}>+ Mitarbeiter hinzufügen</Button>
      </div>

      {loading ? (
        <Card><p className="text-muted">Lade…</p></Card>
      ) : !workers.length ? (
        <Card>
          <div className="empty-state">
            <p>Noch keine Mitarbeiter. Fügen Sie den ersten hinzu.</p>
            <Button onClick={openCreate}>Mitarbeiter hinzufügen</Button>
          </div>
        </Card>
      ) : (
        <div className="card-list">
          {workers.map((w) => (
            <Card key={w.id}>
              <div className="card-list__row">
                <div>
                  <strong>{w.username}</strong>
                  <span className="card-list__meta">
                    {w.work_start?.slice(0, 5)} – {w.work_end?.slice(0, 5)}
                    {w.days_off?.length ? ` · Frei: ${w.days_off.join(", ")}` : ""}
                  </span>
                </div>
                <div className="card-list__actions">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(w)}>Bearbeiten</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(w.id)}>Löschen</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Mitarbeiter bearbeiten" : "Neuer Mitarbeiter"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSubmit} loading={saving}>Speichern</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <Input
            label="Benutzername"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            placeholder="benutzername"
            required
            disabled={!!editing}
          />
          <Input
            label={editing ? "Neues Passwort (leer = unverändert)" : "Passwort"}
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="••••••••"
            required={!editing}
          />
          <Input
            label="Arbeitsbeginn"
            type="time"
            value={form.work_start}
            onChange={(e) => setForm((f) => ({ ...f, work_start: e.target.value }))}
          />
          <Input
            label="Arbeitsende"
            type="time"
            value={form.work_end}
            onChange={(e) => setForm((f) => ({ ...f, work_end: e.target.value }))}
          />
          <Input
            label="Tage frei (kommagetrennt, z.B. Sa, So)"
            value={form.days_off}
            onChange={(e) => setForm((f) => ({ ...f, days_off: e.target.value }))}
            placeholder="Sa, So"
          />
        </form>
      </Modal>
    </Layout>
  );
}
