/**
 * Turn backend error (422 validation or other) into a single display string.
 * Backend 422: { detail: [ { msg: "...", loc: [...] }, ... ] }
 * Other: { detail: "string" } or detail is missing.
 */
export function getErrorMessage(err, fallback = "Ein Fehler ist aufgetreten.") {
  if (!err) return fallback;
  const detail = err.response?.data?.detail;
  if (detail == null) {
    const msg = err.message || err.response?.data?.message;
    return typeof msg === "string" ? msg : fallback;
  }
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (item && typeof item.msg === "string" ? item.msg : null))
      .filter(Boolean);
    return messages.length ? messages.join(", ") : fallback;
  }
  if (typeof detail === "string") return detail;
  return fallback;
}
