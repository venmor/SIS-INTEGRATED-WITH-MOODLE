import { SkeletonText } from "@sis/ui";

// Sign-in loading: placeholder only, never fake account state.
export default function SignInLoading() {
  return (
    <main aria-busy="true" aria-label="Loading sign in">
      <SkeletonText />
    </main>
  );
}
