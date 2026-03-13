import SharePageClient from "../../../components/SharePageClient";
import { buildShareMetadata, getShareTokenMetadata } from "../../../lib/shareMetadata";

export async function generateMetadata({ params }) {
  const { token } = await params;
  const shareToken = await getShareTokenMetadata(token);
  const meta = buildShareMetadata(shareToken);
  const imagePath = `/share/${token}/opengraph-image`;

  return {
    title: meta.title,
    description: meta.description,
    robots: "noindex, nofollow",
    openGraph: {
      title: meta.title,
      description: meta.description,
      images: [{ url: imagePath, width: 1200, height: 630, alt: meta.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [imagePath],
    },
  };
}

export default async function SharePage({ params }) {
  const { token } = await params;
  return <SharePageClient token={token} />;
}
