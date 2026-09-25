const express=require('express');
const db=require('../db');
const {authRequired}=require('../middleware/auth');
const router=express.Router();
router.get('/institutes',authRequired,(req,res)=>{
 const data=db.load();
 res.json({institutes:data.institutes.filter(i=>i.lat&&i.lng).map(i=>({id:i.id,name:i.name,type:i.type,district:i.district,scheme:i.scheme,address:i.address,lat:i.lat,lng:i.lng,status:i.status}))});
});
router.get('/geofence-check',authRequired,(req,res)=>{
 const data=db.load(); const inst=data.institutes.find(i=>i.id===req.query.instituteId); const lat=Number(req.query.lat),lng=Number(req.query.lng),radius=Number(req.query.radius||300);
 if(!inst||!Number.isFinite(lat)||!Number.isFinite(lng)) return res.status(400).json({error:'instituteId, lat and lng are required'});
 const R=6371000,rad=x=>x*Math.PI/180; const dLat=rad(lat-inst.lat),dLng=rad(lng-inst.lng); const a=Math.sin(dLat/2)**2+Math.cos(rad(inst.lat))*Math.cos(rad(lat))*Math.sin(dLng/2)**2; const d=2*R*Math.asin(Math.sqrt(a));
 res.json({inside:d<=radius,distanceMeters:Math.round(d),radiusMeters:radius,institute:{id:inst.id,name:inst.name,lat:inst.lat,lng:inst.lng}});
});
router.get('/route',authRequired,async(req,res)=>{
 const data=db.load(); const from=data.institutes.find(i=>i.id===req.query.from); const to=data.institutes.find(i=>i.id===req.query.to);
 if(!from||!to) return res.status(404).json({error:'Both institutes must be selected'});
 try{const url=`https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`; const r=await fetch(url); if(!r.ok) throw new Error('Routing service unavailable'); const j=await r.json(); const route=j.routes?.[0]; if(!route) throw new Error('No route found'); res.json({distanceKm:(route.distance/1000).toFixed(2),durationMin:Math.round(route.duration/60),geometry:route.geometry});}
 catch(e){res.status(502).json({error:e.message});}
});
module.exports=router;
