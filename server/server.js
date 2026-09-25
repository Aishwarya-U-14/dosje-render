const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const instituteRoutes = require('./routes/institutes');
const inspectionRoutes = require('./routes/inspections');
const assignmentRoutes = require('./routes/assignments');
const vcRoutes = require('./routes/vc');
const cctvRoutes = require('./routes/cctv');
const analyticsRoutes = require('./routes/analytics');
const dashboardRoutes = require('./routes/dashboard');
const reportRoutes = require('./routes/reports');
const aiMonitoringRoutes = require('./routes/ai-monitoring');
const aiCallRoutes = require('./routes/ai-calls');
const mapRoutes = require('./routes/map');
const fieldOpsRoutes = require('./routes/field-ops');
const integrationRoutes = require('./routes/integrations');

const app = express();
const http = require('http');
const { Server } = require('socket.io');
const PORT = process.env.PORT || 4000;

// Ensure required folders exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/institutes', instituteRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/vc', vcRoutes);
app.use('/api/cctv', cctvRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai-monitoring', aiMonitoringRoutes);
app.use('/api/ai-calls', aiCallRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/field-ops', fieldOpsRoutes);
app.use('/api/integrations', integrationRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Serve the frontend (single-page app, no build step)
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
io.on('connection', socket => {
  socket.on('join-call', room => { socket.join(String(room)); socket.to(String(room)).emit('peer-joined', { peerId: socket.id }); });
  socket.on('webrtc-offer', ({ room, offer }) => socket.to(String(room)).emit('webrtc-offer', { offer, peerId: socket.id }));
  socket.on('webrtc-answer', ({ room, answer }) => socket.to(String(room)).emit('webrtc-answer', { answer, peerId: socket.id }));
  socket.on('ice-candidate', ({ room, candidate }) => socket.to(String(room)).emit('ice-candidate', { candidate, peerId: socket.id }));
  socket.on('leave-call', room => { socket.leave(String(room)); socket.to(String(room)).emit('peer-left', { peerId: socket.id }); });
});

httpServer.listen(PORT, () => {
  console.log(`\n DoSJE Monitoring & Inspection System backend running`);
  console.log(` Local:  http://localhost:${PORT}`);
  console.log(` API health check: http://localhost:${PORT}/api/health\n`);
});
