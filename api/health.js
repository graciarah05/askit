import {availability} from './prompt.js';
import {usageRPC} from '../server/usage.js';
export default async function handler(req,res){
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.statusCode=405;return res.end(JSON.stringify({ok:false}));}
 try{
  const database=await usageRPC('askit_health');
  const generation=availability().enabled&&database?.generationEnabled===true;
  res.statusCode=database?.database?200:503;
  res.end(JSON.stringify({ok:database?.database===true,version:'1.4.0',generation,community:process.env.PUBLIC_COMMUNITY_ENABLED==='true'}));
 }catch{res.statusCode=503;res.end(JSON.stringify({ok:false,version:'1.4.0'}));}
}
