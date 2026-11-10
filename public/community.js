import {config} from './config.js';
export const communityReady=()=>config.communityEnabled&&/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.supabaseUrl)&&config.supabasePublishableKey.startsWith('sb_publishable_');
const sessionKey='askit-community-session';
export function session(){try{const s=JSON.parse(sessionStorage.getItem(sessionKey)||'null');return s&&s.expires_at>Date.now()/1000?s:null;}catch{return null;}}
let refreshing;
async function validSession(){let s;try{s=JSON.parse(sessionStorage.getItem(sessionKey)||'null')}catch{}if(!s)return null;if(s.expires_at>Date.now()/1000+30)return s;if(!s.refresh_token){sessionStorage.removeItem(sessionKey);return null;}if(!refreshing)refreshing=(async()=>{try{const r=await fetch(config.supabaseUrl+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:config.supabasePublishableKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token}),signal:AbortSignal.timeout(15000)}).catch(()=>{throw Error('연결하지 못했어요. 잠시 후 다시 시도해 주세요.');});if(!r.ok){sessionStorage.removeItem(sessionKey);return null;}const fresh=await r.json();sessionStorage.setItem(sessionKey,JSON.stringify({...fresh,expires_at:Math.floor(Date.now()/1000)+fresh.expires_in}));return fresh;}finally{refreshing=null;}})();return refreshing;}
async function api(path,{method='GET',body,auth=false}={}){if(!communityReady())throw Error('커뮤니티 연결을 확인해 주세요.');const s=await validSession();if(auth&&!s)throw Error('로그인이 필요해요.');const r=await fetch(config.supabaseUrl+path,{method,headers:{apikey:config.supabasePublishableKey,...(s?{Authorization:'Bearer '+s.access_token}:{}),'Content-Type':'application/json',Prefer:'return=representation'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)}).catch(()=>{throw Error('연결하지 못했어요. 잠시 후 다시 시도해 주세요.');});if(!r.ok){if(path.startsWith('/auth/v1/')){const detail=await r.json().catch(()=>({}));throw Error(authErrorMessage(path,r.status,detail));}if(r.status===401)throw Error('로그인 시간이 만료됐어요. 다시 로그인해 주세요.');if(r.status===429)throw Error('잠시 후 다시 시도해 주세요.');if(r.status===409)throw Error('이미 접수한 내용이에요.');if(r.status===403)throw Error('이 작업을 할 수 있는 권한이 없어요.');throw Error('요청을 처리하지 못했어요. 입력과 연결 상태를 확인해 주세요.');}return r.status===204?null:r.json();}
export const sendCode=email=>api('/auth/v1/otp',{method:'POST',body:{email,create_user:true}});
export async function verifyCode(email,token){const s=await api('/auth/v1/verify',{method:'POST',body:{email,token,type:'email'}});sessionStorage.setItem(sessionKey,JSON.stringify({...s,expires_at:Math.floor(Date.now()/1000)+s.expires_in}));return s;}
export async function signOut(){try{await api('/auth/v1/logout',{method:'POST'});}finally{sessionStorage.removeItem(sessionKey);}}
export const listPosts=({page=0,category='전체',search=''}={})=>{const q=new URLSearchParams({select:'id,title,body,category,nickname,user_id,created_at',order:'created_at.desc,id.desc',limit:'20',offset:String(page*20)});if(category!=='전체')q.set('category','eq.'+category);if(search.trim()){const term=search.trim().slice(0,100).replaceAll('\\','\\\\').replaceAll('"','\\"');q.set('or',`(title.ilike."*${term}*",body.ilike."*${term}*")`);}return api('/rest/v1/posts?'+q);};
export const readPost=id=>api('/rest/v1/posts?id=eq.'+encodeURIComponent(id)+'&select=*');
export const addPost=async d=>{const s=await validSession();if(!s)throw Error('로그인이 필요해요.');return api('/rest/v1/posts',{method:'POST',auth:true,body:{...d,user_id:s.user.id}});};
export const editPost=(id,d)=>api('/rest/v1/posts?id=eq.'+encodeURIComponent(id),{method:'PATCH',auth:true,body:d});
export const deletePost=id=>api('/rest/v1/posts?id=eq.'+encodeURIComponent(id),{method:'DELETE',auth:true});
export const listComments=(id,page=0)=>api('/rest/v1/comments?post_id=eq.'+encodeURIComponent(id)+'&select=*&order=created_at.asc,id.asc&limit=100&offset='+page*100);
export const addComment=async(post_id,body,nickname,parent_id=null)=>{const s=await validSession();if(!s)throw Error('로그인이 필요해요.');return api('/rest/v1/comments',{method:'POST',auth:true,body:{post_id,body,nickname,parent_id,user_id:s.user.id}});};
export const deleteComment=id=>api('/rest/v1/comments?id=eq.'+encodeURIComponent(id),{method:'DELETE',auth:true});
export const reportPost=async(post_id,reason)=>{const s=await validSession();if(!s)throw Error('로그인이 필요해요.');return api('/rest/v1/reports',{method:'POST',auth:true,body:{post_id,reason,user_id:s.user.id}});};

export const listLikes=post_id=>api('/rest/v1/post_likes?post_id=eq.'+encodeURIComponent(post_id)+'&select=user_id');
export async function toggleLike(post_id,liked){const s=await validSession();if(!s)throw Error('로그인이 필요해요.');return api('/rest/v1/post_likes'+(liked?'?post_id=eq.'+encodeURIComponent(post_id)+'&user_id=eq.'+encodeURIComponent(s.user.id):''),{method:liked?'DELETE':'POST',auth:true,...(!liked?{body:{post_id,user_id:s.user.id}}:{})});}
export const imageURL=path=>/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path||'')?config.supabaseUrl+'/storage/v1/object/public/askit-images/'+path:'';
export async function uploadImage(blob){const s=await validSession();if(!s)throw Error('로그인이 필요해요.');const path=s.user.id+'/'+crypto.randomUUID()+'.jpg';const r=await fetch(config.supabaseUrl+'/storage/v1/object/askit-images/'+path,{method:'POST',headers:{apikey:config.supabasePublishableKey,Authorization:'Bearer '+s.access_token,'Content-Type':'image/jpeg','x-upsert':'false'},body:blob,signal:AbortSignal.timeout(30000)}).catch(()=>{throw Error('이미지를 올리지 못했어요. 연결을 확인해 주세요.');});if(!r.ok)throw Error('이미지를 올리지 못했어요. 다시 시도해 주세요.');return path;}
export const removeImage=path=>path?api('/storage/v1/object/askit-images',{method:'DELETE',auth:true,body:{prefixes:[path]}}):Promise.resolve();

export function authErrorMessage(path,status,detail={}){
 const code=detail.error_code||detail.code||'';
 if(code==='over_email_send_rate_limit')return '인증 메일 발송 한도에 도달했어요. 잠시 후 다시 시도해 주세요.';
 if(status===429||code==='over_request_rate_limit')return '요청이 너무 빨라요. 잠시 기다린 뒤 다시 시도해 주세요.';
 if(path==='/auth/v1/verify'&&(code==='otp_expired'||[400,401,403].includes(status)))return '인증번호가 맞지 않거나 만료됐어요. 가장 최근 메일의 번호를 확인하거나 다시 받아 주세요.';
 if(['email_address_invalid','validation_failed'].includes(code))return '이메일 주소를 확인해 주세요.';
 return '로그인 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.';
}
