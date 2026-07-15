import { Link } from "react-router-dom";
import { ArrowRight, Database, Lock, ServerCog, Zap } from "lucide-react";
import SEO from "../components/SEO.jsx";
import ToolGrid from "../components/ToolGrid.jsx";

export default function Home() {
  return (
    <>
      <SEO />
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">MERN • self-hosted • no third-party conversion APIs</p>
          <h1>Secure file tools website for PDFs, images, Word, OCR and compression.</h1>
          <p className="hero-copy">Launch your own production-ready tools platform with React UI, Express APIs, MongoDB job logs and local processing engines.</p>
          <div className="hero-actions">
            <Link className="btn primary" to="/tools">Explore tools <ArrowRight size={18} /></Link>
            <a className="btn ghost" href="/api/tools" target="_blank" rel="noreferrer">View API JSON</a>
          </div>
        </div>
        <div className="hero-panel" aria-label="Platform highlights">
          <div><ServerCog /><strong>Own APIs</strong><span>Express endpoints per tool</span></div>
          <div><Lock /><strong>Secure uploads</strong><span>Limits, allow-list, cleanup</span></div>
          <div><Database /><strong>MongoDB</strong><span>Job audit trail</span></div>
          <div><Zap /><strong>Fast UX</strong><span>Download-ready responses</span></div>
        </div>
      </section>
      <ToolGrid />
      <section className="content-band">
        <h2>Production-ready foundation</h2>
        <p>Deploy with Docker, run local binaries for advanced conversions, and keep user files private inside your infrastructure.</p>
      </section>
    </>
  );
}
