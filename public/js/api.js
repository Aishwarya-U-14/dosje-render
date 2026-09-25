const API_BASE = '/api';
function getToken(){return localStorage.getItem('dosje_token');}
function setToken(t){localStorage.setItem('dosje_token',t);}
function clearToken(){localStorage.removeItem('dosje_token');localStorage.removeItem('dosje_user');}
function getUser(){try{return JSON.parse(localStorage.getItem('dosje_user')||'null');}catch{return null;}}
function setUser(u){localStorage.setItem('dosje_user',JSON.stringify(u));}
async function apiRequest(path, options={}){
  const headers={...(options.isForm?{}:{'Content-Type':'application/json'}),...(options.headers||{})};
  if(getToken()) headers.Authorization='Bearer '+getToken();
  const res=await fetch(API_BASE+path,{...options,headers,body:options.isForm?options.body:(options.body===undefined?undefined:JSON.stringify(options.body))});
  let data={}; try{data=await res.json();}catch{}
  if(res.status===401){clearToken(); if(!location.pathname.includes('login')) setTimeout(()=>render(),0); throw new Error(data.error||'Session expired. Please sign in again.');}
  if(!res.ok) throw new Error(data.error||`Request failed (${res.status})`);
  return data;
}
const api={
 login:p=>apiRequest('/auth/login',{method:'POST',body:p}),register:p=>apiRequest('/auth/register',{method:'POST',body:p}),
 listInstitutes:()=>apiRequest('/institutes'),createInstitute:p=>apiRequest('/institutes',{method:'POST',body:p}),
 listInspections:(q='')=>apiRequest('/inspections'+q),createInspection:p=>apiRequest('/inspections',{method:'POST',body:p}),submitInspection:(id,p)=>apiRequest(`/inspections/${id}/submit`,{method:'POST',body:p}),uploadEvidence:(id,fd)=>apiRequest(`/inspections/${id}/evidence`,{method:'POST',body:fd,isForm:true}),
 listAssignments:()=>apiRequest('/assignments'),randomAssign:p=>apiRequest('/assignments/random',{method:'POST',body:p}),assignOfficer:p=>apiRequest('/assignments/assign',{method:'POST',body:p}),eligibleOfficers:instituteId=>apiRequest(`/assignments/eligible?instituteId=${encodeURIComponent(instituteId)}`),
 listVC:()=>apiRequest('/vc'),randomVC:p=>apiRequest('/vc/random',{method:'POST',body:p}),updateVC:(id,p)=>apiRequest(`/vc/${id}`,{method:'PATCH',body:p}),
 listCctv:()=>apiRequest('/cctv'),addCctv:p=>apiRequest('/cctv',{method:'POST',body:p}),
 analyticsSummary:()=>apiRequest('/analytics/summary'),dashboardLive:()=>apiRequest('/dashboard/live'),
 listReports:(q='')=>apiRequest('/reports'+q),updateReport:(id,p)=>apiRequest(`/reports/${id}`,{method:'PATCH',body:p}),
 aiEvents:()=>apiRequest('/ai-monitoring/events'),aiProfiles:()=>apiRequest('/ai-monitoring/profiles'),aiScan:p=>apiRequest('/ai-monitoring/scan',{method:'POST',body:p}),updateAiEvent:(id,p)=>apiRequest(`/ai-monitoring/events/${id}`,{method:'PATCH',body:p}),
 submitPublicReport:(fd)=>apiRequest('/reports',{method:'POST',body:fd,isForm:true}),publicInstituteOptions:()=>apiRequest('/reports/options'),
 listMapInstitutes:()=>apiRequest('/map/institutes'),geofenceCheck:p=>apiRequest(`/map/geofence-check?instituteId=${encodeURIComponent(p.instituteId)}&lat=${p.lat}&lng=${p.lng}&radius=${p.radius||300}`),routeBetween:p=>apiRequest(`/map/route?from=${encodeURIComponent(p.from)}&to=${encodeURIComponent(p.to)}`),
 listAICalls:()=>apiRequest('/ai-calls'),startAICall:p=>apiRequest('/ai-calls/start',{method:'POST',body:p}),answerAICall:(id,p)=>apiRequest(`/ai-calls/${id}/answer`,{method:'POST',body:p}),completeAICall:id=>apiRequest(`/ai-calls/${id}/complete`,{method:'POST',body:{}}),dialAICall:id=>apiRequest(`/ai-calls/${id}/dial`,{method:'POST',body:{}}),
 fieldJobs:()=>apiRequest('/field-ops/jobs'),createFieldJob:p=>apiRequest('/field-ops/jobs',{method:'POST',body:p}),fieldSubmissions:()=>apiRequest('/field-ops/submissions'),submitFieldInspection:fd=>apiRequest('/field-ops/submit',{method:'POST',body:fd,isForm:true})
};
function showToast(message,type=''){const e=document.getElementById('toast');e.textContent=message;e.className='toast show '+type;setTimeout(()=>e.className='toast '+type,3200);}
