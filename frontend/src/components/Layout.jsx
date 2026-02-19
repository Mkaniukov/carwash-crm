import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function Layout({ children, role }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app-layout">
      <aside className="sidebar" aria-label="Hauptnavigation">
        <div className="sidebar__brand">
          <span className="sidebar__title">Carwash CRM</span>
          <span className="sidebar__subtitle">
            {role === "owner" ? "Inhaber" : "Mitarbeiter"}
          </span>
        </div>

        <nav className="sidebar__nav">
          {role === "owner" && (
            <>
              <Link
                className={`sidebar__link ${isActive("/owner") ? "sidebar__link--active" : ""}`}
                to="/owner"
              >
                Dashboard
              </Link>
              <Link
                className={`sidebar__link ${isActive("/owner/services") ? "sidebar__link--active" : ""}`}
                to="/owner/services"
              >
                Services
              </Link>
              <Link
                className={`sidebar__link ${isActive("/owner/workers") ? "sidebar__link--active" : ""}`}
                to="/owner/workers"
              >
                Mitarbeiter
              </Link>
              <Link
                className={`sidebar__link ${isActive("/owner/schedule") ? "sidebar__link--active" : ""}`}
                to="/owner/schedule"
              >
                Termine
              </Link>
              <Link
                className={`sidebar__link ${isActive("/owner/settings") ? "sidebar__link--active" : ""}`}
                to="/owner/settings"
              >
                Einstellungen
              </Link>
              <Link
                className={`sidebar__link ${isActive("/owner/worktime") ? "sidebar__link--active" : ""}`}
                to="/owner/worktime"
              >
                Arbeitszeit
              </Link>
            </>
          )}
          {role === "worker" && (
            <>
              <Link
                className={`sidebar__link ${isActive("/worker") ? "sidebar__link--active" : ""}`}
                to="/worker"
              >
                Kalender
              </Link>
              <Link
                className={`sidebar__link ${isActive("/worker/abrechnung") ? "sidebar__link--active" : ""}`}
                to="/worker/abrechnung"
              >
                Zur Abrechnung
              </Link>
              <Link
                className={`sidebar__link ${isActive("/worker/time") ? "sidebar__link--active" : ""}`}
                to="/worker/time"
              >
                Arbeitszeit
              </Link>
            </>
          )}
        </nav>

        <div className="sidebar__footer">
          <button
            type="button"
            className="sidebar__logout"
            onClick={handleLogout}
            aria-label="Abmelden"
          >
            Abmelden
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <time dateTime={new Date().toISOString()}>
            {format(new Date(), "EEEE, d. MMMM yyyy", { locale: de })}
          </time>
          <span>Willkommen</span>
        </header>
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
