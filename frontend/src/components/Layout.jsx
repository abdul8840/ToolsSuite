import { Link, NavLink } from "react-router-dom";
import { ShieldCheck, Sparkles } from "lucide-react";

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link to="/" className="brand" aria-label="MERN Tools Suite home">
          <span className="brand-mark"><Sparkles size={20} /></span>
          <span>MERN Tools Suite</span>
        </Link>
        <nav className="nav-links" aria-label="Main navigation">
          <NavLink to="/tools">Tools</NavLink>
          <a href="#security">Security</a>
          <a href="/api/tools" target="_blank" rel="noreferrer">API</a>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="site-footer" id="security">
        <div>
          <h2><ShieldCheck size={22} /> Secure by design</h2>
          <p>Files are processed on your own server with strict upload limits, local processing, temporary cleanup and no third-party conversion APIs.</p>
        </div>
        <div className="footer-grid">
          <span>Helmet headers</span><span>Rate limits</span><span>Local APIs</span><span>Mongo audit logs</span>
        </div>
      </footer>
    </div>
  );
}
