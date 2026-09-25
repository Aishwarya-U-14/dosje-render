const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// GET /api/analytics/summary — anomaly + attendance style analytics (rule-based stand-in for AI model)
router.get('/summary', authRequired, (req, res) => {
  const data = db.load();
  const { inspections, vcSessions, institutes, cctvFeeds } = data;

  const totalInspections = inspections.length;
  const submitted = inspections.filter(i => i.status === 'submitted' || i.status === 'reviewed').length;
  const pending = inspections.filter(i => i.status === 'pending' || i.status === 'in_progress').length;
  const flagged = inspections.filter(i => (i.anomalyFlags || []).length > 0);

  const anomalyCounts = {};
  flagged.forEach(i => (i.anomalyFlags || []).forEach(f => { anomalyCounts[f] = (anomalyCounts[f] || 0) + 1; }));

  const avgScore = (() => {
    const scored = inspections.filter(i => typeof i.score === 'number');
    if (!scored.length) return null;
    return Math.round(scored.reduce((s, i) => s + i.score, 0) / scored.length);
  })();

  const vcTotal = vcSessions.length;
  const vcCompleted = vcSessions.filter(s => s.status === 'completed').length;
  const vcAbsent = vcSessions.filter(s => s.attendancePresent === false).length;

  // Per-institute risk scoring: more anomaly flags + low avg score => higher risk
  const byInstitute = {};
  inspections.forEach(i => {
    if (!byInstitute[i.instituteId]) {
      byInstitute[i.instituteId] = { instituteId: i.instituteId, instituteName: i.instituteName, inspections: 0, flags: 0, scores: [] };
    }
    const rec = byInstitute[i.instituteId];
    rec.inspections += 1;
    rec.flags += (i.anomalyFlags || []).length;
    if (typeof i.score === 'number') rec.scores.push(i.score);
  });
  const riskRanking = Object.values(byInstitute).map(r => {
    const avg = r.scores.length ? r.scores.reduce((a, b) => a + b, 0) / r.scores.length : 100;
    const riskScore = Math.max(0, Math.min(100, r.flags * 15 + (100 - avg) * 0.5));
    return { ...r, avgScore: Math.round(avg), riskScore: Math.round(riskScore) };
  }).sort((a, b) => b.riskScore - a.riskScore);

  res.json({
    totals: {
      institutes: institutes.length,
      cctvFeedsOnline: cctvFeeds.filter(f => f.status === 'online').length,
      cctvFeedsTotal: cctvFeeds.length,
      totalInspections,
      submitted,
      pending,
      flaggedCount: flagged.length,
      avgComplianceScore: avgScore,
      vcTotal,
      vcCompleted,
      vcAbsent
    },
    anomalyCounts,
    riskRanking: riskRanking.slice(0, 10)
  });
});

module.exports = router;
