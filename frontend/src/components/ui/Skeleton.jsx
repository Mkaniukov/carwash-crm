export default function Skeleton({ className = "", width, height, style = {} }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, ...style }}
      aria-hidden
    />
  );
}

export function SkeletonText({ lines = 3 }) {
  return (
    <div className="skeleton-text">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={16} style={{ marginBottom: 8 }} />
      ))}
    </div>
  );
}
