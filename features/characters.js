import { db, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc, query, where, deleteField } from '../firebase.js';
import { appState, PLACEHOLDERS, showToast, getFileNameFromUrl, formatText, textToArray, getDragAfterElement } from '../app.js';

export let currentGroupId = null;
export function setCurrentGroupId(id) { currentGroupId = id; }

let lastFetchedGroupId = null;
let editingCharacterId = null;
let draggedCharNode = null;

const charFormModal = document.getElementById('character-modal');
const viewModal = document.getElementById('view-modal');

const charFieldsConfig = [
    { id: 'char-name', key: 'name', type: 'text' },
    { id: 'char-jp-name', key: 'jpName', type: 'text' },
    { id: 'char-aliases', key: 'aliases', type: 'array' },
    { id: 'char-year', key: 'year', type: 'text' },
    { id: 'char-bday', key: 'birthday', type: 'text' },
    { id: 'char-zodiac', key: 'zodiac', type: 'text' },
    { id: 'char-age', key: 'age', type: 'text' },
    { id: 'char-height', key: 'height', type: 'text' },
    { id: 'char-hand', key: 'dominantHand', type: 'text' },
    { id: 'char-homeland', key: 'homeland', type: 'text' },
    { id: 'char-city', key: 'city', type: 'text' },
    { id: 'char-occupation', key: 'occupation', type: 'text' },
    { id: 'char-position', key: 'position', type: 'text' },
    { id: 'char-club', key: 'club', type: 'text' },
    { id: 'char-subject', key: 'bestSubject', type: 'text' },
    { id: 'char-hobby', key: 'hobby', type: 'text' },
    { id: 'char-dislikes', key: 'dislikes', type: 'text' },
    { id: 'char-fav-food', key: 'favFood', type: 'text' },
    { id: 'char-dislike-food', key: 'dislikeFood', type: 'text' },
    { id: 'char-talent', key: 'specialTalent', type: 'text' },
    { id: 'char-va', key: 'va', type: 'text' },
    { id: 'char-spell-name', key: 'spellName', type: 'text' },
    { id: 'char-spell-desc', key: 'spellDesc', type: 'text' },
    { id: 'char-pronouns', key: 'pronouns', type: 'array' },
    { id: 'char-personality', key: 'personality', type: 'text' },
    { id: 'char-relationships', key: 'relationships', type: 'array' },
    { id: 'char-history', key: 'history', type: 'text' },
    { id: 'char-trivia', key: 'trivia', type: 'array' }
];

const viewFieldsConfig = [
    { type: 'array', idWrap: 'wrap-view-aliases', idText: 'view-aliases', key: 'aliases', bullet: '•' },
    { type: 'text', idWrap: 'wrap-view-occupation', idText: 'view-occupation', key: 'occupation' },
    { type: 'text', idWrap: 'wrap-view-position', idText: 'view-position', key: 'position' },
    { type: 'text', idWrap: 'wrap-view-year', idText: 'view-year', key: 'year' },
    { type: 'text', idWrap: 'wrap-view-bday', idText: 'view-bday', key: 'birthday' },
    { type: 'text', idWrap: 'wrap-view-zodiac', idText: 'view-zodiac', key: 'zodiac' },
    { type: 'text', idWrap: 'wrap-view-age', idText: 'view-age', key: 'age' },
    { type: 'text', idWrap: 'wrap-view-height', idText: 'view-height', key: 'height' },
    { type: 'text', idWrap: 'wrap-view-hand', idText: 'view-hand', key: 'dominantHand' },
    { type: 'text', idWrap: 'wrap-view-homeland', idText: 'view-homeland', key: 'homeland' },
    { type: 'text', idWrap: 'wrap-view-city', idText: 'view-city', key: 'city' },
    { type: 'text', idWrap: 'wrap-view-club', idText: 'view-club', key: 'club' },
    { type: 'text', idWrap: 'wrap-view-subject', idText: 'view-subject', key: 'bestSubject' },
    { type: 'text', idWrap: 'wrap-view-hobby', idText: 'view-hobby', key: 'hobby' },
    { type: 'text', idWrap: 'wrap-view-dislikes', idText: 'view-dislikes', key: 'dislikes' },
    { type: 'text', idWrap: 'wrap-view-fav-food', idText: 'view-fav-food', key: 'favFood' },
    { type: 'text', idWrap: 'wrap-view-dislike-food', idText: 'view-dislike-food', key: 'dislikeFood' },
    { type: 'text', idWrap: 'wrap-view-talent', idText: 'view-talent', key: 'specialTalent' },
    { type: 'text', idWrap: 'wrap-view-va', idText: 'view-va', key: 'va' },
    { type: 'block', idWrap: 'wrap-view-personality', idText: 'view-personality', key: 'personality' },
    { type: 'block', idWrap: 'wrap-view-history', idText: 'view-history', key: 'history' }
];

