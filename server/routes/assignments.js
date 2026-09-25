const express = require('express');
const { randomUUID } = require('crypto');
const uuid = () => randomUUID();
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

function pickRandom(arr, n) {
  const pool = [...arr];
  const picked = [];
  while (pool.length && picked.length < n) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

// GET /api/assignments
router.get('/', authRequired, (req, res) => {
  const data = db.load();
  let assignments = data.assignments;
  if (req.user.role === 'inspector') assignments = assignments.filter(a => a.inspectorId === req.user.id);
  res.json({ assignments: assignments.sort((a, b) => new Date(b.createdAt || b.assignedAt) - new Date(a.createdAt || a.assignedAt)) });
});

router.get('/eligible', authRequired, requireRole('authority','admin','pmu'), (req,res) => {
  const data=db.load();
  const inst=data.institutes.find(i=>i.id===req.query.instituteId);
  if(!inst) return res.status(404).json({error:'Institute not found'});
  const officers=data.users.filter(u=>u.role==='inspector' && u.nativeDistrict && u.nativeDistrict.toLowerCase()!==String(inst.district||'').toLowerCase());
  res.json({institute:{id:inst.id,name:inst.name,district:inst.district},officers:officers.map(o=>({id:o.id,name:o.name,nativeDistrict:o.nativeDistrict}))});
});

router.post('/assign', authRequired, requireRole('authority','admin','pmu'), (req,res) => {
  const { instituteId, inspectorId, type='surprise' }=req.body; const data=db.load();
  const inst=data.institutes.find(i=>i.id===instituteId); const inspector=data.users.find(u=>u.id===inspectorId && u.role==='inspector');
  if(!inst) return res.status(404).json({error:'Institute not found'});
  if(!inspector) return res.status(404).json({error:'Inspection officer not found'});
  if(!inspector.nativeDistrict || inspector.nativeDistrict.toLowerCase()===String(inst.district||'').toLowerCase()) return res.status(400).json({error:'Officer cannot be assigned: native district matches institute district'});
  const assignment={id:uuid(),instituteId:inst.id,instituteName:inst.name,inspectorId:inspector.id,inspectorName:inspector.name,type,status:'assigned',assignedAt:new Date().toISOString(),createdAt:new Date().toISOString(),method:'higher_official_manual',nonNativeVerified:true,nativeDistrict:inspector.nativeDistrict};
  data.assignments.push(assignment);
  const inspection={id:uuid(),instituteId:inst.id,instituteName:inst.name,type,inspectorId:inspector.id,inspectorName:inspector.name,checklist:[],notes:'Assigned by Higher Official after non-native officer verification',status:'pending',evidence:[],geoTag:null,score:null,anomalyFlags:[],scheduledFor:null,assignmentId:assignment.id,createdAt:new Date().toISOString(),submittedAt:null};
  data.inspections.push(inspection);
  data.activityLog.unshift({id:uuid(),type:'inspection_officer_assigned',ref:assignment.id,by:req.user.name,at:new Date().toISOString()});
  db.save(data); res.status(201).json({assignment,inspection});
});

// POST /api/assignments/random
// Body: { count, district (optional), type (optional) }
// Randomly pairs available inspectors with institutes and auto-creates inspection tasks.
router.post('/random', authRequired, requireRole('admin', 'pmu'), (req, res) => {
  const { count = 1, district, type = 'surprise' } = req.body;
  const data = db.load();

  let institutes = data.institutes.filter(i => i.status === 'active');
  if (district) institutes = institutes.filter(i => i.district === district);
  const inspectors = data.users.filter(u => u.role === 'inspector');

  if (institutes.length === 0) return res.status(400).json({ error: 'No active institutes match the criteria' });
  if (inspectors.length === 0) return res.status(400).json({ error: 'No inspectors registered in the system' });

  const targets = pickRandom(institutes, Math.min(count, institutes.length));
  const created = [];

  for (const inst of targets) {
    const eligible = inspectors.filter(o => o.nativeDistrict && String(o.nativeDistrict).toLowerCase() !== String(inst.district || '').toLowerCase());
    if (!eligible.length) continue;
    const inspector = eligible[Math.floor(Math.random() * eligible.length)];
    const assignment = {
      id: uuid(),
      instituteId: inst.id,
      instituteName: inst.name,
      inspectorId: inspector.id,
      inspectorName: inspector.name,
      type,
      status: 'assigned',
      assignedAt: new Date().toISOString(),
      method: 'random_automated', nonNativeVerified: true, nativeDistrict: inspector.nativeDistrict
    };
    data.assignments.push(assignment);

    const inspection = {
      id: uuid(),
      instituteId: inst.id,
      instituteName: inst.name,
      type,
      inspectorId: inspector.id,
      inspectorName: inspector.name,
      checklist: [],
      notes: 'Auto-generated via random assignment engine',
      status: 'pending',
      evidence: [],
      geoTag: null,
      score: null,
      anomalyFlags: [],
      scheduledFor: null,
      assignmentId: assignment.id,
      createdAt: new Date().toISOString(),
      submittedAt: null
    };
    data.inspections.push(inspection);
    created.push({ assignment, inspection });
  }

  if (!created.length) return res.status(400).json({ error: 'No eligible non-native inspection officer is available for the selected institutes' });

  data.activityLog.push({
    id: uuid(),
    type: 'random_assignment_run',
    by: req.user.name,
    count: targets.length,
    at: new Date().toISOString()
  });

  db.save(data);
  res.status(201).json({ created });
});

module.exports = router;
