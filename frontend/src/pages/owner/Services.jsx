import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Layout from "../../components/Layout";
import { getErrorMessage } from "../../utils/error";
import { Card, Button, Input, Modal } from "../../components/ui";
import { ownerApi } from "../../lib/api";

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", price: "", duration: "", description: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    ownerApi
      .getServices()
      .then((data) => setServices(Array.isArray(data) ? data : []))
      .catch(() => {
        toast.error("Services konnten nicht geladen werden.");
        setServices([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", price: "", duration: "", description: "" });
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name || "",
      price: String(s.price ?? ""),
      duration: String(s.duration ?? ""),
      description: s.description || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.name?.trim()) {
      toast.error("Name ist erforderlich.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await ownerApi.updateService(editing.id, {
          name: form.name,
          price: form.price,
          duration: form.duration,
          description: form.description,
        });
        toast.success("Service aktualisiert.");
      } else {
        await ownerApi.createService({
          name: form.name,
          price: form.price,
          duration: form.duration,
          description: form.description || "",
        });
        toast.success("Service erstellt.");
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
    if (!window.confirm("Service wirklich löschen?")) return;
    try {
      await ownerApi.deleteService(id);
      toast.success("Service gelöscht.");
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Löschen fehlgeschlagen."));
    }
  };

  return (
    <Layout role="owner">
      <div className="page-header">
        <h1 className="page-title">Services</h1>
        <Button onClick={openCreate}>+ Service erstellen</Button>
      </div>

      {loading ? (
        <Card><p className="text-muted">Lade…</p></Card>
      ) : !services.length ? (
        <Card>
          <div className="empty-state">
            <p>Noch keine Services. Erstellen Sie Ihren ersten Service.</p>
            <Button onClick={openCreate}>Service erstellen</Button>
          </div>
        </Card>
      ) : (
        <div className="card-list">
          {services.map((s) => (
            <Card key={s.id}>
              <div className="card-list__row">
                <div>
                  <strong>{s.name}</strong>
                  <span className="card-list__meta">€{s.price} · {s.duration} Min</span>
                </div>
                <div className="card-list__actions">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>Bearbeiten</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(s.id)}>Löschen</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Service bearbeiten" : "Neuer Service"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSubmit} loading={saving}>Speichern</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="z.B. Komplettwäsche"
            required
          />
          <Input
            label="Preis (€)"
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            placeholder="0.00"
          />
          <Input
            label="Dauer (Minuten)"
            type="number"
            min="1"
            value={form.duration}
            onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
            placeholder="30"
          />
          <Input
            label="Beschreibung (optional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Kurze Beschreibung"
          />
        </form>
      </Modal>
    </Layout>
  );
}
