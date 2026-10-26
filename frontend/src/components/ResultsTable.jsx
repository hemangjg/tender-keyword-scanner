import { Fragment, useState } from 'react';

const BADGE = { Related: 'badge related', Possible: 'badge possible', 'Not Related': 'badge none' };

export default function ResultsTable({ results }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="table-wrap">
      <table className="results">
        <thead>
          <tr><th>Document</th><th>Tender No</th><th>Matched Keywords</th><th className="num">Match Count</th><th>Relevance</th></tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <Fragment key={r.documentName + i}>
              <tr>
                <td data-label="Document">
                  <div className="fname">{r.documentName}</div>
                  <div className="muted small">{r.metadata.authority !== 'Not Found' ? r.metadata.authority : ''}</div>
                  {r.error && <div className="error small">⚠ {r.error}</div>}
                  {r.warning && <div className="warn small">⚠ {r.warning}</div>}
                </td>
                <td data-label="Tender No">{r.metadata.tenderNo}</td>
                <td data-label="Matched Keywords">
                  {r.matchedKeywords.length ? (
                    <div className="chips">{r.matchedKeywords.map((k) => <span className="chip" key={k}>{k}</span>)}</div>
                  ) : <span className="muted">(none found)</span>}
                  {r.totalHits > 0 && (
                    <button className="link small" onClick={() => setOpen(open === i ? null : i)}>
                      {open === i ? 'Hide' : 'Show'} {r.totalHits} hit{r.totalHits > 1 ? 's' : ''} in context
                    </button>
                  )}
                </td>
                <td data-label="Match Count" className="num">{r.matchCount}</td>
                <td data-label="Relevance"><span className={BADGE[r.relevance]}>{r.relevance}</span></td>
              </tr>
              {open === i && (
                <tr className="hits-row">
                  <td colSpan={5}>
                    <ul className="hits">
                      {r.matches.flatMap((m) => m.hits.map((h, j) => (
                        <li key={m.keyword + j}><strong>{m.keyword}</strong> <span className="muted">p.{h.page}</span> — {h.snippet}</li>
                      )))}
                    </ul>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
