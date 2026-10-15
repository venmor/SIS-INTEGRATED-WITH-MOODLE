import { PublicHeader } from "../public-header";

export default function DiscoveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicHeader current="discover" />
      {children}
    </>
  );
}
