const express = require('express');
const router = express.Router();
const { transcribeAudio } = require('../services/voiceService');
const { suggestCategoryFromImage } = require('../services/imageService');
const { addResolutionEvidence, getResolutionEvidence } = require('../repositories/resolutionRepo');
const {
  createGrievance,
  getAllGrievances,
  getGrievanceById,
  getPublicGrievanceById,
  updateGrievanceStatus,
  upvoteGrievance,
  deleteGrievance,
} = require('../repositories/grievanceRepo');
const { verifyToken, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { submissionLimiter } = require('../middleware/rateLimiter');
const { uploadBufferToCloudinary } = require('../config/cloudinary');

router.post('/', submissionLimiter, upload.single('photo'), async (req, res) => {
  try {
    console.log('=== GRIEVANCE SUBMIT HIT ===');
    console.log('File received:', req.file ? 'YES - ' + req.file.originalname : 'NO FILE');

    const grievanceData = { ...req.body };
    // If the request carries a valid Supabase session token, link this
    // grievance to the authenticated citizen instead of leaving it anonymous.
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const supabaseAdmin = require('../config/supabaseAdmin');
        const { data } = await supabaseAdmin.auth.getUser(token);
        if (data?.user) {
          grievanceData.citizenId = data.user.id;
          grievanceData.isAnonymous = false;
        }
      } catch (err) {
        // Invalid/expired token — treat as anonymous submission, don't block it
      }
    }

    if (!grievanceData.title || !grievanceData.title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!grievanceData.description || !grievanceData.description.trim()) {
      return res.status(400).json({ error: 'Description is required' });
    }
    if (!grievanceData.category || !grievanceData.category.trim()) {
      return res.status(400).json({ error: 'Category is required' });
    }

    if (req.file) {
      const result = await uploadBufferToCloudinary(req.file.buffer, 'civic-odisha/grievances');
      grievanceData.media = [{ type: 'image', url: result.secure_url }];
    }

    // Form-data values arrive as strings, so convert and validate coordinates
    const lat = parseFloat(grievanceData.latitude);
    const lng = parseFloat(grievanceData.longitude);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      grievanceData.location = { lat, lng };
    }

    const grievance = await createGrievance(grievanceData);
    res.status(201).json(grievance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create grievance' });
  }
});

router.get('/', async (req, res) => {
  try {
    const grievances = await getAllGrievances();
    res.json(grievances);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch grievances' });
  }
});
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Keep this ABOVE router.get('/:id'), otherwise "nearby" is read as an id
router.get('/nearby', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }
    const radius = Math.min(Math.max(parseFloat(req.query.radius) || 100, 10), 500);
    const category = req.query.category;

    const all = await getAllGrievances();
    const nearby = all
      .filter((g) => g.status !== 'resolved' && g.location?.lat != null && g.location?.lng != null)
      .filter((g) => !category || g.category === category)
      .map((g) => ({
        id: g.id,
        title: g.title,
        category: g.category,
        status: g.status,
        upvotes: g.upvotes || 0,
        createdAt: g.createdAt,
        distanceM: Math.round(
          distanceMeters(lat, lng, Number(g.location.lat), Number(g.location.lng))
        ),
      }))
      .filter((g) => g.distanceM <= radius)
      .sort((a, b) => a.distanceM - b.distanceM)
      .slice(0, 5);

    res.json(nearby);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch nearby grievances' });
  }
});
router.get('/:id', async (req, res) => {
  try {
    const grievance = await getGrievanceById(req.params.id);
    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }
    res.json(grievance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch grievance' });
  }
});

router.patch('/:id/status', verifyToken, requireRole('dept_staff', 'admin'), upload.single('evidencePhoto'), async (req, res) => {
  try {
    const { status, note, actor } = req.body;

    const validStatuses = ['submitted', 'in_progress', 'resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    if (status === 'resolved' && !req.file) {
      return res.status(400).json({ error: 'A resolution evidence photo is required to mark a grievance as resolved.' });
    }

    const grievance = await updateGrievanceStatus(req.params.id, { status, note, actor });

    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    if (status === 'resolved' && req.file) {
      const result = await uploadBufferToCloudinary(req.file.buffer, 'civic-odisha/resolution-evidence');
      await addResolutionEvidence(req.params.id, {
        staffId: req.user.id,
        mediaUrl: result.secure_url,
        note: note || 'Resolved with evidence',
        evidenceType: 'photo',
      });
    }

    res.json(grievance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.post('/:id/upvote', submissionLimiter, async (req, res) => {
  try {
    const grievance = await upvoteGrievance(req.params.id);
    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }
    res.json(grievance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upvote' });
  }
});

const SUPPORTED_VOICE_LANGUAGES = ['en', 'hi', 'bn', 'te'];

router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const language = (req.body.language || 'en').toLowerCase();

    if (language === 'or') {
      return res.status(400).json({
        error: 'Voice input is not available for Odia yet. Please type your description instead.',
        code: 'LANGUAGE_NOT_SUPPORTED',
      });
    }

    if (!SUPPORTED_VOICE_LANGUAGES.includes(language)) {
      return res.status(400).json({
        error: `Unsupported language code: ${language}`,
        code: 'LANGUAGE_NOT_SUPPORTED',
      });
    }

    let audioUrl = null;
    let audioBuffer = null;

    if (req.file) {
      audioBuffer = req.file.buffer;
    } else if (req.body.audioUrl) {
      audioUrl = req.body.audioUrl;
    } else {
      return res.status(400).json({ error: 'No audio file or audioUrl provided' });
    }

    const result = await transcribeAudio(audioUrl, language, audioBuffer);
    res.json({
      transcript: result.text,
      confidence: result.confidence,
      detectedLanguage: result.language,
      lowConfidence: result.confidence < 0.6,
    });
  } catch (err) {
    console.error('Transcription error:', err.message);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

router.post('/suggest-category', upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No photo provided' });
  }

  try {
    const result = await suggestCategoryFromImage(req.file.buffer);
    res.json(result);
  } catch (err) {
    console.error('Image suggestion error:', err.message);
    res.status(500).json({ error: 'Failed to analyze image' });
  }
});

router.get('/:id/resolution-evidence', async (req, res) => {
  try {
    const evidence = await getResolutionEvidence(req.params.id);
    res.json(evidence);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch evidence' });
  }
});

router.get('/map/all', async (req, res) => {
  try {
    const grievances = await getAllGrievances();
    const mapData = grievances
      .filter((g) => g.location?.lat && g.location?.lng)
      .map((g) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        address: g.address,
        category: g.category,
        status: g.status,
        lat: g.location.lat,
        lng: g.location.lng,
        priorityScore: g.priorityScore,
        createdAt: g.createdAt,
      }));
    res.json(mapData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch map data' });
  }
});

router.get('/:id/public', async (req, res) => {
  try {
    const grievance = await getPublicGrievanceById(req.params.id);
    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }
    res.json(grievance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch public grievance' });
  }
});

// Admin only: permanently delete a grievance with its photos, timeline and evidence
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const deleted = await deleteGrievance(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Grievance not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete grievance' });
  }
});

module.exports = router;