import fs from 'node:fs/promises';
let html=await fs.readFile('public/index.html','utf8'),css=await fs.readFile('public/styles.css','utf8');
const strip=s=>s.replace(/^import[^\n]+\n/gm,'').replace(/^export /gm,'');
let js=(await Promise.all(['config','personalize','workflows','workflow-ui','tasks','community','attachments','prompt-service','prompt-ui'].map(f=>fs.readFile('public/'+f+'.js','utf8')))).map(strip).join('\n');
js+='\nconst board={communityReady,session,sendCode,verifyCode,signOut,listPosts,readPost,addPost,editPost,deletePost,listComments,addComment,deleteComment,reportPost,listLikes,toggleLike,imageURL,uploadImage,removeImage};\n'+strip(await fs.readFile('public/app.js','utf8'));
const assets={};for(const file of await fs.readdir('public/assets/askit')){const url='data:image/'+(file.endsWith('.png')?'png':'svg+xml')+';base64,'+(await fs.readFile('public/assets/askit/'+file)).toString('base64');assets[file.replace('.svg','')]=url;html=html.replaceAll('./assets/askit/'+file,url);css=css.replaceAll('./assets/askit/'+file,url);js=js.replaceAll('./assets/askit/'+file,url);}
js=js.replace("./assets/askit/${icons[n]||'imgGroup6'}.svg", "${embedded[icons[n]||'imgGroup6']}");js='const embedded='+JSON.stringify(assets)+';\n'+js;
css=css.replaceAll('./assets/PretendardVariable.woff2','data:font/woff2;base64,'+(await fs.readFile('public/assets/PretendardVariable.woff2')).toString('base64'));
css=css.replaceAll('./assets/PretendardUI.woff2','data:font/woff2;base64,'+(await fs.readFile('public/assets/PretendardUI.woff2')).toString('base64'));html=html.replace(/<link rel="preload"[^>]+>/g,'');
html=html.replace('<link rel="stylesheet" href="./styles.css">',()=>`<style>${css}</style>`).replace('<script type="module" src="./app.js"></script>',()=>`<script type="module">${js}</script>`);
await fs.mkdir('preview',{recursive:true});await fs.writeFile('preview/Askit.html',html);console.log('preview/Askit.html');
