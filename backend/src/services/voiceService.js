const axios = require('axios');

const ASSEMBLYAI_BASE = 'https://api.assemblyai.com/v2';
const headers = { authorization: process.env.ASSEMBLYAI_API_KEY };

const LANGUAGE_CODE_MAP = {
  en: 'en',
  hi: 'hi',
  bn: 'bn',
  te: 'te',
};

// Uploads a file buffer directly to AssemblyAI's servers and returns
// their hosted URL.
async function uploadFileToAssemblyAI(fileBuffer) {
  const uploadRes = await axios.post(`${ASSEMBLYAI_BASE}/upload`, fileBuffer, {
    headers: {
      ...headers,
      'content-type': 'application/octet-stream',
    },
    maxBodyLength: Infinity,
  });
  return uploadRes.data.upload_url;
}

async function transcribeAudio(audioUrlOrPath, language = 'en', fileBuffer = null) {
  const languageCode = LANGUAGE_CODE_MAP[language] || 'en';

  // If we have a file buffer, upload it to AssemblyAI directly
  // instead of relying on our own server's URL being reachable.
  const finalAudioUrl = fileBuffer
    ? await uploadFileToAssemblyAI(fileBuffer)
    : audioUrlOrPath;

  const submitRes = await axios.post(
    `${ASSEMBLYAI_BASE}/transcript`,
    { audio_url: finalAudioUrl, language_code: languageCode },
    { headers }
  );

  const transcriptId = submitRes.data.id;

  let transcript;
  while (true) {
    const pollRes = await axios.get(`${ASSEMBLYAI_BASE}/transcript/${transcriptId}`, { headers });
    transcript = pollRes.data;

    if (transcript.status === 'completed') break;
    if (transcript.status === 'error') throw new Error(transcript.error);

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return {
    text: transcript.text,
    confidence: transcript.confidence,
    language: transcript.language_code,
  };
}

module.exports = { transcribeAudio };