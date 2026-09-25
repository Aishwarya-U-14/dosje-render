const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { randomUUID } = require('crypto');
const uuid = () => randomUUID();
const fsRead = filePath => require('fs').readFileSync(filePath);
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuid()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

// GET /api/inspections — list (filterable by institute, status, inspector)
router.get('/', authRequired, (req, res) => {
  const data = db.load();
  let list = data.inspections;
  const { institute, status, inspector } = req.query;
  if (institute) list = list.filter(i => i.instituteId === institute);
  if (status) list = list.filter(i => i.status === status);
  if (inspector) list = list.filter(i => i.inspectorId === inspector);
  // Inspectors only see their own by default unless explicit query given
  if (req.user.role === 'inspector' && !inspector) {
    list = list.filter(i => i.inspectorId === req.user.id);
  }
  res.json({ inspections: list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
});

// POST /api/inspections — create a new inspection record (scheduled or surprise)
router.post('/', authRequired, requireRole('admin', 'pmu', 'inspector'), (req, res) => {
  const { instituteId, type, inspectorId, checklist, notes, scheduledFor } = req.body;
  if (!instituteId || !type) return res.status(400).json({ error: 'instituteId and type are required' });
  const data = db.load();
  const inst = data.institutes.find(i => i.id === instituteId);
  if (!inst) return res.status(404).json({ error: 'Institute not found' });

  const inspection = {
    id: uuid(),
    instituteId,
    instituteName: inst.name,
    type, // 'surprise' | 'scheduled' | 'random'
    inspectorId: inspectorId || req.user.id,
    inspectorName: req.user.name,
    checklist: checklist || [],
    notes: notes || '',
    status: 'pending', // pending -> in_progress -> submitted -> reviewed
    evidence: [],
    geoTag: null,
    score: null,
    anomalyFlags: [],
    scheduledFor: scheduledFor || null,
    createdAt: new Date().toISOString(),
    submittedAt: null
  };
  data.inspections.push(inspection);
  data.activityLog.push({ id: uuid(), type: 'inspection_created', ref: inspection.id, by: req.user.name, at: new Date().toISOString() });
  db.save(data);
  res.status(201).json({ inspection });
});

// POST /api/inspections/:id/submit — submit findings with geo-tag + checklist results
router.post('/:id/submit', authRequired, (req, res) => {
  const { geoTag, checklist, notes, score } = req.body;
  const data = db.load();
  const insp = data.inspections.find(i => i.id === req.params.id);
  if (!insp) return res.status(404).json({ error: 'Inspection not found' });

  if (geoTag && typeof geoTag.lat === 'number' && typeof geoTag.lng === 'number') {
    insp.geoTag = { lat: geoTag.lat, lng: geoTag.lng, capturedAt: new Date().toISOString() };
  }
  if (checklist) insp.checklist = checklist;
  if (notes) insp.notes = notes;
  if (typeof score === 'number') insp.score = score;
  insp.status = 'submitted';
  insp.submittedAt = new Date().toISOString();

  // Simple rule-based anomaly detection (stand-in for AI analytics)
  insp.anomalyFlags = [];
  if (!insp.geoTag) insp.anomalyFlags.push('NO_GEO_TAG');
  if (insp.evidence.length === 0) insp.anomalyFlags.push('NO_EVIDENCE_CAPTURED');
  if (typeof insp.score === 'number' && insp.score < 40) insp.anomalyFlags.push('LOW_COMPLIANCE_SCORE');
  const failedItems = (insp.checklist || []).filter(c => c.result === 'fail').length;
  if (failedItems >= 3) insp.anomalyFlags.push('MULTIPLE_CHECKLIST_FAILURES');

  data.activityLog.push({ id: uuid(), type: 'inspection_submitted', ref: insp.id, by: req.user.name, at: new Date().toISOString() });
  db.save(data);
  res.json({ inspection: insp });
});

// POST /api/inspections/:id/evidence — upload geo-tagged photo/video evidence
router.post('/:id/evidence', authRequired, upload.single('file'), (req, res) => {
  const data = db.load();
  const insp = data.inspections.find(i => i.id === req.params.id);
  if (!insp) return res.status(404).json({ error: 'Inspection not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded (field name must be "file")' });

  const { lat, lng } = req.body;
  const fileHash = crypto.createHash('sha256').update(fsRead(req.file.path)).digest('hex');
  const evidence = {
    id: uuid(),
    filename: req.file.filename,
    originalName: req.file.originalname,
    url: `/uploads/${req.file.filename}`,
    lat: lat ? parseFloat(lat) : null,
    lng: lng ? parseFloat(lng) : null,
    uploadedAt: new Date().toISOString(),
    sha256: fileHash
  };
  insp.evidence.push(evidence);
  db.save(data);
  res.status(201).json({ evidence });
});

// PATCH /api/inspections/:id — review / status update (PMU/admin)
router.patch('/:id', authRequired, requireRole('admin', 'pmu', 'authority'), (req, res) => {
  const data = db.load();
  const insp = data.inspections.find(i => i.id === req.params.id);
  if (!insp) return res.status(404).json({ error: 'Inspection not found' });
  const { status, reviewNotes } = req.body;
  if (status) insp.status = status;
  if (reviewNotes) insp.reviewNotes = reviewNotes;
  db.save(data);
  res.json({ inspection: insp });
});

module.exports = router;
