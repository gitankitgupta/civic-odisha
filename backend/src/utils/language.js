const { francAll } = require('franc');

// Maps franc's ISO 639-3 codes to simple readable labels
const LANGUAGE_MAP = {
  hin: 'hindi',
  eng: 'english',
};

function detectLanguage(text) {
  if (!text || text.trim().length < 3) {
    return 'unknown';
  }

  const results = francAll(text, { minLength: 3 });
  if (!results.length) return 'unknown';

  const topCode = results[0][0];
  return LANGUAGE_MAP[topCode] || 'other';
}

module.exports = { detectLanguage };