(() => {
    "use strict";

    const STORAGE_KEY = "webcode-project-v1";

    const state = {
        projectName: "MonProjet",
        files: new Map(),
        folders: new Set(),
        activeFile: "index.html",
        openFolders: new Set(),
        modalMode: null,
        modalPath: null,
        confirmAction: null,
        previewDevice: "desktop",
        previewHtml: "",
        saveTimer: null,
        previewTimer: null,
        contextPath: null,
        contextType: null,
        importing: false
    };

    const $ = id => document.getElementById(id);

    const ui = {
        newProjectBtn: $("newProjectBtn"),
        importBtn: $("importBtn"),
        downloadFileBtn: $("downloadFileBtn"),
        downloadProjectBtn: $("downloadProjectBtn"),
        previewBtn: $("previewBtn"),
        addFileBtn: $("addFileBtn"),
        addFolderBtn: $("addFolderBtn"),
        collapseBtn: $("collapseBtn"),
        fileCount: $("fileCount"),
        fileTree: $("fileTree"),
        fileIcon: $("fileIcon"),
        activeFileName: $("activeFileName"),
        dirtyDot: $("dirtyDot"),
        codeEditor: $("codeEditor"),
        lineNumbers: $("lineNumbers"),
        cursorInfo: $("cursorInfo"),
        languageInfo: $("languageInfo"),
        sizeInfo: $("sizeInfo"),
        findBtn: $("findBtn"),
        formatBtn: $("formatBtn"),
        previewFrame: $("previewFrame"),
        previewFileName: $("previewFileName"),
        previewAddress: $("previewAddress"),
        refreshPreviewBtn: $("refreshPreviewBtn"),
        openPreviewBtn: $("openPreviewBtn"),
        previewStage: $("previewStage"),
        searchBox: $("searchBox"),
        searchInput: $("searchInput"),
        searchResult: $("searchResult"),
        closeSearchBtn: $("closeSearchBtn"),
        contextMenu: $("contextMenu"),
        modal: $("modal"),
        modalTitle: $("modalTitle"),
        modalText: $("modalText"),
        modalLabel: $("modalLabel"),
        modalInput: $("modalInput"),
        modalError: $("modalError"),
        modalConfirmBtn: $("modalConfirmBtn"),
        modalCancelBtn: $("modalCancelBtn"),
        modalCloseBtn: $("modalCloseBtn"),
        confirmModal: $("confirmModal"),
        confirmTitle: $("confirmTitle"),
        confirmText: $("confirmText"),
        confirmOkBtn: $("confirmOkBtn"),
        confirmCancelBtn: $("confirmCancelBtn"),
        confirmCloseBtn: $("confirmCloseBtn"),
        fileInput: $("fileInput"),
        toastContainer: $("toastContainer")
    };

    function normalizePath(path) {
        if (!path) return "";
        const parts = String(path).replace(/\\/g, "/").split("/");
        const clean = [];
        for (const part of parts) {
            if (!part || part === ".") continue;
            if (part === "..") { clean.pop(); continue; }
            clean.push(part);
        }
        return clean.join("/");
    }

    function fileName(path) {
        const p = normalizePath(path);
        const i = p.lastIndexOf("/");
        return i === -1 ? p : p.slice(i + 1);
    }

    function parentPath(path) {
        const p = normalizePath(path);
        const i = p.lastIndexOf("/");
        return i === -1 ? "" : p.slice(0, i);
    }

    function extension(path) {
        const n = fileName(path);
        const i = n.lastIndexOf(".");
        return i === -1 ? "" : n.slice(i + 1).toLowerCase();
    }

    function language(path) {
        const map = {
            html: "HTML", htm: "HTML", css: "CSS", js: "JavaScript", mjs: "JavaScript", cjs: "JavaScript",
            json: "JSON", md: "Markdown", txt: "Text", svg: "SVG", xml: "XML", php: "PHP", py: "Python",
            ts: "TypeScript", tsx: "TSX", jsx: "JSX", vue: "Vue", svelte: "Svelte"
        };
        return map[extension(path)] || "Plain Text";
    }

    function isText(path) {
        return ["html","htm","css","js","mjs","cjs","json","md","txt","svg","xml","php","py","ts","tsx","jsx","vue","svelte","sql","yaml","yml","toml","ini","sh","bat"].includes(extension(path));
    }

    function mime(path) {
        const map = {
            html:"text/html", htm:"text/html", css:"text/css", js:"text/javascript", mjs:"text/javascript", cjs:"text/javascript",
            json:"application/json", txt:"text/plain", md:"text/markdown", svg:"image/svg+xml", xml:"application/xml",
            png:"image/png", jpg:"image/jpeg", jpeg:"image/jpeg", gif:"image/gif", webp:"image/webp", ico:"image/x-icon",
            mp3:"audio/mpeg", wav:"audio/wav", mp4:"video/mp4", webm:"video/webm", woff:"font/woff", woff2:"font/woff2", ttf:"font/ttf", otf:"font/otf"
        };
        return map[extension(path)] || "application/octet-stream";
    }

    function formatBytes(bytes) {
        if (!bytes) return "0 B";
        const units = ["B","KB","MB","GB"];
        let i = 0, n = bytes;
        while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
        return `${n.toFixed(i === 0 ? 0 : n >= 10 ? 0 : 1)} ${units[i]}`;
    }

    function toast(message) {
        const el = document.createElement("div");
        el.className = "toast";
        el.textContent = message;
        ui.toastContainer.appendChild(el);
        setTimeout(() => el.remove(), 3200);
    }

    function ensureParents(path) {
        const parent = parentPath(path);
        if (!parent) return;
        const parts = parent.split("/");
        let current = "";
        for (const part of parts) {
            current = current ? `${current}/${part}` : part;
            state.folders.add(current);
        }
    }

    function addFile(path, content, binary = false) {
        path = normalizePath(path);
        if (!path || state.folders.has(path)) return false;
        state.files.set(path, { path, type:"file", binary, content, mime:mime(path) });
        ensureParents(path);
        return true;
    }

    function addFolder(path) {
        path = normalizePath(path);
        if (!path || state.files.has(path)) return false;
        state.folders.add(path);
        ensureParents(path);
        return true;
    }

    function defaultProject() {
        state.projectName = "MonProjet";
        state.files.clear();
        state.folders.clear();
        state.openFolders.clear();

        addFile("index.html", `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mon site</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <main class="hero">
        <p class="eyebrow">WEBCODE</p>
        <h1>Ton site commence ici.</h1>
        <p class="intro">Modifie les fichiers à gauche et regarde le résultat apparaître instantanément.</p>
        <button id="testButton">Tester JavaScript</button>
    </main>
    <script src="script.js"><\/script>
</body>
</html>`);

        addFile("style.css", `* {
    box-sizing: border-box;
}

body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    background: #0b1020;
    color: white;
    font-family: Arial, sans-serif;
}

.hero {
    max-width: 700px;
    padding: 48px;
    text-align: center;
}

.eyebrow {
    color: #7f9cff;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: .2em;
}

h1 {
    margin: 10px 0;
    font-size: clamp(36px, 7vw, 72px);
}

.intro {
    color: #aab4c5;
    line-height: 1.7;
}

button {
    margin-top: 18px;
    border: 0;
    border-radius: 10px;
    padding: 13px 18px;
    background: #6d93ff;
    color: white;
    cursor: pointer;
}`);

        addFile("script.js", `const button = document.getElementById("testButton");

if (button) {
    button.addEventListener("click", () => {
        alert("JavaScript fonctionne !");
    });
}`);

        state.activeFile = "index.html";
    }

    function saveProject() {
        const data = {
            projectName: state.projectName,
            activeFile: state.activeFile,
            folders: [...state.folders],
            files: [...state.files.values()]
                .filter(f => !f.binary)
                .map(f => ({ path:f.path, content:f.content, binary:false }))
        };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
        catch (e) { console.warn("Sauvegarde locale impossible :", e); }
    }

    function loadProject() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) { defaultProject(); return; }
            const data = JSON.parse(raw);
            state.projectName = data.projectName || "MonProjet";
            state.files.clear(); state.folders.clear();
            if (Array.isArray(data.folders)) data.folders.forEach(f => state.folders.add(normalizePath(f)));
            if (Array.isArray(data.files)) data.files.forEach(f => f?.path && addFile(f.path, f.content || "", false));
            const requested = normalizePath(data.activeFile || "");
            state.activeFile = state.files.has(requested) ? requested : (state.files.keys().next().value || null);
            if (!state.files.size) defaultProject();
        } catch (e) {
            console.warn("Projet local invalide :", e);
            defaultProject();
        }
    }

    function scheduleSave() {
        clearTimeout(state.saveTimer);
        state.saveTimer = setTimeout(saveProject, 300);
    }

    function openFile(path) {
        const f = state.files.get(path);
        if (!f) return;
        state.activeFile = path;
        ui.codeEditor.disabled = !!f.binary;
        ui.codeEditor.value = f.binary ? "// Fichier binaire — non éditable" : (f.content || "");
        updateEditorUI();
        renderTree();
        schedulePreview();
    }

    function updateEditorUI() {
        const path = state.activeFile;
        const f = path ? state.files.get(path) : null;
        if (!f) {
            ui.activeFileName.textContent = "Aucun fichier";
            ui.fileIcon.textContent = "";
            ui.languageInfo.textContent = "Plain Text";
            ui.sizeInfo.textContent = "0 B";
            ui.codeEditor.value = "";
            updateLines(); updateCursor();
            return;
        }
        ui.activeFileName.textContent = fileName(path);
        ui.previewFileName.textContent = fileName(path);
        ui.previewAddress.textContent = `preview://${path}`;
        ui.fileIcon.textContent = icon(path);
        ui.languageInfo.textContent = language(path);
        const text = f.binary ? "" : (f.content || "");
        ui.sizeInfo.textContent = formatBytes(new Blob([text]).size);
        ui.dirtyDot.classList.remove("hidden");
        setTimeout(() => ui.dirtyDot.classList.add("hidden"), 450);
        updateLines(); updateCursor();
    }

    function updateLines() {
        const count = Math.max(1, ui.codeEditor.value.split("\n").length);
        ui.lineNumbers.textContent = Array.from({length:count}, (_, i) => i + 1).join("\n");
    }

    function syncScroll() { ui.lineNumbers.scrollTop = ui.codeEditor.scrollTop; }

    function updateCursor() {
        const pos = ui.codeEditor.selectionStart || 0;
        const parts = ui.codeEditor.value.slice(0, pos).split("\n");
        ui.cursorInfo.textContent = `Ln ${parts.length}, Col ${parts.at(-1).length + 1}`;
    }

    function onEditorInput() {
        if (!state.activeFile) return;
        const f = state.files.get(state.activeFile);
        if (!f || f.binary) return;
        f.content = ui.codeEditor.value;
        updateEditorUI();
        scheduleSave();
        schedulePreview();
    }

    function handleTab(e) {
        if (e.key !== "Tab") return;
        e.preventDefault();
        const start = ui.codeEditor.selectionStart;
        const end = ui.codeEditor.selectionEnd;
        const value = ui.codeEditor.value;
        ui.codeEditor.value = value.slice(0, start) + "    " + value.slice(end);
        ui.codeEditor.selectionStart = start + 4;
        ui.codeEditor.selectionEnd = start + 4;
        onEditorInput();
    }

    function newFileContent(name) {
        const ext = extension(name);
        if (ext === "html" || ext === "htm") return `<!DOCTYPE html>\n<html lang="fr">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Nouvelle page</title>\n</head>\n<body>\n\n</body>\n</html>`;
        if (ext === "css") return `* {\n    box-sizing: border-box;\n}\n\nbody {\n    margin: 0;\n}`;
        if (["js","mjs","cjs"].includes(ext)) return `// Nouveau fichier JavaScript`;
        if (ext === "json") return `{\n    \n}`;
        return "";
    }

    function openModal(mode, currentPath = "") {
        state.modalMode = mode; state.modalPath = currentPath;
        ui.modal.classList.remove("hidden"); ui.modalError.textContent = "";
        if (mode === "file") {
            ui.modalTitle.textContent = "Nouveau fichier"; ui.modalText.textContent = "Crée un fichier dans ton projet.";
            ui.modalLabel.textContent = "Nom du fichier"; ui.modalInput.placeholder = "exemple.html"; ui.modalInput.value = "";
        } else if (mode === "folder") {
            ui.modalTitle.textContent = "Nouveau dossier"; ui.modalText.textContent = "Crée un dossier dans ton projet.";
            ui.modalLabel.textContent = "Nom du dossier"; ui.modalInput.placeholder = "images"; ui.modalInput.value = "";
        } else {
            ui.modalTitle.textContent = "Renommer"; ui.modalText.textContent = "Le nom doit rester unique dans le même dossier.";
            ui.modalLabel.textContent = "Nouveau nom"; ui.modalInput.placeholder = fileName(currentPath); ui.modalInput.value = fileName(currentPath);
        }
        ui.modalInput.focus(); ui.modalInput.select();
    }

    function closeModal() {
        ui.modal.classList.add("hidden");
        state.modalMode = null; state.modalPath = null; ui.modalError.textContent = "";
    }

    function modalSubmit() {
        const raw = ui.modalInput.value.trim();
        const clean = normalizePath(raw);
        if (!clean) { ui.modalError.textContent = "Le nom ne peut pas être vide."; return; }
        if (clean.includes("/") && !["file","folder"].includes(state.modalMode)) { ui.modalError.textContent = "Utilise seulement un nom ici."; return; }
        if (state.modalMode === "file") {
            if (state.files.has(clean) || state.folders.has(clean)) { ui.modalError.textContent = "Ce nom existe déjà."; return; }
            addFile(clean, newFileContent(clean)); openFile(clean); toast("Fichier créé.");
        } else if (state.modalMode === "folder") {
            if (state.files.has(clean) || state.folders.has(clean)) { ui.modalError.textContent = "Ce nom existe déjà."; return; }
            addFolder(clean); state.openFolders.add(clean); renderTree(); scheduleSave(); toast("Dossier créé.");
        } else {
            renamePath(state.modalPath, clean);
        }
        closeModal();
    }

    function icon(path) {
        const ext = extension(path);
        const map = {html:"◇",htm:"◇",css:"#",js:"JS",mjs:"JS",cjs:"JS",json:"{}",svg:"◇",png:"▧",jpg:"▧",jpeg:"▧",gif:"▧",webp:"▧",mp3:"♫",mp4:"▶",txt:"T"};
        return map[ext] || "•";
    }

    function uniqueCopyFilePath(path) {
        const parent = parentPath(path), name = fileName(path), ext = extension(path);
        const base = ext ? name.slice(0, -(ext.length + 1)) : name;
        let i = 1;
        let candidate;
        do {
            candidate = `${parent ? parent + "/" : ""}${base} copy${i > 1 ? " " + i : ""}${ext ? "." + ext : ""}`;
            i++;
        } while (state.files.has(candidate) || state.folders.has(candidate));
        return candidate;
    }

    function renamePath(oldPath, newName) {
        const type = state.files.has(oldPath) ? "file" : state.folders.has(oldPath) ? "folder" : null;
        if (!type) return;
        const target = parentPath(oldPath) ? `${parentPath(oldPath)}/${newName}` : newName;
        if (target !== oldPath && (state.files.has(target) || state.folders.has(target))) { toast("Ce nom existe déjà."); return; }

        if (type === "file") {
            const f = state.files.get(oldPath); state.files.delete(oldPath); f.path = target; state.files.set(target, f);
            if (state.activeFile === oldPath) state.activeFile = target;
        } else {
            const prefix = oldPath + "/";
            const folders = [...state.folders].filter(p => p === oldPath || p.startsWith(prefix)).sort((a,b) => a.length - b.length);
            const files = [...state.files.entries()].filter(([p]) => p.startsWith(prefix));
            folders.forEach(p => state.folders.delete(p)); files.forEach(([p]) => state.files.delete(p));
            folders.forEach(p => state.folders.add(p === oldPath ? target : target + p.slice(oldPath.length)));
            files.forEach(([p,f]) => { const np = target + p.slice(oldPath.length); f.path = np; state.files.set(np,f); });
            if (state.activeFile === oldPath || state.activeFile?.startsWith(prefix)) state.activeFile = target + state.activeFile.slice(oldPath.length);
        }
        renderTree(); updateEditorUI(); scheduleSave(); schedulePreview(); toast("Nom modifié.");
    }

    function requestDelete(path, type) {
        state.contextPath = path; state.contextType = type;
        ui.confirmTitle.textContent = type === "folder" ? "Supprimer le dossier ?" : "Supprimer le fichier ?";
        ui.confirmText.textContent = type === "folder" ? `Le dossier « ${fileName(path)} » et son contenu seront supprimés.` : `Le fichier « ${fileName(path)} » sera supprimé.`;
        ui.confirmModal.classList.remove("hidden");
        state.confirmAction = () => {
            if (type === "file") {
                state.files.delete(path);
            } else {
                const prefix = path + "/";
                [...state.files.keys()].forEach(p => { if (p === path || p.startsWith(prefix)) state.files.delete(p); });
                [...state.folders].forEach(p => { if (p === path || p.startsWith(prefix)) state.folders.delete(p); });
            }
            if (state.activeFile === path || state.activeFile?.startsWith(path + "/")) state.activeFile = state.files.keys().next().value || null;
            closeConfirm(); renderTree();
            if (state.activeFile) openFile(state.activeFile); else { ui.codeEditor.value = ""; updateEditorUI(); }
            scheduleSave(); schedulePreview(); toast("Suppression effectuée.");
        };
    }

    function closeConfirm() { ui.confirmModal.classList.add("hidden"); state.confirmAction = null; }

    function duplicate(path, type) {
        if (type === "file") {
            const f = state.files.get(path); if (!f) return;
            const target = uniqueCopyFilePath(path);
            const content = f.binary ? new Uint8Array(f.content) : f.content;
            addFile(target, content, f.binary); renderTree(); scheduleSave(); toast("Fichier dupliqué."); return;
        }
        const base = fileName(path); const parent = parentPath(path); let i = 1;
        let root;
        do { root = `${parent ? parent + "/" : ""}${base} copy${i > 1 ? " " + i : ""}`; i++; } while (state.folders.has(root) || state.files.has(root));
        const prefix = path + "/";
        [...state.folders].filter(p => p === path || p.startsWith(prefix)).forEach(p => state.folders.add(p === path ? root : root + p.slice(path.length)));
        [...state.files.entries()].filter(([p]) => p.startsWith(prefix)).forEach(([p,f]) => { const np = root + p.slice(path.length); addFile(np, f.binary ? new Uint8Array(f.content) : f.content, f.binary); });
        renderTree(); scheduleSave(); toast("Dossier dupliqué.");
    }

    function renderTree() {
        ui.fileTree.innerHTML = "";
        const root = { folders:new Map(), files:[] };
        for (const path of state.folders) insertTree(root, path, "folder");
        for (const path of state.files.keys()) insertTree(root, path, "file");
        renderLevel(root, ui.fileTree, 0);
        const n = state.files.size;
        ui.fileCount.textContent = `${n} fichier${n !== 1 ? "s" : ""}`;
    }

    function insertTree(root, path, type) {
        const parts = normalizePath(path).split("/"); let node = root;
        parts.forEach((part,i) => {
            const last = i === parts.length - 1;
            if (last) {
                if (type === "file") node.files.push({name:part,path});
                else if (!node.folders.has(part)) node.folders.set(part,{name:part,path,folders:new Map(),files:[]});
                return;
            }
            if (!node.folders.has(part)) node.folders.set(part,{name:part,path:parts.slice(0,i+1).join("/"),folders:new Map(),files:[]});
            node = node.folders.get(part);
        });
    }

    function renderLevel(node, container, depth) {
        const folders = [...node.folders.values()].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:"base"}));
        const files = [...node.files].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:"base"}));
        for (const folder of folders) {
            const row = document.createElement("div"); row.className = "tree-row"; row.style.paddingLeft = `${7 + depth*16}px`; row.dataset.path=folder.path; row.dataset.type="folder";
            const open = state.openFolders.has(folder.path);
            row.innerHTML = `<span class="arrow">${open ? "▾":"▸"}</span><span class="icon">▰</span><span class="name"></span><span class="more">⋮</span>`;
            row.querySelector(".name").textContent = folder.name;
            row.addEventListener("click",()=>{ open ? state.openFolders.delete(folder.path) : state.openFolders.add(folder.path); renderTree(); });
            row.addEventListener("contextmenu",e=>{e.preventDefault();showContext(e.clientX,e.clientY,folder.path,"folder")});
            container.appendChild(row);
            const children = document.createElement("div"); children.className="children"; if(!open) children.classList.add("hidden"); renderLevel(folder,children,depth+1); container.appendChild(children);
        }
        for (const file of files) {
            const row = document.createElement("div"); row.className="tree-row"; row.style.paddingLeft=`${7+depth*16}px`; row.dataset.path=file.path; row.dataset.type="file";
            if(state.activeFile===file.path) row.classList.add("active");
            row.innerHTML = `<span class="arrow"></span><span class="icon"></span><span class="name"></span><span class="more">⋮</span>`;
            row.querySelector(".icon").textContent=icon(file.path); row.querySelector(".name").textContent=file.name;
            row.addEventListener("click",()=>openFile(file.path)); row.addEventListener("contextmenu",e=>{e.preventDefault();showContext(e.clientX,e.clientY,file.path,"file")}); container.appendChild(row);
        }
    }

    function showContext(x,y,path,type) {
        state.contextPath=path; state.contextType=type; ui.contextMenu.classList.remove("hidden");
        const w=175,h=180; ui.contextMenu.style.left=`${Math.max(5,Math.min(x,window.innerWidth-w-5))}px`; ui.contextMenu.style.top=`${Math.max(5,Math.min(y,window.innerHeight-h-5))}px`;
    }

    function hideContext(){ui.contextMenu.classList.add("hidden");}
    function openSearch(){ui.searchBox.classList.remove("hidden");ui.searchInput.focus();ui.searchInput.select();}
    function searchCode(){const q=ui.searchInput.value;const text=ui.codeEditor.value;if(!q){ui.searchResult.textContent="0 résultat";return;}let count=0,at=0;while(true){const i=text.indexOf(q,at);if(i===-1)break;count++;at=i+Math.max(1,q.length)}ui.searchResult.textContent=`${count} résultat${count!==1?"s":""}`;if(count){const i=text.indexOf(q);ui.codeEditor.focus();ui.codeEditor.selectionStart=i;ui.codeEditor.selectionEnd=i+q.length;}}

    function formatCode() {
        const path=state.activeFile;if(!path||!isText(path))return;const ext=extension(path);let code=ui.codeEditor.value;
        if(ext==="html"||ext==="htm")code=formatHtml(code); else if(ext==="css")code=formatCss(code);
        ui.codeEditor.value=code;onEditorInput();toast("Formatage appliqué.");
    }
    function formatHtml(code){const out=[];let indent=0;for(let line of code.replace(/>\s*</g,">\n<").split("\n")){line=line.trim();if(!line)continue;if(/^<\/[^>]+>/.test(line))indent=Math.max(0,indent-1);out.push("    ".repeat(indent)+line);if(/^<[^/!][^>]*>$/.test(line)&&!/\/>$/.test(line)&&!/^<(meta|link|img|input|br|hr)\b/i.test(line))indent++;}return out.join("\n");}
    function formatCss(code){const out=[];let indent=0;for(let line of code.replace(/\{/g,"{\n").replace(/\}/g,"\n}\n").replace(/;/g,";\n").split("\n")){line=line.trim();if(!line)continue;if(line.startsWith("}"))indent=Math.max(0,indent-1);out.push("    ".repeat(indent)+line);if(line.endsWith("{"))indent++;}return out.join("\n");}

    function findMainHtml(){if(state.files.has("index.html"))return "index.html";for(const path of state.files.keys())if(["html","htm"].includes(extension(path)))return path;return null;}

    function toDataUrl(bytes,type){let binary="";const arr=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);const chunk=0x8000;for(let i=0;i<arr.length;i+=chunk)binary+=String.fromCharCode(...arr.subarray(i,i+chunk));return `data:${type};base64,${btoa(binary)}`;}

    function resolveProjectPath(current,target){
        if(!target)return null; target=target.trim();
        if(/^(?:https?:|data:|blob:|mailto:|tel:|javascript:|#|\/\/)/i.test(target))return null;
        target=target.split("?")[0].split("#")[0]; if(!target)return null;
        const parent=parentPath(current); return normalizePath(parent?`${parent}/${target}`:target);
    }

    function buildPreviewDocument(mainPath){
        const main=state.files.get(mainPath); if(!main||main.binary)return "";
        const binaryUrls=new Map();
        for(const [path,f] of state.files){if(f.binary)binaryUrls.set(path,toDataUrl(f.content,f.mime));}
        const resolveBinary=(current,target)=>{const p=resolveProjectPath(current,target);return p?binaryUrls.get(p)||null:null;};
        const css=(path,stack=new Set())=>{if(stack.has(path))return "";const f=state.files.get(path);if(!f||f.binary)return "";stack.add(path);let s=f.content||"";s=s.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi,(full,q,t)=>{const u=resolveBinary(path,t);return u?`url("${u}")`:full;});s=s.replace(/@import\s+(?:url\(\s*)?(['"])(.*?)\1\s*\)?/gi,(full,q,t)=>{const p=resolveProjectPath(path,t);const x=p?state.files.get(p):null;if(x&& !x.binary && extension(p)==="css")return css(p,stack);return full;});stack.delete(path);return s;};
        let html=main.content||"";
        html=html.replace(/<link\b[^>]*\brel\s*=\s*["']stylesheet["'][^>]*>/gi,tag=>{const m=tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);if(!m)return tag;const p=resolveProjectPath(mainPath,m[1]);const f=p?state.files.get(p):null;return f&& !f.binary && extension(p)==="css"?`<style>\n${css(p)}\n</style>`:tag;});
        html=html.replace(/<script\b([^>]*?)\bsrc\s*=\s*["']([^"']+)["']([^>]*)>\s*<\/script>/gi,(full,before,target,after)=>{const p=resolveProjectPath(mainPath,target);const f=p?state.files.get(p):null;if(!f||f.binary||!["js","mjs","cjs"].includes(extension(p)))return full;return `<script>\n${String(f.content).replace(/<\/script/gi,"<\\/script")}\n<\/script>`;});
        html=html.replace(/\b(?:src|poster|href)\s*=\s*(["'])(.*?)\1/gi,(full,q,target)=>{const u=resolveBinary(mainPath,target);return u?full.replace(target,u):full;});
        html=html.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi,(full,q,t)=>{const u=resolveBinary(mainPath,t);return u?`url("${u}")`:full;});
        html=html.replace(/\bhref\s*=\s*(["'])([^"']+\.html?)(?:#[^"']*)?\1/gi,(full,q,target)=>{const p=resolveProjectPath(mainPath,target);return p&&state.files.has(p)?`href="preview-page:${p.replace(/"/g,"&quot;")}"`:full;});
        const bridge=`<script>
document.addEventListener("click",function(e){const a=e.target.closest("a");if(!a)return;const h=a.getAttribute("href")||"";if(!h.startsWith("preview-page:"))return;e.preventDefault();parent.postMessage({type:"webcode-navigate",path:h.slice(14)},"*");});
<\/script>`;
        return html.replace(/<\/body>/i,bridge+"</body>");
    }

    function postPreviewPage(path){const html=buildPreviewDocument(path);if(!html)return;state.previewHtml=html;ui.previewFrame.srcdoc=html;ui.previewFileName.textContent=fileName(path);ui.previewAddress.textContent=`preview://${path}`;}
    function buildPreview(){const main=findMainHtml();if(!main){state.previewHtml="";ui.previewFrame.srcdoc="<!doctype html><html><body style='font-family:Arial;padding:40px'><h2>Aucun fichier HTML</h2><p>Crée un fichier index.html pour lancer le preview.</p></body></html>";toast("Aucun fichier HTML trouvé.");return;}postPreviewPage(main);}
    function schedulePreview(){clearTimeout(state.previewTimer);state.previewTimer=setTimeout(buildPreview,350);}
    function openPreviewTab(){if(!state.previewHtml)buildPreview();const win=window.open("","_blank");if(!win){toast("Le navigateur a bloqué le nouvel onglet.");return;}win.document.open();win.document.write(state.previewHtml);win.document.close();}
    function setDevice(device){state.previewDevice=device;ui.previewStage.classList.remove("tablet","mobile");if(device!=="desktop")ui.previewStage.classList.add(device);document.querySelectorAll(".device").forEach(b=>b.classList.toggle("active",b.dataset.device===device));}

    function downloadBlob(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    async function downloadCurrentFile(){if(!state.activeFile){toast("Aucun fichier sélectionné.");return;}const f=state.files.get(state.activeFile);if(!f)return;downloadBlob(new Blob([f.content],{type:f.mime+(!f.binary?";charset=utf-8":"")}),fileName(f.path));toast("Fichier téléchargé.");}
    async function downloadProject(){if(typeof JSZip==="undefined"){toast("La bibliothèque ZIP n'est pas disponible.");return;}const zip=new JSZip();for(const folder of state.folders)zip.folder(folder);for(const f of state.files.values())zip.file(f.path,f.content);const blob=await zip.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:6}});downloadBlob(blob,`${(state.projectName||"MonProjet").replace(/[<>:"/\\|?*]/g,"_")}.zip`);toast("Projet ZIP téléchargé.");}

    async function importFiles(files){if(state.importing)return;state.importing=true;let added=0;try{for(const file of files){const path=normalizePath(file.webkitRelativePath||file.name);if(!path)continue;if(path.toLowerCase().endsWith(".zip")){await importZip(file);continue;}if(state.files.has(path)||state.folders.has(path)){if(!window.confirm(`« ${path} » existe déjà.\n\nRemplacer le fichier ?`))continue;}if(isText(path))addFile(path,await file.text(),false);else addFile(path,new Uint8Array(await file.arrayBuffer()),true);added++;}if(added){const index=[...state.files.keys()].find(p=>p.toLowerCase()==="index.html");state.activeFile=index||state.activeFile||state.files.keys().next().value;renderTree();if(state.activeFile)openFile(state.activeFile);scheduleSave();schedulePreview();toast(`${added} fichier${added>1?"s":""} importé${added>1?"s":""}.`);}}finally{state.importing=false;ui.fileInput.value="";}}

    async function importZip(file){if(typeof JSZip==="undefined"){toast("La bibliothèque ZIP n'est pas disponible.");return;}try{const zip=await JSZip.loadAsync(file);let count=0;const entries=[];zip.forEach((path,entry)=>entries.push({path:normalizePath(path),entry}));for(const item of entries){if(!item.path)continue;if(item.entry.dir){addFolder(item.path);continue;}if(state.files.has(item.path)||state.folders.has(item.path)){if(!window.confirm(`« ${item.path} » existe déjà.\n\nRemplacer le fichier ?`))continue;}if(isText(item.path))addFile(item.path,await item.entry.async("string"),false);else addFile(item.path,await item.entry.async("uint8array"),true);count++;}const index=[...state.files.keys()].find(p=>p.toLowerCase()==="index.html");state.activeFile=index||state.activeFile||state.files.keys().next().value;renderTree();if(state.activeFile)openFile(state.activeFile);scheduleSave();schedulePreview();toast(`Projet ZIP importé : ${count} fichier${count>1?"s":""}.`);}catch(e){console.error(e);toast("Impossible de lire ce fichier ZIP.");}}

    function setupEvents(){
        ui.newProjectBtn.addEventListener("click",()=>{ui.confirmTitle.textContent="Nouveau projet ?";ui.confirmText.textContent="Le projet actuellement ouvert sera remplacé.";ui.confirmModal.classList.remove("hidden");state.confirmAction=()=>{defaultProject();renderTree();openFile("index.html");scheduleSave();buildPreview();closeConfirm();toast("Nouveau projet créé.");};});
        ui.importBtn.addEventListener("click",()=>{ui.fileInput.value="";ui.fileInput.click();});
        ui.fileInput.addEventListener("change",()=>importFiles([...ui.fileInput.files]));
        ui.downloadFileBtn.addEventListener("click",downloadCurrentFile); ui.downloadProjectBtn.addEventListener("click",downloadProject); ui.previewBtn.addEventListener("click",buildPreview);
        ui.refreshPreviewBtn.addEventListener("click",buildPreview); ui.openPreviewBtn.addEventListener("click",openPreviewTab);
        ui.addFileBtn.addEventListener("click",()=>openModal("file")); ui.addFolderBtn.addEventListener("click",()=>openModal("folder")); ui.collapseBtn.addEventListener("click",()=>{state.openFolders.clear();renderTree();});
        ui.findBtn.addEventListener("click",openSearch); ui.formatBtn.addEventListener("click",formatCode); ui.codeEditor.addEventListener("input",onEditorInput); ui.codeEditor.addEventListener("scroll",syncScroll); ui.codeEditor.addEventListener("keyup",updateCursor); ui.codeEditor.addEventListener("click",updateCursor); ui.codeEditor.addEventListener("select",updateCursor); ui.codeEditor.addEventListener("keydown",handleTab);
        ui.searchInput.addEventListener("input",searchCode); ui.closeSearchBtn.addEventListener("click",()=>ui.searchBox.classList.add("hidden"));
        document.querySelectorAll(".device").forEach(btn=>btn.addEventListener("click",()=>setDevice(btn.dataset.device)));
        ui.modalConfirmBtn.addEventListener("click",modalSubmit); ui.modalCancelBtn.addEventListener("click",closeModal); ui.modalCloseBtn.addEventListener("click",closeModal); ui.confirmOkBtn.addEventListener("click",()=>{const a=state.confirmAction;if(typeof a==="function")a();}); ui.confirmCancelBtn.addEventListener("click",closeConfirm); ui.confirmCloseBtn.addEventListener("click",closeConfirm);
        ui.modalInput.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();modalSubmit();}if(e.key==="Escape")closeModal();});
        document.addEventListener("keydown",e=>{if(e.key==="Escape"){hideContext();ui.searchBox.classList.add("hidden");if(!ui.modal.classList.contains("hidden"))closeModal();if(!ui.confirmModal.classList.contains("hidden"))closeConfirm();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();downloadCurrentFile();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="f"){e.preventDefault();openSearch();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="p"){e.preventDefault();buildPreview();}});
        document.addEventListener("click",e=>{if(!e.target.closest("#contextMenu"))hideContext();if(!e.target.closest("#searchBox")&&!e.target.closest("#findBtn"))ui.searchBox.classList.add("hidden");});
        ui.contextMenu.addEventListener("click",e=>{const action=e.target.closest("button")?.dataset.action;if(!action||!state.contextPath)return;const path=state.contextPath,type=state.contextType;hideContext();if(action==="open"){if(type==="file")openFile(path);else{state.openFolders.has(path)?state.openFolders.delete(path):state.openFolders.add(path);renderTree();}}else if(action==="rename")openModal("rename",path);else if(action==="duplicate")duplicate(path,type);else if(action==="delete")requestDelete(path,type);});
        document.addEventListener("dragover",e=>e.preventDefault()); document.addEventListener("drop",e=>{e.preventDefault();const files=[...e.dataTransfer.files];if(files.length)importFiles(files);});
        window.addEventListener("beforeunload",saveProject);
    }

    window.addEventListener("message",event=>{if(event.data?.type!=="webcode-navigate")return;const path=normalizePath(event.data.path);if(path&&state.files.has(path))postPreviewPage(path);});

    function init(){loadProject();setupEvents();renderTree();if(state.activeFile&&state.files.has(state.activeFile))openFile(state.activeFile);else{state.activeFile=state.files.keys().next().value||null;if(state.activeFile)openFile(state.activeFile);}setDevice("desktop");buildPreview();}
    init();
})();
/* =========================================================
   AUTO-COMPLÉTION + COLORATION SYNTAXIQUE
   À COLLER À LA FIN DE SCRIPT.JS
   ========================================================= */

(() => {
    "use strict";

    const editor = document.getElementById("codeEditor");

    if (!editor) {
        return;
    }

    /* =====================================================
       STYLE DE LA COLORATION
       ===================================================== */

    const highlightStyle = document.createElement("style");

    highlightStyle.textContent = `
        .webcode-highlight-layer {
            position: absolute;
            inset: 0;

            padding: 16px 18px 40px;

            overflow: hidden;

            pointer-events: none;

            white-space: pre;
            word-wrap: normal;

            font-family:
                "JetBrains Mono",
                "SFMono-Regular",
                Consolas,
                "Liberation Mono",
                monospace;

            font-size: 13px;
            line-height: 22px;

            color: #d9dee7;

            tab-size: 4;

            z-index: 0;
        }

        .editor-wrap {
            position: relative;
        }

        .editor-wrap .code-editor {
            z-index: 1;
            background: transparent;
        }

        .webcode-editor-transparent {
            color: transparent !important;
            -webkit-text-fill-color: transparent !important;
            caret-color: white !important;
        }

        .syntax-tag {
            color: #78a9ff;
        }

        .syntax-attribute {
            color: #d9bd70;
        }

        .syntax-string {
            color: #91d391;
        }

        .syntax-comment {
            color: #687281;
        }

        .syntax-keyword {
            color: #c792ea;
        }

        .syntax-number {
            color: #f4a261;
        }

        .syntax-property {
            color: #82b7ff;
        }

        .syntax-function {
            color: #72d6ca;
        }

        .syntax-selector {
            color: #e89cff;
        }

        .syntax-important {
            color: #ff8b8b;
        }

        .syntax-operator {
            color: #d6a8ff;
        }
    `;

    document.head.appendChild(highlightStyle);


    /* =====================================================
       COUCHE DE COLORATION
       ===================================================== */

    const highlight = document.createElement("pre");

    highlight.className = "webcode-highlight-layer";

    highlight.setAttribute(
        "aria-hidden",
        "true"
    );

    editor.parentElement.insertBefore(
        highlight,
        editor
    );

    editor.classList.add(
        "webcode-editor-transparent"
    );


    /* =====================================================
       ÉCHAPPEMENT HTML
       ===================================================== */

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* =====================================================
       PROTECTION DES TOKENS
       ===================================================== */

    function protectToken(text, className) {
        return `<span class="${className}">${escapeHtml(text)}</span>`;
    }


    /* =====================================================
       COLORATION HTML
       ===================================================== */

    function highlightHTML(code) {
        let result = escapeHtml(code);

        /* Commentaires */
        result = result.replace(
            /(&lt;!--[\s\S]*?--&gt;)/g,
            '<span class="syntax-comment">$1</span>'
        );

        /* Balises */
        result = result.replace(
            /(&lt;\/?)([a-zA-Z][\w:-]*)([\s\S]*?)(\/?&gt;)/g,
            function(
                full,
                opening,
                tagName,
                attributes,
                closing
            ) {
                let coloredAttributes =
                    attributes;

                coloredAttributes =
                    coloredAttributes.replace(
                        /([a-zA-Z_:][\w:.-]*)(=)(&quot;.*?&quot;|&#039;.*?&#039;|[^\s]+)/g,
                        function(
                            attrFull,
                            name,
                            equal,
                            value
                        ) {
                            return (
                                '<span class="syntax-attribute">' +
                                name +
                                '</span>' +
                                equal +
                                '<span class="syntax-string">' +
                                value +
                                '</span>'
                            );
                        }
                    );

                return (
                    escapeHtml(opening) +
                    '<span class="syntax-tag">' +
                    tagName +
                    '</span>' +
                    coloredAttributes +
                    escapeHtml(closing)
                );
            }
        );

        return result;
    }


    /* =====================================================
       COLORATION CSS
       ===================================================== */

    function highlightCSS(code) {
        let result = escapeHtml(code);

        /* Commentaires */
        result = result.replace(
            /(\/\*[\s\S]*?\*\/)/g,
            '<span class="syntax-comment">$1</span>'
        );

        /* Chaînes */
        result = result.replace(
            /(&quot;.*?&quot;|&#039;.*?&#039;)/g,
            '<span class="syntax-string">$1</span>'
        );

        /* Sélecteurs simples */
        result = result.replace(
            /^([^{\n]+)(?=\s*\{)/gm,
            '<span class="syntax-selector">$1</span>'
        );

        /* Propriétés CSS */
        result = result.replace(
            /([a-zA-Z-]+)(?=\s*:)/g,
            '<span class="syntax-property">$1</span>'
        );

        /* Nombres */
        result = result.replace(
            /\b\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|s|ms|deg)?\b/g,
            '<span class="syntax-number">$&</span>'
        );

        /* !important */
        result = result.replace(
            /!important/g,
            '<span class="syntax-important">!important</span>'
        );

        return result;
    }


    /* =====================================================
       COLORATION JAVASCRIPT
       ===================================================== */

    function highlightJS(code) {
        let result = escapeHtml(code);

        /*
         * On remplace d'abord les commentaires et chaînes
         * afin d'éviter de colorer leur contenu comme du code.
         */

        result = result.replace(
            /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
            '<span class="syntax-comment">$1</span>'
        );

        result = result.replace(
            /(`(?:\\.|[^`])*`|&quot;(?:\\.|[^&]|&(?!quot;))*?&quot;|&#039;(?:\\.|[^&]|&(?!#039;))*?&#039;)/g,
            '<span class="syntax-string">$1</span>'
        );

        /* Mots-clés */
        result = result.replace(
            /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|this|true|false|null|undefined)\b/g,
            '<span class="syntax-keyword">$1</span>'
        );

        /* Nombres */
        result = result.replace(
            /\b\d+(?:\.\d+)?\b/g,
            '<span class="syntax-number">$&</span>'
        );

        /* Fonctions */
        result = result.replace(
            /\b([a-zA-Z_$][\w$]*)(?=\s*\()/g,
            '<span class="syntax-function">$1</span>'
        );

        /* Opérateurs */
        result = result.replace(
            /(===|!==|==|!=|=>|\+\+|--|\+=|-=|\*=|\/=|&&|\|\||[=+\-*\/%!<>])/g,
            '<span class="syntax-operator">$1</span>'
        );

        return result;
    }


    /* =====================================================
       DÉTERMINER LE TYPE DE FICHIER
       ===================================================== */

    function getCurrentExtension() {
        const tabName =
            document.getElementById(
                "activeFileName"
            );

        if (!tabName) {
            return "";
        }

        const name =
            tabName.textContent.trim();

        const dot =
            name.lastIndexOf(".");

        if (dot === -1) {
            return "";
        }

        return name
            .slice(dot + 1)
            .toLowerCase();
    }


    /* =====================================================
       COLORATION PRINCIPALE
       ===================================================== */

    function updateHighlight() {
        const code = editor.value;

        const ext =
            getCurrentExtension();

        let html;

        if (
            ext === "html" ||
            ext === "htm"
        ) {
            html = highlightHTML(code);
        } else if (ext === "css") {
            html = highlightCSS(code);
        } else if (
            ext === "js" ||
            ext === "mjs" ||
            ext === "cjs"
        ) {
            html = highlightJS(code);
        } else {
            html = escapeHtml(code);
        }

        /*
         * Un espace à la fin permet de garder la hauteur
         * correcte lorsque le fichier est vide ou finit
         * par une ligne vide.
         */

        highlight.innerHTML =
            html + "\n";

        highlight.scrollTop =
            editor.scrollTop;

        highlight.scrollLeft =
            editor.scrollLeft;
    }


    /* =====================================================
       SYNCHRONISATION DU SCROLL
       ===================================================== */

    editor.addEventListener(
        "scroll",
        function() {
            highlight.scrollTop =
                editor.scrollTop;

            highlight.scrollLeft =
                editor.scrollLeft;
        }
    );


    /* =====================================================
       MISE À JOUR QUAND ON ÉCRIT
       ===================================================== */

    editor.addEventListener(
        "input",
        function() {
            updateHighlight();
        }
    );


    /* =====================================================
       AUTO-FERMETURE DES BALISES HTML
       ===================================================== */

    editor.addEventListener(
        "keydown",
        function(event) {
            if (
                event.key !== ">" ||
                editor.selectionStart !==
                editor.selectionEnd
            ) {
                return;
            }

            const cursor =
                editor.selectionStart;

            const before =
                editor.value.slice(
                    0,
                    cursor
                );

            const match =
                before.match(
                    /<([a-zA-Z][\w:-]*)[^<>]*$/
                );

            if (!match) {
                return;
            }

            const tag =
                match[1].toLowerCase();

            const voidTags = [
                "area",
                "base",
                "br",
                "col",
                "embed",
                "hr",
                "img",
                "input",
                "link",
                "meta",
                "param",
                "source",
                "track",
                "wbr"
            ];

            if (
                voidTags.includes(tag)
            ) {
                return;
            }

            event.preventDefault();

            const after =
                editor.value.slice(
                    cursor
                );

            editor.value =
                before +
                ">" +
                `</${tag}>` +
                after;

            const newCursor =
                cursor + 1;

            editor.selectionStart =
                newCursor;

            editor.selectionEnd =
                newCursor;

            updateHighlight();

            editor.dispatchEvent(
                new Event("input", {
                    bubbles: true
                })
            );
        }
    );


    /* =====================================================
       AUTO-FERMETURE DES ACCOLADES / PARENTHÈSES
       ===================================================== */

    editor.addEventListener(
        "keydown",
        function(event) {
            const pairs = {
                "{": "}",
                "(": ")",
                "[": "]",
                '"': '"',
                "'": "'",
                "`": "`"
            };

            if (!pairs[event.key]) {
                return;
            }

            /*
             * Pour les guillemets simples/doubles/backticks,
             * on évite de doubler lorsqu'on est déjà devant
             * le même caractère fermant.
             */

            const cursor =
                editor.selectionStart;

            const end =
                editor.selectionEnd;

            if (cursor !== end) {
                return;
            }

            const nextChar =
                editor.value.charAt(cursor);

            if (
                (
                    event.key === '"' ||
                    event.key === "'" ||
                    event.key === "`"
                ) &&
                nextChar === pairs[event.key]
            ) {
                event.preventDefault();

                editor.selectionStart =
                    cursor + 1;

                editor.selectionEnd =
                    cursor + 1;

                return;
            }

            event.preventDefault();

            const closing =
                pairs[event.key];

            const before =
                editor.value.slice(
                    0,
                    cursor
                );

            const after =
                editor.value.slice(
                    cursor
                );

            editor.value =
                before +
                event.key +
                closing +
                after;

            editor.selectionStart =
                cursor + 1;

            editor.selectionEnd =
                cursor + 1;

            updateHighlight();

            editor.dispatchEvent(
                new Event("input", {
                    bubbles: true
                })
            );
        }
    );


    /* =====================================================
       ÉVITER DE TAPER DEUX FOIS UNE FERMETURE
       ===================================================== */

    editor.addEventListener(
        "keydown",
        function(event) {
            const closingCharacters = [
                "}",
                ")",
                "]",
                '"',
                "'",
                "`"
            ];

            if (
                !closingCharacters.includes(
                    event.key
                )
            ) {
                return;
            }

            if (
                editor.selectionStart !==
                editor.selectionEnd
            ) {
                return;
            }

            const cursor =
                editor.selectionStart;

            const next =
                editor.value.charAt(cursor);

            if (next !== event.key) {
                return;
            }

            event.preventDefault();

            editor.selectionStart =
                cursor + 1;

            editor.selectionEnd =
                cursor + 1;
        }
    );


    /* =====================================================
       INDENTATION ENTRE { }
       ===================================================== */

    editor.addEventListener(
        "keydown",
        function(event) {
            if (
                event.key !== "Enter" ||
                editor.selectionStart !==
                editor.selectionEnd
            ) {
                return;
            }

            const cursor =
                editor.selectionStart;

            const text =
                editor.value;

            const before =
                text.slice(0, cursor);

            const after =
                text.slice(cursor);

            const previousChar =
                before.slice(-1);

            const nextChar =
                after.charAt(0);

            if (
                previousChar === "{" &&
                nextChar === "}"
            ) {
                event.preventDefault();

                const indentation =
                    getCurrentIndentation(
                        before
                    );

                const innerIndent =
                    indentation + "    ";

                const replacement =
                    "\n" +
                    innerIndent +
                    "\n" +
                    indentation;

                editor.value =
                    before +
                    replacement +
                    after;

                editor.selectionStart =
                    cursor +
                    1 +
                    innerIndent.length;

                editor.selectionEnd =
                    editor.selectionStart;

                updateHighlight();

                editor.dispatchEvent(
                    new Event("input", {
                        bubbles: true
                    })
                );

                return;
            }

            /*
             * Reprendre l'indentation de la ligne actuelle.
             */

            const indentation =
                getCurrentIndentation(
                    before
                );

            if (indentation) {
                event.preventDefault();

                editor.value =
                    before +
                    "\n" +
                    indentation +
                    after;

                editor.selectionStart =
                    cursor +
                    1 +
                    indentation.length;

                editor.selectionEnd =
                    editor.selectionStart;

                updateHighlight();

                editor.dispatchEvent(
                    new Event("input", {
                        bubbles: true
                    })
                );
            }
        }
    );


    /* =====================================================
       CALCUL DE L'INDENTATION
       ===================================================== */

    function getCurrentIndentation(text) {
        const lines =
            text.split("\n");

        const currentLine =
            lines[lines.length - 1];

        const match =
            currentLine.match(
                /^[\t ]*/
            );

        return match
            ? match[0]
            : "";
    }


    /* =====================================================
       INITIALISATION
       ===================================================== */

    updateHighlight();

})();
