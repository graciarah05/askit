// A successful write and a successful launch are separate, observable actions.
export async function copyAction(text,{launch=false,url,meta={},record=()=>{},write=value=>navigator.clipboard.writeText(value),open=()=>window.open('about:blank','_blank')}={}){
 if(!text.trim())return 'empty';
 try{await write(text);}catch{record('copy_failed',meta);return 'manual';}
 record('prompt_copy',meta);
 if(!launch)return 'copied';
 let tab;
 try{tab=open();if(tab){tab.opener=null;tab.location.replace(url);record('google_ai_open',meta);return 'opened';}}catch{tab?.close();}
 record('popup_blocked',meta);return 'blocked';
}
