import { useEffect } from "react";
import Button from "./Button";

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  closeLabel = "Schließen",
}) {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">
            {title}
          </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Schließen"
          >
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer !== undefined ? (
          <div className="modal-footer">{footer}</div>
        ) : (
          <div className="modal-footer">
            <Button variant="secondary" onClick={onClose}>
              {closeLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
