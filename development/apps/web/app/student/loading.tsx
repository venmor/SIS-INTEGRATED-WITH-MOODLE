import { Skeleton, SkeletonCard } from "@sis/ui";

export default function StudentLoading() {
  return (
    <section aria-busy="true" aria-live="polite" className="grid gap-5 py-8">
      <p role="status">Loading student portal…</p>
      <Skeleton width="14rem" height="2.25rem" />
      <Skeleton width="60%" height="1rem" />
      <SkeletonCard lines={3} />
      <div className="grid gap-3 sm:grid-cols-2">
        <SkeletonCard lines={2} action={false} />
        <SkeletonCard lines={2} action={false} />
      </div>
    </section>
  );
}
