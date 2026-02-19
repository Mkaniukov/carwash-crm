import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import toast from "react-hot-toast";
import Layout from "../../components/Layout";
import { Card, Button, Input } from "../../components/ui";
import { workerApi } from "../../lib/api";
import { getErrorMessage } from "../../utils/error";

function SignaturePad({ value, onChange }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, []);

  const start = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const end = () => {
    setDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  };

  return (
    <div className="checkin-signature">
      <canvas
        ref={canvasRef}
        width={300}
        height={120}
        onMouseDown={start}
        onMouseMove={draw}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={(e) => { e.preventDefault(); start(e.touches[0]); }}
        onTouchMove={(e) => { e.preventDefault(); draw(e.touches[0]); }}
        onTouchEnd={(e) => { e.preventDefault(); end(); }}
        style={{ border: "1px solid #ccc", borderRadius: 8, touchAction: "none" }}
      />
      <Button type="button" variant="ghost" size="sm" onClick={clear}>Löschen</Button>
    </div>
  );
}

export default function CompleteBookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_name: "",
    phone: "",
    email: "",
    car_plate: "",
    payment_method: "cash",
    visible_damage_notes: "",
    no_visible_damage: false,
    internal_notes: "",
    signature_image: null,
    photos: [],
  });

  useEffect(() => {
    if (!id) return;
    workerApi
      .getBooking(Number(id))
      .then((b) => {
        setBooking(b);
        setForm((f) => ({
          ...f,
          client_name: b.client_name || "",
          phone: b.phone || "",
          email: b.email || "",
        }));
      })
      .catch((err) => {
        toast.error(getErrorMessage(err, "Buchung nicht geladen."));
        navigate("/worker");
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handlePhoto = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const reader = (file) =>
      new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.readAsDataURL(file);
      });
    Promise.all(files.map(reader)).then((urls) => {
      setForm((f) => ({ ...f, photos: [...(f.photos || []), ...urls] }));
    });
  };

  const removePhoto = (index) => {
    setForm((f) => ({ ...f, photos: f.photos.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.car_plate?.trim()) {
      toast.error("Kennzeichen ist Pflicht.");
      return;
    }
    setSaving(true);
    try {
      await workerApi.completeBookingWithForm(Number(id), {
        client_name: form.client_name || booking?.client_name,
        phone: form.phone || booking?.phone,
        email: form.email || booking?.email || null,
        car_plate: form.car_plate.trim(),
        payment_method: form.payment_method,
        visible_damage_notes: form.visible_damage_notes || null,
        no_visible_damage: form.no_visible_damage,
        internal_notes: form.internal_notes || null,
        signature_image: form.signature_image || null,
        photos: form.photos?.length ? form.photos : null,
      });
      toast.success("Termin abgeschlossen.");
      navigate("/worker");
    } catch (err) {
      toast.error(getErrorMessage(err, "Speichern fehlgeschlagen."));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !booking) {
    return (
      <Layout role="worker">
        <Card><p className="text-muted">Lade…</p></Card>
      </Layout>
    );
  }

  const startTime = typeof booking.start_time === "string" ? parseISO(booking.start_time) : booking.start_time;

  return (
    <Layout role="worker">
      <div className="page-header">
        <Button variant="ghost" size="sm" onClick={() => navigate("/worker")}>← Zurück</Button>
        <h1 className="page-title">Formular ausfüllen (Abnahme)</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="checkin-form">
          <h3 className="checkin-form__section">Kunde & Buchung</h3>
          <Input
            label="Kundenname"
            value={form.client_name}
            onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
          />
          <Input
            label="Telefon"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <Input
            label="E-Mail"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <p className="text-muted" style={{ marginTop: 8 }}>
            Service: {booking.service_name} · €{booking.service_price} · {format(startTime, "dd.MM.yyyy HH:mm", { locale: de })}
          </p>

          <h3 className="checkin-form__section">Fahrzeug & Zahlung</h3>
          <Input
            label="Kennzeichen"
            value={form.car_plate}
            onChange={(e) => setForm((f) => ({ ...f, car_plate: e.target.value }))}
            required
            placeholder="z.B. W-12345"
          />
          <div className="checkin-form__row">
            <label className="input-label">Zahlungsart</label>
            <select
              className="input-field"
              value={form.payment_method}
              onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
            >
              <option value="cash">Bar</option>
              <option value="card">Karte</option>
            </select>
          </div>

          <h3 className="checkin-form__section">Zustand</h3>
          <div className="checkin-form__row">
            <label className="input-label">
              <input
                type="checkbox"
                checked={form.no_visible_damage}
                onChange={(e) => setForm((f) => ({ ...f, no_visible_damage: e.target.checked }))}
              />
              {" "}Keine sichtbaren Schäden
            </label>
          </div>
          <Input
            label="Sichtbare Schäden (Notizen)"
            value={form.visible_damage_notes}
            onChange={(e) => setForm((f) => ({ ...f, visible_damage_notes: e.target.value }))}
            placeholder="Optional"
          />
          <Input
            label="Interne Notizen"
            value={form.internal_notes}
            onChange={(e) => setForm((f) => ({ ...f, internal_notes: e.target.value }))}
            placeholder="Optional"
          />

          <h3 className="checkin-form__section">Unterschrift</h3>
          <SignaturePad
            value={form.signature_image}
            onChange={(v) => setForm((f) => ({ ...f, signature_image: v }))}
          />

          <h3 className="checkin-form__section">Fotos</h3>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhoto}
            className="input-field"
          />
          {form.photos?.length > 0 && (
            <div className="checkin-form__photos">
              {form.photos.map((url, i) => (
                <div key={i} className="checkin-form__photo-wrap">
                  <img src={url} alt="" style={{ maxWidth: 80, maxHeight: 60, objectFit: "cover" }} />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removePhoto(i)}>×</Button>
                </div>
              ))}
            </div>
          )}

          <div className="checkin-form__actions">
            <Button type="button" variant="secondary" onClick={() => navigate("/worker")}>Abbrechen</Button>
            <Button type="submit" loading={saving} disabled={saving}>Speichern & abschließen</Button>
          </div>
        </form>
      </Card>
    </Layout>
  );
}
