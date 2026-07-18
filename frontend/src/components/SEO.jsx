import { Helmet } from "react-helmet-async";

const siteName = import.meta.env.VITE_SITE_NAME || "MERN Tools Suite";
const siteUrl = (import.meta.env.VITE_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");

export default function SEO({ title, description, path = "/", tool }) {
  const fullTitle = title ? `${title} | ${siteName}` : `${siteName} | Secure File Conversion Tools`;
  const desc = description || "Self-hosted secure tools for PDF, image, Word, OCR, compression and QR code tasks.";
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={`${siteUrl}${path}`} />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={`${siteUrl}${path}`} />
      <meta property="og:site_name" content={siteName} />
      <meta name="twitter:card" content="summary_large_image" />
      <script type="application/ld+json">{JSON.stringify({ "@context": "https://schema.org", "@type": "WebApplication", name: tool?.title || siteName, description: desc, url: `${siteUrl}${path}`, applicationCategory: "UtilitiesApplication", operatingSystem: "Any", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } })}</script>
    </Helmet>
  );
}
