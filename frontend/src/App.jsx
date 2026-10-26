import { useState } from 'react';
import DropZone from './components/DropZone.jsx';
import ResultsTable from './components/ResultsTable.jsx';
import { scanFiles, downloadReport } from './api.js';

export default function App() {
  const [files, setFiles] = useState([]);
  const [scan, setScan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true); setError(''); setScan(null);
    try { setScan(await scanFiles(files)); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const download = async () => {
    try { await downloadReport(scan.downloadUrl); } catch (e) { setError(e.message); }
  };
  const counts = scan && scan.results.reduce((a, r) => ({ ...a, [r.relevance]: (a[r.relevance] || 0) + 1 }), {});

  return (
    <div className="app">
      <header>
        <h1>Tender Keyword Scanner</h1>
        <p className="muted">Upload tender / Scope-of-Work documents to check them for Tritorc-relevant bolting, flange-management and torque-tool requirements.</p>
      </header>

      <main>
        <div className="card">
          <DropZone files={files} onChange={(f) => { setFiles(f); setScan(null); }} disabled={busy} />
          <div className="actions">
            <button className="primary" disabled={!files.length || busy} onClick={run}>
              {busy ? 'Scanning…' : `Scan ${files.length || ''} document${files.length === 1 ? '' : 's'}`}
            </button>
            {files.length > 0 && !busy && <button className="secondary" onClick={() => { setFiles([]); setScan(null); }}>Clear</button>}
          </div>
          {error && <p className="error" role="alert">{error}</p>}
        </div>

        {scan && (
          <div className="card">
            <div className="results-head">
              <div>
                <h2>Results</h2>
                <p className="muted small">
                  {scan.results.length} document(s) scanned against {scan.keywordCount} keywords ·{' '}
                  {['Related', 'Possible', 'Not Related'].map((k) => `${counts[k] || 0} ${k}`).join(' · ')}
                </p>
              </div>
              <button className="primary" onClick={download}>⬇ Download Excel report</button>
            </div>
            <ResultsTable results={scan.results} />
            <p className="muted small">Verdict = distinct keywords matched: 0 → Not Related, 1–2 → Possible, 3+ → Related.</p>
          </div>
        )}
      </main>
      <footer className="muted small">Tritorc Relevance Checker · React + Express</footer>
    </div>
  );
}
