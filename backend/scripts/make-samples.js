// Generates the 3 self-made test documents in ../samples (one relevant, one irrelevant, one borderline).
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, HeadingLevel } = require('docx');

const out = path.join(__dirname, '..', '..', 'samples');
fs.mkdirSync(out, { recursive: true });

const relevant = [
  'Tender ID: TND-2026-1101', 'Tender No: HPR/2026/TA/031', 'Tender Authority: Western Coast Refinery Ltd',
  'Location: Jamnagar, Gujarat', 'Opening Date: 02-11-2026', 'Closing Date: 20-11-2026',
  'Tender Amount: INR 4,50,00,000', 'EMD: INR 4,50,000', 'Document Cost: INR 5,000', 'Tender Fee: INR 2,000',
  'Tab Name: Mechanical Works', 'Technical Qualification: Min. 5 years in refinery turnaround projects',
  'Financial Qualification: Min. average annual turnover INR 10 crore', 'Corrigendum: Not issued',
  'Purchaser Address: Refinery Road, Jamnagar 361140', 'Email: procurement@wcr-example.in', 'Website: www.wcr-example.in',
  'Scope of Work: Controlled bolting and flange management for the 2026 plant shutdown.',
  'Tender Description: Annual turnaround services covering hydraulic bolt tensioning of heat-exchanger studs,',
  'hydraulic torque wrenches for 150 bolted joints, pre-tensioning checks and torque calibration of all tools.',
  'The contractor shall supply bolting tools including nut splitters and torque multipliers, and maintain flange joint integrity records.',
];
const irrelevant = [
  'Tender ID: TND-2026-2207', 'Tender No: MUN/CIV/2026/88', 'Tender Authority: City Municipal Corporation',
  'Location: Pune, Maharashtra', 'Closing Date: 15-11-2026', 'Email: works@pmc-example.in',
  'Scope of Work: Resurfacing of internal roads, storm-water drain cleaning and extension of footpaths.',
  'Tender Description: Civil works including bituminous road laying, kerb stones, painting and landscaping.',
  'Note: the extension of the contract period and attention to pedestrian safety are mandatory.',
];
const borderline = [
  'Tender ID: TND-2026-3150', 'Tender No: PWR/MNT/2026/12', 'Tender Authority: State Thermal Power Co.',
  'Location: Nagpur, Maharashtra', 'Closing Date: 28-11-2026',
  'Scope of Work: General mechanical maintenance of boiler feed pumps during the annual shutdown maintenance window.',
  'Tender Description: Supply of spanners, a torque wrench set and consumables (gaskets, lubricants).',
  'Contractor must provide pump alignment, bearing replacement and valve servicing.',
];

function pdf(file, title, lines) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50, compress: false, pdfVersion: '1.4' });
    const s = fs.createWriteStream(path.join(out, file));
    doc.pipe(s);
    doc.fontSize(16).text(title).moveDown();
    doc.fontSize(11);
    lines.forEach((l) => doc.text(l).moveDown(0.3));
    doc.end();
    s.on('finish', resolve);
  });
}

async function docx(file, title, lines) {
  const d = new Document({ sections: [{ children: [new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }), ...lines.map((l) => new Paragraph(l))] }] });
  fs.writeFileSync(path.join(out, file), await Packer.toBuffer(d));
}

(async () => {
  await pdf('Relevant_Refinery_Turnaround_SOW.pdf', 'Scope of Work - Refinery Turnaround 2026 (sample)', relevant);
  await docx('Irrelevant_Road_Civil_Works_Tender.docx', 'Tender - Road and Civil Works (sample)', irrelevant);
  await docx('Borderline_Pump_Maintenance_SOW.docx', 'SOW - Boiler Feed Pump Maintenance (sample)', borderline);
  console.log('samples written to', out);
})();
