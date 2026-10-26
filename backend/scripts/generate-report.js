// CLI: node scripts/generate-report.js out.xlsx file1.pdf file2.docx ...
const fs = require('fs');
const path = require('path');
const { scanDocument } = require('../src/services/scanner');
const { buildWorkbook } = require('../src/services/report');

(async () => {
  const [out, ...files] = process.argv.slice(2);
  if (!out || !files.length) { console.error('usage: generate-report.js out.xlsx <files...>'); process.exit(1); }
  const results = [];
  for (const f of files) {
    const r = await scanDocument(fs.readFileSync(f), path.basename(f));
    results.push(r);
    console.log(`${r.documentName}: ${r.relevance} (${r.matchCount} distinct, ${r.totalHits} hits) -> ${r.matchedKeywords.join(', ') || '(none found)'}${r.error ? ' ERROR ' + r.error : ''}`);
  }
  await buildWorkbook(results).xlsx.writeFile(out);
  console.log('Wrote', out);
})();
