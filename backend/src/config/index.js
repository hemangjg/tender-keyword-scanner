const fs = require('fs');
const path = require('path');

/** Load the default keyword list from keywords.csv (header row "keyword"). */
function loadKeywords(file = path.join(__dirname, 'keywords.csv')) {
  return fs.readFileSync(file, 'utf8')
    .split(/\r?\n/).map((l) => l.trim().replace(/^"|"$/g, ''))
    .filter((l, i) => l && !(i === 0 && l.toLowerCase() === 'keyword'));
}

module.exports = {
  port: Number(process.env.PORT) || 4000,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB) || 20,
  maxFiles: 20,
  keywords: loadKeywords(),
  // Verdict = number of DISTINCT keywords matched.
  scoring: {
    relatedMin: Number(process.env.RELATED_MIN) || 3, // >= 3 distinct -> Related
    possibleMin: Number(process.env.POSSIBLE_MIN) || 1, // 1-2 -> Possible, 0 -> Not Related
    labels: { related: 'Related', possible: 'Possible', none: 'Not Related' },
  },
  snippetRadius: 60,
  maxHitsPerKeyword: 25,
  loadKeywords,
};
