import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, Loader2, ShieldCheck, UploadCloud } from "lucide-react";
import SEO from "../components/SEO.jsx";
import { tools } from "../data/tools.js";

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000" : "");

function initialOptions(fields) {
  return Object.fromEntries(fields.map((field) => [field.name, field.defaultValue ?? ""]));
}

function getFilename(contentDisposition, fallback) {
  if (!contentDisposition) return fallback;
  const utf = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf) return decodeURIComponent(utf[1]);
  const regular = contentDisposition.match(/filename="?([^";]+)"?/i);
  return regular?.[1] || fallback;
}

export default function ToolPage() {
  const { slug } = useParams();
  const tool = useMemo(() => tools.find((item) => item.slug === slug), [slug]);
  const [files, setFiles] = useState([]);
  const [options, setOptions] = useState(() => initialOptions(tool?.fields || []));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  if (!tool) {
    return (
      <div className="page-title">
        <h1>Tool not found</h1>
        <Link to="/tools">Back to tools</Link>
      </div>
    );
  }

  const hasFileInput = Boolean(tool.accept);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      if (hasFileInput && files.length === 0) throw new Error("Please upload a file first.");
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("files", file));
      formData.append("options", JSON.stringify(options));

      const response = await fetch(`${API_URL}/api/tools/${tool.slug}`, { method: "POST", body: formData });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Request failed" }));
        throw new Error(error.message || "Tool request failed");
      }

      const blob = await response.blob();
      const filename = getFilename(response.headers.get("content-disposition"), `${tool.slug}-result`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage({ type: "success", text: `Done. Download started: ${filename}` });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  function updateOption(name, value) {
    setOptions((current) => ({ ...current, [name]: value }));
  }

  return (
    <>
      <SEO title={tool.title} description={tool.description} path={`/tools/${tool.slug}`} />
      <section className="tool-detail">
        <Link to="/tools" className="back-link"><ArrowLeft size={18} /> Back to tools</Link>
        <div className="tool-detail-card">
          <div className="tool-detail-copy">
            <span className="pill">{tool.category}</span>
            <h1>{tool.title}</h1>
            <p>{tool.description}</p>
            <ul className="trust-list">
              <li><ShieldCheck size={18} /> Local API processing</li>
              <li><ShieldCheck size={18} /> Temporary files cleaned after download</li>
              <li><ShieldCheck size={18} /> Upload limits and validation</li>
            </ul>
          </div>
          <form className="tool-form" onSubmit={submit}>
            {hasFileInput && (
              <label className="dropzone">
                <UploadCloud size={34} />
                <strong>{tool.multiple ? "Upload files" : "Upload file"}</strong>
                <span>{tool.accept || "Any supported file"}</span>
                <input type="file" accept={tool.accept} multiple={tool.multiple} onChange={(event) => setFiles(event.target.files)} />
              </label>
            )}
            {files.length > 0 && (
              <div className="file-list">
                {Array.from(files).map((file) => <span key={`${file.name}-${file.size}`}>{file.name}</span>)}
              </div>
            )}
            <div className="field-grid">
              {tool.fields.map((field) => (
                <label key={field.name} className={field.type === "textarea" ? "wide-field" : ""}>
                  <span>{field.label}</span>
                  {field.type === "select" ? (
                    <select value={options[field.name]} onChange={(event) => updateOption(field.name, event.target.value)}>
                      {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea rows={7} value={options[field.name]} onChange={(event) => updateOption(field.name, event.target.value)} />
                  ) : (
                    <input type={field.type} value={options[field.name]} onChange={(event) => updateOption(field.name, event.target.value)} />
                  )}
                </label>
              ))}
            </div>
            <button className="btn primary full" type="submit" disabled={busy}>
              {busy ? <Loader2 className="spin" size={18} /> : <Download size={18} />}
              {busy ? "Processing..." : `Run ${tool.title}`}
            </button>
            {message && <div className={`alert ${message.type}`}>{message.text}</div>}
          </form>
        </div>
      </section>
    </>
  );
}
