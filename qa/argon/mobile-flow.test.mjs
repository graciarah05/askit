import test from 'node:test';
import assert from 'node:assert/strict';
import {authErrorMessage} from '../../public/community.js';
import {pendingLogin,rememberLogin,clearPendingLogin,resendSeconds,loginForm} from '../../public/auth-ui.js';
import {handoffFiles,workflowPanel} from '../../public/workflow-ui.js';

test('wrong or expired email code gives a recovery action, not a permissions error',()=>{
  for(const status of [400,401,403]){
    const text=authErrorMessage('/auth/v1/verify',status,{error_code:'otp_expired'});
    assert.match(text,/인증번호/);assert.match(text,/가장 최근 메일/);assert.doesNotMatch(text,/권한/);
  }
});
test('rate limiting and infrastructure failures remain distinct from bad codes',()=>{
  assert.match(authErrorMessage('/auth/v1/verify',429),/기다린/);
  assert.match(authErrorMessage('/auth/v1/otp',429,{error_code:'over_email_send_rate_limit'}),/발송 한도/);
  assert.doesNotMatch(authErrorMessage('/auth/v1/verify',500),/맞지 않거나/);
});
test('pending auth restores email without persisting a code and expires',()=>{
  globalThis.sessionStorage=new MapStorage();
  rememberLogin('  student@example.test ',100000);
  assert.deepEqual(pendingLogin(100010),{email:'student@example.test',sentAt:100000});
  assert.equal(resendSeconds(pendingLogin(100010),100010),60);
  assert.equal(resendSeconds(pendingLogin(100010),160000),0);
  assert.equal(pendingLogin(3700001),null);
  assert.doesNotMatch(sessionStorage.getItem('askit-email-step'),/token|code/);
  clearPendingLogin();assert.equal(pendingLogin(),null);
});
test('pending email is escaped in restored markup',()=>{
  rememberLogin('a\"<tag>@example.test');
  assert.match(loginForm(),/&quot;&lt;tag&gt;/);assert.doesNotMatch(loginForm(),/<tag>/);
  clearPendingLogin();
});
test('image handoff surfaces original next to launch, but not text already embedded',()=>{
  const r={workflow:{id:'image',reason:'image'},text:'prompt',attachments:[{id:'a',name:'original.png',role:'original'},{id:'b',name:'brief.txt',role:'assignment',text:'brief'}]};
  assert.deepEqual(handoffFiles(r).map(f=>f.id),['a']);
  const html=workflowPanel(r,false);
  assert(html.indexOf('original.png')<html.indexOf('data-action="launch"'));
  assert.match(html,/파일은 자동으로 전달되지 않아요/);
});
test('notebook handoff includes text sources but excludes design and assignment files',()=>{
  assert.deepEqual(handoffFiles({workflow:{id:'notebook'},attachments:[{id:'a',role:'source',text:'body'},{id:'b',role:'style'},{id:'c',role:'assignment'}]}).map(f=>f.id),['a']);
});
test('video handoff only requests references for the active clip',()=>{
  assert.deepEqual(handoffFiles({workflow:{id:'flow'},activeClip:1,clips:[{referenceIds:['a']},{referenceIds:['b']}],attachments:[{id:'a'},{id:'b'},{id:'pdf'}]}).map(f=>f.id),['b']);
});
test('file handoff safely escapes user filenames',()=>{
  const html=workflowPanel({workflow:{id:'chat',reason:'chat'},text:'prompt',attachments:[{id:'x',name:'<img onerror=bad>.pdf'}]},false);
  assert.doesNotMatch(html,/<img onerror/);assert.match(html,/&lt;img/);
});
class MapStorage{data=new Map();getItem(k){return this.data.get(k)||null;}setItem(k,v){this.data.set(k,v);}removeItem(k){this.data.delete(k);}}
