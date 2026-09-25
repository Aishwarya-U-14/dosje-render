const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const router = express.Router();

router.get('/live', authRequired, (req,res) => {
  const data = db.load();
  const recentInspections = [...data.inspections].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,8);
  const recentActivity = [...data.activityLog].sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,12);
  const upcomingVC = [...data.vcSessions].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5);
  const aiSuspects = data.aiEvents.filter(e=>['suspect','escalated'].includes(e.status)).length;
  const reports = data.reports.filter(r=>r.status==='new').length;
  res.json({
    counts: {
      institutes:data.institutes.length,
      pendingInspections:data.inspections.filter(i=>['pending','in_progress'].includes(i.status)).length,
      cctvOnline:data.cctvFeeds.filter(f=>f.status==='online').length,
      inspectors:data.users.filter(u=>u.role==='inspector').length,
      aiSuspects, communityReports:reports
    },
    recentInspections, recentActivity, upcomingVC,
    topSuspects:data.aiEvents.slice(0,5)
  });
});
module.exports = router;
