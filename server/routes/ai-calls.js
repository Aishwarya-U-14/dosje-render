const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');
const router = express.Router();
const uuid = () => randomUUID();

function questionsFor(inst) {
  const t = `${inst.type} ${inst.scheme} ${inst.name}`.toLowerCase();
  const base = [
    { id:'activity', text:'What activity is happening right now?', options:['Expected service activity','No activity','Unexpected activity','Other'] },
    { id:'attendance', text:'How many beneficiaries or participants are present?', options:[] },
    { id:'records', text:'Are attendance and daily records being maintained?', options:['Yes','No','Partially'] },
    { id:'cctv', text:'Is the CCTV system operational?', options:['Yes','No','Partially'] },
    { id:'issue', text:'Is there any issue the department should know about?', options:[] }
  ];
  if (t.includes('skill') || t.includes('training')) base[0].text = 'Are skill training or teaching activities happening right now?';
  if (t.includes('shelter') || t.includes('women')) base[0].text = 'Are beneficiary care, counselling or scheduled services happening right now?';
  if (t.includes('old age') || t.includes('senior')) base[0].text = 'Are senior-citizen care, recreation or medical-support activities happening right now?';
  return base;
}

function evaluate(answers) {
  const text = answers.map(a => `${a.question} ${a.answer || ''}`.toLowerCase()).join(' | ');
  let score = 0; const reasons=[];
  if (/unexpected|dancing|party|sleeping|empty|closed|no class|no training|not conducting/.test(text)) { score += 45; reasons.push('Reported activity may not match the institute service profile'); }
  if (/cctv.*(no|not|off|failed)|cctv.*(partially)/.test(text)) { score += 20; reasons.push('CCTV reported as unavailable or partial'); }
  if (/records.*(no|not|partially)|attendance.*(no|not)/.test(text)) { score += 20; reasons.push('Operational records/attendance may be incomplete'); }
  if (/issue.*(yes|fraud|unsafe|misuse|absent|closed|not working)/.test(text)) { score += 20; reasons.push('Caller reported a potential operational exception'); }
  const risk = Math.min(99, score);
  return { riskScore:risk, outcome:risk >= 60 ? 'suspect' : risk >= 30 ? 'watch' : 'verified_normal', reasons, recommendation:risk>=60?'Trigger surprise inspection and cross-check CCTV/evidence':risk>=30?'Schedule corroboration check':'No immediate escalation' };
}

router.get('/', authRequired, (req,res)=>{
  const data=db.load();
  res.json({ calls:[...data.aiCalls].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,100) });
});

router.post('/start', authRequired, requireRole('admin','pmu','authority','inspector'), (req,res)=>{
  const data=db.load();
  const inst=data.institutes.find(i=>i.id===req.body.instituteId);
  if(!inst) return res.status(404).json({error:'Institute not found'});
  const call={id:uuid(), instituteId:inst.id, instituteName:inst.name, targetName:inst.incharge, targetContact:inst.contact||'', channel:'browser_voice_agent', status:'in_progress', questions:questionsFor(inst), answers:[], createdAt:new Date().toISOString(), startedBy:req.user.name, result:null};
  data.aiCalls.unshift(call);
  data.activityLog.unshift({id:uuid(),type:'ai_verification_call_started',ref:call.id,by:req.user.name,at:new Date().toISOString()});
  db.save(data); res.status(201).json({call});
});

router.post('/:id/answer', authRequired, (req,res)=>{
  const data=db.load(); const call=data.aiCalls.find(c=>c.id===req.params.id);
  if(!call) return res.status(404).json({error:'AI call not found'});
  const {questionId,question,answer}=req.body;
  call.answers.push({questionId,question,answer:String(answer||''),answeredAt:new Date().toISOString()});
  db.save(data); res.json({call});
});

router.post('/:id/complete', authRequired, (req,res)=>{
  const data=db.load(); const call=data.aiCalls.find(c=>c.id===req.params.id);
  if(!call) return res.status(404).json({error:'AI call not found'});
  call.status='completed'; call.completedAt=new Date().toISOString(); call.result=evaluate(call.answers);
  if(call.result.outcome==='suspect'){
    const inspectors=data.users.filter(u=>u.role==='inspector');
    if(inspectors.length){
      const inspector=inspectors[Math.floor(Math.random()*inspectors.length)];
      const inspection={id:uuid(),instituteId:call.instituteId,instituteName:call.instituteName,type:'ai_call_triggered',inspectorId:inspector.id,inspectorName:inspector.name,checklist:[],notes:`AI verification call escalated: ${call.result.reasons.join('; ')}`,status:'pending',evidence:[],geoTag:null,score:null,anomalyFlags:['AI_CALL_EXCEPTION'],scheduledFor:null,createdAt:new Date().toISOString(),submittedAt:null,aiCallId:call.id};
      data.inspections.push(inspection); call.inspectionId=inspection.id; call.assignedInspectorName=inspector.name;
    }
  }
  data.activityLog.unshift({id:uuid(),type:'ai_verification_call_completed',ref:call.id,by:'AI Verification Agent',at:new Date().toISOString()});
  db.save(data); res.json({call});
});

router.post('/:id/dial', authRequired, requireRole('admin','pmu','authority','inspector'), async (req,res)=>{
  const data=db.load(); const call=data.aiCalls.find(c=>c.id===req.params.id);
  if(!call) return res.status(404).json({error:'AI call not found'});
  const configured=!!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER && call.targetContact);
  if(!configured) return res.json({mode:'browser-demo',message:'Twilio is not configured. Browser voice agent is ready; add TWILIO_* variables to enable real phone dialing.',call});
  try {
    const twilio=require('twilio')(process.env.TWILIO_ACCOUNT_SID,process.env.TWILIO_AUTH_TOKEN);
    const base=process.env.PUBLIC_BASE_URL||`http://localhost:${process.env.PORT||4000}`;
    const tw=await twilio.calls.create({to:call.targetContact,from:process.env.TWILIO_FROM_NUMBER,url:`${base}/api/ai-calls/${call.id}/twiml`});
    call.providerCallSid=tw.sid; call.channel='twilio'; call.status='dialing'; db.save(data);
    res.json({mode:'twilio',sid:tw.sid,call});
  } catch(e){res.status(502).json({error:`Twilio call failed: ${e.message}`});}
});

router.post('/:id/twiml', (req,res)=>{
  const data=db.load(); const call=data.aiCalls.find(c=>c.id===req.params.id);
  if(!call) return res.status(404).type('text/xml').send('<Response><Say>Verification call unavailable.</Say></Response>');
  const first=call.questions[0]?.text||'Please describe the current situation.';
  res.type('text/xml').send(`<Response><Gather input="speech" action="/api/ai-calls/${call.id}/twiml-answer" method="POST" speechTimeout="auto"><Say language="en-IN">This is an automated DoSJE verification call. ${first}</Say></Gather><Say>No response received. Thank you.</Say></Response>`);
});

router.post('/:id/twiml-answer',(req,res)=>{
  const data=db.load(); const call=data.aiCalls.find(c=>c.id===req.params.id); if(!call) return res.status(404).type('text/xml').send('<Response/>');
  const q=call.questions[call.answers.length]; if(q) call.answers.push({questionId:q.id,question:q.text,answer:req.body.SpeechResult||'',answeredAt:new Date().toISOString()});
  db.save(data); res.type('text/xml').send('<Response><Say>Thank you. The response has been recorded for verification.</Say></Response>');
});

module.exports=router;
