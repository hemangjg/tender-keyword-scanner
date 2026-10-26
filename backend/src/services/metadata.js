/**
 * Pull tender metadata out of extracted text with regexes.
 * GeM bid documents are bilingual (Hindi / English) with "label/value" pairs,
 * so we anchor on the English label. A generic "Label: value" fallback covers
 * DOCX / non-GeM documents. Anything not found -> "Not Found".
 */
const NF = 'Not Found';

const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

function first(text, patterns) {
  for (const re of patterns) {
    const m = text.match(re);
    if (m && clean(m[1])) return clean(m[1]);
  }
  return null;
}

/** Generic "Label: value" line, e.g. "Tender ID: TND-2026-001". */
const label = (...names) => new RegExp(`(?:^|\\n)\\s*(?:${names.join('|')})\\s*[:\\-–]\\s*([^\\n]+)`, 'i');

function formatInr(n) {
  const num = Number(String(n).replace(/[^0-9.]/g, ''));
  return Number.isFinite(num) && num > 0 ? 'INR ' + num.toLocaleString('en-IN') : null;
}

// keep "DD-MM-YYYY HH:MM" (GeM opening and closing are often the same day)
function dateOnly(s) {
  return s ? s.replace(/(\d{2}:\d{2}):\d{2}$/, '$1') : s;
}

function extractMetadata(text, filename = '') {
  const isGem = /GEM\/\d{4}\/B\/\d+/.test(text);
  const f = {};

  f.tenderId = first(filename, [/GeM-Bidding-(\d+)/i]) || first(text, [label('Tender ID', 'Tender Id', 'Bid ID')]);
  f.tenderNo = first(text, [/Bid Number\s*:?\s*(GEM\/\d{4}\/B\/\d+)/i, /(GEM\/\d{4}\/B\/\d+)/, label('Tender No\\.?', 'Tender Number', 'Reference No\\.?', 'Ref No\\.?')]);

  const org = first(text, [/Organisation Name\s*([^\n]+)/i]);
  const dept = first(text, [/Department Name\s*([^\n]+)/i]);
  f.authority = org ? (dept && dept !== org ? `${org} (${dept})` : org) : first(text, [label('Tender Authority', 'Tendering Authority', 'Issued By', 'Owner', 'Client', 'Employer')]);

  f.location = first(text, [/Office Name\s*([^\n]+)/i, label('Location', 'Site', 'Place of Work', 'Project Location')]);
  f.openingDate = dateOnly(first(text, [/Bid Opening\s*\n?\s*Date\/Time\s*\n?\s*(\d{2}-\d{2}-\d{4}(?: \d{2}:\d{2}:\d{2})?)/i, label('Opening Date', 'Bid Opening Date', 'Start Date')]));
  f.closingDate = dateOnly(first(text, [/Bid End Date\/Time\s*\n?\s*(\d{2}-\d{2}-\d{4}(?: \d{2}:\d{2}:\d{2})?)/i, label('Closing Date', 'Bid End Date', 'Due Date', 'Submission Deadline')]));

  const est = first(text, [/Estimated Bid Value\s*:?\s*([\d,]+(?:\.\d+)?)/i]);
  f.tenderAmount = (est && formatInr(est)) || first(text, [label('Tender Amount', 'Tender Value', 'Estimated Value', 'Contract Value', 'Estimated Cost')]);

  let emd = null;
  const emdBlock = text.match(/EMD Detail[\s\S]{0,200}?Required\s*(Yes|No)/i);
  if (emdBlock) {
    if (/no/i.test(emdBlock[1])) emd = 'Not Required';
    else emd = formatInr(first(text, [/EMD Amount\s*:?\s*([\d,]+)/i]) || '') || 'Required';
  }
  f.emd = emd || first(text, [label('EMD', 'Earnest Money Deposit', 'Bid Security')]);

  f.documentCost = first(text, [label('Document Cost', 'Tender Document Cost', 'Cost of Document')]);
  f.tenderFee = isGem ? null : first(text, [label('Tender Fee', 'Tender Processing Fee')]);
  f.tabName = isGem ? null : first(text, [label('Tab Name', 'Category', 'Work Category')]);

  const years = first(text, [/Years of Past Experience Required[^\n]*?\n?\s*(\d+\s*Year\(?s?\)?)/i]);
  const elig = first(text, [/ELIGIBILITY CRITERIA\s*-*>\s*-*\s*([\s\S]{20,1500}?)\n\s*(?:REQUIREMENT|SPECIAL|DELIVERY|\d+\s*\/\s*\d+\s*\n)/i]);
  f.technicalQualification = (years && `Min. ${years} past experience`) || (elig && (elig.length > 400 ? elig.slice(0, 399) + '…' : elig)) || first(text, [label('Technical Qualification', 'Technical Eligibility', 'Experience Required')]);
  const turnover = first(text, [/Minimum Average Annual Turnover[^\n]*?\n?\s*([\d,]+\s*Lakh\s*\(s\)|[\d,]+)/i]);
  f.financialQualification = (turnover && `Min. average annual turnover ${turnover}`) || first(text, [label('Financial Qualification', 'Financial Eligibility', 'Turnover')]);

  const item = first(text, [/Item Category\s*\n?\s*([^\n]+(?:\n(?![^\n]*GeMARPTS)[^\n]+){0,2})/i]);
  f.scopeOfWork = item || first(text, [label('Scope of Work', 'Scope')]);
  const bidType = first(text, [/Type of Bid\s*([^\n]+)/i]);
  const qty = first(text, [/Total Quantity\s*(\d+)/i]);
  f.summary = item
    ? `GeM bid for ${item}${qty ? `; total quantity ${qty}` : ''}${bidType ? `; ${bidType}` : ''}.`
    : first(text, [label('Tender Summary', 'Summary', 'Title', 'Subject')]);
  f.description = first(text, [/Searched\s*\n?\s*Strings used in GeMARPTS\s*\n([^\n]+)/i, label('Tender Description', 'Description', 'Work Description')]);
  f.corrigendum = isGem ? null : first(text, [label('Corrigendum', 'Addendum', 'Amendment')]);

  const ministry = first(text, [/Ministry\/State Name\s*([^\n]+)/i]);
  f.purchaserAddress = org ? [first(text, [/Office Name\s*([^\n]+)/i]), org, ministry].filter(Boolean).join(', ') : first(text, [label('Purchaser Address', 'Address', 'Office Address')]);
  f.email = first(text, [/Buyer Email id\s*:?\s*([\w.+-]+@[\w.-]+\.\w+)/i, /([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/]);
  f.website = isGem ? null : first(text, [/((?:https?:\/\/)?www\.[\w.-]+\.[a-z]{2,}[^\s]*)/i]);

  for (const k of Object.keys(f)) if (!f[k]) f[k] = NF;
  return f;
}

module.exports = { extractMetadata, NOT_FOUND: NF };
