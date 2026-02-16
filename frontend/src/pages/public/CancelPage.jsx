import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { publicApi } from "../../lib/api";
import { Button } from "../../components/ui";

export default function CancelPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading | success | error

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    publicApi
      .cancelByToken(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  if (status === "loading") {
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
          <p className="success-page__muted">Der Stornierungslink ist nicht mehr gültig.</p>
          <Button onClick={() => navigate("/")}>Zur Startseite</Button>
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
