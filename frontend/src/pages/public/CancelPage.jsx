import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { publicApi } from "../../lib/api";
import { Button } from "../../components/ui";
import { formatDateTime } from "../../utils/date";

export default function CancelPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading | confirm | success | error
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    publicApi
      .getCancelPreview(token)
      .then((data) => {
        setPreview(data);
        setStatus("confirm");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  const handleConfirmCancel = () => {
    if (!token) return;
    setStatus("loading");
    publicApi
      .cancelByToken(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  };

  if (status === "loading" && !preview) {
    return (
      <div className="success-page">
        <div className="success-page__inner card card--padding">
          <p className="text-muted">Bitte warten…</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="success-page">
        <div className="success-page__inner card card--padding">
          <h2>Link ungültig oder abgelaufen</h2>
          <p className="success-page__muted">Der Stornierungslink ist nicht mehr gültig oder die Buchung wurde bereits storniert.</p>
          <Button onClick={() => navigate("/")}>Zur Startseite</Button>
        </div>
      </div>
    );
  }

  if (status === "confirm" && preview) {
    const dt = preview.start_time ? formatDateTime(preview.start_time) : "—";
    return (
      <div className="success-page">
        <div className="success-page__inner card card--padding">
          <h2 className="success-page__title" style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>
            Termin stornieren?
          </h2>
          <p className="text-muted" style={{ marginBottom: "0.5rem" }}>
            <strong>{preview.service_name || "Termin"}</strong>
          </p>
          <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
            {dt}
          </p>
          <p className="success-page__muted" style={{ marginBottom: "1.5rem" }}>
            Nur nach Klick auf die Schaltfläche wird die Buchung storniert. So werden versehentliche Stornierungen durch E-Mail-Programme vermieden.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <Button size="lg" variant="danger" onClick={handleConfirmCancel}>
              Ja, Termin stornieren
            </Button>
            <Button variant="ghost" onClick={() => navigate("/")}>
              Abbrechen
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "loading" && preview) {
    return (
      <div className="success-page">
        <div className="success-page__inner card card--padding">
          <p className="text-muted">Stornierung wird bearbeitet…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="success-page">
      <div className="success-page__inner">
        <div className="success-page__card card card--padding">
          <div className="success-page__icon" aria-hidden>✓</div>
          <h1 className="success-page__title">Termin storniert</h1>
          <p className="success-page__subtitle">Ihr Termin wurde erfolgreich storniert.</p>
          <Button size="lg" className="success-page__cta" onClick={() => navigate("/")}>
            Zur Startseite
          </Button>
        </div>
      </div>
    </div>
  );
}
