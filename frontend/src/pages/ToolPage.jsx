import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, File, FileText, Image, Loader2, Plus, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
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

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export default function ToolPage() {
  const { slug } = useParams();
  const tool = useMemo(() => tools.find((item) => item.slug === slug), [slug]);
  const [files, setFiles] = useState([]);
  const inputRef = useRef(null);
  const filesRef = useRef([]);
  const [options, setOptions] = useState(() => initialOptions(tool?.fields || []));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => { filesRef.current = files; }, [files]);
  useEffect(() => () => filesRef.current.forEach((item) => item.preview && URL.revokeObjectURL(item.preview)), []);
  useEffect(() => {
    setFiles((current) => {
      current.forEach((item) => item.preview && URL.revokeObjectURL(item.preview));
      return [];
    });
    setOptions(initialOptions(tool?.fields || []));
    setMessage(null);
  }, [slug, tool]);

  if (!tool) {
    return (
      <div className="page-title">
        <h1>Tool not found</h1>
        <Link to="/tools">Back to tools</Link>
      </div>
    );
  }

  const hasFileInput = Boolean(tool.accept);

  function addFiles(fileList) {
    const incoming = Array.from(fileList || []).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null
    }));
    if (!incoming.length) return;
    setFiles((current) => {
      if (!tool.multiple) {
        current.forEach((item) => item.preview && URL.revokeObjectURL(item.preview));
        return [incoming[0]];
      }
      const existing = new Set(current.map((item) => `${item.file.name}-${item.file.size}-${item.file.lastModified}`));
      const unique = incoming.filter((item) => {
        const duplicate = existing.has(`${item.file.name}-${item.file.size}-${item.file.lastModified}`);
        if (duplicate && item.preview) URL.revokeObjectURL(item.preview);
        return !duplicate;
      });
      return [...current, ...unique];
    });
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(id) {
    setFiles((current) => current.filter((item) => {
      if (item.id === id && item.preview) URL.revokeObjectURL(item.preview);
      return item.id !== id;
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const acceptsTypedHtml = tool.slug === "html-to-pdf" && options.html?.trim();
      if (hasFileInput && files.length === 0 && !acceptsTypedHtml) throw new Error("Please upload a file first.");
      const formData = new FormData();
      files.forEach((item) => formData.append("files", item.file));
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
      <SEO title={tool.title} description={tool.description} path={`/tools/${tool.slug}`} tool={tool} />
      <section className="tool-detail">
        <Link to="/tools" className="back-link"><ArrowLeft size={18} /> Back to tools</Link>
        <div className="tool-detail-card">
          <div className="tool-detail-copy">
            <span className="pill">{tool.category}</span>
            <h1>{tool.title}</h1>
            <p>{tool.description}</p>
            <ul className="trust-list">
              <li><ShieldCheck size={18} /> Private, secured processing</li>
              <li><ShieldCheck size={18} /> Fast Cloudinary delivery</li>
              <li><ShieldCheck size={18} /> Free to use, no signup</li>
            </ul>
          </div>
          <form className="tool-form" onSubmit={submit}>
            {hasFileInput && (
              <label className={`dropzone ${files.length ? "compact" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files); }}>
                <UploadCloud size={34} />
                <strong>{files.length ? (tool.multiple ? "Add more files" : "Replace file") : "Drop your file here"}</strong>
                <span>or click to browse · {tool.accept || "Supported files"}</span>
                <input ref={inputRef} type="file" accept={tool.accept} multiple={tool.multiple} onChange={(event) => addFiles(event.target.files)} />
              </label>
            )}
            {files.length > 0 && (
              <div className="upload-summary">
                <div className="upload-summary-head"><strong>{files.length} {files.length === 1 ? "file" : "files"} ready</strong>{tool.multiple && <button type="button" className="text-button" onClick={() => inputRef.current?.click()}><Plus size={16} /> Add</button>}</div>
                <div className="file-preview-list">
                  {files.map((item) => (
                    <article className="file-preview" key={item.id}>
                      <div className="preview-visual">
                        {item.preview ? <img src={item.preview} alt={`Preview of ${item.file.name}`} /> : item.file.type === "application/pdf" ? <FileText /> : item.file.type.startsWith("image/") ? <Image /> : <File />}
                      </div>
                      <div className="preview-info"><strong title={item.file.name}>{item.file.name}</strong><span>{formatBytes(item.file.size)} · {item.file.type || "File"}</span></div>
                      <button type="button" className="remove-file" aria-label={`Remove ${item.file.name}`} onClick={() => removeFile(item.id)}><Trash2 size={17} /></button>
                    </article>
                  ))}
                </div>
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
