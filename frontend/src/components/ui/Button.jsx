const variants = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

const sizes = {
  sm: "btn-sm",
  md: "btn-md",
  lg: "btn-lg",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  loading,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={["btn", variants[variant], sizes[size], className].filter(Boolean).join(" ")}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="btn-spinner" aria-hidden />
          <span className="btn-text">{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
