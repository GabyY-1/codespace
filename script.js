(() => {
    "use strict";

    const STORAGE_KEY = "webcode-project-clean-v3";

    const state = {
        files: new Map(),
        folders: new Set(),
        activeFile: null,
        openFolders: new Set(),
        modalMode: null,
        modalPath: null,
        contextPath: null,
        contextType: null,
        confirmAction: null,
        saveTimer: null,
        previewTimer: null
    };

    const $ = id => document.getElementById(id);

    const ui = {
        newProjectBtn: $("newProjectBtn"),
        importBtn: $("importBtn"),
        downloadFileBtn: $("downloadFileBtn"),
        downloadProjectBtn: $("downloadProjectBtn"),
        previewBtn: $("previewBtn"),
        newFileBtn: $("newFileBtn"),
        newFolderBtn: $("newFolderBtn"),
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
        binaryPreview: $("binaryPreview"),
        binaryIcon: $("binaryIcon"),
        binaryName: $("binaryName"),
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
        const result = [];
        for (const part of parts) {
            if (!part || part === ".") continue;
            if (part === "..") result.pop();
            else result.push(part);
        }
        return result.join("/");
    }

    function fileName(path) {
        const p = normalizePath(path);
        const index = p.lastIndexOf("/");
        return index === -1 ? p : p.slice(index + 1);
    }

    function parentPath(path) {
        const p = normalizePath(path);
        const index = p.lastIndexOf("/");
        return index === -1 ? "" : p.slice(0, index);
    }

    function extension(path) {
        const name = fileName(path);
        const index = name.lastIndexOf(".");
        return index === -1 ? "" : name.slice(index + 1).toLowerCase();
    }

    function isText(path) {
        return [
            "html", "htm", "css", "js", "mjs", "cjs", "json", "txt", "md",
            "svg", "xml", "php", "py", "ts", "tsx", "jsx", "vue", "svelte",
            "sql", "yaml", "yml", "toml", "ini", "sh", "bat"
        ].includes(extension(path));
    }

    function mime(path) {
        const map = {
            html: "text/html", htm: "text/html", css: "text/css",
            js: "text/javascript", mjs: "text/javascript", cjs: "text/javascript",
            json: "application/json", txt: "text/plain", md: "text/markdown",
            svg: "image/svg+xml", xml: "application/xml", png: "image/png",
            jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
            webp: "image/webp", ico: "image/x-icon", mp3: "audio/mpeg",
            wav: "audio/wav", mp4: "video/mp4", webm: "video/webm",
            woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf"
        };
        return map[extension(path)] || "application/octet-stream";
    }

    function icon(path) {
        const map = {
            html: "◇", htm: "◇", css: "#", js: "JS", mjs: "JS", cjs: "JS",
            json: "{}", svg: "◇", png: "▧", jpg: "▧", jpeg: "▧", gif: "▧",
            webp: "▧", mp3: "♫", mp4: "▶", txt: "T"
        };
        return map[extension(path)] || "•";
    }

    function language(path) {
        const map = {
            html: "HTML", htm: "HTML", css: "CSS", js: "JavaScript",
            mjs: "JavaScript", cjs: "JavaScript", json: "JSON", md: "Markdown",
            txt: "Text", svg: "SVG", xml: "XML", php: "PHP", py: "Python",
            ts: "TypeScript", tsx: "TSX", jsx: "JSX", vue: "Vue", svelte: "Svelte"
        };
        return map[extension(path)] || "Plain Text";
    }

    function sizeOf(content) {
        return typeof content === "string"
            ? new Blob([content]).size
            : (content?.byteLength || 0);
    }

    function formatBytes(value) {
        if (!value) return "0 B";
        const units = ["B", "KB", "MB", "GB"];
        let index = 0;
        let number = value;
        while (number >= 1024 && index < units.length - 1) {
            number /= 1024;
            index++;
        }
        return `${number.toFixed(index === 0 ? 0 : number >= 10 ? 0 : 1)} ${units[index]}`;
    }

    function showToast(message) {
        const item = document.createElement("div");
        item.className = "toast";
        item.textContent = message;
        ui.toastContainer.appendChild(item);
        setTimeout(() => item.remove(), 3000);
    }

    function ensureParents(path) {
        let parent = parentPath(path);
        while (parent) {
            state.folders.add(parent);
            parent = parentPath(parent);
        }
    }

    function addFile(path, content, binary = false) {
        path = normalizePath(path);
        if (!path || state.folders.has(path)) return false;
        state.files.set(path, { path, content, binary, mime: mime(path) });
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

    function saveProject() {
        try {
            const data = {
                files: [...state.files.values()]
                    .filter(file => !file.binary)
                    .map(file => ({ path: file.path, content: file.content })),
                folders: [...state.folders],
                active: state.activeFile
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.warn("Sauvegarde locale impossible", error);
        }
    }

    function scheduleSave() {
        clearTimeout(state.saveTimer);
        state.saveTimer = setTimeout(saveProject, 250);
    }

    function loadProject() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);

            state.files.clear();
            state.folders.clear();

            if (Array.isArray(data.folders)) {
                data.folders.forEach(folder => addFolder(folder));
            }

            if (Array.isArray(data.files)) {
                data.files.forEach(file => {
                    if (file && file.path) addFile(file.path, file.content || "", false);
                });
            }

            if (data.active && state.files.has(data.active)) {
                state.activeFile = data.active;
            }
        } catch (error) {
            console.warn("Projet local invalide", error);
        }
    }

    function clearEditor() {
        ui.codeEditor.value = "";
        ui.codeEditor.disabled = true;
        ui.fileIcon.textContent = "";
        ui.activeFileName.textContent = "Aucun fichier";
        ui.languageInfo.textContent = "Plain Text";
        ui.sizeInfo.textContent = "0 B";
        ui.cursorInfo.textContent = "Ln 1, Col 1";
        ui.lineNumbers.textContent = "1";
        ui.binaryPreview.classList.add("hidden");
        ui.codeEditor.classList.remove("hidden");
        ui.lineNumbers.classList.remove("hidden");
        ui.previewFileName.textContent = "aucune page";
        ui.previewAddress.textContent = "preview://vide";
    }

    function openFile(path) {
        const file = state.files.get(path);
        if (!file) return;

        state.activeFile = path;
        ui.activeFileName.textContent = fileName(path);
        ui.fileIcon.textContent = icon(path);
        ui.languageInfo.textContent = language(path);
        ui.sizeInfo.textContent = formatBytes(sizeOf(file.content));
        ui.previewFileName.textContent = fileName(path);

        if (file.binary) {
            ui.codeEditor.classList.add("hidden");
            ui.lineNumbers.classList.add("hidden");
            ui.binaryPreview.classList.remove("hidden");
            ui.binaryName.textContent = fileName(path);
            ui.binaryIcon.textContent = icon(path);
        } else {
            ui.binaryPreview.classList.add("hidden");
            ui.codeEditor.classList.remove("hidden");
            ui.lineNumbers.classList.remove("hidden");
            ui.codeEditor.disabled = false;
            ui.codeEditor.value = file.content || "";
            updateLines();
            updateCursor();
        }

        renderTree();
        scheduleSave();
    }

    function updateLines() {
        const count = Math.max(1, ui.codeEditor.value.split("\n").length);
        ui.lineNumbers.textContent = Array.from({ length: count }, (_, index) => index + 1).join("\n");
    }

    function updateCursor() {
        const position = ui.codeEditor.selectionStart || 0;
        const parts = ui.codeEditor.value.slice(0, position).split("\n");
        ui.cursorInfo.textContent = `Ln ${parts.length}, Col ${parts[parts.length - 1].length + 1}`;
    }

    function onEditorInput() {
        if (!state.activeFile) return;
        const file = state.files.get(state.activeFile);
        if (!file || file.binary) return;

        file.content = ui.codeEditor.value;
        ui.sizeInfo.textContent = formatBytes(sizeOf(file.content));
        updateLines();
        updateCursor();
        ui.dirtyDot.classList.remove("hidden");
        clearTimeout(state.dirtyTimer);
        state.dirtyTimer = setTimeout(() => ui.dirtyDot.classList.add("hidden"), 450);
        scheduleSave();
        schedulePreview();
    }

    function renderTree() {
        ui.fileTree.innerHTML = "";
        const root = { folders: new Map(), files: [] };
        state.folders.forEach(path => insertTree(root, path, "folder"));
        state.files.forEach((_, path) => insertTree(root, path, "file"));
        renderLevel(root, ui.fileTree, 0);
        ui.fileCount.textContent = `${state.files.size} fichier${state.files.size > 1 ? "s" : ""}`;
    }

    function insertTree(root, path, type) {
        const parts = normalizePath(path).split("/");
        let node = root;

        parts.forEach((part, index) => {
            const last = index === parts.length - 1;

            if (last) {
                if (type === "file") {
                    node.files.push({ name: part, path });
                } else if (!node.folders.has(part)) {
                    node.folders.set(part, { name: part, path, folders: new Map(), files: [] });
                }
                return;
            }

            if (!node.folders.has(part)) {
                node.folders.set(part, {
                    name: part,
                    path: parts.slice(0, index + 1).join("/"),
                    folders: new Map(),
                    files: []
                });
            }
            node = node.folders.get(part);
        });
    }

    function renderLevel(node, container, depth) {
        const folders = [...node.folders.values()].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
        );
        const files = [...node.files].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
        );

        folders.forEach(folder => {
            const row = document.createElement("div");
            const open = state.openFolders.has(folder.path);
            row.className = "tree-row";
            row.style.paddingLeft = `${7 + depth * 16}px`;
            row.innerHTML = `<span class="arrow">${open ? "▾" : "▸"}</span><span class="icon">▰</span><span class="name"></span><span class="more">⋮</span>`;
            row.querySelector(".name").textContent = folder.name;

            row.addEventListener("click", () => {
                if (state.openFolders.has(folder.path)) state.openFolders.delete(folder.path);
                else state.openFolders.add(folder.path);
                renderTree();
            });

            row.addEventListener("contextmenu", event => {
                event.preventDefault();
                showContext(event.clientX, event.clientY, folder.path, "folder");
            });

            container.appendChild(row);

            const children = document.createElement("div");
            children.className = open ? "children" : "children hidden";
            renderLevel(folder, children, depth + 1);
            container.appendChild(children);
        });

        files.forEach(file => {
            const row = document.createElement("div");
            row.className = "tree-row" + (state.activeFile === file.path ? " active" : "");
            row.style.paddingLeft = `${7 + depth * 16}px`;
            row.innerHTML = `<span class="arrow"></span><span class="icon"></span><span class="name"></span><span class="more">⋮</span>`;
            row.querySelector(".icon").textContent = icon(file.path);
            row.querySelector(".name").textContent = file.name;
            row.addEventListener("click", () => openFile(file.path));
            row.addEventListener("contextmenu", event => {
                event.preventDefault();
                showContext(event.clientX, event.clientY, file.path, "file");
            });
            container.appendChild(row);
        });
    }

    function showContext(x, y, path, type) {
        state.contextPath = path;
        state.contextType = type;
        ui.contextMenu.classList.remove("hidden");
        ui.contextMenu.style.left = `${Math.max(10, Math.min(x, innerWidth - 185))}px`;
        ui.contextMenu.style.top = `${Math.max(10, Math.min(y, innerHeight - 180))}px`;
    }

    function hideContext() {
        ui.contextMenu.classList.add("hidden");
        state.contextPath = null;
        state.contextType = null;
    }

    function openModal(mode, path = "") {
        state.modalMode = mode;
        state.modalPath = path;
        ui.modalError.textContent = "";
        ui.modal.classList.remove("hidden");

        if (mode === "file") {
            ui.modalTitle.textContent = "Nouveau fichier";
            ui.modalText.textContent = "Le projet est vide : ajoute le fichier dont tu as besoin.";
            ui.modalLabel.textContent = "Nom du fichier";
            ui.modalInput.placeholder = "index.html";
            ui.modalInput.value = "";
        } else if (mode === "folder") {
            ui.modalTitle.textContent = "Nouveau dossier";
            ui.modalText.textContent = "Pour organiser tes images, vidéos, scripts et autres fichiers.";
            ui.modalLabel.textContent = "Nom du dossier";
            ui.modalInput.placeholder = "images";
            ui.modalInput.value = "";
        } else {
            ui.modalTitle.textContent = "Renommer";
            ui.modalText.textContent = "Le nom doit être unique au même emplacement.";
            ui.modalLabel.textContent = "Nouveau nom";
            ui.modalInput.placeholder = fileName(path);
            ui.modalInput.value = fileName(path);
        }

        ui.modalInput.focus();
        ui.modalInput.select();
    }

    function closeModal() {
        ui.modal.classList.add("hidden");
        state.modalMode = null;
        state.modalPath = null;
        ui.modalError.textContent = "";
    }

    function modalSubmit() {
        const value = ui.modalInput.value.trim();
        const clean = normalizePath(value);

        if (!clean) {
            ui.modalError.textContent = "Nom obligatoire.";
            return;
        }

        if (state.modalMode === "file") {
            if (state.files.has(clean) || state.folders.has(clean)) {
                ui.modalError.textContent = "Ce nom existe déjà.";
                return;
            }
            addFile(clean, "", false);
            openFile(clean);
            showToast("Fichier créé.");
        } else if (state.modalMode === "folder") {
            if (state.files.has(clean) || state.folders.has(clean)) {
                ui.modalError.textContent = "Ce nom existe déjà.";
                return;
            }
            addFolder(clean);
            state.openFolders.add(clean);
            renderTree();
            scheduleSave();
            showToast("Dossier créé.");
        } else if (state.modalMode === "rename") {
            renamePath(state.modalPath, clean);
        }

        closeModal();
    }

    function renamePath(oldPath, newName) {
        const file = state.files.has(oldPath);
        const folder = state.folders.has(oldPath);
        if (!file && !folder) return;

        const parent = parentPath(oldPath);
        const target = parent ? `${parent}/${newName}` : newName;

        if (target !== oldPath && (state.files.has(target) || state.folders.has(target))) {
            showToast("Ce nom existe déjà.");
            return;
        }

        if (file) {
            const item = state.files.get(oldPath);
            state.files.delete(oldPath);
            item.path = target;
            state.files.set(target, item);
            if (state.activeFile === oldPath) state.activeFile = target;
        } else {
            const prefix = oldPath + "/";
            const foldersToRename = [...state.folders].filter(path => path === oldPath || path.startsWith(prefix));
            const filesToRename = [...state.files.entries()].filter(([path]) => path.startsWith(prefix));

            foldersToRename.forEach(path => state.folders.delete(path));
            filesToRename.forEach(([path]) => state.files.delete(path));

            foldersToRename.forEach(path => {
                state.folders.add(target + (path === oldPath ? "" : path.slice(oldPath.length)));
            });

            filesToRename.forEach(([path, item]) => {
                const next = target + path.slice(oldPath.length);
                item.path = next;
                state.files.set(next, item);
            });

            if (state.activeFile === oldPath || state.activeFile?.startsWith(prefix)) {
                state.activeFile = target + state.activeFile.slice(oldPath.length);
            }
        }

        renderTree();
        if (state.activeFile) openFile(state.activeFile);
        scheduleSave();
        schedulePreview();
        showToast("Nom modifié.");
    }

    function uniqueCopyPath(path) {
        const parent = parentPath(path);
        const name = fileName(path);
        const ext = extension(path);
        const base = ext ? name.slice(0, -(ext.length + 1)) : name;

        let number = 1;
        let candidateName = `${base} copy${ext ? "." + ext : ""}`;
        let candidate = parent ? `${parent}/${candidateName}` : candidateName;

        while (state.files.has(candidate) || state.folders.has(candidate)) {
            number++;
            candidateName = `${base} copy ${number}${ext ? "." + ext : ""}`;
            candidate = parent ? `${parent}/${candidateName}` : candidateName;
        }

        return candidate;
    }

    function duplicate(path, type) {
        if (type === "file") {
            const file = state.files.get(path);
            if (!file) return;
            const target = uniqueCopyPath(path);
            const content = file.binary ? new Uint8Array(file.content) : file.content;
            addFile(target, content, file.binary);
        } else {
            const targetRoot = uniqueCopyPath(path);
            const prefix = path + "/";

            [...state.folders]
                .filter(folder => folder === path || folder.startsWith(prefix))
                .forEach(folder => state.folders.add(targetRoot + (folder === path ? "" : folder.slice(path.length))));

            [...state.files.entries()]
                .filter(([filePath]) => filePath.startsWith(prefix))
                .forEach(([filePath, file]) => {
                    const content = file.binary ? new Uint8Array(file.content) : file.content;
                    addFile(targetRoot + filePath.slice(path.length), content, file.binary);
                });
        }

        renderTree();
        scheduleSave();
        showToast("Copie créée.");
    }

    function askDelete(path, type) {
        ui.confirmTitle.textContent = type === "folder" ? "Supprimer le dossier ?" : "Supprimer le fichier ?";
        ui.confirmText.textContent = type === "folder"
            ? `Le dossier « ${fileName(path)} » et son contenu seront supprimés.`
            : `Le fichier « ${fileName(path)} » sera supprimé.`;

        ui.confirmModal.classList.remove("hidden");

        state.confirmAction = () => {
            if (type === "file") {
                state.files.delete(path);
            } else {
                const prefix = path + "/";
                [...state.files.keys()].forEach(filePath => {
                    if (filePath === path || filePath.startsWith(prefix)) state.files.delete(filePath);
                });
                [...state.folders].forEach(folderPath => {
                    if (folderPath === path || folderPath.startsWith(prefix)) state.folders.delete(folderPath);
                });
            }

            if (!state.files.has(state.activeFile)) {
                state.activeFile = state.files.keys().next().value || null;
            }

            closeConfirm();
            renderTree();

            if (state.activeFile) openFile(state.activeFile);
            else clearEditor();

            scheduleSave();
            schedulePreview();
            showToast("Suppression effectuée.");
        };
    }

    function closeConfirm() {
        ui.confirmModal.classList.add("hidden");
        state.confirmAction = null;
    }

    function searchCode() {
        const query = ui.searchInput.value;
        const text = ui.codeEditor.value;

        if (!query) {
            ui.searchResult.textContent = "0 résultat";
            return;
        }

        let count = 0;
        let start = 0;

        while (true) {
            const index = text.indexOf(query, start);
            if (index === -1) break;
            count++;
            start = index + Math.max(1, query.length);
        }

        ui.searchResult.textContent = `${count} résultat${count !== 1 ? "s" : ""}`;

        if (count) {
            const index = text.indexOf(query);
            ui.codeEditor.focus();
            ui.codeEditor.selectionStart = index;
            ui.codeEditor.selectionEnd = index + query.length;
        }
    }

    function formatCode() {
        if (!state.activeFile || !isText(state.activeFile)) return;

        const ext = extension(state.activeFile);
        let code = ui.codeEditor.value;

        if (ext === "html" || ext === "htm") {
            const lines = code.replace(/>\s*</g, ">\n<").split("\n");
            const output = [];
            let indent = 0;

            for (let line of lines) {
                line = line.trim();
                if (!line) continue;
                if (/^<\//.test(line)) indent = Math.max(0, indent - 1);
                output.push("    ".repeat(indent) + line);
                if (/^<[^/!][^>]*>$/.test(line) && !/\/>$/.test(line) && !/^<(meta|link|img|input|br|hr)\b/i.test(line)) {
                    indent++;
                }
            }
            code = output.join("\n");
        } else if (ext === "css") {
            const tokens = code.replace(/\{/g, "{\n").replace(/\}/g, "\n}\n").replace(/;/g, ";\n").split("\n");
            const output = [];
            let indent = 0;

            for (let line of tokens) {
                line = line.trim();
                if (!line) continue;
                if (line.startsWith("}")) indent = Math.max(0, indent - 1);
                output.push("    ".repeat(indent) + line);
                if (line.endsWith("{")) indent++;
            }
            code = output.join("\n");
        }

        ui.codeEditor.value = code;
        onEditorInput();
        showToast("Code formaté.");
    }

    function projectPath(current, target) {
        if (!target) return null;
        target = target.trim();

        if (/^(?:https?:|data:|blob:|mailto:|tel:|javascript:|#|\/\/)/i.test(target)) return null;

        const clean = target.split("?")[0].split("#")[0];
        if (!clean) return null;

        if (clean.startsWith("/")) return normalizePath(clean);

        const parent = parentPath(current);
        return normalizePath(parent ? `${parent}/${clean}` : clean);
    }

    function binaryDataUrl(data, type) {
        const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
        let binary = "";
        const chunk = 0x8000;

        for (let index = 0; index < bytes.length; index += chunk) {
            binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
        }

        return `data:${type};base64,${btoa(binary)}`;
    }

    function assetUrl(current, target) {
        const path = projectPath(current, target);
        if (!path) return null;
        const file = state.files.get(path);
        if (!file || !file.binary) return null;
        return binaryDataUrl(file.content, file.mime);
    }

    function buildPreviewDocument(mainPath) {
        const main = state.files.get(mainPath);
        if (!main || main.binary) return "";

        let html = main.content || "";

        html = html.replace(
            /<link\b[^>]*\brel\s*=\s*["']stylesheet["'][^>]*>/gi,
            tag => {
                const match = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
                if (!match) return tag;

                const path = projectPath(mainPath, match[1]);
                const css = path ? state.files.get(path) : null;
                if (!css || css.binary || extension(path) !== "css") return tag;

                let content = css.content || "";
                content = content.replace(/url\(\s*(["']?)(.*?)\1\s*\)/gi, (full, quote, target) => {
                    const url = assetUrl(path, target);
                    return url ? `url("${url}")` : full;
                });

                return `<style>\n${content}\n</style>`;
            }
        );

        html = html.replace(
            /<script\b([^>]*)\bsrc\s*=\s*["']([^"']+)["']([^>]*)>\s*<\/script>/gi,
            (full, before, target, after) => {
                const path = projectPath(mainPath, target);
                const js = path ? state.files.get(path) : null;
                if (!js || js.binary || !["js", "mjs", "cjs"].includes(extension(path))) return full;

                const code = String(js.content || "").replace(/<\/script/gi, "<\\/script");
                return `<script>${code}<\/script>`;
            }
        );

        html = html.replace(
            /\b(src|poster|href)\s*=\s*(["'])(.*?)\2/gi,
            (full, attr, quote, target) => {
                const url = assetUrl(mainPath, target);
                return url ? `${attr}=${quote}${url}${quote}` : full;
            }
        );

        html = html.replace(
            /url\(\s*(["']?)(.*?)\1\s*\)/gi,
            (full, quote, target) => {
                const url = assetUrl(mainPath, target);
                return url ? `url("${url}")` : full;
            }
        );

        return html;
    }

    function findMainHtml() {
        if (state.files.has("index.html")) return "index.html";
        if (state.files.has("index.htm")) return "index.htm";

        for (const path of state.files.keys()) {
            if (extension(path) === "html" || extension(path) === "htm") return path;
        }

        return null;
    }

    function buildPreview() {
        const main = findMainHtml();

        if (!main) {
            ui.previewFrame.srcdoc = "";
            ui.previewFileName.textContent = "aucune page";
            ui.previewAddress.textContent = "preview://vide";
            return;
        }

        ui.previewFrame.srcdoc = buildPreviewDocument(main);
        ui.previewFileName.textContent = fileName(main);
        ui.previewAddress.textContent = `preview://${main}`;
    }

    function schedulePreview() {
        clearTimeout(state.previewTimer);
        state.previewTimer = setTimeout(buildPreview, 350);
    }

    async function downloadBlob(blob, name) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async function downloadCurrentFile() {
        if (!state.activeFile) {
            showToast("Aucun fichier sélectionné.");
            return;
        }

        const file = state.files.get(state.activeFile);
        if (!file) return;

        await downloadBlob(
            new Blob([file.content], { type: file.mime }),
            fileName(file.path)
        );

        showToast("Fichier téléchargé.");
    }

    async function downloadProjectZip() {
        if (typeof JSZip === "undefined") {
            showToast("La bibliothèque ZIP n'est pas disponible.");
            return;
        }

        if (!state.files.size && !state.folders.size) {
            showToast("Le projet est vide.");
            return;
        }

        const zip = new JSZip();
        state.folders.forEach(folder => zip.folder(folder));
        state.files.forEach(file => zip.file(file.path, file.content));

        const blob = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: { level: 6 }
        });

        await downloadBlob(blob, "WebCode-project.zip");
        showToast("Projet ZIP téléchargé.");
    }

    async function importFiles(files) {
        let count = 0;

        for (const file of files) {
            const path = normalizePath(file.webkitRelativePath || file.name);
            if (!path) continue;

            if (path.toLowerCase().endsWith(".zip")) {
                await importZip(file);
                continue;
            }

            if (state.files.has(path) || state.folders.has(path)) {
                if (!window.confirm(`« ${path} » existe déjà.\n\nRemplacer ?`)) continue;
            }

            if (isText(path)) {
                addFile(path, await file.text(), false);
            } else {
                addFile(path, new Uint8Array(await file.arrayBuffer()), true);
            }

            count++;
        }

        if (count) {
            const index = [...state.files.keys()].find(path => path.toLowerCase() === "index.html");
            state.activeFile = index || state.activeFile || state.files.keys().next().value || null;
            renderTree();
            if (state.activeFile) openFile(state.activeFile);
            scheduleSave();
            schedulePreview();
            showToast(`${count} fichier${count > 1 ? "s" : ""} importé${count > 1 ? "s" : ""}.`);
        }
    }

    async function importZip(file) {
        if (typeof JSZip === "undefined") {
            showToast("La bibliothèque ZIP n'est pas disponible.");
            return;
        }

        try {
            const zip = await JSZip.loadAsync(file);
            let count = 0;
            const entries = [];
            zip.forEach((path, entry) => entries.push({ path: normalizePath(path), entry }));

            for (const item of entries) {
                if (!item.path) continue;

                if (item.entry.dir) {
                    addFolder(item.path);
                    continue;
                }

                if (state.files.has(item.path) || state.folders.has(item.path)) {
                    if (!window.confirm(`« ${item.path} » existe déjà.\n\nRemplacer ?`)) continue;
                }

                if (isText(item.path)) {
                    addFile(item.path, await item.entry.async("string"), false);
                } else {
                    addFile(item.path, await item.entry.async("uint8array"), true);
                }
                count++;
            }

            const index = [...state.files.keys()].find(path => path.toLowerCase() === "index.html");
            state.activeFile = index || state.activeFile || state.files.keys().next().value || null;
            renderTree();
            if (state.activeFile) openFile(state.activeFile);
            scheduleSave();
            schedulePreview();
            showToast(`ZIP importé : ${count} fichier${count > 1 ? "s" : ""}.`);
        } catch (error) {
            console.error(error);
            showToast("Impossible de lire ce ZIP.");
        }
    }

    function setupEvents() {
        ui.newProjectBtn.addEventListener("click", () => {
            ui.confirmTitle.textContent = "Nouveau projet ?";
            ui.confirmText.textContent = "Le projet actuel sera remplacé par un projet complètement vide.";
            ui.confirmModal.classList.remove("hidden");

            state.confirmAction = () => {
                state.files.clear();
                state.folders.clear();
                state.openFolders.clear();
                state.activeFile = null;
                clearEditor();
                renderTree();
                buildPreview();
                saveProject();
                closeConfirm();
                showToast("Nouveau projet vide.");
            };
        });

        ui.importBtn.addEventListener("click", () => {
            ui.fileInput.value = "";
            ui.fileInput.click();
        });

        ui.fileInput.addEventListener("change", () => importFiles([...ui.fileInput.files]));
        ui.downloadFileBtn.addEventListener("click", downloadCurrentFile);
        ui.downloadProjectBtn.addEventListener("click", downloadProjectZip);
        ui.previewBtn.addEventListener("click", buildPreview);
        ui.refreshPreviewBtn.addEventListener("click", buildPreview);

        ui.openPreviewBtn.addEventListener("click", () => {
            const html = ui.previewFrame.srcdoc;
            if (!html) {
                showToast("Le preview est vide.");
                return;
            }

            const windowRef = window.open("", "_blank");
            if (!windowRef) {
                showToast("Le navigateur a bloqué le nouvel onglet.");
                return;
            }

            windowRef.document.open();
            windowRef.document.write(html);
            windowRef.document.close();
        });

        ui.newFileBtn.addEventListener("click", () => openModal("file"));
        ui.newFolderBtn.addEventListener("click", () => openModal("folder"));
        ui.collapseBtn.addEventListener("click", () => {
            state.openFolders.clear();
            renderTree();
        });

        ui.codeEditor.addEventListener("input", onEditorInput);
        ui.codeEditor.addEventListener("scroll", () => {
            ui.lineNumbers.scrollTop = ui.codeEditor.scrollTop;
        });
        ui.codeEditor.addEventListener("click", updateCursor);
        ui.codeEditor.addEventListener("keyup", updateCursor);
        ui.codeEditor.addEventListener("select", updateCursor);
        ui.codeEditor.addEventListener("keydown", event => {
            if (event.key !== "Tab") return;
            event.preventDefault();

            const start = ui.codeEditor.selectionStart;
            const end = ui.codeEditor.selectionEnd;
            const value = ui.codeEditor.value;

            ui.codeEditor.value = value.slice(0, start) + "    " + value.slice(end);
            ui.codeEditor.selectionStart = start + 4;
            ui.codeEditor.selectionEnd = start + 4;
            onEditorInput();
        });

        ui.findBtn.addEventListener("click", () => {
            ui.searchBox.classList.remove("hidden");
            ui.searchInput.focus();
        });
        ui.searchInput.addEventListener("input", searchCode);
        ui.closeSearchBtn.addEventListener("click", () => {
            ui.searchBox.classList.add("hidden");
            ui.searchInput.value = "";
            ui.searchResult.textContent = "0 résultat";
        });

        ui.formatBtn.addEventListener("click", formatCode);

        ui.modalConfirmBtn.addEventListener("click", modalSubmit);
        ui.modalCancelBtn.addEventListener("click", closeModal);
        ui.modalCloseBtn.addEventListener("click", closeModal);
        ui.modalInput.addEventListener("keydown", event => {
            if (event.key === "Enter") modalSubmit();
            if (event.key === "Escape") closeModal();
        });

        ui.confirmOkBtn.addEventListener("click", () => {
            if (typeof state.confirmAction === "function") state.confirmAction();
        });
        ui.confirmCancelBtn.addEventListener("click", closeConfirm);
        ui.confirmCloseBtn.addEventListener("click", closeConfirm);

        ui.contextMenu.addEventListener("click", event => {
            const button = event.target.closest("button");
            if (!button || !state.contextPath) return;

            const action = button.dataset.action;
            const path = state.contextPath;
            const type = state.contextType;

            hideContext();

            if (action === "open") {
                if (type === "file") openFile(path);
                else {
                    if (state.openFolders.has(path)) state.openFolders.delete(path);
                    else state.openFolders.add(path);
                    renderTree();
                }
            } else if (action === "rename") {
                openModal("rename", path);
            } else if (action === "duplicate") {
                duplicate(path, type);
            } else if (action === "delete") {
                askDelete(path, type);
            }
        });

        document.addEventListener("click", event => {
            if (!event.target.closest("#contextMenu")) hideContext();
            if (!event.target.closest("#searchBox") && !event.target.closest("#findBtn")) {
                ui.searchBox.classList.add("hidden");
            }
        });

        document.addEventListener("keydown", event => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
                event.preventDefault();
                ui.searchBox.classList.remove("hidden");
                ui.searchInput.focus();
            }

            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
                event.preventDefault();
                downloadCurrentFile();
            }

            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
                event.preventDefault();
                buildPreview();
            }

            if (event.key === "Escape") {
                hideContext();
                ui.searchBox.classList.add("hidden");
                if (!ui.modal.classList.contains("hidden")) closeModal();
                if (!ui.confirmModal.classList.contains("hidden")) closeConfirm();
            }
        });

        document.querySelectorAll(".device").forEach(button => {
            button.addEventListener("click", () => {
                document.querySelectorAll(".device").forEach(item => item.classList.remove("active"));
                button.classList.add("active");
                ui.previewStage.classList.remove("tablet", "mobile");
                if (button.dataset.device !== "desktop") {
                    ui.previewStage.classList.add(button.dataset.device);
                }
            });
        });

        document.addEventListener("contextmenu", event => {
            const row = event.target.closest(".tree-row");
            if (!row || !ui.fileTree.contains(row)) return;
            event.preventDefault();
            showContext(event.clientX, event.clientY, row.querySelector(".name") ? row.dataset.path : row.dataset.path, row.dataset.type);
        });

        document.addEventListener("dragover", event => event.preventDefault());
        document.addEventListener("drop", async event => {
            event.preventDefault();
            const files = [...event.dataTransfer.files];
            if (files.length) await importFiles(files);
        });

        window.addEventListener("beforeunload", saveProject);
    }

    loadProject();
    setupEvents();
    renderTree();

    if (state.activeFile && state.files.has(state.activeFile)) {
        openFile(state.activeFile);
    } else {
        clearEditor();
    }

    buildPreview();
})();
