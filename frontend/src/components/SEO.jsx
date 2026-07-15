import { Helmet } from "react-helmet-async";

const siteName = import.meta.env.VITE_SITE_NAME || "MERN Tools Suite";

export default function SEO({ title, description, path = "/" }) {
  const fullTitle = title ? `${title} | ${siteName}` : `${siteName} | Secure File Conversion Tools`;
  const desc = description || "Self-hosted secure tools for PDF, image, Word, OCR, compression and QR code tasks.";
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={path} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <script type="application/ld+json">{JSON.stringify({ "@context": "https://schema.org", "@type": "WebApplication", name: siteName, applicationCategory: "UtilitiesApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0" } })}</script>
    </Helmet>
  );
}