export function resetCharacterForm() {
    editingCharacterId = null;
    document.getElementById('character-form').reset();
    document.getElementById('form-modal-title').innerText = "เพิ่มข้อมูลตัวละคร";
    document.getElementById('char-file-name').innerText = "ไม่ได้เลือกไฟล์";
    document.getElementById('clear-char-img-btn').style.display = "none";
    document.getElementById('char-profile-file-name').innerText = "ไม่ได้เลือกไฟล์";
    document.getElementById('clear-char-profile-btn').style.display = "none";
    appState.charImgRemoved = false;
    appState.charProfileRemoved = false;
    appState.croppedCoverBlob = null;
    appState.croppedProfileBlob = null;
    
    const firstTab = charFormModal.querySelector('.modal-tabs li:first-child');
    if(firstTab) firstTab.click();
    charFormModal.querySelector('.modal-content').scrollTop = 0;
    
    charFormModal.style.display = "block";
}

function renderViewField(type, wrapId, textId, value, bullet = '') {
    const wrap = document.getElementById(wrapId);
    if(!wrap) return;
    if (!value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && value.trim() === "")) {
        wrap.style.display = "none";
    } else {
        if (type === 'block') wrap.style.display = "block";
        else wrap.style.display = ""; 
        
        if (Array.isArray(value)) {
            if (value.length === 1) {
                document.getElementById(textId).innerHTML = formatText(value[0]);
            } else {
                document.getElementById(textId).innerHTML = value.map(i => `${bullet} ${formatText(i)}`).join('<br>');
            }
        } else {
            document.getElementById(textId).innerHTML = formatText(value);
        }
    }
}

