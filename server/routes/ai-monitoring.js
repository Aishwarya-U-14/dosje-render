const express = require('express');
const { randomUUID } = require('crypto');
const uuid = () => randomUUID();
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

const ACTIVITY_LIBRARY = [
  'teaching', 'skill_training', 'beneficiary_counselling', 'meal_service', 'medical_check',
  'recreation', 'dancing', 'empty_room', 'crowd', 'staff_only', 'unknown_activity'
];

function expectedFor(inst) {
  const t = `${inst.type} ${inst.scheme} ${inst.name}`.toLowerCase();
  if (t.includes('skill') || t.includes('training')) return ['skill_training', 'teaching', 'beneficiary_counselling', 'staff_only'];
  if (t.includes('shelter') || t.includes('women')) return ['beneficiary_counselling', 'meal_service', 'recreation', 'medical_check', 'staff_only'];
  if (t.includes('old age') || t.includes('senior')) return ['medical_check', 'meal_service', 'recreation', 'beneficiary_counselling', 'staff_only'];
  if (t.includes('school') || t.includes('education')) return ['teaching', 'recreation', 'meal_service', 'counselling'];
  return ['teaching', 'beneficiary_counselling', 'meal_service', 'staff_only'];
}

function scanOne(data, institute, feed, requestedActivity) {
  const expected = expectedFor(institute);
  const activity = requestedActivity || ACTIVITY_LIBRARY[Math.floor(Math.random() * ACTIVITY_LIBRARY.length)];
  const unexpected = !expected.includes(activity);
  const recentReports = data.reports.filter(r => r.instituteId === institute.id && (Date.now() - new Date(r.createdAt).getTime()) < 7*86400000);
  const priorFlags = data.inspections.filter(i => i.instituteId === institute.id && (i.anomalyFlags || []).length).length;
  const corroboration = recentReports.length ? Math.min(25, recentReports.reduce((s,r)=>s+(r.aiAssessment?.priority||0),0)/10) : 0;
  const confidence = Math.round(Math.min(99, (unexpected ? 78 : 58) + corroboration * 0.45 + Math.min(12, priorFlags * 3)));
  const severity = unexpected ? (confidence >= 88 ? 'critical' : 'high') : (confidence >= 75 ? 'watch' : 'normal');

  const reasons = [];
  if (unexpected) reasons.push(`Observed '${activity.replace(/_/g,' ')}' is outside the expected activity profile`);
  else reasons.push(`Observed '${activity.replace(/_/g,' ')}' matches the expected profile`);
  if (recentReports.length) reasons.push(`${recentReports.length} recent community evidence signal(s) corroborate this location`);
  if (priorFlags) reasons.push(`${priorFlags} prior inspection(s) contain anomaly flags`);

  const event = {
    id: uuid(), instituteId: institute.id, instituteName: institute.name,
    feedId: feed?.id || null, cameraName: feed?.cameraName || 'Demo Camera',
    activity, expectedActivities: expected, unexpected, confidence, severity,
    reasons, status: unexpected ? 'suspect' : 'observed',
    createdAt: new Date().toISOString(), assignedInspectorId: null, assignedInspectorName: null,
    model: 'Context-Aware CCTV Activity Engine v1 (demo inference)'
  };
  data.aiEvents.unshift(event);
  if (unexpected) {
    const inspectors = data.users.filter(u => u.role === 'inspector');
    if (inspectors.length) {
      const inspector = inspectors[Math.floor(Math.random()*inspectors.length)];
      event.assignedInspectorId = inspector.id;
      event.assignedInspectorName = inspector.name;
      const inspection = {
        id: uuid(), instituteId: institute.id, instituteName: institute.name,
        type: 'ai_triggered', inspectorId: inspector.id, inspectorName: inspector.name,
        checklist: [], notes: `AI-triggered surprise inspection. CCTV detected ${activity.replace(/_/g,' ')} outside expected profile. Confidence ${confidence}%.`,
        status: 'pending', evidence: [], geoTag: null, score: null,
        anomalyFlags: ['CCTV_CONTEXT_MISMATCH'], scheduledFor: null,
        createdAt: new Date().toISOString(), submittedAt: null, aiEventId: event.id
      };
      data.inspections.push(inspection);
      event.inspectionId = inspection.id;
      // Proactive AI verification call: queue a call session immediately after a high-confidence mismatch.
      // In local/demo mode the browser voice agent can execute it; when TWILIO_* credentials are configured
      // the AI-call route can dial the institute contact.
      data.aiCalls = Array.isArray(data.aiCalls) ? data.aiCalls : [];
      const aiCall = {
        id: uuid(), instituteId: institute.id, instituteName: institute.name, targetName: institute.incharge,
        targetContact: institute.contact || '', channel: 'browser_voice_agent', status: 'queued', autoTriggered: true,
        triggerReason: event.reasons.join('; '), aiEventId: event.id, inspectionId: inspection.id,
        questions: [
          {id:'activity',text:'What activity is happening right now?'},
          {id:'attendance',text:'How many beneficiaries or participants are present?'},
          {id:'records',text:'Are attendance and daily records being maintained?'},
          {id:'cctv',text:'Is the CCTV system operational?'},
          {id:'issue',text:'Is there any issue the department should know about?'}
        ], answers: [], createdAt: new Date().toISOString(), result: null
      };
      data.aiCalls.unshift(aiCall); event.aiCallId = aiCall.id;
    }
  }
  data.activityLog.unshift({ id: uuid(), type: unexpected ? 'ai_suspect_escalated' : 'ai_activity_observed', ref: event.id, by: 'AI Monitor', at: new Date().toISOString() });
  return event;
}

router.get('/events', authRequired, (req,res) => {
  const data = db.load();
  res.json({ events: data.aiEvents.slice(0,100) });
});

router.get('/profiles', authRequired, (req,res) => {
  const data = db.load();
  res.json({ profiles: data.institutes.map(i => ({ instituteId:i.id, instituteName:i.name, type:i.type, scheme:i.scheme, expectedActivities:expectedFor(i) })) });
});

// Demo scan: can be driven by a real camera integration later. The input activity lets the demo reproduce a vision result deterministically.
router.post('/scan', authRequired, requireRole('admin','pmu','authority','inspector'), (req,res) => {
  const data = db.load();
  const { instituteId, feedId, activity } = req.body;
  const institute = data.institutes.find(i => i.id === instituteId) || data.institutes[0];
  if (!institute) return res.status(400).json({ error:'No institute available' });
  const feed = data.cctvFeeds.find(f => f.id === feedId);
  const event = scanOne(data, institute, feed, activity);
  db.save(data);
  res.status(201).json({ event });
});

router.patch('/events/:id', authRequired, requireRole('admin','pmu','authority'), (req,res) => {
  const data = db.load();
  const event = data.aiEvents.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({error:'AI event not found'});
  if (req.body.status) event.status = req.body.status;
  if (req.body.actionNote) event.actionNote = req.body.actionNote;
  event.updatedAt = new Date().toISOString();
  db.save(data);
  res.json({ event });
});

module.exports = router;
