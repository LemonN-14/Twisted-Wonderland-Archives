import { db, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, deleteField } from '../firebase.js';
import { appState, PLACEHOLDERS, showToast, getFileNameFromUrl, getDragAfterElement } from '../app.js';

let editingStoryId = null;
let currentStoryContent = "";
let draggedStoryNode = null;

const storyCardModal = document.getElementById('story-card-modal');
const storyContentModal = document.getElementById('story-content-modal');

export function resetStoryForm() {
    editingStoryId = null;
    document.getElementById('story-card-form').reset();
    document.getElementById('story-card-title').innerText = "สร้างสตอรี่ใหม่";
    document.getElementById('story-file-name').innerText = "ไม่ได้เลือกไฟล์";
    document.getElementById('clear-story-img-btn').style.display = "none";
    appState.storyImgRemoved = false;
    appState.croppedStoryBlob = null;
    
    const activeSubTab = document.querySelector('#story-view .sub-tabs li.active');
    if(activeSubTab) document.getElementById('story-category').value = activeSubTab.innerText.trim();
    
    if(storyCardModal) storyCardModal.style.display = "block";
}

export function initStories() {
    fetchStories();
}

export async function fetchStories() {
    const mainGrid = document.getElementById('main-story-grid');
    const eventGrid = document.getElementById('events-story-grid');
    if(!mainGrid || !eventGrid) return;
    
    mainGrid.innerHTML = '<div class="loading-state">กำลังโหลด...</div>';
    eventGrid.innerHTML = '<div class="loading-state">กำลังโหลด...</div>';

    try {
        const snap = await getDocs(collection(db, "stories"));
        mainGrid.innerHTML = '';
        eventGrid.innerHTML = '';
        
        if(snap.empty) {
            mainGrid.innerHTML = '<div class="empty-state">ยังไม่มีข้อมูล</div>';
            eventGrid.innerHTML = '<div class="empty-state">ยังไม่มีข้อมูล</div>';
            appState.isStoryLoaded = true;
            return; 
        }

        let stories = [];
        snap.forEach(doc => {
            const data = doc.data();
            stories.push({ id: doc.id, data: data, order: data.order ?? data.timestamp ?? 0 });
        });
        stories.sort((a, b) => a.order - b.order); 

        const mainFrag = document.createDocumentFragment();
        const eventFrag = document.createDocumentFragment();

        stories.forEach(storyItem => {
            const { id, data } = storyItem;
            const imgUrl = data.image ? data.image : PLACEHOLDERS.STORY;

            const card = document.createElement('div');
            card.className = 'story-card';
            card.draggable = true;
            card.dataset.id = id;

            card.innerHTML = `
                <img src="${imgUrl}" loading="lazy" class="story-img">
                <div class="story-name">${data.name}</div>
                <div class="card-actions admin-only">
                    <button class="action-btn edit" title="แก้ไข"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" title="ลบ"><i class="fas fa-trash"></i></button>
                </div>
            `;

            card.addEventListener('dragstart', (e) => {
                if(!document.body.classList.contains('is-admin')) { e.preventDefault(); return; }
                draggedStoryNode = card;
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = "move";
            });
            card.addEventListener('dragend', () => {
                if(!document.body.classList.contains('is-admin')) return;
                card.classList.remove('dragging');
                draggedStoryNode = null;
                card.parentNode.querySelectorAll('.story-card').forEach((c, i) => {
                    updateDoc(doc(db, "stories", c.dataset.id), { order: i });
                });
            });

            card.querySelector('.delete').onclick = async (e) => {
                e.stopPropagation();
                if(confirm('ยืนยันลบสตอรี่นี้?')) {
                    await deleteDoc(doc(db, "stories", id));
                    fetchStories();
                    showToast("ลบสตอรี่เรียบร้อย");
                }
            };

            card.querySelector('.edit').onclick = async (e) => {
                e.stopPropagation();
                editingStoryId = id;
                document.getElementById('story-card-title').innerText = "แก้ไขข้อมูลสตอรี่";
                document.getElementById('story-name').value = data.name || '';
                document.getElementById('story-category').value = data.category || 'Main Story';

                const sName = document.getElementById('story-file-name');
                const sClear = document.getElementById('clear-story-img-btn');
                document.getElementById('story-image').value = ""; 
                appState.storyImgRemoved = false; 
                appState.croppedStoryBlob = null;
                
                if(data.image) { 
                    sName.innerText = getFileNameFromUrl(data.image); 
                    sClear.style.display = "inline-block"; 
                } else { 
                    sName.innerText = "ไม่ได้เลือกไฟล์"; 
                    sClear.style.display = "none"; 
                }
                storyCardModal.style.display = "block";
            };

            card.onclick = () => {
                editingStoryId = id;
                document.getElementById('story-content-header').innerText = data.name;
                currentStoryContent = data.content || "<p>พิมพ์เนื้อหาสตอรี่ที่นี่...</p>";
                
                import('./world.js').then(m => {
                    const { html } = m.parseWorldContent(currentStoryContent);
                    const displayArea = document.getElementById('story-display');
                    displayArea.innerHTML = html;
                    
                    displayArea.querySelectorAll('details.world-toggle').forEach(details => {
                        details.removeAttribute('open');
                    });
                    
                    document.getElementById('story-editor').style.display = 'none';
                    document.getElementById('story-toolbar').style.display = 'none';
                    displayArea.style.display = 'block';
                    
                    storyContentModal.style.display = "block";
                });
            };

            if(data.category === 'Main Story') mainFrag.appendChild(card);
            else eventFrag.appendChild(card);
        });

        mainGrid.appendChild(mainFrag);
        eventGrid.appendChild(eventFrag);
        
        if(mainGrid.innerHTML === '') mainGrid.innerHTML = '<div class="empty-state">ยังไม่มีข้อมูล</div>';
        if(eventGrid.innerHTML === '') eventGrid.innerHTML = '<div class="empty-state">ยังไม่มีข้อมูล</div>';
        
        appState.isStoryLoaded = true;
    } catch (error) { 
        const errorMsg = '<div class="error-state">โหลดไม่สำเร็จ กรุณาลองใหม่</div>';
        mainGrid.innerHTML = errorMsg;
        eventGrid.innerHTML = errorMsg;
    }
}
window.fetchStories = fetchStories;

