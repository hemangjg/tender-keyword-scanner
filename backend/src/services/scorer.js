const config = require('../config');

/** Verdict computed from the number of DISTINCT keywords matched. */
function score(distinctCount, scoring = config.scoring) {
  if (distinctCount >= scoring.relatedMin) return scoring.labels.related;
  if (distinctCount >= scoring.possibleMin) return scoring.labels.possible;
  return scoring.labels.none;
}

module.exports = { score };
