import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import toast from "react-hot-toast";
import Layout from "../../components/Layout";
import { Card, Button, Input } from "../../components/ui";
import { workerApi, publicApi } from "../../lib/api";
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
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_name: "",
    phone: "",
    email: "",
    service_id: 0,
    car_size: "small",
    extra_glanz: false,
    regie_price: "",
    car_plate: "",
    visible_damage_notes: "",
    no_visible_damage: false,
    internal_notes: "",
    signature_image: null,
    photos: [],
  });

  useEffect(() => {
    if (!id) return;
    Promise.all([
      workerApi.getBooking(Number(id)),
      publicApi.getServices().catch(() => []),
    ])
      .then(([b, s]) => {
        setBooking(b);
        setServices(Array.isArray(s) ? s : []);
        setForm((f) => ({
          ...f,
          client_name: b.client_name || "",
          phone: b.phone || "",
          email: b.email || "",
          service_id: b.service_id || 0,
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

  const selectedService = services.find((s) => s.id === (form.service_id || booking?.service_id));
  const previewPrice = (() => {
    if (!selectedService) return null;
    let p = selectedService.price || 0;
    if (form.car_size === "large") p += 24;
    if (form.extra_glanz) p += 9;
    const regie = parseFloat(form.regie_price);
    if (Number.isFinite(regie) && regie > 0) p += regie;
    return p;
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.car_plate?.trim()) {
      toast.error("Kennzeichen ist Pflicht.");
      return;
    }
    const sid = form.service_id || booking?.service_id;
    if (!sid) {
      toast.error("Bitte Service wählen.");
      return;
    }
    setSaving(true);
    try {
      await workerApi.completeBookingWithForm(Number(id), {
        client_name: form.client_name || booking?.client_name,
        phone: form.phone || booking?.phone,
        email: form.email || booking?.email || null,
        service_id: sid,
        car_size: form.car_size,
        extra_glanz: form.extra_glanz,
        regie_price: form.regie_price ? parseFloat(form.regie_price) : null,
        car_plate: form.car_plate.trim(),
        visible_damage_notes: form.visible_damage_notes || null,
        no_visible_damage: form.no_visible_damage,
        internal_notes: form.internal_notes || null,
        signature_image: form.signature_image || null,
        photos: form.photos?.length ? form.photos : null,
      });
      toast.success("Formular gespeichert. Zahlung bitte unter „Zur Zahlung“ erfassen.");
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
            {format(startTime, "dd.MM.yyyy HH:mm", { locale: de })}
          </p>

          <h3 className="checkin-form__section">Service & Fahrzeug</h3>
          {services?.length > 0 && (
            <div className="checkin-form__row">
              <label className="input-label">Service</label>
              <select
                className="input-field"
                value={form.service_id || booking?.service_id || ""}
                onChange={(e) => setForm((f) => ({ ...f, service_id: Number(e.target.value) }))}
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} · €{s.price} · {s.duration} Min</option>
                ))}
              </select>
            </div>
          )}
          <div className="checkin-form__row">
            <label className="input-label">Fahrzeuggröße</label>
            <select
              className="input-field"
              value={form.car_size}
              onChange={(e) => setForm((f) => ({ ...f, car_size: e.target.value }))}
            >
              <option value="small">Klein</option>
              <option value="large">Groß (+€24)</option>
            </select>
          </div>
          <div className="checkin-form__row">
            <label className="input-label">
              <input
                type="checkbox"
                checked={form.extra_glanz}
                onChange={(e) => setForm((f) => ({ ...f, extra_glanz: e.target.checked }))}
              />
              {" "}Extra Glanz (+€9)
            </label>
          </div>
          <Input
            label="Regie-Preis (optional, €)"
            type="number"
            step="0.01"
            min="0"
            value={form.regie_price}
            onChange={(e) => setForm((f) => ({ ...f, regie_price: e.target.value }))}
            placeholder="0"
          />
          {previewPrice != null && (
            <p className="text-muted" style={{ marginTop: 8 }}>
              Voraussichtlicher Preis: <strong>€{previewPrice.toFixed(2)}</strong> (wird am Server berechnet)
            </p>
          )}
          <Input
            label="Kennzeichen"
            value={form.car_plate}
            onChange={(e) => setForm((f) => ({ ...f, car_plate: e.target.value }))}
            required
            placeholder="z.B. W-12345"
          />

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
