import {timingSafeEqual} from 'node:crypto';
import {usageRPC} from '../server/usage.js';
export default async function handler(req,res){
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
 const token=process.env.ASKIT_MAINTENANCE_TOKEN||'';
 const provided=String(req.headers.authorization||'');const expected='Bearer '+token;
 if(req.method!=='POST'||token.length<32||provided.length!==expected.length||!timingSafeEqual(Buffer.from(provided),Buffer.from(expected))){res.statusCode=404;return res.end(JSON.stringify({ok:false}));}
 try{const removed=await usageRPC('askit_prune_usage');res.end(JSON.stringify({ok:true,removed}));}
 catch{res.statusCode=503;res.end(JSON.stringify({ok:false}));}
}
