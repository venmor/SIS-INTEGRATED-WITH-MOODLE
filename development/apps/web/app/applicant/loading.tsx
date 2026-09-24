import { Skeleton, SkeletonCard } from "@sis/ui";

export default function ApplicantLoading() {
  return (
    <section aria-busy="true" aria-live="polite">
      <p role="status">Loading applicant workspace…</p>
      <div style={{ display: "grid", gap: "16px", marginTop: "24px" }}>
        <Skeleton width="14rem" height="2.25rem" />
        <Skeleton width="60%" height="1rem" />
        <SkeletonCard lines={3} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
            gap: "12px",
          }}
        >
          <SkeletonCard lines={2} action={false} />
          <SkeletonCard lines={2} action={false} />
          <SkeletonCard lines={2} action={false} />
        </div>
      </div>
    </section>
  );
}
