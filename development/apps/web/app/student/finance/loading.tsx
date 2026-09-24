import { SkeletonCard } from "@sis/ui";

// Finance loading: placeholders only where layout is known, never fake
// figures. Real amounts render only from confirmed data.
export default function FinanceLoading() {
  return (
    <main aria-busy="true" aria-label="Loading finance and clearance">
      <SkeletonCard />
      <SkeletonCard />
    </main>
  );
}
