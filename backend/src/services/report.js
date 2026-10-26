const ExcelJS = require('exceljs');
const { NOT_FOUND } = require('./metadata');

// Columns + widths replicated from sample_tender_scan_report.xlsx
const COLUMNS = [
  ['Document Name', 'documentName', 30], ['Tender ID', 'tenderId', 15], ['Tender No', 'tenderNo', 16],
  ['Tender Authority', 'authority', 24], ['Location', 'location', 20], ['Opening Date', 'openingDate', 13],
  ['Closing Date', 'closingDate', 13], ['Tender Amount', 'tenderAmount', 18], ['EMD', 'emd', 16],
  ['Document Cost', 'documentCost', 14], ['Tender Fee', 'tenderFee', 13], ['Tab Name', 'tabName', 15],
  ['Technical Qualification', 'technicalQualification', 30], ['Financial Qualification', 'financialQualification', 28],
  ['Scope of Work', 'scopeOfWork', 34], ['Tender Summary', 'summary', 34], ['Tender Description', 'description', 36],
  ['Corrigendum', 'corrigendum', 30], ['Purchaser Address', 'purchaserAddress', 30], ['Email', 'email', 24],
  ['Website', 'website', 20], ['Matched Keywords', 'matchedKeywords', 40], ['Match Count', 'matchCount', 11],
  ['Relevance to Tritorc', 'relevance', 16],
];

const VERDICT_FILL = { Related: 'FFD9F2D9', Possible: 'FFFDEBD3', 'Not Related': 'FFF2F2F2' };
const HEADER_FILL = 'FF1E3A5F';
const NF_FONT = { color: { argb: 'FF9CA3AF' } };
const solid = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

function styleHeader(row) {
  row.eachCell((c) => {
    c.fill = solid(HEADER_FILL);
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.alignment = { wrapText: true, vertical: 'middle' };
  });
}

/** Build the workbook for a list of scan results. Returns an ExcelJS.Workbook. */
function buildWorkbook(results) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Tritorc Tender Keyword Scanner';
  wb.created = new Date();

  const ws = wb.addWorksheet('Tender Scan Report', { views: [{ state: 'frozen', xSplit: 1, ySplit: 1, topLeftCell: 'B2' }] });
  ws.columns = COLUMNS.map(([header, key, width]) => ({ header, key, width }));
  styleHeader(ws.getRow(1));

  for (const r of results) {
    const row = ws.addRow({
      documentName: r.documentName,
      ...r.metadata,
      matchedKeywords: r.matchedKeywords.length ? r.matchedKeywords.join(', ') : '(none found)',
      matchCount: r.matchCount,
      relevance: r.relevance,
    });
    row.eachCell({ includeEmpty: true }, (c) => {
      c.alignment = { wrapText: true, vertical: 'top' };
      if (c.value === NOT_FOUND) c.font = NF_FONT;
    });
    const v = row.getCell('relevance');
    if (VERDICT_FILL[r.relevance]) v.fill = solid(VERDICT_FILL[r.relevance]);
    if (r.error) row.getCell('documentName').note = `Error: ${r.error}`;
  }

  // Bonus sheet: every keyword hit with page + context
  const hs = wb.addWorksheet('Keyword Hits', { views: [{ state: 'frozen', ySplit: 1 }] });
  hs.columns = [
    { header: 'Document Name', key: 'doc', width: 30 }, { header: 'Keyword', key: 'keyword', width: 28 },
    { header: 'Matched Text', key: 'text', width: 28 }, { header: 'Page', key: 'page', width: 8 },
    { header: 'Context Snippet', key: 'snippet', width: 90 },
  ];
  styleHeader(hs.getRow(1));
  for (const r of results) {
    for (const m of r.matches) {
      for (const h of m.hits) {
        hs.addRow({ doc: r.documentName, keyword: m.keyword, text: h.text, page: h.page, snippet: h.snippet })
          .eachCell((c) => { c.alignment = { wrapText: true, vertical: 'top' }; });
      }
    }
  }
  if (hs.rowCount === 1) hs.addRow({ doc: '(no keyword hits in this scan)' });
  return wb;
}

module.exports = { buildWorkbook, COLUMNS, VERDICT_FILL };
