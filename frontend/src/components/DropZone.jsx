import { useRef, useState } from 'react';

const ACCEPT = ['.pdf', '.docx'];
const okType = (f) => ACCEPT.some((ext) => f.name.toLowerCase().endsWith(ext));

export default function DropZone({ files, onChange, disabled }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const [rejected, setRejected] = useState([]);

  const add = (list) => {
    const incoming = Array.from(list);
    setRejected(incoming.filter((f) => !okType(f)).map((f) => f.name));
    const names = new Set(files.map((f) => f.name));
    onChange([...files, ...incoming.filter((f) => okType(f) && !names.has(f.name))]);
  };

  return (
    <section>
      <div
        className={`dropzone ${over ? 'over' : ''} ${disabled ? 'disabled' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => !disabled && input.current.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled) add(e.dataTransfer.files); }}
      >
        <div className="dz-icon" aria-hidden>📄</div>
        <p><strong>Drag &amp; drop tender / SOW files here</strong></p>
        <p className="muted">or click to browse · PDF or DOCX · multiple files allowed</p>
        <input ref={input} type="file" multiple accept=".pdf,.docx" hidden onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      </div>
      {rejected.length > 0 && <p className="error">Skipped (not PDF/DOCX): {rejected.join(', ')}</p>}
      {files.length > 0 && (
        <ul className="file-list">
          {files.map((f) => (
            <li key={f.name}>
              <span className="fname">{f.name}</span>
              <span className="muted">{(f.size / 1024).toFixed(0)} KB</span>
              {!disabled && <button className="link" aria-label={`Remove ${f.name}`} onClick={() => onChange(files.filter((x) => x !== f))}>✕</button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
