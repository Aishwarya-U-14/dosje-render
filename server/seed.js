// Seed script — creates demo login accounts and sample institutes so you can explore
// the app immediately. Run with: npm run seed
const { randomUUID } = require('crypto');
const uuid = () => randomUUID();
const db = require('./db');
const { hashPassword } = require('./utils/password');

const data = db.load();
// Keep the demo surface to three roles: beneficiary, inspection officer, higher official.
const hiddenDemoEmails = new Set(['admin@dosje.gov.in','pmu@dosje.gov.in','ngo@dosje.gov.in','authority@dosje.gov.in']);
data.users = data.users.filter(u => !hiddenDemoEmails.has(u.email));
for (const k of ['aiCalls','fieldJobs','fieldSubmissions']) if (!Array.isArray(data[k])) data[k] = [];

function upsertUser({ name, email, password, role, institute, nativeDistrict }) {
  let user = data.users.find(u => u.email === email);
  if (user) { user.name=name; user.role=role; user.passwordHash=hashPassword(password); if(nativeDistrict) user.nativeDistrict=nativeDistrict; return user; }
  user = {
    id: uuid(),
    name,
    email,
    passwordHash: hashPassword(password),
    role,
    institute: institute || null,
    createdAt: new Date().toISOString()
  };
  data.users.push(user);
  return user;
}

const beneficiary = upsertUser({ name: 'Beneficiary Demo User', email: 'beneficiary@dosje.gov.in', password: 'Beneficiary@123', role: 'ngo' });
const insp1 = upsertUser({ name: 'Inspector Rakesh Kumar', email: 'inspector1@dosje.gov.in', password: 'Insp@123', role: 'inspector', nativeDistrict: 'Bhopal' });
const insp2 = upsertUser({ name: 'Inspector Sunita Devi', email: 'inspector2@dosje.gov.in', password: 'Insp@456', role: 'inspector', nativeDistrict: 'Indore' });
const insp3 = upsertUser({ name: 'Inspector Arjun Singh', email: 'inspector3@dosje.gov.in', password: 'Insp@789', role: 'inspector', nativeDistrict: 'Gwalior' });
const authority = upsertUser({ name: 'Higher Official', email: 'official@dosje.gov.in', password: 'Official@123', role: 'authority' });

function upsertInstitute(inst) {
  let existing = data.institutes.find(i => i.name === inst.name);
  if (existing) return existing;
  const record = { id: uuid(), status: 'active', createdAt: new Date().toISOString(), ...inst };
  data.institutes.push(record);
  return record;
}

const i1 = upsertInstitute({ name: 'Asha Kiran Shelter Home', type: 'NGO', district: 'Bhopal', scheme: 'Shelter for Destitute Women', address: 'MP Nagar, Bhopal', lat: 23.2599, lng: 77.4126, incharge: 'Mrs. Kavita Sharma', contact: '9876500001' });
const i2 = upsertInstitute({ name: 'Divya Jyoti Skill Training Institute', type: 'Institute', district: 'Indore', scheme: 'Skill Development for SC/ST Youth', address: 'Vijay Nagar, Indore', lat: 22.7196, lng: 75.8577, incharge: 'Mr. Anil Verma', contact: '9876500002' });
const i3 = upsertInstitute({ name: 'Sahara Old Age Care Project', type: 'Project', district: 'Gwalior', scheme: 'Senior Citizen Welfare', address: 'City Centre, Gwalior', lat: 26.2183, lng: 78.1828, incharge: 'Mrs. Rina Joshi', contact: '9876500003' });
const i4 = upsertInstitute({ name: 'Umang Institute for Differently Abled', type: 'Institute', district: 'Jabalpur', scheme: 'Disability Empowerment Scheme', address: 'Napier Town, Jabalpur', lat: 23.1815, lng: 79.9864, incharge: 'Mr. Suresh Patel', contact: '9876500004' });


const i5 = upsertInstitute({ name: 'Saksham Tribal Residential Centre', type: 'Project', district: 'Jabalpur', scheme: 'Tribal Welfare Residential Support', address: 'Civil Lines, Jabalpur', lat: 23.1810, lng: 79.9869, incharge: 'Ms. Meena Yadav', contact: '9876500005' });
const i6 = upsertInstitute({ name: 'Udaan Community Education Hub', type: 'NGO', district: 'Bhopal', scheme: 'Community Education & Inclusion', address: 'Arera Colony, Bhopal', lat: 23.2084, lng: 77.4347, incharge: 'Mr. Rahul Singh', contact: '9876500006' });

