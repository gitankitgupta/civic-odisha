const axios = require('axios');

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const CATEGORIES = ['pothole', 'garbage', 'streetlight', 'water', 'drainage'];

const PROMPT = `You are classifying a photo submitted for a civic grievance in India.
Pick the single best category from: ${CATEGORIES.join(', ')}.
- pothole: damaged road, potholes, cracks
- garbage: trash, waste dumps, overflowing bins
- streetlight: broken or non-working street lights, light poles
- water: water leakage, flooding, waterlogging, no water supply
- drainage: blocked or open drains, sewage
If the photo matches none of these, use "none".
Respond ONLY with JSON: {"category": "<one of the above or none>", "confidence": <number between 0 and 1>}`;

function detectMimeType(buffer) {
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
  if (buffer.slice(0, 4).toString() === 'RIFF') return 'image/webp';
  return 'image/jpeg';
}

async function suggestCategoryFromImage(imageBuffer) {
  const res = await axios.post(
    API_URL,
    {
      contents: [
        {
          parts: [
            { text: PROMPT },
            {
              inline_data: {
                mime_type: detectMimeType(imageBuffer),
                data: imageBuffer.toString('base64'),
              },
            },
          ],
        },
      ],
      generationConfig: { responseMimeType: 'application/json' },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
      timeout: 25000,
    }
  );

  const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return { suggestedCategory: null, confidence: 0, rawLabel: null };
  }

  const parsed = JSON.parse(text);
  const category = CATEGORIES.includes(parsed.category) ? parsed.category : null;

  return {
    suggestedCategory: category,
    confidence: Number(parsed.confidence) || 0,
    rawLabel: parsed.category,
  };
}

module.exports = { suggestCategoryFromImage };