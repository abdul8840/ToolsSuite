import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Cloud, Lock, Sparkles, Zap } from "lucide-react";
import SEO from "../components/SEO.jsx";
import ToolGrid from "../components/ToolGrid.jsx";

export default function Home() {
  return (
    <>
      <SEO />
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow"><Sparkles size={14} /> 24 tools. Always free. No signup.</p>
          <h1>Everything you need to work with <span>files.</span></h1>
          <p className="hero-copy">Convert PDFs, compress documents, remove image backgrounds and more—all from one fast, private workspace.</p>
          <div className="hero-actions">
            <Link className="btn primary" to="/tools">Explore all tools <ArrowRight size={18} /></Link>
            <a className="btn ghost" href="#tools">Popular tools</a>
          </div>
          <div className="hero-proof"><span><CheckCircle2 /> No signup</span><span><CheckCircle2 /> Secure uploads</span><span><CheckCircle2 /> Free tools</span></div>
        </div>
        <div className="hero-panel" aria-label="Platform highlights">
          <div><Zap /><strong>Fast processing</strong><span>Optimized conversion engines</span></div>
          <div><Lock /><strong>Private by design</strong><span>Protected, validated uploads</span></div>
          <div><Cloud /><strong>Reliable delivery</strong><span>Cloudinary-backed results</span></div>
          <div><CheckCircle2 /><strong>Ready in seconds</strong><span>Upload, process, download</span></div>
        </div>
      </section>
      <ToolGrid />
      <section className="content-band">
        <p className="eyebrow">Built for everyday work</p>
        <h2>One clean workspace. Zero learning curve.</h2>
        <p>Choose a tool, preview your files, adjust the settings and download a polished result. No account, subscription or complicated software required.</p>
      </section>
    </>
  );
}
