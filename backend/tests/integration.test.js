const path = require('path');
const fs = require('fs');
const request = require('supertest');
const ExcelJS = require('exceljs');
const app = require('../src/app');

const ROOT = path.join(__dirname, '..', '..', '..');
const SAMPLES = path.join(__dirname, '..', '..', 'samples');
const gem = (id) => path.join(ROOT, `GeM-Bidding-${id}.pdf`);
const haveGem = fs.existsSync(gem('9649647'));

(haveGem ? describe : describe.skip)('real GeM tenders via API', () => {
  let body;
  beforeAll(async () => {
    const res = await request(app).post('/api/scan')
      .attach('files', gem('9649647')).attach('files', gem('9605104')).attach('files', gem('9563430'));
    expect(res.status).toBe(200);
    body = res.body;
  }, 60000);
  const verdict = (id) => body.results.find((r) => r.documentName.includes(id));

  test('9649647 (hydraulic torque wrench) is flagged', () => {
    expect(verdict('9649647').matchedKeywords).toEqual(expect.arrayContaining(['Hydraulic torque wrench', 'Torque wrench']));
    expect(['Possible', 'Related']).toContain(verdict('9649647').relevance);
  });
  test('9605104 (hydraulic nuts) has no keyword hits', () => expect(verdict('9605104').relevance).toBe('Not Related'));
  test('9563430 (tube beveling; contains "extension") is Not Related', () => expect(verdict('9563430').relevance).toBe('Not Related'));
  test('GeM metadata extracted', () => {
    expect(verdict('9649647').metadata).toMatchObject({ tenderNo: 'GEM/2026/B/7824594', email: 'buyer26.rsp.or@gembuyer.in', tabName: 'Not Found', website: 'Not Found' });
  });

  test('xlsx download matches sample layout', async () => {
    const res = await request(app).get(body.downloadUrl).buffer(true).parse((r, cb) => { const c = []; r.on('data', (d) => c.push(d)); r.on('end', () => cb(null, Buffer.concat(c))); });
    expect(res.status).toBe(200);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(res.body);
    const ws = wb.getWorksheet('Tender Scan Report');
    expect(ws.getRow(1).values.slice(1)).toHaveLength(24);
    expect(ws.getCell('A1').fill.fgColor.argb).toBe('FF1E3A5F');
    expect(ws.views[0]).toMatchObject({ state: 'frozen', xSplit: 1, ySplit: 1 });
    const row = ws.getRows(2, 3).find((r) => String(r.getCell(1).value).includes('9563430'));
    expect(row.getCell(22).value).toBe('(none found)');
    expect(row.getCell(24).fill.fgColor.argb).toBe('FFF2F2F2');
    expect(wb.getWorksheet('Keyword Hits')).toBeTruthy();
  });
});

describe('self-made samples via API', () => {
  test('relevant / irrelevant / borderline', async () => {
    const res = await request(app).post('/api/scan')
      .attach('files', path.join(SAMPLES, 'Relevant_Refinery_Turnaround_SOW.pdf'))
      .attach('files', path.join(SAMPLES, 'Irrelevant_Road_Civil_Works_Tender.docx'))
      .attach('files', path.join(SAMPLES, 'Borderline_Pump_Maintenance_SOW.docx'));
    const v = Object.fromEntries(res.body.results.map((r) => [r.documentName.split('_')[0], r.relevance]));
    expect(v).toEqual({ Relevant: 'Related', Irrelevant: 'Not Related', Borderline: 'Possible' });
  }, 30000);
});

describe('validation', () => {
  test('rejects no files', async () => expect((await request(app).post('/api/scan')).status).toBe(400));
  test('rejects other file types', async () => {
    const res = await request(app).post('/api/scan').attach('files', Buffer.from('hi'), 'notes.txt');
    expect(res.status).toBe(400);
  });
  test('unknown scan id -> 404', async () => expect((await request(app).get('/api/scan/nope/report.xlsx')).status).toBe(404));
});