function upsertFeed({ institute, cameraName, video, observedActivity, expectedLabel }) {
  let feed = data.cctvFeeds.find(f => f.cameraName === cameraName && f.instituteId === institute.id);
  if (!feed) {
    feed = { id: uuid(), instituteId: institute.id, instituteName: institute.name, cameraName, streamUrl: '', status: 'online', registeredAt: new Date().toISOString(), lastPinged: new Date().toISOString() };
    data.cctvFeeds.push(feed);
  }
  Object.assign(feed, { demoVideoUrl: video, demoMode: true, observedActivity, expectedLabel, lastPinged: new Date().toISOString() });
  return feed;
}

upsertFeed({ institute: i2, cameraName: 'Camera 01 - Training Hall', video: 'https://videos.pexels.com/video-files/5762413/5762413-uhd_3840_2160_24fps.mp4', observedActivity: 'teaching', expectedLabel: 'Teaching / Skill training' });
upsertFeed({ institute: i2, cameraName: 'Camera 02 - Activity Hall', video: 'https://videos.pexels.com/video-files/8775626/8775626-uhd_3840_2160_25fps.mp4', observedActivity: 'dancing', expectedLabel: 'Teaching / Skill training' });
upsertFeed({ institute: i1, cameraName: 'Camera 03 - Dormitory Hall', video: 'https://videos.pexels.com/video-files/5734745/5734745-uhd_2560_1080_30fps.mp4', observedActivity: 'empty_room', expectedLabel: 'Counselling / Meal service / Recreation' });
upsertFeed({ institute: i3, cameraName: 'Camera 04 - Common Hall', video: 'https://videos.pexels.com/video-files/852107/852107-hd_1920_1080_30fps.mp4', observedActivity: 'crowd', expectedLabel: 'Medical check / Meal service / Recreation' });
upsertFeed({ institute: i4, cameraName: 'Camera 05 - Service Desk', video: 'https://videos.pexels.com/video-files/8465135/8465135-uhd_4096_2160_25fps.mp4', observedActivity: 'staff_only', expectedLabel: 'Beneficiary counselling / Service delivery' });


// Seed a small amount of historical operational data so the dashboard is not empty during the demo.
if (data.inspections.length === 0) {
  data.inspections.push(
    { id: uuid(), instituteId: i1.id, instituteName: i1.name, type: 'scheduled', inspectorId: insp1.id, inspectorName: insp1.name, checklist: ['attendance','records','safety'], notes: 'Routine shelter inspection completed.', status: 'submitted', evidence: [], geoTag: {lat:i1.lat,lng:i1.lng}, score: 92, anomalyFlags: [], scheduledFor: null, createdAt: new Date(Date.now()-5*86400000).toISOString(), submittedAt: new Date(Date.now()-5*86400000+3600000).toISOString() },
    { id: uuid(), instituteId: i2.id, instituteName: i2.name, type: 'surprise', inspectorId: insp2.id, inspectorName: insp2.name, checklist: ['attendance','training','CCTV'], notes: 'Attendance discrepancy observed during surprise visit.', status: 'reviewed', evidence: [], geoTag: {lat:i2.lat,lng:i2.lng}, score: 68, anomalyFlags: ['ATTENDANCE_MISMATCH'], scheduledFor: null, createdAt: new Date(Date.now()-3*86400000).toISOString(), submittedAt: new Date(Date.now()-3*86400000+5400000).toISOString() },
    { id: uuid(), instituteId: i3.id, instituteName: i3.name, type: 'scheduled', inspectorId: insp1.id, inspectorName: insp1.name, checklist: ['medical','meal service','beneficiary welfare'], notes: 'Pending follow-up on staffing documentation.', status: 'pending', evidence: [], geoTag: null, score: null, anomalyFlags: ['STAFF_DOCUMENTATION'], scheduledFor: new Date(Date.now()+86400000).toISOString(), createdAt: new Date(Date.now()-86400000).toISOString(), submittedAt: null }
  );
}
if (data.reports.length === 0) {
  const mkReport = (inst,title,description,category,priority) => ({ id:uuid(), instituteId:inst.id, instituteName:inst.name, title, description, category, reporterName:'Community Reporter', reporterContact:'', geoTag:{lat:inst.lat,lng:inst.lng,capturedAt:new Date(Date.now()-3600000).toISOString()}, annotation:{x:240,y:130,radius:70}, evidence:null, status:'new', aiAssessment:{priority,level:priority>=80?'critical':'watch',reason:'Demo seed evidence for corroboration',recommendedAction:'Cross-check CCTV and inspection history',model:'Context-Aware Triage v1 (demo inference)'}, createdAt:new Date(Date.now()-3600000).toISOString() });
  data.reports.push(mkReport(i2,'No training session visible','No training activity was visible during the expected session window.','service_delivery',88));
  data.reports.push(mkReport(i1,'CCTV camera not working','Main corridor CCTV appears unavailable. Please verify the feed.','cctv',62));
}
if (data.activityLog.length === 0) {
  data.activityLog.push({id:uuid(),type:'system_seeded',ref:null,by:'Demo dataset',at:new Date().toISOString()});
  data.activityLog.push({id:uuid(),type:'inspection_completed',ref:data.inspections[0].id,by:data.inspections[0].inspectorName,at:data.inspections[0].submittedAt});
  data.activityLog.push({id:uuid(),type:'citizen_report_received',ref:data.reports[0].id,by:'Community Reporter',at:data.reports[0].createdAt});
}


