/**
 * Keyword matcher.
 * - case-insensitive, whole-word (so "extension" never counts as "tension")
 * - flexible separators: any run of spaces / hyphens / line breaks between words
 *   ("pre-tensioning" == "pre tensioning" == "pretensioning")
 * - suffix variants per word: wrench/wrenches, tensioner/tensioners,
 *   tensioning/tensioned/tension, tool/tools, joint/joints ... (light stemming)
 */

const SUFFIXES = ['', 's', 'es', 'ed', 'ing', 'er', 'ers', 'ion', 'ions', 'ings', 'ment', 'ments'];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Very small Porter-style stemmer good enough for our English keyword list. */
function stem(word) {
  let w = word.toLowerCase();
  for (const suf of ['ings', 'ing', 'ers', 'er', 'ions', 'ion', 'ments', 'ment', 'es', 'ed', 's']) {
    if (w.length - suf.length >= 4 && w.endsWith(suf)) { w = w.slice(0, -suf.length); break; }
  }
  // "tighten" -> "tight", "calibrat(e)" -> "calibrat"
  if (w.endsWith('e') && w.length > 4) w = w.slice(0, -1);
  return w;
}

/** Regex fragment for one word: its stem plus an optional known suffix. */
function wordPattern(word) {
  const lower = word.toLowerCase();
  if (lower.length <= 3) return esc(lower) + '(?:s|es)?'; // "and", "nut"
  const s = stem(lower);
  return esc(s) + '(?:e)?(?:' + SUFFIXES.filter(Boolean).map(esc).join('|') + ')?';
}

/** Build a global, case-insensitive regex for a keyword phrase. */
function buildRegex(keyword) {
  const words = keyword.trim().split(/[\s\-–—_]+/).filter(Boolean);
  const sep = '[\\s\\-–—_]*'; // allow "pre-tensioning", "pretensioning", line breaks
  const body = words.map(wordPattern).join(words.length > 1 ? sep.replace('*', '+') : '');
  // word boundaries done with look-arounds so they work at hyphens / unicode too
  return new RegExp('(?<![A-Za-z0-9])' + body + '(?![A-Za-z0-9])', 'gi');
}

/** Special-case: allow the single-token form for hyphenated keywords ("pretensioning"). */
function buildRegexes(keyword) {
  const list = [buildRegex(keyword)];
  if (/-/.test(keyword)) list.push(buildRegex(keyword.replace(/-/g, '')));
  return list;
}

function snippet(text, index, length, radius) {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + length + radius);
  return ((start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : ''))
    .replace(/\s+/g, ' ').trim();
}

/**
 * Scan pages of text for keywords.
 * @param {string[]} pages text per page (DOCX = single page)
 * @param {string[]} keywords
 * @returns {{matched: {keyword:string, count:number, hits:{page:number, text:string, snippet:string}[]}[], totalHits:number}}
 */
function scanText(pages, keywords, { snippetRadius = 60, maxHitsPerKeyword = 25 } = {}) {
  const matched = [];
  let totalHits = 0;
  for (const keyword of keywords) {
    const hits = [];
    const seen = new Set();
    pages.forEach((pageText, i) => {
      for (const re of buildRegexes(keyword)) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(pageText)) !== null) {
          const key = i + ':' + m.index;
          if (seen.has(key)) continue;
          seen.add(key);
          hits.push({ page: i + 1, text: m[0].replace(/\s+/g, ' '), snippet: snippet(pageText, m.index, m[0].length, snippetRadius) });
        }
      }
    });
    if (hits.length) {
      totalHits += hits.length;
      matched.push({ keyword, count: hits.length, hits: hits.slice(0, maxHitsPerKeyword) });
    }
  }
  return { matched, totalHits };
}

module.exports = { scanText, buildRegex, stem };
