import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Layout from "../../components/Layout";
import { Card, Button } from "../../components/ui";
import { ownerApi } from "../../lib/api";
import { getErrorMessage } from "../../utils/error";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marketingOnly, setMarketingOnly] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = () => {
    setLoading(true);
    const params = marketingOnly ? { marketing: true } : {};
    ownerApi
      .getCustomers(params)
      .then((data) => setCustomers(Array.isArray(data) ? data : []))
      .catch(() => {
        toast.error(getErrorMessage(null, "Kunden konnten nicht geladen werden."));
        setCustomers([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), [marketingOnly]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await ownerApi.getCustomersExport();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "marketing_contacts.csv";
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("CSV heruntergeladen.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Export fehlgeschlagen."));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout role="owner">
      <div className="page-header" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Kunden</h1>
        <label className="input-label" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={marketingOnly}
            onChange={(e) => setMarketingOnly(e.target.checked)}
          />
          Nur mit Marketing-Zustimmung
        </label>
        <Button size="sm" onClick={handleExport} loading={exporting}>
          Export CSV
        </Button>
      </div>

      {loading ? (
        <Card><p className="text-muted">Lade Kunden…</p></Card>
      ) : (
        <Card>
          <div className="table-wrapper" style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Telefon</th>
                  <th>Termine</th>
                  <th>Marketing</th>
                  <th>Letzter Termin</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-muted">Keine Kunden gefunden.</td>
                  </tr>
                ) : (
                  customers.map((c, i) => (
                    <tr key={c.email + i}>
                      <td>{c.name || "—"}</td>
                      <td>{c.email || "—"}</td>
                      <td>{c.phone || "—"}</td>
                      <td>{c.total_bookings ?? 0}</td>
                      <td>{c.marketing_consent ? "Ja" : "Nein"}</td>
                      <td>{c.last_booking_date || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Layout>
  );
}
