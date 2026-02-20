import { Input, Button } from "../ui";

const validate = (details) => {
  const err = {};
  if (!details.name?.trim()) err.name = "Name ist erforderlich";
  if (!details.phone?.trim()) err.phone = "Telefon ist erforderlich";
  if (!details.email?.trim()) err.email = "E-Mail ist erforderlich";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) err.email = "Ungültige E-Mail";
  return err;
};

export default function DetailsStep({ details, setDetails, onSubmit, loading }) {
  const errors = validate(details);
  const valid = !Object.keys(errors).length;

  return (
    <div className="booking-step">
      <h2 className="booking-step__title">Ihre Kontaktdaten</h2>
      <form
        className="details-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSubmit();
        }}
        noValidate
      >
        <Input
          label="Name"
          name="name"
          placeholder="Max Mustermann"
          value={details.name}
          onChange={(e) => setDetails((d) => ({ ...d, name: e.target.value }))}
          error={errors.name}
          autoComplete="name"
          required
        />
        <Input
          label="Telefon"
          name="phone"
          type="tel"
          placeholder="+43 660 1234567"
          value={details.phone}
          onChange={(e) => setDetails((d) => ({ ...d, phone: e.target.value }))}
          error={errors.phone}
          autoComplete="tel"
          required
        />
        <Input
          label="E-Mail"
          name="email"
          type="email"
          placeholder="max@beispiel.at"
          value={details.email}
          onChange={(e) => setDetails((d) => ({ ...d, email: e.target.value }))}
          error={errors.email}
          autoComplete="email"
          required
        />
        <div className="details-form__marketing" style={{ marginTop: 16 }}>
          <label className="input-label" style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={!!details.marketing_consent}
              onChange={(e) => setDetails((d) => ({ ...d, marketing_consent: e.target.checked }))}
              style={{ marginTop: 4 }}
            />
            <span>
              Ich möchte Informationen zu Aktionen und Angeboten per E-Mail erhalten.
              Ich kann meine Einwilligung jederzeit widerrufen.
            </span>
          </label>
        </div>
        <Button type="submit" disabled={!valid} loading={loading} className="details-form__submit">
          Weiter zur Bestätigung
        </Button>
      </form>
    </div>
  );
}