if (data.aiCalls.length === 0) {
  const now = Date.now();
  data.aiCalls.push({id:uuid(), instituteId:i2.id, instituteName:i2.name, targetName:i2.incharge, targetContact:i2.contact, channel:'browser_voice_agent', status:'completed', duration:'04:38', durationSeconds:278,
    questions:[{id:'activity',text:'Are skill training or teaching activities happening right now?'},{id:'attendance',text:'How many beneficiaries or participants are present?'},{id:'records',text:'Are attendance and daily records being maintained?'},{id:'cctv',text:'Is the CCTV system operational?'},{id:'issue',text:'Is there any issue the department should know about?'}],
    answers:[{questionId:'activity',question:'Are skill training or teaching activities happening right now?',answer:'Yes, computer skill training is happening.'},{questionId:'attendance',question:'How many beneficiaries or participants are present?',answer:'32 beneficiaries are present.'},{questionId:'records',question:'Are attendance and daily records being maintained?',answer:'Yes, they are updated.'},{questionId:'cctv',question:'Is the CCTV system operational?',answer:'Yes, CCTV is operational.'},{questionId:'issue',question:'Is there any issue the department should know about?',answer:'No issue.'}],
    result:{riskScore:12,outcome:'verified_normal',reasons:['Responses are consistent with the institute service profile'],recommendation:'No immediate escalation'}, summary:'AI asked 5 questions; responses were consistent with expected skill-training activity.', createdAt:new Date(now-2*86400000).toISOString(), completedAt:new Date(now-2*86400000+278000).toISOString(), startedBy:authority.name});
  data.aiCalls.push({id:uuid(), instituteId:i2.id, instituteName:i2.name, targetName:i2.incharge, targetContact:i2.contact, channel:'browser_voice_agent', status:'completed', duration:'03:52', durationSeconds:232,
    questions:[{id:'activity',text:'Are skill training or teaching activities happening right now?'},{id:'attendance',text:'How many beneficiaries or participants are present?'},{id:'issue',text:'Is there any issue the department should know about?'}],
    answers:[{questionId:'activity',question:'Are skill training or teaching activities happening right now?',answer:'Yes, vocational training is happening.'},{questionId:'attendance',question:'How many beneficiaries or participants are present?',answer:'28 beneficiaries.'},{questionId:'issue',question:'Is there any issue the department should know about?',answer:'No.'}],
    result:{riskScore:58,outcome:'watch',reasons:['Reported activity requires corroboration with CCTV context'],recommendation:'Schedule corroboration check'}, summary:'AI answer indicated training; CCTV context required corroboration. Manual verification recommended.', createdAt:new Date(now-86400000).toISOString(), completedAt:new Date(now-86400000+232000).toISOString(), startedBy:authority.name});
}

db.save(data);

console.log('\n Seed complete. Demo accounts:');
console.log(' -----------------------------------------------------');
console.log(' Role       Email                        Password');
console.log(' -----------------------------------------------------');
console.log(' Beneficiary beneficiary@dosje.gov.in     Beneficiary@123');
console.log(' Officer    inspector1@dosje.gov.in       Insp@123');
console.log(' Officer    inspector2@dosje.gov.in       Insp@456');
console.log(' Officer    inspector3@dosje.gov.in       Insp@789');
console.log(' Official   official@dosje.gov.in         Official@123');
console.log(' -----------------------------------------------------');
console.log(` Sample institutes created: ${data.institutes.length}`);
console.log(` Demo CCTV feeds created: ${data.cctvFeeds.length}`);
console.log(` Historical inspections: ${data.inspections.length} · Public reports: ${data.reports.length}\n`);
