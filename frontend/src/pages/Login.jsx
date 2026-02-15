import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../lib/api";
import { getErrorMessage } from "../utils/error";
import { Card, Button, Input } from "../components/ui";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error("Benutzername und Passwort eingeben.");
      return;
    }
    setLoading(true);
    try {
      const { access_token } = await authApi.login(username.trim(), password);
      login(access_token);
      const payload = JSON.parse(atob(access_token.split(".")[1]));
      if (payload.role === "owner") navigate("/owner");
      else navigate("/worker");
    } catch (err) {
      const message = getErrorMessage(err, "Anmeldung fehlgeschlagen.");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-page__inner">
        <h1 className="login-page__logo">Carwash CRM</h1>
        <Card>
          <form onSubmit={handleSubmit} className="login-form">
            <h2 className="login-form__title">Anmeldung</h2>
            <Input
              label="Benutzername"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="z.B. owner"
              required
              disabled={loading}
            />
            <Input
              label="Passwort"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passwort"
              required
              disabled={loading}
            />
            <Button type="submit" loading={loading} disabled={loading} className="login-form__submit">
              Einloggen
            </Button>
          </form>
        </Card>
      </div>
      <Toaster position="top center" />
    </div>
  );
}
