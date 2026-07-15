import { useMemo, useState } from "react";
import ToolCard from "./ToolCard.jsx";
import { categories, tools } from "../data/tools.js";

export default function ToolGrid() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = useMemo(() => {
    return tools.filter((tool) => {
      const matchesCategory = category === "All" || tool.category === category;
      const text = `${tool.title} ${tool.description} ${tool.category}`.toLowerCase();
      return matchesCategory && text.includes(query.toLowerCase());
    });
  }, [query, category]);

  return (
    <section className="tools-section" id="tools">
      <div className="section-heading">
        <p className="eyebrow">24 production tools</p>
        <h2>All conversion APIs run on your own server</h2>
      </div>
      <div className="filters" role="search">
        <input aria-label="Search tools" placeholder="Search PDF, image, Word, OCR..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <select aria-label="Filter category" value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <div className="tool-grid">
        {filtered.map((tool) => <ToolCard key={tool.slug} tool={tool} />)}
      </div>
    </section>
  );
}
