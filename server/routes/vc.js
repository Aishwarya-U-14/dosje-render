const express = require('express');
const { randomUUID } = require('crypto');
const uuid = () => randomUUID();
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/vc
router.get('/', authRequired, (req, res) => {
  const data = db.load();
  res.json({ sessions: data.vcSessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
});

// POST /api/vc/random — randomly pick an institute + a participant type (incharge/staff/beneficiary)
// and generate a call session record. In production, plug this into an actual video SDK
// (e.g. Twilio, Daily.co, Jitsi, Zoom API) — this creates the session + a Jitsi meeting link
// (meet.jit.si rooms are free/anonymous and need no API key), so it is genuinely joinable.
router.post('/random', authRequired, requireRole('admin', 'pmu', 'authority', 'inspector'), (req, res) => {
  const { district } = req.body;
  const data = db.load();
  let institutes = data.institutes.filter(i => i.status === 'active');
  if (district) institutes = institutes.filter(i => i.district === district);
  if (institutes.length === 0) return res.status(400).json({ error: 'No active institutes match the criteria' });

  const institute = institutes[Math.floor(Math.random() * institutes.length)];
  const participantTypes = ['Project Incharge', 'Staff', 'Beneficiary'];
  const participantType = participantTypes[Math.floor(Math.random() * participantTypes.length)];

  const roomName = `dosje-${institute.id.slice(0, 8)}-${Date.now()}`;
  const session = {
    id: uuid(),
    instituteId: institute.id,
    instituteName: institute.name,
    participantType,
    roomName,
    meetingLink: `https://meet.jit.si/${roomName}`,
    status: 'scheduled',
    initiatedBy: req.user.name,
    createdAt: new Date().toISOString()
  };
  data.vcSessions.push(session);
  data.activityLog.push({ id: uuid(), type: 'vc_scheduled', ref: session.id, by: req.user.name, at: new Date().toISOString() });
  db.save(data);
  res.status(201).json({ session });
});

// PATCH /api/vc/:id — mark completed / add notes / attendance outcome
router.patch('/:id', authRequired, requireRole('admin', 'pmu', 'authority', 'inspector'), (req, res) => {
  const data = db.load();
  const session = data.vcSessions.find(s => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'VC session not found' });
  const { status, outcomeNotes, attendancePresent } = req.body;
  if (status) session.status = status;
  if (outcomeNotes) session.outcomeNotes = outcomeNotes;
  if (typeof attendancePresent === 'boolean') session.attendancePresent = attendancePresent;
  db.save(data);
  res.json({ session });
});

module.exports = router;
