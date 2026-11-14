const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getAllProposals,
  getProposalById,
  createProposal,
  voteOnProposal,
} = require('../repositories/budgetRepo');

router.get('/', async (req, res) => {
  try {
    const proposals = await getAllProposals();
    res.json(proposals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const proposal = await getProposalById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    res.json(proposal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch proposal' });
  }
});

router.post('/', async (req, res) => {
  try {
    const proposal = await createProposal(req.body);
    res.status(201).json(proposal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create proposal' });
  }
});

router.post('/:id/vote', async (req, res) => {
  try {
    const { voterId, voteType } = req.body;
    const result = await voteOnProposal(req.params.id, voterId, voteType);

    if (!result) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    if (result.error === 'already_voted') {
      return res.status(400).json({ error: 'You have already voted on this proposal' });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

router.post('/generate-draft', verifyToken, requireRole('admin', 'dept_staff'), async (req, res) => {
  try {
    const { category, wardId } = req.body;

    if (!category || !wardId) {
      return res.status(400).json({ error: 'category and wardId are required' });
    }

    const grievancesRes = await pool.query(
      `SELECT id, title, ward_id FROM grievances
       WHERE category = $1 AND ward_id = $2 AND status != 'resolved'`,
      [category, wardId]
    );

    const matched = grievancesRes.rows;

    if (matched.length < 3) {
      return res.status(400).json({
        error: `Not enough grievances to generate a draft (found ${matched.length}, need at least 3)`,
      });
    }

    const grievanceIds = matched.map((g) => g.id);

    const draftProposal = {
      title: `${category.charAt(0).toUpperCase() + category.slice(1)} repair package — Ward ${wardId}`,
      description: `Auto-drafted from ${matched.length} repeated ${category} grievances in Ward ${wardId}. Review and edit before publishing for community voting.`,
      estimatedCost: matched.length * 25000,
      wardId,
      sourceGrievanceIds: grievanceIds,
    };

    res.json({ draft: draftProposal, matchedCount: matched.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate draft proposal' });
  }
});
module.exports = router;