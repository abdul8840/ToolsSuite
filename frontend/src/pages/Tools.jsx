import SEO from "../components/SEO.jsx";
import ToolGrid from "../components/ToolGrid.jsx";

export default function Tools() {
  return (
    <>
      <SEO title="All Tools" description="Browse all secure PDF, image, Word, OCR and QR code tools." path="/tools" />
      <div className="page-title">
        <p className="eyebrow">Tool directory</p>
        <h1>Choose a tool</h1>
        <p>Every operation is handled by your own local API.</p>
      </div>
      <ToolGrid />
    </>
  );
}
