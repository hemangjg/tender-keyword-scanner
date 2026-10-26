const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const config = require('../config');
const { scanDocument } = require('../services/scanner');
const { buildWorkbook } = require('../services/report');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileSizeMb * 1024 * 1024, files: config.maxFiles },
  fileFilter: (req, file, cb) => {
    const ok = ['.pdf', '.docx'].includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : Object.assign(new Error(`Only .pdf and .docx files are allowed (got ${file.originalname})`), { status: 400 }), ok);
  },
});

// In-memory store of recent scans (id -> results). Swap for MongoDB to keep history.
const scans = new Map();
const MAX_SCANS = 50;

router.get('/health', (req, res) => res.json({ ok: true }));

router.get('/keywords', (req, res) => res.json({ keywords: config.keywords, scoring: config.scoring }));

/** POST /api/scan  multipart field "files" (1..n .pdf/.docx). Optional field "keywords" (newline/comma list). */
router.post('/scan', upload.array('files', config.maxFiles), async (req, res, next) => {
  try {
    if (!req.files || !req.files.length) return res.status(400).json({ error: 'Upload at least one .pdf or .docx file in field "files".' });
    let keywords = config.keywords;
    if (req.body.keywords) {
      const custom = String(req.body.keywords).split(/[\n,]/).map((k) => k.trim()).filter(Boolean);
      if (custom.length) keywords = custom;
    }
    const results = [];
    for (const f of req.files) {
      // multer decodes names as latin1; restore UTF-8
      const name = Buffer.from(f.originalname, 'latin1').toString('utf8');
      results.push(await scanDocument(f.buffer, name, keywords));
    }
    const id = crypto.randomUUID();
    scans.set(id, { results, createdAt: new Date().toISOString() });
    if (scans.size > MAX_SCANS) scans.delete(scans.keys().next().value);
    res.json({ scanId: id, downloadUrl: `/api/scan/${id}/report.xlsx`, keywordCount: keywords.length, results });
  } catch (e) { next(e); }
});

/** GET /api/scan/:id/report.xlsx  download the Excel report for a scan. */
router.get('/scan/:id/report.xlsx', async (req, res, next) => {
  try {
    const scan = scans.get(req.params.id);
    if (!scan) return res.status(404).json({ error: 'Scan not found or expired. Please scan again.' });
    const wb = buildWorkbook(scan.results);
    const stamp = scan.createdAt.slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="tender_scan_report_${stamp}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (e) { next(e); }
});

module.exports = router;
