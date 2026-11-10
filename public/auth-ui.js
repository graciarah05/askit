// Keep only the in-progress email step in this tab; never store the OTP.
const pendingKey='askit-email-step';
let pendingMemory=null;
export function pendingLogin(now=Date.now()){
  let p=pendingMemory;
  try{p=JSON.parse(sessionStorage.getItem(pendingKey)||'null')||p;}catch{}
  return p&&typeof p.email==='string'&&Number.isFinite(p.sentAt)&&now-p.sentAt<3600000?p:null;
}
export function rememberLogin(email,now=Date.now()){
  pendingMemory={email:email.trim(),sentAt:now};
  try{sessionStorage.setItem(pendingKey,JSON.stringify(pendingMemory));}catch{}
  return pendingMemory;
}
export function clearPendingLogin(){pendingMemory=null;try{sessionStorage.removeItem(pendingKey);}catch{}}
export function resendSeconds(p,now=Date.now()){return p?Math.max(0,Math.ceil((p.sentAt+60000-now)/1000)):0;}
const escape=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function loginForm(){
  const p=pendingLogin();
  return `<h1>이메일로 로그인</h1><p class="quiet">글·댓글을 쓸 때만 필요해요.</p><form id="login-form" class="section"><div class="field"><label for="email">이메일</label><input id="email" name="email" type="email" required autocomplete="email" autocapitalize="none" spellcheck="false" value="${escape(p?.email)}" ${p?'readonly':''}></div><button class="btn ${p?'':'primary'} full" type="submit">${p?'인증번호 다시 받기':'인증번호 받기'}</button></form><form id="verify-form" ${p?'':'hidden'}><p id="auth-status" class="quiet" role="status">${p?'이메일로 인증번호를 보냈어요. 메일이 없으면 스팸함도 확인해 주세요.':''}</p><div class="field"><label for="code">이메일로 받은 인증번호</label><input id="code" name="code" autocomplete="one-time-code" inputmode="numeric" required minlength="6" maxlength="12" aria-describedby="auth-error"></div><button class="btn primary full" type="submit">로그인</button><button class="btn text full" type="button" data-action="changeEmail">다른 이메일 사용</button></form><p id="auth-error" class="error" role="alert"></p><p class="quiet">계속하면 <a class="link" href="#/privacy">개인정보 안내</a>에 따른 이메일 인증과 공개 게시 기능을 이용합니다.</p>`;
}
let cooldownTimer;
export function bindLogin({sendCode,verifyCode,onSuccess}){
  clearInterval(cooldownTimer);
  const form=document.querySelector('#login-form'),verify=document.querySelector('#verify-form');
  if(!form||!verify)return;
  const email=form.elements.email,code=verify.elements.code,send=form.querySelector('button'),submit=verify.querySelector('button[type=submit]'),error=document.querySelector('#auth-error'),status=document.querySelector('#auth-status');
  let busy=false,verifying=false;
  const update=()=>{if(!form.isConnected){clearInterval(cooldownTimer);return;}const p=pendingLogin(),seconds=resendSeconds(p);send.disabled=busy||seconds>0;send.textContent=busy?(verifying?'인증번호 확인 중…':'인증번호를 보내고 있어요…'):seconds?`${seconds}초 후 다시 받기`:p?'인증번호 다시 받기':'인증번호 받기';};
  update();cooldownTimer=setInterval(update,1000);
  form.onsubmit=async ev=>{ev.preventDefault();if(busy||resendSeconds(pendingLogin()))return;busy=true;error.textContent='';email.readOnly=true;update();try{await sendCode(email.value.trim());rememberLogin(email.value);verify.hidden=false;send.classList.remove('primary');status.textContent='이메일로 인증번호를 보냈어요. 메일이 없으면 스팸함도 확인해 주세요.';code.value='';code.focus();}catch(err){error.textContent=err.message;email.readOnly=!!pendingLogin();}finally{busy=false;update();}};
  verify.onsubmit=async ev=>{ev.preventDefault();if(submit.disabled||busy)return;error.textContent='';const token=code.value.replace(/\s/g,'');if(!/^\d{6,10}$/.test(token)){error.textContent='메일에 적힌 숫자만 입력해 주세요.';code.focus();return;}submit.disabled=true;send.disabled=true;submit.textContent='확인하고 있어요…';busy=true;verifying=true;try{await verifyCode(email.value,token);clearPendingLogin();onSuccess();}catch(err){error.textContent=err.message;code.setAttribute('aria-invalid','true');code.focus();}finally{busy=false;verifying=false;submit.disabled=false;submit.textContent='로그인';update();}};
  code.oninput=()=>{error.textContent='';code.removeAttribute('aria-invalid');};
  verify.querySelector('[data-action=changeEmail]').onclick=()=>{if(busy)return;clearPendingLogin();verify.hidden=true;code.value='';error.textContent='';email.readOnly=false;send.classList.add('primary');update();email.focus();};
}
