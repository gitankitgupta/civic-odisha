const axios = require('axios');

const MODEL_URL = 'https://router.huggingface.co/hf-inference/models/google/vit-base-patch16-224';

function mapLabelToCategory(label) {
  const l = label.toLowerCase();
  if (l.includes('pothole') || l.includes('crack') || l.includes('road')) return 'pothole';
  if (l.includes('trash') || l.includes('garbage') || l.includes('waste') || l.includes('ashcan')) return 'garbage';
  if (l.includes('street') && l.includes('light')) return 'streetlight';
  if (l.includes('water') || l.includes('puddle') || l.includes('flood')) return 'water';
  if (l.includes('drain') || l.includes('sewer')) return 'drainage';
  return null;
}

async function callModel(imageBuffer) {
  return axios.post(MODEL_URL, imageBuffer, {
    headers: {
      Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
      'Content-Type': 'application/octet-stream',
    },
    timeout: 25000, // 25 seconds per attempt
  });
}

async function suggestCategoryFromImage(imageBuffer) {
  let lastError;
  // Retry up to 3 times — Hugging Face's free model needs a "cold start"
  // the first time it's called, and returns a 503 while it loads.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await callModel(imageBuffer);
      const predictions = res.data;

      if (!Array.isArray(predictions) || !predictions.length) {
        return { suggestedCategory: null, confidence: 0, rawLabel: null };
      }

      const top = predictions[0];
      return {
        suggestedCategory: mapLabelToCategory(top.label),
        confidence: top.score,
        rawLabel: top.label,
      };
    } catch (err) {
      lastError = err;
      const isLoading = err.response?.status === 503;
      if (isLoading && attempt < 3) {
        console.log(`Model is loading (attempt ${attempt}), retrying in 5s...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }
      throw lastError;
    }
  }
}

module.exports = { suggestCategoryFromImage };