const config = require('../config');
const { extractText } = require('./extractor');
const { scanText } = require('./matcher');
const { score } = require('./scorer');
const { extractMetadata } = require('./metadata');

/** Full pipeline for one file: extract -> match -> score -> metadata. */
async function scanDocument(buffer, filename, keywords = config.keywords) {
  try {
    const { pages, text, pageCount } = await extractText(buffer, filename);
    const { matched, totalHits } = scanText(pages, keywords, config);
    const matchedKeywords = matched.map((m) => m.keyword);
    const warning = text.replace(/\s/g, '').length < 50 ? 'Very little text extracted (scanned image PDF?)' : undefined;
    return {
      documentName: filename,
      pageCount,
      matchedKeywords,
      matchCount: matchedKeywords.length,
      totalHits,
      relevance: score(matchedKeywords.length),
      matches: matched,
      metadata: extractMetadata(text, filename),
      warning,
    };
  } catch (err) {
    return {
      documentName: filename, pageCount: 0, matchedKeywords: [], matchCount: 0, totalHits: 0,
      relevance: score(0), matches: [], metadata: extractMetadata('', filename), error: err.message,
    };
  }
}

module.exports = { scanDocument };