export async function fetchCharactersInGroup(groupId) {
    const grid = document.getElementById('character-grid');
    if(!grid) return;
    
    if (lastFetchedGroupId === groupId && grid.innerHTML.trim() !== '') {
        return;
    }
    
    grid.innerHTML = '<div class="loading-state">กำลังโหลด...</div>'; 
    lastFetchedGroupId = groupId;

    try {
        const q = query(collection(db, "characters"), where("groupId", "==", groupId));
        const snap = await getDocs(q);
        grid.innerHTML = '';
        if(snap.empty) {
            grid.innerHTML = '<div class="empty-state">ยังไม่มีข้อมูล</div>';
            return;
        }

        let chars = [];
        snap.forEach(doc => {
            const data = doc.data();
            chars.push({ id: doc.id, order: data.order ?? data.timestamp ?? 0, name: data.name, coverImage: data.coverImage });
        });
        chars.sort((a, b) => a.order - b.order); 

        const charFrag = document.createDocumentFragment();

        chars.forEach((charItem) => {
            const { id, name, coverImage } = charItem;
            const imgUrl = coverImage || PLACEHOLDERS.COVER;
            const card = document.createElement('div');
            card.className = 'char-card';
            card.draggable = true;
            card.dataset.id = id;
            card.innerHTML = `
                <img src="${imgUrl}" loading="lazy" class="char-img">
                <div class="char-name">${name}</div>
                <div class="card-actions admin-only">
                    <button class="action-btn edit" title="แก้ไข"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" title="ลบ"><i class="fas fa-trash"></i></button>
                </div>
            `;

            card.addEventListener('dragstart', (e) => {
                if(!document.body.classList.contains('is-admin')) { e.preventDefault(); return; }
                draggedCharNode = card;
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = "move";
            });
            card.addEventListener('dragend', () => {
                if(!document.body.classList.contains('is-admin')) return;
                card.classList.remove('dragging');
                draggedCharNode = null;
                card.parentNode.querySelectorAll('.char-card').forEach((c, i) => {
                    updateDoc(doc(db, "characters", c.dataset.id), { order: i });
                });
            });

            card.querySelector('.delete').onclick = async (e) => {
                e.stopPropagation();
                if(confirm('ยืนยันลบตัวละคร?')) {
                    await deleteDoc(doc(db, "characters", id));
                    lastFetchedGroupId = null;
                    fetchCharactersInGroup(groupId);
                }
            };

            card.querySelector('.edit').onclick = async (e) => {
                e.stopPropagation();
                try {
                    const docSnap = await getDoc(doc(db, "characters", id));
                    if (!docSnap.exists()) return;
                    const data = docSnap.data();

                    editingCharacterId = id;
                    document.getElementById('form-modal-title').innerText = "แก้ไขข้อมูลตัวละคร";
                    
                    charFieldsConfig.forEach(f => {
                        const el = document.getElementById(f.id);
                        if(el) {
                            if (f.type === 'array') el.value = (data[f.key] || []).join('\n');
                            else if(f.key === 'birthday' && data[f.key]) el.value = data[f.key].replace(/-/g, '/');
                            else el.value = data[f.key] || '';
                        }
                    });

                    document.getElementById('char-image').value = ""; appState.charImgRemoved = false; appState.croppedCoverBlob = null;
                    const cName = document.getElementById('char-file-name');
                    const cClear = document.getElementById('clear-char-img-btn');
                    if(data.coverImage) { cName.innerText = getFileNameFromUrl(data.coverImage); cClear.style.display = "inline-block"; } 
                    else { cName.innerText = "ไม่ได้เลือกไฟล์"; cClear.style.display = "none"; }

                    document.getElementById('char-profile-image').value = ""; appState.charProfileRemoved = false; appState.croppedProfileBlob = null;
                    const pName = document.getElementById('char-profile-file-name');
                    const pClear = document.getElementById('clear-char-profile-btn');
                    if(data.profileImage) { pName.innerText = getFileNameFromUrl(data.profileImage); pClear.style.display = "inline-block"; } 
                    else { pName.innerText = "ไม่ได้เลือกไฟล์"; pClear.style.display = "none"; }

                    const firstTab = charFormModal.querySelector('.modal-tabs li:first-child');
                    if(firstTab) firstTab.click();
                    charFormModal.querySelector('.modal-content').scrollTop = 0;

                    charFormModal.style.display = "block";
                } catch (err) { alert("เกิดข้อผิดพลาดในการดึงข้อมูล"); }
            };

            card.onclick = async () => {
                try {
                    const docSnap = await getDoc(doc(db, "characters", id));
                    if (!docSnap.exists()) return;
                    const data = docSnap.data();

                    const viewLeft = document.querySelector('.view-left');
                    if (data.profileImage) {
                        viewLeft.style.display = "flex";
                        const viewImg = document.getElementById('view-img');
                        viewImg.setAttribute('loading', 'lazy');
                        viewImg.src = data.profileImage;
                    } else {
                        viewLeft.style.display = "none";
                    }

                    document.getElementById('view-name-top').innerText = data.name;
                    document.getElementById('view-name-inside').innerText = data.name;
                    const jpNameEl = document.getElementById('view-jp-name-inside');
                    if (data.jpName) { jpNameEl.innerText = data.jpName; jpNameEl.style.display = "block"; } else jpNameEl.style.display = "none";

                    viewFieldsConfig.forEach(f => {
                        let val = data[f.key];
                        if (f.key === 'birthday' && val) val = val.replace(/-/g, '/');
                        renderViewField(f.type, f.idWrap, f.idText, val, f.bullet);
                    });

                    const spellWrap = document.getElementById('wrap-view-spell');
                    if (!data.spellName && !data.spellDesc) spellWrap.style.display = "none";
                    else {
                        spellWrap.style.display = "block";
                        let h = "";
                        if (data.spellName) h += `<div style="text-align: center; font-weight: bold; color: var(--accent-color); margin-bottom: 5px;">${formatText(data.spellName)}</div>`;
                        if (data.spellDesc) h += `<div class="info-box">${formatText(data.spellDesc)}</div>`;
                        document.getElementById('view-spell-content').innerHTML = h;
                    }

                    renderViewField('block', 'wrap-view-pronouns', 'view-pronouns', data.pronouns, '');
                    renderViewField('block', 'wrap-view-relationships', 'view-relationships', data.relationships, '•');
                    renderViewField('block', 'wrap-view-trivia', 'view-trivia', data.trivia, '<span style="font-size:0.5rem; position:relative; top:-1px; margin-right:4px;">◆</span>');

                    const firstTab = viewModal.querySelector('.modal-tabs li:first-child');
                    if(firstTab) firstTab.click();
                    viewModal.querySelector('.modal-content').scrollTop = 0;

                    viewModal.style.display = "block";
                } catch (err) { alert("เกิดข้อผิดพลาดในการดึงข้อมูลตัวละคร"); }
            };
            charFrag.appendChild(card);
        });

        grid.appendChild(charFrag);
    } catch(e) { 
        grid.innerHTML = `<div class="error-state">โหลดไม่สำเร็จ กรุณาลองใหม่</div>`;
    }
}
window.fetchCharactersInGroup = fetchCharactersInGroup;

