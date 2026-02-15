import { Component } from "react";
import { Button } from "./ui";

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary__inner card card--padding">
            <h2 className="error-boundary__title">Etwas ist schiefgelaufen</h2>
            <p className="error-boundary__text">
              Bitte laden Sie die Seite neu oder kehren Sie zur Startseite zurück.
            </p>
            <div className="error-boundary__actions">
              <Button onClick={() => window.location.reload()}>Seite neu laden</Button>
              <Button variant="secondary" onClick={() => (window.location.href = "/")}>
                Zur Startseite
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
