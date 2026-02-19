import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, subDays } from "date-fns";
import { de } from "date-fns/locale";
import toast from "react-hot-toast";
import Layout from "../../components/Layout";
import { Card, Button, Modal, Input } from "../../components/ui";
import { workerApi } from "../../lib/api";
import { getErrorMessage } from "../../utils/error";

function isCheckedIn(b) {
  const s = (b.status || "").toLowerCase();
  return s === "checked_in";
}

export default function AbrechnungPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signedOnly, setSignedOnly] = useState([]);
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [pdfLoading, setPdfLoading] = useState(false);
  const [paymentModal, setPaymentModal] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [paySaving, setPaySaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    const to = format(new Date(), "yyyy-MM-dd");
    const from = format(subDays(new Date(), 30), "yyyy-MM-dd");
    workerApi
      .getBookings({ from, to })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setBookings(list);
        setSignedOnly(list.filter(isCheckedIn));
      })
      .catch(() => {
        toast.error("Termine konnten nicht geladen werden.");
        setBookings([]);
        setSignedOnly([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const openPayment = (b) => {
    setPaymentModal({ id: b.id, final_price: b.final_price ?? b.service_price });
    setPayAmount(String(b.final_price ?? b.service_price ?? ""));
    setPayMethod("cash");
  };

  const submitPayment = async () => {
    if (!paymentModal) return;
    const amount = parseFloat(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Bitte gültigen Betrag eingeben.");
      return;
    }
    setPaySaving(true);
    try {
      await workerApi.payBooking(paymentModal.id, { amount, payment_method: payMethod });
      toast.success("Zahlung erfasst.");
      setPaymentModal(null);
      const to = format(new Date(), "yyyy-MM-dd");
      const from = format(subDays(new Date(), 30), "yyyy-MM-dd");
      const data = await workerApi.getBookings({ from, to });
      const list = Array.isArray(data) ? data : [];
      setSignedOnly(list.filter(isCheckedIn));
    } catch (err) {
      toast.error(getErrorMessage(err, "Zahlung fehlgeschlagen."));
    } finally {
      setPaySaving(false);
    }
  };

  const handlePdf = async (openInNewTab = true) => {
    if (!fromDate || !toDate) {
      toast.error("Bitte Zeitraum wählen.");
      return;
    }
    setPdfLoading(true);
    try {
      const blob = await workerApi.getAbrechnungPdf(fromDate, toDate);
      const url = URL.createObjectURL(blob);
      if (openInNewTab) {
        window.open(url, "_blank", "noopener");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `Abrechnung_${fromDate}_${toDate}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.success("Abrechnung erstellt.");
    } catch (err) {
      toast.error(getErrorMessage(err, "PDF konnte nicht erstellt werden."));
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePrint = () => {
    handlePdf(true).then(() => {
      setTimeout(() => {
        const w = window.open("", "_blank");
        if (w) w.print();
      }, 500);
    });
  };

  return (
    <Layout role="worker">
      <div className="page-header">
        <h1 className="page-title">Zur Abrechnung</h1>
      </div>

      <Card className="abrechnung-section" style={{ marginBottom: 24 }}>
        <h2 className="schedule-day__title">Unterschriebene Karten (noch nicht bezahlt)</h2>
        <p className="text-muted" style={{ marginBottom: 16 }}>
          Hier erscheinen Termine mit ausgefülltem Formular. Bezahlen Sie sie und erstellen Sie dann die Abrechnung als PDF.
        </p>
        {loading ? (
          <p className="text-muted">Lade…</p>
        ) : signedOnly.length === 0 ? (
          <p className="text-muted">Keine unterschriebenen Karten.</p>
        ) : (
          <ul className="abrechnung-list" style={{ listStyle: "none", padding: 0 }}>
            {signedOnly.map((b) => (
              <li
                key={b.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: "1px solid #eee",
                  gap: 16,
                }}
              >
                <div>
                  <strong>{b.client_name}</strong> · {b.service_name || `#${b.service_id}`} ·{" "}
                  {format(new Date(b.start_time), "dd.MM. HH:mm", { locale: de })}
                </div>
                <Button size="sm" onClick={() => openPayment(b)}>
                  Zur Zahlung
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="abrechnung-section">
        <h2 className="schedule-day__title">Abrechnung als PDF</h2>
        <p className="text-muted" style={{ marginBottom: 16 }}>
          Wählen Sie den Zeitraum (bezahlte Termine) und erstellen Sie das Formular zum Drucken oder Export.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
          <Input
            label="Von"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <Input
            label="Bis"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
          <Button loading={pdfLoading} onClick={() => handlePdf(true)}>
            PDF öffnen
          </Button>
          <Button variant="secondary" loading={pdfLoading} onClick={() => handlePdf(false)}>
            PDF herunterladen
          </Button>
          <span className="text-muted" style={{ alignSelf: "center" }}>
            (PDF öffnen → im Tab mit Strg+P drucken)
          </span>
        </div>
      </Card>

      <Modal
        open={!!paymentModal}
        onClose={() => setPaymentModal(null)}
        title="Zur Zahlung"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPaymentModal(null)}>Abbrechen</Button>
            <Button loading={paySaving} onClick={submitPayment}>Zahlung erfassen</Button>
          </>
        }
      >
        {paymentModal && (
          <div>
            <Input
              label="Betrag (€)"
              type="number"
              step="0.01"
              min="0"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
            <div className="checkin-form__row" style={{ marginTop: 12 }}>
              <label className="input-label">Zahlungsart</label>
              <select
                className="input-field"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
              >
                <option value="cash">Bar</option>
                <option value="card">Karte</option>
              </select>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
