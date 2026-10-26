const { scanText } = require('../src/services/matcher');
const { score } = require('../src/services/scorer');
const config = require('../src/config');

const kw = (text, keywords = config.keywords) => scanText([text], keywords).matched.map((m) => m.keyword);

describe('keyword matching', () => {
  test('loads the 20 default keywords from config', () => {
    expect(config.keywords).toHaveLength(20);
    expect(config.keywords.some((k) => /nut(?!\s*splitter)/i.test(k))).toBe(false); // no hydraulic-nut additions
  });
  test('case-insensitive', () => {
    expect(kw('HYDRAULIC TORQUE WRENCH WITH POWER PACK')).toEqual(expect.arrayContaining(['Hydraulic torque wrench', 'Torque wrench']));
  });
  test('plural variants: torque wrenches', () => {
    expect(kw('supply of torque wrenches')).toContain('Torque wrench');
  });
  test('stemming bonus: tensioning / tensioned / tensioners', () => {
    expect(kw('stud bolt tensioned to spec', ['Stud bolt tensioning'])).toEqual(['Stud bolt tensioning']);
    expect(kw('two bolt tensioners', ['Bolt tensioner'])).toEqual(['Bolt tensioner']);
    expect(kw('flange bolts tightened', ['Flange bolt tightening'])).toEqual(['Flange bolt tightening']);
  });
  test('the "extension" trap: no tension hit inside another word', () => {
    expect(kw('connector / extension piece, extensions, intensive', ['Bolt tensioner', 'Pre-tensioning', 'Hydraulic bolt tensioning'])).toEqual([]);
    expect(kw('EXTENSION of contract and attention to detail')).toEqual([]);
  });
  test('whole words only: "retorque wrench" is not a Torque wrench hit', () => {
    expect(kw('retorque wrench', ['Torque wrench'])).toEqual([]);
  });
  test('flexible hyphens / whitespace / line breaks', () => {
    expect(kw('pre tensioning', ['Pre-tensioning'])).toEqual(['Pre-tensioning']);
    expect(kw('pretensioning', ['Pre-tensioning'])).toEqual(['Pre-tensioning']);
    expect(kw('hydraulic\ntorque   wrench', ['Hydraulic torque wrench'])).toEqual(['Hydraulic torque wrench']);
    expect(kw('plant-shutdown', ['Plant shutdown'])).toEqual(['Plant shutdown']);
  });
  test('multi-word phrase does not match when words are split by other words', () => {
    expect(kw('torque wrench calibration', ['Torque calibration'])).toEqual([]);
  });
  test('records page and snippet', () => {
    const r = scanText(['nothing here', 'page two has a Torque Wrench in it'], ['Torque wrench']);
    expect(r.matched[0].hits[0]).toMatchObject({ page: 2, text: 'Torque Wrench' });
    expect(r.matched[0].hits[0].snippet).toContain('Torque Wrench');
  });
});

describe('scoring', () => {
  test('0 = Not Related, 1-2 = Possible, 3+ = Related', () => {
    expect(score(0)).toBe('Not Related');
    expect(score(1)).toBe('Possible');
    expect(score(2)).toBe('Possible');
    expect(score(3)).toBe('Related');
  });
  test('thresholds are configurable', () => {
    const s = { relatedMin: 5, possibleMin: 2, labels: config.scoring.labels };
    expect(score(1, s)).toBe('Not Related');
    expect(score(4, s)).toBe('Possible');
  });
});
