const express = require('express');
const { randomUUID } = require('crypto');
const uuid = () => randomUUID();
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/cctv — list registered feeds
router.get('/', authRequired, (req, res) => {
  const data = db.load();
  res.json({ feeds: data.cctvFeeds });
});

// POST /api/cctv — register a live feed for an institute.
// streamUrl should be an HLS (.m3u8) or embeddable player URL from the institute's CCTV/NVR system.
// Most commercial DVR/NVR systems (Hikvision, CP Plus, Dahua) can expose an RTSP stream which you
// convert to HLS with a media server (e.g. free/open-source "MediaMTX") to embed in a browser/app.
router.post('/', authRequired, requireRole('admin', 'authority'), (req, res) => {
  const { instituteId, cameraName, streamUrl } = req.body;
  if (!instituteId || !streamUrl) return res.status(400).json({ error: 'instituteId and streamUrl are required' });
  const data = db.load();
  const inst = data.institutes.find(i => i.id === instituteId);
  if (!inst) return res.status(404).json({ error: 'Institute not found' });

  const feed = {
    id: uuid(),
    instituteId,
    instituteName: inst.name,
    cameraName: cameraName || 'Camera 1',
    streamUrl,
    status: 'online',
    registeredAt: new Date().toISOString(),
    lastPinged: new Date().toISOString()
  };
  data.cctvFeeds.push(feed);
  db.save(data);
  res.status(201).json({ feed });
});

// PATCH /api/cctv/:id — update status (online/offline) e.g. from a heartbeat/health-check job
router.patch('/:id', authRequired, requireRole('admin', 'authority'), (req, res) => {
  const data = db.load();
  const feed = data.cctvFeeds.find(f => f.id === req.params.id);
  if (!feed) return res.status(404).json({ error: 'Feed not found' });
  const { status, streamUrl } = req.body;
  if (status) feed.status = status;
  if (streamUrl) feed.streamUrl = streamUrl;
  feed.lastPinged = new Date().toISOString();
  db.save(data);
  res.json({ feed });
});

// DELETE /api/cctv/:id
router.delete('/:id', authRequired, requireRole('admin'), (req, res) => {
  const data = db.load();
  data.cctvFeeds = data.cctvFeeds.filter(f => f.id !== req.params.id);
  db.save(data);
  res.json({ success: true });
});

module.exports = router;
