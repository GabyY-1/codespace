(() => {
  "use strict";

  const KEY = "webcode-project-v2";
  const state = {
    files: new Map(),
    folders: new Set(),
    active: null,
    openFolders: new Set(),
    modalMode: null,
    modalPath: null,
    contextPath: null,
    contextType: null,
    confirmAction: null,
    previewPage: null,
    previewTimer: null,
    device: "desktop"
  };

  const $ = id => document.getElementById(id);
  const ui = {
    newProjectBtn:$('newProjectBtn'), importBtn:$('importBtn'), downloadFileBtn:$('downloadFileBtn'), downloadProjectBtn:$('downloadProjectBtn'), previewBtn:$('previewBtn'),
    addFileBtn:$('addFileBtn'), addFolderBtn:$('addFolderBtn'), collapseBtn:$('collapseBtn'), fileCount:$('fileCount'), fileTree:$('fileTree'),
    fileIcon:$('fileIcon'), activeFileName:$('activeFileName'), dirtyDot:$('dirtyDot'), codeEditor:$('codeEditor'), lineNumbers:$('lineNumbers'), cursorInfo:$('cursorInfo'), languageInfo:$('languageInfo'), sizeInfo:$('sizeInfo'), findBtn:$('findBtn'), formatBtn:$('formatBtn'),
    previewFrame:$('previewFrame'), previewFileName:$('previewFileName'), previewAddress:$('previewAddress'), refreshPreviewBtn:$('refreshPreviewBtn'), openPreviewBtn:$('openPreviewBtn'), previewStage:$('previewStage'),
    searchBox:$('searchBox'), searchInput:$('searchInput'), searchResult:$('searchResult'), closeSearchBtn:$('closeSearchBtn'), contextMenu:$('contextMenu'),
    modal:$('modal'), modalTitle:$('modalTitle'), modalText:$('modalText'), modalLabel:$('modalLabel'), modalInput:$('modalInput'), modalError:$('modalError'), modalConfirmBtn:$('modalConfirmBtn'), modalCancelBtn:$('modalCancelBtn'), modalCloseBtn:$('modalCloseBtn'),
    confirmModal:$('confirmModal'), confirmTitle:$('confirmTitle'), confirmText:$('confirmText'), confirmOkBtn:$('confirmOkBtn'), confirmCancelBtn:$('confirmCancelBtn'), confirmCloseBtn:$('confirmCloseBtn'), fileInput:$('fileInput'), toastContainer:$('toastContainer')
  };

  function norm(p){
    const out=[];
    for(const part of String(p||'').replace(/\\/g,'/').split('/')){
      if(!part||part==='.'){continue;}
      if(part==='..'){out.pop();continue;}
      out.push(part);
    }
    return out.join('/');
  }
  function name(p){const s=norm(p),i=s.lastIndexOf('/');return i<0?s:s.slice(i+1)}
  function parent(p){const s=norm(p),i=s.lastIndexOf('/');return i<0?'':s.slice(0,i)}
  function ext(p){const n=name(p),i=n.lastIndexOf('.');return i<0?'':n.slice(i+1).toLowerCase()}
  function isText(p){return ['html','htm','css','js','mjs','cjs','json','txt','md','svg','xml','php','py','ts','tsx','jsx','vue','svelte','sql','yaml','yml','toml','ini','sh','bat'].includes(ext(p))}
  function mime(p){return ({html:'text/html',htm:'text/html',css:'text/css',js:'text/javascript',mjs:'text/javascript',cjs:'text/javascript',json:'application/json',txt:'text/plain',md:'text/markdown',svg:'image/svg+xml',xml:'application/xml',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',ico:'image/x-icon',mp3:'audio/mpeg',wav:'audio/wav',mp4:'video/mp4',webm:'video/webm',woff:'font/woff',woff2:'font/woff2',ttf:'font/ttf',otf:'font/otf'})[ext(p)]||'application/octet-stream'}
  function lang(p){return ({html:'HTML',htm:'HTML',css:'CSS',js:'JavaScript',mjs:'JavaScript',cjs:'JavaScript',json:'JSON',md:'Markdown',txt:'Text',svg:'SVG',xml:'XML',php:'PHP',py:'Python',ts:'TypeScript',tsx:'TSX',jsx:'JSX',vue:'Vue',svelte:'Svelte'})[ext(p)]||'Plain Text'}
  function icon(p){return ({html:'◇',htm:'◇',css:'#',js:'JS',mjs:'JS',cjs:'JS',json:'{}',svg:'◇',png:'▧',jpg:'▧',jpeg:'▧',gif:'▧',webp:'▧',txt:'T',mp3:'♫',mp4:'▶'})[ext(p)]||'•'}
  function bytes(n){if(!n)return '0 B';const u=['B','KB','MB','GB'];let i=0,v=n;while(v>=1024&&i<u.length-1){v/=1024;i++}return `${v.toFixed(i?1:0)} ${u[i]}`}
  function toast(msg){const e=document.createElement('div');e.className='toast';e.textContent=msg;ui.toastContainer.appendChild(e);setTimeout(()=>e.remove(),2800)}
  function ensureParents(p){let x=parent(p);if(!x)return;let cur='';for(const part of x.split('/')){cur=cur?`${cur}/${part}`:part;state.folders.add(cur)}}
  function addFile(p,c,binary=false){p=norm(p);if(!p||state.folders.has(p))return false;state.files.set(p,{path:p,content:c,binary,mime:mime(p)});ensureParents(p);return true}
  function addFolder(p){p=norm(p);if(!p||state.files.has(p))return false;state.folders.add(p);ensureParents(p);return true}

  function defaultProject(){
    state.files.clear();state.folders.clear();state.openFolders.clear();
    addFile('index.html',`<!DOCTYPE html>\n<html lang="fr">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Mon site</title>\n    <link rel="stylesheet" href="style.css">\n</head>\n<body>\n    <main class="hero">\n        <p class="eyebrow">WEBCODE</p>\n        <h1>Ton site commence ici.</h1>\n        <p>Modifie le HTML, le CSS ou le JavaScript et regarde le résultat à droite.</p>\n        <button id="testButton">Tester JavaScript</button>\n    </main>\n    <script src="script.js"><\\/script>\n</body>\n</html>`);
    addFile('style.css',`* { box-sizing: border-box; }\n\nbody { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0b1020; color: white; font-family: Arial, sans-serif; }\n.hero { width: min(700px, 90vw); padding: 48px; text-align: center; }\n.eyebrow { color: #7f9cff; font-size: 12px; font-weight: bold; letter-spacing: .2em; }\nh1 { font-size: clamp(36px, 7vw, 72px); margin: 10px 0; }\nbutton { border: 0; border-radius: 10px; padding: 13px 18px; background: #6d93ff; color: white; cursor: pointer; }`);
    addFile('script.js',`const button = document.getElementById("testButton");\n\nif (button) {\n    button.addEventListener("click", () => {\n        alert("JavaScript fonctionne !");\n    });\n}`);
    state.active='index.html';
  }

  function save(){
    try{
      localStorage.setItem(KEY,JSON.stringify({files:[...state.files.values()].filter(f=>!f.binary).map(f=>({path:f.path,content:f.content})),folders:[...state.folders],active:state.active}));
    }catch(e){console.warn(e)}
  }
  function load(){
    try{
      const raw=localStorage.getItem(KEY);if(!raw){defaultProject();return}
      const d=JSON.parse(raw);state.files.clear();state.folders.clear();
      (d.folders||[]).forEach(addFolder);(d.files||[]).forEach(f=>addFile(f.path,f.content||'',false));
      state.active=state.files.has(d.active)?d.active:(state.files.keys().next().value||null);
      if(!state.files.size)defaultProject();
    }catch(e){defaultProject()}
  }

  function renderTree(){
    ui.fileTree.innerHTML='';
    const root={folders:new Map(),files:[]};
    const insert=(p,type)=>{const parts=norm(p).split('/');let n=root;parts.forEach((part,i)=>{const last=i===parts.length-1;if(last){if(type==='file')n.files.push({name:part,path:p});else if(!n.folders.has(part))n.folders.set(part,{name:part,path:p,folders:new Map(),files:[]});return}if(!n.folders.has(part))n.folders.set(part,{name:part,path:parts.slice(0,i+1).join('/'),folders:new Map(),files:[]});n=n.folders.get(part)})};
    state.folders.forEach(p=>insert(p,'folder'));state.files.keys().forEach(p=>insert(p,'file'));
    const render=(node,container,depth)=>{
      [...node.folders.values()].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})).forEach(f=>{
        const row=document.createElement('div');row.className='tree-row';row.style.paddingLeft=`${7+depth*16}px`;row.innerHTML=`<span class="arrow">${state.openFolders.has(f.path)?'▾':'▸'}</span><span class="icon">▰</span><span class="name"></span><span class="more">⋮</span>`;row.querySelector('.name').textContent=f.name;row.dataset.path=f.path;row.dataset.type='folder';
        row.onclick=()=>{state.openFolders.has(f.path)?state.openFolders.delete(f.path):state.openFolders.add(f.path);renderTree()};row.oncontextmenu=e=>{e.preventDefault();showContext(e.clientX,e.clientY,f.path,'folder')};container.appendChild(row);
        const ch=document.createElement('div');ch.className='children'+(state.openFolders.has(f.path)?'':' hidden');render(f,ch,depth+1);container.appendChild(ch)
      });
      [...node.files].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})).forEach(f=>{const row=document.createElement('div');row.className='tree-row'+(state.active===f.path?' active':'');row.style.paddingLeft=`${7+depth*16}px`;row.innerHTML=`<span class="arrow"></span><span class="icon"></span><span class="name"></span><span class="more">⋮</span>`;row.querySelector('.icon').textContent=icon(f.path);row.querySelector('.name').textContent=f.name;row.dataset.path=f.path;row.dataset.type='file';row.onclick=()=>openFile(f.path);row.oncontextmenu=e=>{e.preventDefault();showContext(e.clientX,e.clientY,f.path,'file')};container.appendChild(row)})
    };
    render(root,ui.fileTree,0);ui.fileCount.textContent=`${state.files.size} fichier${state.files.size>1?'s':''}`
  }

  function openFile(p){const f=state.files.get(p);if(!f)return;state.active=p;ui.codeEditor.disabled=f.binary;ui.codeEditor.value=f.binary?'// Fichier binaire non éditable':(f.content||'');updateEditor();renderTree();schedulePreview()}
  function updateEditor(){const f=state.files.get(state.active);ui.activeFileName.textContent=f?name(state.active):'Aucun fichier';ui.fileIcon.textContent=f?icon(state.active):'';ui.previewFileName.textContent=f?name(state.active):'';ui.previewAddress.textContent=f?`preview://${state.active}`:'preview://';ui.languageInfo.textContent=f?lang(state.active):'Plain Text';ui.sizeInfo.textContent=f&& !f.binary?bytes(new Blob([f.content]).size):'0 B';updateLines();updateCursor()}
  function updateLines(){const n=Math.max(1,ui.codeEditor.value.split('\n').length);ui.lineNumbers.textContent=Array.from({length:n},(_,i)=>i+1).join('\n');ui.lineNumbers.scrollTop=ui.codeEditor.scrollTop}
  function updateCursor(){const p=ui.codeEditor.selectionStart||0;const before=ui.codeEditor.value.slice(0,p);const ls=before.split('\n');ui.cursorInfo.textContent=`Ln ${ls.length}, Col ${ls[ls.length-1].length+1}`}
  function editorInput(){const f=state.files.get(state.active);if(!f||f.binary)return;f.content=ui.codeEditor.value;ui.dirtyDot.classList.remove('hidden');updateEditor();save();schedulePreview()}
  function schedulePreview(){clearTimeout(state.previewTimer);state.previewTimer=setTimeout(buildPreview,250)}
  function getMainHtml(){if(state.files.has('index.html'))return 'index.html';for(const p of state.files.keys())if(['html','htm'].includes(ext(p)))return p;return null}
  function projectPath(current,target){target=(target||'').trim();if(!target||/^(https?:|data:|blob:|mailto:|tel:|javascript:|#|\/\/)/i.test(target))return null;target=target.split('?')[0].split('#')[0];if(target.startsWith('/'))return norm(target);return norm(parent(current)?`${parent(current)}/${target}`:target)}
  function binaryDataUrl(c,type){if(!(c instanceof Uint8Array))c=new Uint8Array(c);let s='';for(let i=0;i<c.length;i+=0x8000)s+=String.fromCharCode(...c.subarray(i,i+0x8000));return `data:${type};base64,${btoa(s)}`}
  function buildPreviewDoc(mainPath){
    const binaryUrls=new Map();state.files.forEach((f,p)=>{if(f.binary)binaryUrls.set(p,binaryDataUrl(f.content,f.mime))});
    const resolveAsset=(current,target)=>{const p=projectPath(current,target);return p&&binaryUrls.get(p)||null};
    const getCss=(path,stack=new Set())=>{if(stack.has(path))return '';const f=state.files.get(path);if(!f||f.binary)return '';stack.add(path);let css=f.content||'';css=css.replace(/url\(\s*(["']?)(.*?)\1\s*\)/gi,(m,q,t)=>{const u=resolveAsset(path,t);return u?`url("${u}")`:m});stack.delete(path);return css};
    const main=state.files.get(mainPath);if(!main||main.binary)return '';
    let html=main.content||'';
    html=html.replace(/<link\b([^>]*?)\bhref\s*=\s*(["'])(.*?)\2([^>]*)>/gi,(m,a,q,t,b)=>{const p=projectPath(mainPath,t);const f=p?state.files.get(p):null;return f&&!f.binary&&ext(p)==='css'?`<style>${getCss(p)}<\\/style>`:m});
    html=html.replace(/<script\b([^>]*?)\bsrc\s*=\s*(["'])(.*?)\2([^>]*)>\s*<\/script>/gi,(m,a,q,t,b)=>{const p=projectPath(mainPath,t);const f=p?state.files.get(p):null;if(!f||f.binary||!['js','mjs','cjs'].includes(ext(p)))return m;return `<script>\\n${String(f.content).replace(/<\/script/gi,'<\\/script')}\\n<\\/script>`});
    html=html.replace(/\b(src|poster)\s*=\s*(["'])(.*?)\2/gi,(m,a,q,t)=>{const u=resolveAsset(mainPath,t);return u?`${a}=${q}${u}${q}`:m});
    html=html.replace(/url\(\s*(["']?)(.*?)\1\s*\)/gi,(m,q,t)=>{const u=resolveAsset(mainPath,t);return u?`url("${u}")`:m});
    return html;
  }
  function buildPreview(){const main=getMainHtml();if(!main){ui.previewFrame.srcdoc='<html><body style="font-family:Arial;padding:40px"><h2>Aucun fichier HTML</h2><p>Ajoute un index.html pour lancer le preview.</p></body></html>';return}state.previewPage=main;ui.previewFrame.srcdoc=buildPreviewDoc(main);ui.previewFileName.textContent=name(main);ui.previewAddress.textContent=`preview://${main}`}

  function setupPreviewLinks(){ui.previewFrame.addEventListener('load',()=>{try{const doc=ui.previewFrame.contentDocument;if(!doc)return;doc.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;const href=a.getAttribute('href')||'';if(/^https?:|^mailto:|^tel:|^#|^\/\//i.test(href))return;const p=projectPath(state.previewPage,href);if(p&&state.files.has(p)&&['html','htm'].includes(ext(p))){e.preventDefault();state.previewPage=p;ui.previewFrame.srcdoc=buildPreviewDoc(p);ui.previewFileName.textContent=name(p);ui.previewAddress.textContent=`preview://${p}`}})}catch(_){}})}
  function downloadBlob(blob,filename){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}
  async function downloadFile(){const f=state.files.get(state.active);if(!f){toast('Aucun fichier sélectionné.');return}downloadBlob(new Blob([f.content],{type:f.mime}),name(f.path));toast('Fichier téléchargé.')}
  async function downloadZip(){if(typeof JSZip==='undefined'){toast('JSZip est indisponible.');return}const z=new JSZip();state.folders.forEach(f=>z.folder(f));state.files.forEach(f=>z.file(f.path,f.content));const blob=await z.generateAsync({type:'blob',compression:'DEFLATE'});downloadBlob(blob,'MonProjet.zip');toast('Projet ZIP téléchargé.')}
  async function importFiles(list){let count=0;for(const file of list){if(file.name.toLowerCase().endsWith('.zip')){await importZip(file);continue}const p=norm(file.webkitRelativePath||file.name);if(!p)continue;if(state.files.has(p)||state.folders.has(p)){if(!confirm(`« ${p} » existe déjà. Le remplacer ?`))continue}if(isText(p))addFile(p,await file.text(),false);else addFile(p,new Uint8Array(await file.arrayBuffer()),true);count++}renderTree();if(count){const idx=[...state.files.keys()].find(p=>p.toLowerCase()==='index.html');if(idx)state.active=idx;else if(!state.active)state.active=state.files.keys().next().value;openFile(state.active);save();schedulePreview();toast(`${count} fichier${count>1?'s':''} importé${count>1?'s':''}.`)} }
  async function importZip(file){if(typeof JSZip==='undefined'){toast('JSZip est indisponible.');return}try{const z=await JSZip.loadAsync(file);let n=0;const entries=[];z.forEach((p,e)=>entries.push({p:norm(p),e}));for(const x of entries){if(!x.p)continue;if(x.e.dir){addFolder(x.p);continue}if(state.files.has(x.p)||state.folders.has(x.p)){if(!confirm(`« ${x.p} » existe déjà. Le remplacer ?`))continue}if(isText(x.p))addFile(x.p,await x.e.async('string'),false);else addFile(x.p,await x.e.async('uint8array'),true);n++}renderTree();const idx=[...state.files.keys()].find(p=>p.toLowerCase()==='index.html');if(idx)state.active=idx;else if(!state.active)state.active=state.files.keys().next().value;if(state.active)openFile(state.active);save();schedulePreview();toast(`Projet ZIP importé : ${n} fichier${n>1?'s':''}.`)}catch(e){console.error(e);toast('ZIP invalide ou impossible à lire.')}}

  function openModal(mode,path=null){state.modalMode=mode;state.modalPath=path;ui.modalError.textContent='';ui.modal.classList.remove('hidden');if(mode==='file'){ui.modalTitle.textContent='Nouveau fichier';ui.modalText.textContent='Crée un fichier dans le projet.';ui.modalLabel.textContent='Nom du fichier';ui.modalInput.placeholder='exemple.html';ui.modalInput.value=''}else if(mode==='folder'){ui.modalTitle.textContent='Nouveau dossier';ui.modalText.textContent='Crée un dossier dans le projet.';ui.modalLabel.textContent='Nom du dossier';ui.modalInput.placeholder='images';ui.modalInput.value=''}else{ui.modalTitle.textContent='Renommer';ui.modalText.textContent='Le nom doit être unique dans son dossier.';ui.modalLabel.textContent='Nouveau nom';ui.modalInput.placeholder=name(path);ui.modalInput.value=name(path)}ui.modalInput.focus();ui.modalInput.select()}
  function closeModal(){ui.modal.classList.add('hidden');state.modalMode=null;state.modalPath=null}
  function uniqueCopy(p){const par=parent(p),n=name(p),e=ext(p),base=e?n.slice(0,-(e.length+1)):n;let i=0;while(true){const suffix=i===0?' copy':` copy ${i+1}`;const candidate=par?`${par}/${base}${suffix}${e?'.'+e:''}`:`${base}${suffix}${e?'.'+e:''}`;if(!state.files.has(candidate)&&!state.folders.has(candidate))return candidate;i++}}
  function modalSubmit(){const raw=ui.modalInput.value.trim();const v=norm(raw);if(!v){ui.modalError.textContent='Nom invalide.';return}if(state.modalMode==='file'){if(state.files.has(v)||state.folders.has(v)){ui.modalError.textContent='Ce nom existe déjà.';return}addFile(v,'',false);openFile(v)}else if(state.modalMode==='folder'){if(state.files.has(v)||state.folders.has(v)){ui.modalError.textContent='Ce nom existe déjà.';return}addFolder(v);state.openFolders.add(v);renderTree();save()}else{const old=state.modalPath;const np=parent(old)?`${parent(old)}/${v}`:v;if(np!==old&&(state.files.has(np)||state.folders.has(np))){ui.modalError.textContent='Ce nom existe déjà.';return}if(state.files.has(old)){const f=state.files.get(old);state.files.delete(old);f.path=np;state.files.set(np,f);if(state.active===old)state.active=np}else{const oldPre=old+'/';const folders=[...state.folders].filter(p=>p===old||p.startsWith(oldPre));const files=[...state.files.entries()].filter(([p])=>p.startsWith(oldPre));folders.forEach(p=>state.folders.delete(p));files.forEach(([p])=>state.files.delete(p));folders.forEach(p=>state.folders.add(p===old?np:np+p.slice(old.length)));files.forEach(([p,f])=>{const q=np+p.slice(old.length);f.path=q;state.files.set(q,f)});if(state.active===old||state.active?.startsWith(oldPre))state.active=np+state.active.slice(old.length)}renderTree();save();schedulePreview();updateEditor()}closeModal();toast('Modification effectuée.')}
  function showContext(x,y,p,t){state.contextPath=p;state.contextType=t;ui.contextMenu.classList.remove('hidden');ui.contextMenu.style.left=Math.min(x,innerWidth-185)+'px';ui.contextMenu.style.top=Math.min(y,innerHeight-180)+'px'}
  function hideContext(){ui.contextMenu.classList.add('hidden');state.contextPath=null;state.contextType=null}
  function askDelete(){const p=state.contextPath,t=state.contextType;if(!p||!t)return;hideContext();ui.confirmTitle.textContent=t==='folder'?'Supprimer le dossier ?':'Supprimer le fichier ?';ui.confirmText.textContent=t==='folder'?`« ${name(p)} » et son contenu seront supprimés.`:`« ${name(p)} » sera supprimé.`;ui.confirmModal.classList.remove('hidden');state.confirmAction=()=>{if(t==='file'){state.files.delete(p)}else{const pre=p+'/';[...state.files.keys()].forEach(x=>{if(x===p||x.startsWith(pre))state.files.delete(x)});[...state.folders].forEach(x=>{if(x===p||x.startsWith(pre))state.folders.delete(x)})}if(!state.files.has(state.active))state.active=state.files.keys().next().value||null;ui.confirmModal.classList.add('hidden');state.confirmAction=null;renderTree();state.active?openFile(state.active):updateEditor();save();schedulePreview();toast('Suppression effectuée.')}}

  ui.codeEditor.addEventListener('input',editorInput);ui.codeEditor.addEventListener('scroll',updateLines);ui.codeEditor.addEventListener('keyup',updateCursor);ui.codeEditor.addEventListener('click',updateCursor);ui.codeEditor.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const s=ui.codeEditor.selectionStart;ui.codeEditor.value=ui.codeEditor.value.slice(0,s)+'    '+ui.codeEditor.value.slice(ui.codeEditor.selectionEnd);ui.codeEditor.selectionStart=ui.codeEditor.selectionEnd=s+4;editorInput()}});
  ui.newProjectBtn.onclick=()=>{ui.confirmTitle.textContent='Nouveau projet ?';ui.confirmText.textContent='Le projet actuel sera remplacé.';ui.confirmModal.classList.remove('hidden');state.confirmAction=()=>{ui.confirmModal.classList.add('hidden');state.confirmAction=null;defaultProject();renderTree();openFile('index.html');save();schedulePreview();toast('Nouveau projet créé.')}};
  ui.importBtn.onclick=()=>{ui.fileInput.value='';ui.fileInput.click()};ui.fileInput.onchange=()=>importFiles([...ui.fileInput.files]);
  ui.downloadFileBtn.onclick=downloadFile;ui.downloadProjectBtn.onclick=downloadZip;ui.previewBtn.onclick=buildPreview;ui.refreshPreviewBtn.onclick=buildPreview;ui.openPreviewBtn.onclick=()=>{const w=open('','_blank');if(!w){toast('Le navigateur a bloqué le nouvel onglet.');return}w.document.open();w.document.write(ui.previewFrame.srcdoc||'');w.document.close()};
  ui.addFileBtn.onclick=()=>openModal('file');ui.addFolderBtn.onclick=()=>openModal('folder');ui.collapseBtn.onclick=()=>{state.openFolders.clear();renderTree()};ui.findBtn.onclick=()=>{ui.searchBox.classList.remove('hidden');ui.searchInput.focus()};ui.closeSearchBtn.onclick=()=>ui.searchBox.classList.add('hidden');ui.searchInput.oninput=()=>{const q=ui.searchInput.value,t=ui.codeEditor.value;if(!q){ui.searchResult.textContent='0 résultat';return}let c=0,i=0;while((i=t.indexOf(q,i))!==-1){c++;i+=Math.max(1,q.length)}ui.searchResult.textContent=`${c} résultat${c>1?'s':''}`;const at=t.indexOf(q);if(at>=0){ui.codeEditor.focus();ui.codeEditor.selectionStart=at;ui.codeEditor.selectionEnd=at+q.length}};ui.formatBtn.onclick=()=>{const e=ext(state.active);let v=ui.codeEditor.value;if(['html','htm'].includes(e)){v=v.replace(/>\s*</g,'>\n<').split('\n').filter(Boolean).map(s=>s.trim()).join('\n')}else if(e==='css'){v=v.replace(/\{/g,'{\n').replace(/\}/g,'\n}').replace(/;/g,';\n').split('\n').filter(Boolean).map(s=>s.trim()).join('\n')}ui.codeEditor.value=v;editorInput();toast('Formatage appliqué.')};
  document.querySelectorAll('.device').forEach(b=>b.onclick=()=>{state.device=b.dataset.device;ui.previewStage.classList.remove('tablet','mobile');if(state.device!=='desktop')ui.previewStage.classList.add(state.device);document.querySelectorAll('.device').forEach(x=>x.classList.toggle('active',x===b))});
  ui.modalConfirmBtn.onclick=modalSubmit;ui.modalCancelBtn.onclick=closeModal;ui.modalCloseBtn.onclick=closeModal;ui.confirmCancelBtn.onclick=()=>{ui.confirmModal.classList.add('hidden');state.confirmAction=null};ui.confirmCloseBtn.onclick=()=>{ui.confirmModal.classList.add('hidden');state.confirmAction=null};ui.confirmOkBtn.onclick=()=>{if(state.confirmAction)state.confirmAction()};
  ui.contextMenu.onclick=e=>{const act=e.target.closest('button')?.dataset.action,p=state.contextPath,t=state.contextType;if(!act||!p)return;hideContext();if(act==='open'){t==='file'?openFile(p):(state.openFolders.has(p)?state.openFolders.delete(p):state.openFolders.add(p),renderTree())}else if(act==='rename')openModal('rename',p);else if(act==='duplicate'){const target=uniqueCopy(p);if(t==='file'){const f=state.files.get(p);addFile(target,f.binary?new Uint8Array(f.content):f.content,f.binary)}else{const pre=p+'/';addFolder(target);[...state.folders].filter(x=>x.startsWith(pre)).forEach(x=>addFolder(target+x.slice(p.length)));[...state.files.entries()].filter(([x])=>x.startsWith(pre)).forEach(([x,f])=>addFile(target+x.slice(p.length),f.binary?new Uint8Array(f.content):f.content,f.binary))}renderTree();save();toast('Dupliqué.')}else if(act==='delete')askDelete()};
  document.addEventListener('click',e=>{if(!e.target.closest('#contextMenu'))hideContext();if(!e.target.closest('#searchBox')&&!e.target.closest('#findBtn'))ui.searchBox.classList.add('hidden')});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();ui.confirmModal.classList.add('hidden');ui.searchBox.classList.add('hidden');hideContext()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();downloadFile()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f'){e.preventDefault();ui.searchBox.classList.remove('hidden');ui.searchInput.focus()}});
  setupPreviewLinks();
  load();renderTree();if(state.active)openFile(state.active);else updateEditor();buildPreview();
})();