function setupStoryDragAndDrop(gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.addEventListener('dragover', e => {
        if(!document.body.classList.contains('is-admin')) return;
        e.preventDefault();
        if (!draggedStoryNode) return;
        const afterElement = getDragAfterElement(grid, e.clientX, e.clientY, 'story-card');
        if (afterElement == null || afterElement === draggedStoryNode) {
            grid.appendChild(draggedStoryNode);
        } else {
            grid.insertBefore(draggedStoryNode, afterElement);
        }
    });
}
setupStoryDragAndDrop('main-story-grid');
setupStoryDragAndDrop('events-story-grid');

const storyCardForm = document.getElementById('story-card-form');
if(storyCardForm) {
    storyCardForm.onsubmit = async (e) => {
        e.preventDefault();
        import('../firebase.js').then(async ({ uploadImageToCloudinary }) => {
            const btn = document.getElementById('submit-story-btn');
            const loading = document.getElementById('story-loading-text');
            btn.disabled = true; loading.style.display = "inline";

            const storyData = {
                name: document.getElementById('story-name').value,
                category: document.getElementById('story-category').value
            };

            if (appState.croppedStoryBlob) {
                const imageUrl = await uploadImageToCloudinary(appState.croppedStoryBlob);
                if(imageUrl) storyData.image = imageUrl;
            } else if (appState.storyImgRemoved) {
                storyData.image = deleteField();
            }

            try {
                if (editingStoryId) {
                    await updateDoc(doc(db, "stories", editingStoryId), storyData);
                } else {
                    storyData.order = Date.now();
                    await addDoc(collection(db, "stories"), storyData);
                }
                storyCardModal.style.display = "none";
                fetchStories();
                showToast("บันทึกสตอรี่สำเร็จ!");
            } catch (e) {}

            btn.disabled = false; loading.style.display = "none";
        });
    };
}

const storyDisplay = document.getElementById('story-display');
if(storyDisplay) {
    storyDisplay.addEventListener('dblclick', () => {
        if(!document.body.classList.contains('is-admin')) return;
        import('../app.js').then(m => {
            const display = document.getElementById('story-display');
            const editor = document.getElementById('story-editor');
            const toolbar = document.getElementById('story-toolbar');
            
            display.style.display = 'none';
            editor.style.display = 'block';
            toolbar.style.display = 'flex';
            
            editor.innerHTML = m.prepareHtmlForEditor(currentStoryContent);
            editor.setAttribute('contenteditable', 'true');
            editor.querySelectorAll('details.world-toggle').forEach(details => {
                if(!details.hasAttribute('open')) details.setAttribute('open', '');
            });
            editor.focus();
        });
    });
}

const saveStoryContentBtn = document.getElementById('save-story-content-btn');
if(saveStoryContentBtn) {
    saveStoryContentBtn.onclick = async () => {
        import('../app.js').then(async (m) => {
            const editor = document.getElementById('story-editor');
            const cleanedHtml = m.cleanHtmlFromEditor(editor.innerHTML);

            try {
                await updateDoc(doc(db, "stories", editingStoryId), { content: cleanedHtml });
                currentStoryContent = cleanedHtml;
                editor.style.display = 'none';
                document.getElementById('story-toolbar').style.display = 'none';
                const display = document.getElementById('story-display');
                display.style.display = 'block';
                
                import('./world.js').then(wm => {
                    const { html } = wm.parseWorldContent(currentStoryContent);
                    display.innerHTML = html;
                    
                    display.querySelectorAll('details.world-toggle').forEach(details => {
                        details.removeAttribute('open');
                    });
                });
                
                showToast("บันทึกเนื้อหาสตอรี่สำเร็จ");
            } catch (e) {}
        });
    };
}

import('../app.js').then(m => {
    m.setupRichEditor('story-editor', 'story-display', 'story-toolbar', 'save-story-content-btn', 'cancel-story-content-btn', 'btn-story-image', 'story-image-input', 'btn-story-dashed-line', 'btn-story-toggle');
});