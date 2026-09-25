const fs = require('fs');
const path = require('path');
const DB_PATH = path.join(__dirname, 'data', 'db.json');
function defaultData(){return {users:[],institutes:[],inspections:[],assignments:[],vcSessions:[],cctvFeeds:[],activityLog:[],reports:[],aiEvents:[],aiCalls:[],fieldJobs:[],fieldSubmissions:[]};}
function load(){
  if(!fs.existsSync(DB_PATH)){fs.mkdirSync(path.dirname(DB_PATH),{recursive:true});fs.writeFileSync(DB_PATH,JSON.stringify(defaultData(),null,2));}
  try{
    const data=JSON.parse(fs.readFileSync(DB_PATH,'utf8'));
    for(const k of ['reports','aiEvents','aiCalls','fieldJobs','fieldSubmissions']) if(!Array.isArray(data[k])) data[k]=[];
    return data;
  }catch(e){const d=defaultData();fs.writeFileSync(DB_PATH,JSON.stringify(d,null,2));return d;}
}
let writeQueue=Promise.resolve();
function save(data){writeQueue=writeQueue.then(()=>fs.writeFileSync(DB_PATH,JSON.stringify(data,null,2),'utf8'));return writeQueue;}
module.exports={load,save,DB_PATH};
