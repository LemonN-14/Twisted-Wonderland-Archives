import { db, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, deleteField } from '../firebase.js';
import { appState, PLACEHOLDERS, showToast, getFileNameFromUrl, getDragAfterElement } from '../app.js';

let activeGroupId = null; 
let activeGroupName = "";
let activeGroupCategory = "";
let editingGroupId = null;
let draggedGroupNode = null;

const groupModal = document.getElementById('group-modal');
const insideGroupModal = document.getElementById('inside-group-modal');

export function resetGroupForm() {
    editingGroupId = null;
    document.getElementById('group-form').reset();
    document.getElementById('group-modal-title').innerText = "สร้างไอคอนกลุ่ม/หอใหม่";
    document.getElementById('group-file-name').innerText = "ไม่ได้เลือกไฟล์";
    document.getElementById('clear-group-img-btn').style.display = "none";
    appState.groupImgRemoved = false;
    appState.croppedGroupBlob = null;
    if(groupModal) groupModal.style.display = "block";
}

export function initGroups() {
    fetchGroups();
}

export async function fetchGroups() {
    const nrcGrid = document.getElementById('nrc-grid');
    const rsaGrid = document.getElementById('rsa-grid');
    if(!nrcGrid || !rsaGrid) return;
    
    nrcGrid.innerHTML = '<div class="loading-state">กำลังโหลด...</div>';
    rsaGrid.innerHTML = '<div class="loading-state">กำลังโหลด...</div>';

    try {
        const snap = await getDocs(collection(db, "groups"));
        nrcGrid.innerHTML = ''; 
        rsaGrid.innerHTML = '';
        
        if(snap.empty) {
            nrcGrid.innerHTML = '<div class="empty-state">ยังไม่มีข้อมูล</div>';
            rsaGrid.innerHTML = '<div class="empty-state">ยังไม่มีข้อมูล</div>';
            return; 
        }

        let groups = [];
        snap.forEach(doc => {
            const data = doc.data();
            groups.push({ id: doc.id, data: data, order: data.order ?? data.timestamp ?? 0 });
        });
        groups.sort((a, b) => a.order - b.order); 

        const nrcFrag = document.createDocumentFragment();
        const rsaFrag = document.createDocumentFragment();

        groups.forEach((groupItem, index) => {
            const { id, data } = groupItem;
            const imgUrl = data.image ? data.image : PLACEHOLDERS.GROUP;
            const card = document.createElement('div');
            card.className = 'group-card';
            card.style.animationDelay = `${index * 0.05}s`;
            card.draggable = true;
            card.dataset.id = id;
            card.innerHTML = `<img src="${imgUrl}" loading="lazy" class="group-img"><div class="group-name">${data.name}</div>`;

            card.addEventListener('dragstart', (e) => {
                if(!document.body.classList.contains('is-admin')) { e.preventDefault(); return; }
                draggedGroupNode = card;
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = "move";
            });
            card.addEventListener('dragend', () => {
                if(!document.body.classList.contains('is-admin')) return;
                card.classList.remove('dragging');
                draggedGroupNode = null;
                card.parentNode.querySelectorAll('.group-card').forEach((c, i) => {
                    updateDoc(doc(db, "groups", c.dataset.id), { order: i });
                });
            });

            card.onclick = () => {
                activeGroupId = id;
                activeGroupName = data.name;
                activeGroupCategory = data.category;
                document.getElementById('inside-group-title').innerText = data.name;
                insideGroupModal.style.display = "block";
                
                import('./characters.js').then(m => {
                    m.setCurrentGroupId(id);
                    m.fetchCharactersInGroup(id);
                });
            };

            if(data.category === 'NRC') nrcFrag.appendChild(card);
            else rsaFrag.appendChild(card);
        });
        
        nrcGrid.appendChild(nrcFrag);
        rsaGrid.appendChild(rsaFrag);

        if(nrcGrid.innerHTML === '') nrcGrid.innerHTML = '<div class="empty-state">ยังไม่มีข้อมูล</div>';
        if(rsaGrid.innerHTML === '') rsaGrid.innerHTML = '<div class="empty-state">ยังไม่มีข้อมูล</div>';
        
    } catch (error) { 
        const errorMsg = '<div class="error-state">โหลดไม่สำเร็จ กรุณาลองใหม่</div>';
        nrcGrid.innerHTML = errorMsg;
        rsaGrid.innerHTML = errorMsg;
    }
}
window.fetchGroups = fetchGroups;

