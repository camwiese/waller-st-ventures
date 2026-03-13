import SharePageClient from "../../../components/SharePageClient";

export const metadata = {
  title: "Waller Street Ventures",
  robots: "noindex, nofollow",
};

export default async function SharePage({ params }) {
  const { token } = await params;
  return <SharePageClient token={token} />;
}
