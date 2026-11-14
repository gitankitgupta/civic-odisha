const express = require('express');
const router = express.Router();
const { getAllGrievances } = require('../repositories/grievanceRepo');
const { getAllProposals } = require('../repositories/budgetRepo');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/dashboard/stats', verifyToken, requireRole('admin', 'dept_staff'), async (req, res) => {
  try {
    const grievances = await getAllGrievances();
    const proposals = await getAllProposals();

    const statusCounts = {};
    const categoryCounts = {};

    grievances.forEach((g) => {
      statusCounts[g.status] = (statusCounts[g.status] || 0) + 1;
      categoryCounts[g.category] = (categoryCounts[g.category] || 0) + 1;
    });

    res.json({
      totalGrievances: grievances.length,
      statusCounts,
      categoryCounts,
      totalProposals: proposals.length,
      totalDuplicatesDetected: grievances.filter((g) => g.duplicateOf !== null).length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});
router.get('/analytics', verifyToken, requireRole('admin', 'dept_staff'), async (req, res) => {
  try {
    const grievances = await getAllGrievances();

    const statusCounts = {};
    const categoryCounts = {};
    const wardCounts = {};
    const dailyTrend = {};

    let overdueCount = 0;
    let totalResolutionHours = 0;
    let resolvedWithTimeCount = 0;

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    grievances.forEach((g) => {
      statusCounts[g.status] = (statusCounts[g.status] || 0) + 1;
      categoryCounts[g.category] = (categoryCounts[g.category] || 0) + 1;

      if (g.location?.wardId) {
        const wardKey = g.location.wardId;
        if (!wardCounts[wardKey]) {
          wardCounts[wardKey] = { wardId: wardKey, count: 0, lat: g.location.lat, lng: g.location.lng };
        }
        wardCounts[wardKey].count += 1;
      }

      if (g.slaStatus === 'overdue') {
        overdueCount += 1;
      }

      const createdDate = new Date(g.createdAt);
      if (createdDate >= thirtyDaysAgo) {
        const dayKey = createdDate.toISOString().split('T')[0];
        dailyTrend[dayKey] = (dailyTrend[dayKey] || 0) + 1;
      }

      if (g.status === 'resolved' && Array.isArray(g.auditTrail)) {
        const resolvedEvent = g.auditTrail.find((e) => e.action === 'status_changed_to_resolved');
        if (resolvedEvent) {
          const submittedTime = new Date(g.createdAt).getTime();
          const resolvedTime = new Date(resolvedEvent.timestamp).getTime();
          const hoursDiff = (resolvedTime - submittedTime) / (1000 * 60 * 60);
          if (hoursDiff >= 0) {
            totalResolutionHours += hoursDiff;
            resolvedWithTimeCount += 1;
          }
        }
      }
    });

    const totalGrievances = grievances.length;
    const resolvedCount = statusCounts['resolved'] || 0;
    const resolutionRate = totalGrievances > 0
      ? Math.round((resolvedCount / totalGrievances) * 100)
      : 0;

    const avgResolutionHours = resolvedWithTimeCount > 0
      ? Math.round(totalResolutionHours / resolvedWithTimeCount)
      : null;

    const sortedTrend = Object.entries(dailyTrend)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([date, count]) => ({ date, count }));

    const proposals = await getAllProposals();
    const totalVotesCast = proposals.reduce((sum, p) => sum + p.votes.up + p.votes.down, 0);
    const topProposals = [...proposals]
      .sort((a, b) => (b.votes.up - b.votes.down) - (a.votes.up - a.votes.down))
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        title: p.title,
        estimatedCost: p.estimatedCost,
        netVotes: p.votes.up - p.votes.down,
        totalVotes: p.votes.up + p.votes.down,
      }));

    res.json({
      totalGrievances,
      statusCounts,
      categoryCounts,
      resolutionRate,
      overdueCount,
      wardHotspots: Object.values(wardCounts).sort((a, b) => b.count - a.count),
      duplicateCount: grievances.filter((g) => g.duplicateOf !== null).length,
      avgResolutionHours,
      dailyTrend: sortedTrend,
      budgetInsights: {
        totalProposals: proposals.length,
        totalVotesCast,
        topProposals,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/queue', verifyToken, requireRole('admin', 'dept_staff'), async (req, res) => {
  try {
    const grievances = await getAllGrievances();
    const openQueue = grievances.filter((g) => g.status !== 'resolved' && g.status !== 'closed');
    res.json(openQueue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

module.exports = router;