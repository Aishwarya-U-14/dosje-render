const express = require('express');
const multer = require('multer');
const path = require('path');
const { randomUUID } = require('crypto');
const uuid = () => randomUUID();
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public lightweight institute selector for the no-login evidence channel.
router.get('/options', (req, res) => {
  const data = db.load();
  res.json({ institutes: data.institutes.map(i => ({ id: i.id, name: i.name, type: i.type, district: i.district })) });
});
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname) || '.jpg'}`)
});
const upload = multer({ storage, limits: { fileSize: 12 * 1024 * 1024 } });

// Public citizen/staff evidence report. Login is intentionally NOT required.
router.post('/', upload.single('file'), (req, res) => {
  const { instituteId, title, description, category, reporterName, reporterContact, lat, lng, annotation } = req.body;
  if (!instituteId || !description) return res.status(400).json({ error: 'instituteId and description are required' });
  const data = db.load();
  const inst = data.institutes.find(i => i.id === instituteId);
  if (!inst) return res.status(404).json({ error: 'Institute not found' });

  const report = {
    id: uuid(),
    instituteId,
    instituteName: inst.name,
    title: title || 'Community observation',
    description,
    category: category || 'general',
    reporterName: reporterName || 'Anonymous reporter',
    reporterContact: reporterContact || '',
    geoTag: (lat && lng) ? { lat: Number(lat), lng: Number(lng), capturedAt: new Date().toISOString() } : null,
    annotation: annotation ? JSON.parse(annotation) : null,
    evidence: req.file ? { filename: req.file.filename, originalName: req.file.originalname, url: `/uploads/${req.file.filename}` } : null,
    status: 'new',
    aiAssessment: null,
    createdAt: new Date().toISOString()
  };

  // Context-aware triage: the report itself becomes an evidence signal for the AI engine.
  const keywords = `${report.title} ${report.description} ${report.category}`.toLowerCase();
  const high = ['fake', 'closed', 'absent', 'cctv', 'unsafe', 'misuse', 'proxy', 'no class', 'no training', 'fraud'];
  const medium = ['crowd', 'late', 'maintenance', 'delay', 'shortage', 'not working'];
  const highHit = high.find(k => keywords.includes(k));
  const medHit = medium.find(k => keywords.includes(k));
  const priority = highHit ? 88 : medHit ? 62 : 35;
  report.aiAssessment = {
    priority,
    level: priority >= 80 ? 'critical' : priority >= 55 ? 'watch' : 'informational',
    reason: highHit ? `Matched high-risk indicator: ${highHit}` : medHit ? `Matched monitoring indicator: ${medHit}` : 'No high-risk keyword; retained for corroboration',
    recommendedAction: priority >= 80 ? 'Cross-check CCTV and trigger surprise inspection' : 'Corroborate with CCTV / inspection history',
    model: 'Context-Aware Triage v1 (demo inference)'
  };

  data.reports.push(report);
  data.activityLog.unshift({ id: uuid(), type: 'citizen_report_received', ref: report.id, by: report.reporterName, at: new Date().toISOString() });
  db.save(data);
  res.status(201).json({ report });
});

router.get('/', authRequired, (req, res) => {
  const data = db.load();
  let reports = [...data.reports];
  if (req.query.status) reports = reports.filter(r => r.status === req.query.status);
  if (req.query.institute) reports = reports.filter(r => r.instituteId === req.query.institute);
  reports.sort((a,b) => (b.aiAssessment?.priority || 0) - (a.aiAssessment?.priority || 0) || new Date(b.createdAt)-new Date(a.createdAt));
  res.json({ reports });
});

router.patch('/:id', authRequired, requireRole('admin', 'pmu', 'authority'), (req, res) => {
  const data = db.load();
  const report = data.reports.find(r => r.id === req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  const { status, actionNote } = req.body;
  if (status) report.status = status;
  if (actionNote) report.actionNote = actionNote;
  report.updatedAt = new Date().toISOString();
  data.activityLog.unshift({ id: uuid(), type: 'citizen_report_updated', ref: report.id, by: req.user.name, at: new Date().toISOString() });
  db.save(data);
  res.json({ report });
});

module.exports = router;
