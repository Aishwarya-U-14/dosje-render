const express=require('express'); const {authRequired}=require('../middleware/auth'); const router=express.Router();
router.get('/status',authRequired,(req,res)=>res.json({integrations:{openStreetMap:{enabled:true},osrm:{enabled:true},webrtc:{enabled:true},twilio:{enabled:!!(process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN)},verkada:{enabled:!!process.env.VERKADA_API_KEY},googleEarthEngine:{enabled:!!process.env.GEE_PROJECT_ID}}}));
module.exports=router;
