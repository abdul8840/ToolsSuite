import { Link } from "react-router-dom";
import * as Icons from "lucide-react";

export default function ToolCard({ tool }) {
  const Icon = Icons[tool.icon] || Icons.Wrench;
  return (
    <Link className="tool-card" to={`/tools/${tool.slug}`}>
      <span className="tool-icon"><Icon size={24} /></span>
      <span className="pill">{tool.category}</span>
      <h3>{tool.title}</h3>
      <p>{tool.description}</p>
      <strong>Open tool →</strong>
    </Link>
  );
}
