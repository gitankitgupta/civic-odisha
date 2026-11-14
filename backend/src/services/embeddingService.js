// Uses Hugging Face's free Inference API to get sentence embeddings,
// then compares them with cosine similarity for semantic duplicate detection.
// Falls back to null on any failure so the caller can use Jaccard instead.

const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const HF_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

async function getEmbedding(text) {
  try {
    const res = await fetch(HF_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
    });

    if (!res.ok) return null;
    const data = await res.json();

    // Model returns a flat array of numbers (the embedding vector)
    if (Array.isArray(data) && typeof data[0] === 'number') return data;
    return null;
  } catch (err) {
    console.error('Embedding fetch failed:', err.message);
    return null;
  }
}

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Returns a 0-1 semantic similarity score between two texts, or null
 * if embeddings couldn't be fetched (caller should fall back to Jaccard).
 */
async function semanticSimilarity(textA, textB) {
  const [vecA, vecB] = await Promise.all([getEmbedding(textA), getEmbedding(textB)]);
  if (!vecA || !vecB) return null;
  return cosineSimilarity(vecA, vecB);
}

module.exports = { semanticSimilarity };