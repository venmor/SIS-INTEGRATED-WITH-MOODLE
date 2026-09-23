import styles from "./Skeleton.module.css";

export function Skeleton({
  width = "100%",
  height = "1rem",
  radius = "sm",
  className = "",
}: {
  width?: string;
  height?: string;
  radius?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`${styles.skeleton} ${styles[radius]} ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className={styles.stack} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? "68%" : "100%"}
          height="0.85rem"
        />
      ))}
    </div>
  );
}

export function SkeletonCard({
  lines = 3,
  action = true,
}: {
  lines?: number;
  action?: boolean;
}) {
  return (
    <div className={styles.card} aria-hidden="true">
      <Skeleton width="42%" height="1.15rem" />
      <SkeletonText lines={lines} />
      {action ? <Skeleton width="8rem" height="2.5rem" radius="md" /> : null}
    </div>
  );
}

export function SkeletonQueue({ rows = 4 }: { rows?: number }) {
  return (
    <div className={styles.queue} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div className={styles.queueRow} key={index}>
          <div className={styles.queuePrimary}>
            <Skeleton width="8rem" height="1rem" />
            <Skeleton width="70%" height="0.8rem" />
          </div>
          <Skeleton width="7rem" height="1.9rem" radius="md" />
          <Skeleton width="6rem" height="2.25rem" radius="md" />
        </div>
      ))}
    </div>
  );
}
