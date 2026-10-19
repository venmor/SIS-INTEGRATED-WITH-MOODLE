import Home from "../home-entry";
export const dynamic = "force-dynamic";
export default async function SignInPage({ searchParams }: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { returnTo } = await searchParams;
  return <Home returnTo={typeof returnTo === "string" ? returnTo : undefined} />;
}
