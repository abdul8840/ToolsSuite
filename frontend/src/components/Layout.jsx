import { Link, NavLink } from "react-router-dom";
import { ArrowRight, Cloud, ShieldCheck, Sparkles } from "lucide-react";

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link to="/" className="brand" aria-label="MERN Tools Suite home">
          <span className="brand-mark"><Sparkles size={20} /></span>
          <span>Tools Suite</span>
        </Link>
        <nav className="nav-links" aria-label="Main navigation">
          <NavLink to="/tools">Tools</NavLink>
          <a href="#security">Why us</a>
          <Link className="nav-cta" to="/tools">Start free <ArrowRight size={15} /></Link>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="site-footer" id="security">
        <div>
          <h2><ShieldCheck size={22} /> Simple, secure file tools</h2>
          <p>Convert, compress and edit files with protected uploads, temporary processing workspaces and reliable cloud delivery.</p>
        </div>
        <div className="footer-grid">
          <span><ShieldCheck size={17} /> Secure uploads</span><span><Cloud size={17} /> Cloud delivery</span><span>24 free tools</span><span>No signup needed</span>
        </div>
      </footer>
    </div>
  );
}
