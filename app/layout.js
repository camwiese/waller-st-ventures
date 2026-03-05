import { Inter, Cormorant, Cormorant_Garamond } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "react-hot-toast";
import "../styles/prose.css";
import { normalizeAppUrl } from "../lib/url";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const cormorant = Cormorant({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-serif-garamond",
  display: "swap",
});

const appUrl = normalizeAppUrl(
  process.env.NEXT_PUBLIC_APP_URL,
  "https://wallerstreetventures.com"
);

export const metadata = {
  title: {
    default: "Waller Street Ventures",
    template: "%s | Waller Street Ventures",
  },
  description: "Early-stage venture capital investing in exceptional founders.",
  metadataBase: new URL(appUrl),
  openGraph: {
    title: "Waller Street Ventures",
    description: "Early-stage venture capital investing in exceptional founders.",
    siteName: "Waller Street Ventures",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Waller Street Ventures",
    description: "Early-stage venture capital investing in exceptional founders.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable} ${cormorantGaramond.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: "'Inter', var(--font-sans), sans-serif", backgroundColor: "#fdfbf7" }}>
        {children}
        <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
        <Analytics />
      </body>
    </html>
  );
}
