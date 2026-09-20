import Link from "next/link";
export default function Help() {
  return (
    <>
      <h1>Application help</h1>
      <p>
        Use fictional information only. This teaching demonstration does not
        offer admission or process payments.
      </p>
      <p>
        Your draft is saved on the server only after a confirmed save. If a
        request fails, keep the page open and check the saved result before
        retrying.
      </p>
      <p>
        Documents are quarantined until safety checks finish. A safe file still
        requires readability and formal verification checks.
      </p>
      <p>
        For this local demo, use the fictional applicant account listed in the
        developer demonstration guide. Account registration and real contact
        verification are not yet available.
      </p>
      <p>
        Contact Admissions through your institution’s published support route.
        Provide the support reference, never your password or complete identity
        number.
      </p>
      <Link href="/applicant">Return to my applications</Link>
    </>
  );
}