function setupCharacterDragAndDrop(gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.addEventListener('dragover', e => {
        if(!document.body.classList.contains('is-admin')) return;
        e.preventDefault();
        if (!draggedCharNode) return;
        const afterElement = getDragAfterElement(grid, e.clientX, e.clientY, 'char-card');
        if (afterElement == null || afterElement === draggedCharNode) {
            grid.appendChild(draggedCharNode);
        } else {
            grid.insertBefore(draggedCharNode, afterElement);
        }
    });
}
setupCharacterDragAndDrop('character-grid');

const charForm = document.getElementById('character-form');
if(charForm) {
    charForm.onsubmit = async (e) => {
        e.preventDefault();
        if(!currentGroupId) return alert("Error: ไม่พบข้อมูลกลุ่มที่เลือกอยู่");

        import('../firebase.js').then(async ({ uploadImageToCloudinary }) => {
            const btn = document.getElementById('submit-btn');
            const load = document.getElementById('loading-text');
            btn.disabled = true; load.style.display = "inline";

            const charData = { groupId: currentGroupId, timestamp: new Date() };
            
            charFieldsConfig.forEach(f => {
                const el = document.getElementById(f.id);
                if(el) {
                    let val = el.value;
                    if(f.key === 'birthday' && val) val = val.replace(/\//g, '-');
                    charData[f.key] = f.type === 'array' ? textToArray(val) : val;
                }
            });

            if (appState.croppedCoverBlob) {
                const coverUrl = await uploadImageToCloudinary(appState.croppedCoverBlob);
                if(coverUrl) charData.coverImage = coverUrl;
            } else if (appState.charImgRemoved) charData.coverImage = deleteField();
            
            if (appState.croppedProfileBlob) {
                const profileUrl = await uploadImageToCloudinary(appState.croppedProfileBlob);
                if(profileUrl) charData.profileImage = profileUrl;
            } else if (appState.charProfileRemoved) charData.profileImage = deleteField();

            try {
                if (editingCharacterId) {
                    await updateDoc(doc(db, "characters", editingCharacterId), charData);
                } else {
                    charData.order = Date.now(); 
                    await addDoc(collection(db, "characters"), charData);
                }
                charFormModal.style.display = "none";
                lastFetchedGroupId = null; // บังคับโหลดใหม่
                fetchCharactersInGroup(currentGroupId);
                showToast("บันทึกตัวละครสำเร็จ!");
                
                if (document.getElementById('calendar-main-content')) {
                    import('./calendar.js').then(m => m.initCalendar());
                }
            } catch(err) { }

            btn.disabled = false; load.style.display = "none";
        });
    };
}