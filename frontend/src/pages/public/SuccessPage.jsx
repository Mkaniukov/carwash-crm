import { useLocation, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "../../components/ui";

export default function SuccessPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state) {
    return (
      <div className="success-page">
        <div className="success-page__inner card card--padding">
          <h2>Ungültiger Zugriff</h2>
          <p className="success-page__muted">Bitte starten Sie die Buchung von der Startseite.</p>
          <Button onClick={() => navigate("/")}>Zur Startseite</Button>
        </div>
      </div>
    );
  }

  const dateStr = state.date
    ? format(new Date(state.date), "EEEE, d. MMMM yyyy, HH:mm", { locale: de })
    : "—";

  return (
    <div className="success-page">
      <div className="success-page__inner">
        <div className="success-page__card card card--padding">
          <div className="success-page__icon" aria-hidden>✓</div>
          <h1 className="success-page__title">Termin erfolgreich gebucht!</h1>
          <p className="success-page__subtitle">Sie erhalten in Kürze eine Bestätigung.</p>

          <dl className="success-page__details">
            <div className="success-page__row">
              <dt>Buchungsnummer</dt>
              <dd>#{state.bookingId}</dd>
            </div>
            <div className="success-page__row">
              <dt>Name</dt>
              <dd>{state.client_name}</dd>
            </div>
            <div className="success-page__row">
              <dt>Telefon</dt>
              <dd>{state.phone}</dd>
            </div>
            <div className="success-page__row">
              <dt>E-Mail</dt>
              <dd>{state.email}</dd>
            </div>
            <div className="success-page__row">
              <dt>Service</dt>
              <dd>{state.serviceName} · €{state.servicePrice} · {state.serviceDuration} Min</dd>
            </div>
            <div className="success-page__row">
              <dt>Termin</dt>
              <dd>{dateStr}</dd>
            </div>
          </dl>

          <div className="success-page__notice" role="note">
            <strong>Hinweis:</strong> Für SUV & Großraum-Fahrzeuge kann ein Zuschlag von €24 auf die Programme 3–5 anfallen.
          </div>

          <Button size="lg" className="success-page__cta" onClick={() => navigate("/")}>
            Neue Buchung
          </Button>
        </div>
      </div>
    </div>
  );
}
