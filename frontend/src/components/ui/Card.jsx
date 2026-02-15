export default function Card({ children, className = "", padding = true, ...props }) {
  return (
    <div
      className={`card ${padding ? "card--padding" : ""} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
