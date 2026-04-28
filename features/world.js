import { db, doc, setDoc, getDoc } from '../firebase.js';
import { appState, showToast } from '../app.js';

export let rawWorldContent = "";

export function parseWorldContent(rawHtml) {
    const temp = document.createElement('div');
    temp.innerHTML = rawHtml;
    const tocList = [];
    let idCounter = 0;

    temp.querySelectorAll('.world-toggle').forEach(toggle => {
        let parent = toggle.parentElement;
        if (!parent || !parent.classList.contains('toggle-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'toggle-wrapper';
            toggle.parentNode.insertBefore(wrapper, toggle);
            wrapper.appendChild(toggle);
        }

        const summary = toggle.querySelector('summary');
        if(summary && !summary.querySelector('.toggle-icon')) {
            const icon = document.createElement('span');
            icon.className = 'toggle-icon';
            icon.title = 'เปิด/ปิด';
            icon.innerText = '‣';
            summary.insertBefore(icon, summary.firstChild);
            summary.insertBefore(document.createTextNode('\u00A0'), icon.nextSibling);
        }
    });

    const walker = document.createTreeWalker(temp, NodeFilter.SHOW_TEXT, null, false);
    const nodesToReplace = [];

    while(walker.nextNode()) {
        const node = walker.currentNode;
        const text = node.nodeValue;
        const match = text.match(/^\s*(#{1,4})\s+(.*)$/);
        if (match) {
            nodesToReplace.push({ node, level: match[1].length, text: match[2] });
        }
    }

    nodesToReplace.forEach(({node, level, text}) => {
        const heading = document.createElement('div');
        heading.className = `world-h${level} toc-item-element`;
        heading.innerText = text;
        heading.dataset.tocLevel = level;
        heading.dataset.tocText = text;

        let p = node.parentElement;
        let customColor = null;
        while(p && p !== temp) {
            if (p.style && p.style.color) { customColor = p.style.color; break; }
            if (p.hasAttribute('color')) { customColor = p.getAttribute('color'); break; }
            p = p.parentElement;
        }
        if (customColor) heading.style.color = customColor;
        node.replaceWith(heading);
    });

    temp.querySelectorAll('.world-toggle').forEach(toggle => {
        const titleEl = toggle.querySelector('.toggle-title');
        if(titleEl && titleEl.innerText.trim() !== "") {
            toggle.classList.add('toc-item-element');
            toggle.dataset.tocLevel = 'toggle'; 
            toggle.dataset.tocText = titleEl.innerText.trim();
        }
    });

    temp.querySelectorAll('img').forEach(img => {
        img.setAttribute('loading', 'lazy');
    });

    temp.querySelectorAll('.toc-item-element').forEach(el => {
        idCounter++;
        const id = `toc-heading-${idCounter}`;
        el.id = id;
        const isToggle = el.dataset.tocLevel === 'toggle';
        tocList.push({ 
            level: isToggle ? 2 : parseInt(el.dataset.tocLevel), 
            text: el.dataset.tocText, 
            id: id,
            isToggle: isToggle
        });
    });

    temp.querySelectorAll('.drag-handle').forEach(el => el.remove());
    temp.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    temp.querySelectorAll('.toggle-wrapper').forEach(w => w.removeAttribute('draggable'));
    
    temp.querySelectorAll('.resize-wrapper').forEach(wrapper => {
        const img = wrapper.querySelector('img');
        if (img) {
            img.classList.remove('resizing-img');
            if (img.className === '') img.removeAttribute('class');
            wrapper.replaceWith(img);
        }
    });

    return { html: temp.innerHTML, toc: tocList };
}

function updateWorldDisplay() {
    const worldDisplay = document.getElementById('world-display');
    if(!worldDisplay) return;
    const { html, toc } = parseWorldContent(rawWorldContent);
    worldDisplay.innerHTML = html;
    
    const tocContainer = document.getElementById('world-toc');
    if(!tocContainer) return;
    tocContainer.innerHTML = '';
    
    if (toc.length === 0) {
        tocContainer.innerHTML = '<li style="color:var(--text-secondary); font-size:0.9rem;">ยังไม่มีสารบัญ<br>(พิมพ์ # นำหน้าข้อความ หรือสร้าง Toggle เพื่อเพิ่มหัวข้อ)</li>';
    }

    const tocFrag = document.createDocumentFragment();

    toc.forEach(item => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${item.id}`;
        
        if(item.isToggle) {
            a.innerHTML = `<span style="color:var(--accent-color); font-size:0.75rem; margin-right:8px; vertical-align:middle;">◆</span>${item.text}`;
            a.style.paddingLeft = "25px";
            a.classList.add('toc-toggle');
        } else {
            a.innerText = item.text;
        }

        a.onclick = (e) => {
            e.preventDefault();
            const target = document.getElementById(item.id);
            if(target) {
                target.scrollIntoView({behavior: "smooth", block: "start"});
                if(target.tagName.toLowerCase() === 'details' && !target.hasAttribute('open')) {
                    target.setAttribute('open', '');
                }
            }
            if (window.innerWidth <= 1024) hideSidebar();
        };
        
        if (item.level === 1) a.classList.add('toc-h1');
        else if (item.level === 2) a.classList.add('toc-h2');
        else if (item.level === 3) a.classList.add('toc-h3');
        else if (item.level === 4) a.classList.add('toc-h4');

        li.appendChild(a);
        tocFrag.appendChild(li);
    });
    
    tocContainer.appendChild(tocFrag);
}

export function initWorld() {
    fetchWorldData();
}

export async function fetchWorldData() {
    const worldDisplay = document.getElementById('world-display');
    if(!worldDisplay) return;
    worldDisplay.innerHTML = '<div class="loading-state">กำลังโหลด...</div>';
    try {
        const docSnap = await getDoc(doc(db, "world", "mainData"));
        if (docSnap.exists()) rawWorldContent = docSnap.data().content;
        else rawWorldContent = "<p>พิมพ์ข้อมูลเกี่ยวกับ World ที่นี่... <br>พิมพ์ # นำหน้าเพื่อสร้างหัวข้อ</p>";
        updateWorldDisplay();
        appState.isWorldLoaded = true;
    } catch (e) { 
        worldDisplay.innerHTML = '<div class="error-state">โหลดไม่สำเร็จ กรุณาลองใหม่ <br><button class="btn-tool" style="margin-top:10px;" onclick="window.fetchWorldData()">ลองใหม่</button></div>';
    }
}
window.fetchWorldData = fetchWorldData;

import('../app.js').then(m => {
    m.setupRichEditor('world-editor', 'world-display', 'world-toolbar', 'save-world-btn', 'cancel-world-btn', 'btn-world-image', 'world-image-input', 'btn-dashed-line', 'btn-world-toggle');
});

const toggleTocBtn = document.getElementById('toggle-toc-btn');
const closeTocInsideBtn = document.getElementById('close-toc-inside-btn'); 
const worldSidebar = document.getElementById('world-sidebar');
const tocOverlay = document.getElementById('toc-overlay');
const toggleIcon = toggleTocBtn ? toggleTocBtn.querySelector('i') : null;

if (toggleTocBtn) {
    toggleTocBtn.onclick = () => {
        const isShowing = worldSidebar.classList.contains('show');
        if (isShowing) hideSidebar();
        else {
            worldSidebar.classList.add('show');
            tocOverlay.classList.add('show');
            toggleTocBtn.classList.add('show'); 
            if(toggleIcon) toggleIcon.className = 'fas fa-chevron-left';
        }
    };
}

const hideSidebar = () => {
    if(worldSidebar) worldSidebar.classList.remove('show');
    if(tocOverlay) tocOverlay.classList.remove('show');
    if (toggleTocBtn) {
        toggleTocBtn.classList.remove('show');
        if(toggleIcon) toggleIcon.className = 'fas fa-chevron-right';
    }
};

if (closeTocInsideBtn) closeTocInsideBtn.onclick = hideSidebar;
if (tocOverlay) tocOverlay.onclick = hideSidebar;

const worldDisplay = document.getElementById('world-display');
const worldEditor = document.getElementById('world-editor');
const worldToolbar = document.getElementById('world-toolbar');
const saveWorldBtn = document.getElementById('save-world-btn');

if(worldDisplay) {
    worldDisplay.addEventListener('dblclick', () => {
        if (!appState.isAdmin) return;
        import('../app.js').then(m => {
            worldDisplay.style.display = 'none';
            worldEditor.style.display = 'block';
            worldToolbar.style.display = 'flex';
            
            worldEditor.innerHTML = m.prepareHtmlForEditor(rawWorldContent);
            worldEditor.setAttribute('contenteditable', 'true');
            
            window.scrollTo(0, 0);
            worldEditor.querySelectorAll('details.world-toggle').forEach(details => {
                if(!details.hasAttribute('open')) details.setAttribute('open', '');
            });
            
            worldEditor.focus();
        });
    });
}

if(saveWorldBtn) {
    saveWorldBtn.onclick = async () => {
        import('../app.js').then(async (m) => {
            const cleanedHtml = m.cleanHtmlFromEditor(worldEditor.innerHTML);

            try {
                await setDoc(doc(db, "world", "mainData"), { content: cleanedHtml }, { merge: true });
                rawWorldContent = cleanedHtml;
                worldEditor.style.display = 'none';
                worldToolbar.style.display = 'none';
                worldDisplay.style.display = 'block';
                updateWorldDisplay();
                showToast("บันทึกข้อมูล World สำเร็จ");
                window.scrollTo(0, 0);
            } catch (e) { }
        });
    };
}