function setupGroupDragAndDrop(gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.addEventListener('dragover', e => {
        if(!document.body.classList.contains('is-admin')) return;
        e.preventDefault();
        if (!draggedGroupNode) return;
        const afterElement = getDragAfterElement(grid, e.clientX, e.clientY, 'group-card');
        if (afterElement == null || afterElement === draggedGroupNode) {
            grid.appendChild(draggedGroupNode);
        } else {
            grid.insertBefore(draggedGroupNode, afterElement);
        }
    });
}
setupGroupDragAndDrop('nrc-grid');
setupGroupDragAndDrop('rsa-grid');

const editGroupBtn = document.getElementById('edit-group-btn');
if(editGroupBtn) {
    editGroupBtn.onclick = async () => {
        if (!activeGroupId) return;
        editingGroupId = activeGroupId;
        document.getElementById('group-modal-title').innerText = "แก้ไขกลุ่ม/หอ";
        document.getElementById('group-name').value = activeGroupName;
        document.getElementById('group-category').value = activeGroupCategory;
        
        const grpImgInputLocal = document.getElementById('group-image');
        const grpImgClearBtnLocal = document.getElementById('clear-group-img-btn');
        const grpFileNameLocal = document.getElementById('group-file-name');

        grpImgInputLocal.value = "";
        appState.groupImgRemoved = false;
        appState.croppedGroupBlob = null;
        grpFileNameLocal.innerText = "ไม่ได้เลือกไฟล์";
        
        const docSnap = await getDoc(doc(db, "groups", activeGroupId));
        if (docSnap.exists() && docSnap.data().image) {
            grpFileNameLocal.innerText = getFileNameFromUrl(docSnap.data().image);
            grpImgClearBtnLocal.style.display = "inline-block";
        } else {
            grpImgClearBtnLocal.style.display = "none";
        }
        groupModal.style.display = "block";
    };
}

const deleteGroupBtn = document.getElementById('delete-group-btn');
if(deleteGroupBtn) {
    deleteGroupBtn.onclick = async () => {
        if (!activeGroupId) return;
        if(confirm(`ต้องการลบ ${activeGroupName} ใช่หรือไม่? ตัวละครในนี้จะถูกลบไปด้วย`)) {
            await deleteDoc(doc(db, "groups", activeGroupId));
            insideGroupModal.style.display = "none";
            fetchGroups();
            showToast("ลบกลุ่มเรียบร้อย");
        }
    };
}

const groupForm = document.getElementById('group-form');
if(groupForm) {
    groupForm.onsubmit = async (e) => {
        e.preventDefault();
        import('../firebase.js').then(async ({ uploadImageToCloudinary }) => {
            const btn = document.getElementById('submit-group-btn');
            const loading = document.getElementById('group-loading-text');
            btn.disabled = true; loading.style.display = "inline";

            const groupData = {
                name: document.getElementById('group-name').value,
                category: document.getElementById('group-category').value
            };

            if (appState.croppedGroupBlob) {
                const imageUrl = await uploadImageToCloudinary(appState.croppedGroupBlob);
                if(imageUrl) groupData.image = imageUrl;
            } else if (appState.groupImgRemoved) {
                groupData.image = deleteField();
            }

            try {
                if (editingGroupId) {
                    await updateDoc(doc(db, "groups", editingGroupId), groupData);
                    activeGroupName = groupData.name;
                    activeGroupCategory = groupData.category;
                    document.getElementById('inside-group-title').innerText = groupData.name;
                } else {
                    groupData.order = Date.now();
                    await addDoc(collection(db, "groups"), groupData);
                }
                groupModal.style.display = "none";
                fetchGroups();
                showToast("บันทึกกลุ่มสำเร็จ!");
            } catch (e) {}

            btn.disabled = false; loading.style.display = "none";
        });
    };
}