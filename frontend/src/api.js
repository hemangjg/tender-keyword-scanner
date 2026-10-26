// Base URL of the Express API. Empty in dev (Vite proxy); set VITE_API_URL in production.
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function scanFiles(files) {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  const res = await fetch(`${API_BASE}/api/scan`, { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Scan failed (${res.status})`);
  return data;
}

export async function downloadReport(downloadUrl) {
  const res = await fetch(`${API_BASE}${downloadUrl}`);
  if (!res.ok) throw new Error('Report download failed');
  const blob = await res.blob();
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || 'tender_scan_report.xlsx';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}
