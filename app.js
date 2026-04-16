import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc, query, where, deleteField } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// 1. ตั้งค่า Firebase และ Cloudinary 
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyASMrByO6jt_veaCaEDqdi-NdyEa7QFxSU",
  authDomain: "twisted-wonderland-archives.firebaseapp.com",
  projectId: "twisted-wonderland-archives",
  storageBucket: "twisted-wonderland-archives.firebasestorage.app",
  messagingSenderId: "205198629571",
  appId: "1:205198629571:web:2d21975d33495e218ae076"
};

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/ducs7aqwc/image/upload";
const CLOUDINARY_UPLOAD_PRESET  = "Twisted_Wonderland_Archives";
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentGroupId = null; 
let currentGroupName = "";
let currentGroupCategory = "";
let editingGroupId = null;
let editingCharacterId = null;

let groupImgRemoved = false;
let charImgRemoved = false;
let charProfileRemoved = false;

let cropper = null;
let currentCropTarget = ''; 
let croppedGroupBlob = null;
let croppedCoverBlob = null;
let croppedProfileBlob = null;

const TRANSPARENT_GROUP_PLACEHOLDER = "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22150%22%20height%3D%22150%22%3E%3Crect%20width%3D%22150%22%20height%3D%22150%22%20fill%3D%22transparent%22%20stroke%3D%22%23555%22%20stroke-width%3D%222%22%20stroke-dasharray%3D%225%2C5%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22%23555%22%3ENo%20Icon%3C%2Ftext%3E%3C%2Fsvg%3E";
const COVER_PLACEHOLDER = "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22140%22%20height%3D%22180%22%20style%3D%22background%3A%23555%22%3E%3C%2Fsvg%3E";

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

function getFileNameFromUrl(url) {
    if (!url) return "ไม่ได้เลือกไฟล์";
    try { return url.split('/').pop(); } catch(e) { return "ไฟล์รูปภาพ"; }
}

async function uploadImageToCloudinary(fileOrBlob) {
    const formData = new FormData();
    formData.append('file', fileOrBlob);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    try {
        const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        const data = await response.json();
        return data.secure_url.replace('/upload/', '/upload/w_600,q_auto,f_auto/');
    } catch (error) {
        console.error(error);
        alert("อัปโหลดรูปล้มเหลว");
        return null;
    }
}

const textToArray = (text) => text.split('\n').map(item => item.trim()).filter(item => item !== "");

// ==========================================
// 2. ระบบ Tabs
// ==========================================
document.querySelectorAll('.main-tabs li').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.main-tabs li').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.target).classList.add('active');

        if(tab.dataset.target === 'world-view') {
            document.getElementById('add-btn').style.display = 'none';
        } else {
            document.getElementById('add-btn').style.display = 'block';
        }
    });
});

document.querySelectorAll('.sub-tabs li').forEach(tab => {
    tab.addEventListener('click', () => {
        const parentSection = tab.closest('.view-section');
        parentSection.querySelectorAll('.sub-tabs li').forEach(t => t.classList.remove('active'));
        parentSection.querySelectorAll('.sub-view').forEach(v => v.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.target).classList.add('active');
    });
});

const setupTabs = (tabSelector, contentSelector) => {
    document.querySelectorAll(tabSelector).forEach(tab => {
        tab.addEventListener('click', () => {
            const targetContainer = tab.closest('.modal-content') || document;
            targetContainer.querySelectorAll(tabSelector).forEach(t => t.classList.remove('active'));
            targetContainer.querySelectorAll(contentSelector).forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.target).classList.add('active');
        });
    });
};
setupTabs('#character-modal .modal-tabs li', '#character-modal .form-tab');
setupTabs('#view-modal .modal-tabs li', '#view-modal .v-tab');

// ==========================================
// 3. ระบบ Crop รูปภาพ
// ==========================================
function openCropModal(imageSrc, target, ratio) {
    currentCropTarget = target;
    const img = document.getElementById('crop-image-target');
    img.src = imageSrc;
    document.getElementById('crop-modal').style.display = 'block';

    if (cropper) cropper.destroy();
    cropper = new Cropper(img, {
        aspectRatio: ratio,
        viewMode: 1,
        autoCropArea: 1,
    });
}

document.getElementById('cancel-crop-btn').onclick = () => {
    document.getElementById('crop-modal').style.display = 'none';
    if(currentCropTarget === 'group') document.getElementById('group-image').value = "";
    if(currentCropTarget === 'cover') document.getElementById('char-image').value = "";
    if(currentCropTarget === 'profile') document.getElementById('char-profile-image').value = "";
};

document.getElementById('confirm-crop-btn').onclick = () => {
    if (!cropper) return;
    cropper.getCroppedCanvas({ fillColor: 'transparent' }).toBlob((blob) => {
        if (currentCropTarget === 'group') {
            croppedGroupBlob = blob;
            document.getElementById('group-file-name').innerText = "รูปภาพถูกครอบตัดแล้ว";
            document.getElementById('clear-group-img-btn').style.display = "inline-block";
            groupImgRemoved = false;
        } else if (currentCropTarget === 'cover') {
            croppedCoverBlob = blob;
            document.getElementById('char-file-name').innerText = "รูปปกถูกครอบตัดแล้ว";
            document.getElementById('clear-char-img-btn').style.display = "inline-block";
            charImgRemoved = false;
        } else if (currentCropTarget === 'profile') {
            croppedProfileBlob = blob;
            document.getElementById('char-profile-file-name').innerText = "รูปโปรไฟล์ถูกครอบตัดแล้ว";
            document.getElementById('clear-char-profile-btn').style.display = "inline-block";
            charProfileRemoved = false;
        }
        document.getElementById('crop-modal').style.display = 'none';
    }, 'image/png', 0.9);
};

const grpImgInput = document.getElementById('group-image');
const grpImgClearBtn = document.getElementById('clear-group-img-btn');
const grpFileName = document.getElementById('group-file-name');

grpImgInput.addEventListener('change', function(e) {
    if (this.files && this.files.length > 0) {
        const reader = new FileReader();
        reader.onload = (e) => openCropModal(e.target.result, 'group', 1/1);
        reader.readAsDataURL(this.files[0]);
    }
});
grpImgClearBtn.addEventListener('click', () => {
    grpImgInput.value = "";
    croppedGroupBlob = null;
    grpFileName.innerText = "ไม่ได้เลือกไฟล์";
    grpImgClearBtn.style.display = "none";
    groupImgRemoved = true;
});

const charImgInput = document.getElementById('char-image');
const charImgClearBtn = document.getElementById('clear-char-img-btn');
const charFileName = document.getElementById('char-file-name');

charImgInput.addEventListener('change', function(e) {
    if (this.files && this.files.length > 0) {
        const reader = new FileReader();
        reader.onload = (e) => openCropModal(e.target.result, 'cover', 3/4);
        reader.readAsDataURL(this.files[0]);
    }
});
charImgClearBtn.addEventListener('click', () => {
    charImgInput.value = "";
    croppedCoverBlob = null;
    charFileName.innerText = "ไม่ได้เลือกไฟล์";
    charImgClearBtn.style.display = "none";
    charImgRemoved = true;
});

const charProfileInput = document.getElementById('char-profile-image');
const charProfileClearBtn = document.getElementById('clear-char-profile-btn');
const charProfileFileName = document.getElementById('char-profile-file-name');

charProfileInput.addEventListener('change', function(e) {
    if (this.files && this.files.length > 0) {
        const reader = new FileReader();
        reader.onload = (e) => openCropModal(e.target.result, 'profile', 1/1);
        reader.readAsDataURL(this.files[0]);
    }
});
charProfileClearBtn.addEventListener('click', () => {
    charProfileInput.value = "";
    croppedProfileBlob = null;
    charProfileFileName.innerText = "ไม่ได้เลือกไฟล์";
    charProfileClearBtn.style.display = "none";
    charProfileRemoved = true;
});

// ==========================================
// 4. ระบบ Modal (เปิด/ปิด)
// ==========================================
const groupModal = document.getElementById('group-modal');
const insideGroupModal = document.getElementById('inside-group-modal');
const charFormModal = document.getElementById('character-modal');
const viewModal = document.getElementById('view-modal');

document.getElementById('add-btn').onclick = () => {
    editingGroupId = null;
    document.getElementById('group-form').reset();
    document.getElementById('group-modal-title').innerText = "สร้างไอคอนกลุ่ม/หอใหม่";
    grpFileName.innerText = "ไม่ได้เลือกไฟล์";
    grpImgClearBtn.style.display = "none";
    groupImgRemoved = false;
    croppedGroupBlob = null;
    groupModal.style.display = "block";
};

document.getElementById('add-char-btn').onclick = () => {
    editingCharacterId = null;
    document.getElementById('character-form').reset();
    document.getElementById('form-modal-title').innerText = "เพิ่มข้อมูลตัวละคร";
    charFileName.innerText = "ไม่ได้เลือกไฟล์";
    charImgClearBtn.style.display = "none";
    charProfileFileName.innerText = "ไม่ได้เลือกไฟล์";
    charProfileClearBtn.style.display = "none";
    charImgRemoved = false;
    charProfileRemoved = false;
    croppedCoverBlob = null;
    croppedProfileBlob = null;
    charFormModal.style.display = "block";
};

document.getElementById('close-group-modal').onclick = () => groupModal.style.display = "none";
document.getElementById('close-inside-group-btn').onclick = () => insideGroupModal.style.display = "none";
document.getElementById('close-form-btn').onclick = () => charFormModal.style.display = "none";
document.getElementById('close-view-btn').onclick = () => viewModal.style.display = "none";

window.onclick = (e) => {
    if (e.target == groupModal) groupModal.style.display = "none";
    if (e.target == insideGroupModal) insideGroupModal.style.display = "none";
    if (e.target == charFormModal) charFormModal.style.display = "none";
    if (e.target == viewModal) viewModal.style.display = "none";
};

// ==========================================
// 5. จัดการข้อมูล Group + ระบบ Drag and Drop
// ==========================================
let draggedGroupNode = null;

async function fetchGroups() {
    const nrcGrid = document.getElementById('nrc-grid');
    const rsaGrid = document.getElementById('rsa-grid');
    nrcGrid.innerHTML = ''; 
    rsaGrid.innerHTML = '';

    try {
        const snap = await getDocs(collection(db, "groups"));
        if(snap.empty) return; 

        let groups = [];
        snap.forEach(doc => {
            const data = doc.data();
            const order = data.order || data.timestamp || 0;
            groups.push({ id: doc.id, data: data, order: order });
        });
        groups.sort((a, b) => a.order - b.order); 

        groups.forEach((groupItem, index) => {
            const id = groupItem.id;
            const data = groupItem.data;
            const imgUrl = data.image ? data.image : TRANSPARENT_GROUP_PLACEHOLDER;

            const card = document.createElement('div');
            card.className = 'group-card';
            card.style.animationDelay = `${index * 0.05}s`;
            card.draggable = true;
            card.dataset.id = id;

            card.innerHTML = `
                <img src="${imgUrl}" class="group-img">
                <div class="group-name">${data.name}</div>
            `;

            card.addEventListener('dragstart', (e) => {
                draggedGroupNode = card;
                e.dataTransfer.effectAllowed = "move";
                setTimeout(() => card.classList.add('drag-over'), 0);
            });
            card.addEventListener('dragend', () => {
                card.classList.remove('drag-over');
                draggedGroupNode = null;
            });
            card.addEventListener('dragover', (e) => e.preventDefault());
            card.addEventListener('drop', async (e) => {
                e.preventDefault();
                
                if(draggedGroupNode && draggedGroupNode !== card) {
                    const rect = card.getBoundingClientRect();
                    const midX = rect.left + rect.width / 2;
                    
                    if (e.clientX < midX) card.parentNode.insertBefore(draggedGroupNode, card);
                    else card.parentNode.insertBefore(draggedGroupNode, card.nextSibling);

                    const parent = card.parentNode;
                    const allCards = parent.querySelectorAll('.group-card');
                    allCards.forEach((c, i) => {
                        updateDoc(doc(db, "groups", c.dataset.id), { order: i });
                    });
                }
            });

            card.onclick = () => {
                currentGroupId = id;
                currentGroupName = data.name;
                currentGroupCategory = data.category;
                
                document.getElementById('inside-group-title').innerText = data.name;
                insideGroupModal.style.display = "block";
                fetchCharactersInGroup(id);
            };

            if(data.category === 'NRC') nrcGrid.appendChild(card);
            else rsaGrid.appendChild(card);
        });
    } catch (error) {
        console.error(error);
    }
}

document.getElementById('edit-group-btn').onclick = async () => {
    if (!currentGroupId) return;
    editingGroupId = currentGroupId;
    document.getElementById('group-modal-title').innerText = "แก้ไขกลุ่ม/หอ";
    document.getElementById('group-name').value = currentGroupName;
    document.getElementById('group-category').value = currentGroupCategory;
    
    grpImgInput.value = "";
    groupImgRemoved = false;
    croppedGroupBlob = null;
    grpFileName.innerText = "ไม่ได้เลือกไฟล์";
    
    const docSnap = await getDoc(doc(db, "groups", currentGroupId));
    if (docSnap.exists() && docSnap.data().image) {
        grpFileName.innerText = getFileNameFromUrl(docSnap.data().image);
        grpImgClearBtn.style.display = "inline-block";
    } else {
        grpImgClearBtn.style.display = "none";
    }
    
    groupModal.style.display = "block";
};

document.getElementById('delete-group-btn').onclick = async () => {
    if (!currentGroupId) return;
    if(confirm(`ต้องการลบ ${currentGroupName} ใช่หรือไม่? ตัวละครในนี้จะถูกลบไปด้วย`)) {
        await deleteDoc(doc(db, "groups", currentGroupId));
        insideGroupModal.style.display = "none";
        fetchGroups();
        showToast("ลบกลุ่มเรียบร้อย");
    }
};

document.getElementById('group-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-group-btn');
    const loading = document.getElementById('group-loading-text');
    btn.disabled = true; loading.style.display = "inline";

    const groupData = {
        name: document.getElementById('group-name').value,
        category: document.getElementById('group-category').value
    };

    if (croppedGroupBlob) {
        const imageUrl = await uploadImageToCloudinary(croppedGroupBlob);
        if(imageUrl) groupData.image = imageUrl;
    } else if (groupImgRemoved) {
        groupData.image = deleteField();
    }

    try {
        if (editingGroupId) {
            await updateDoc(doc(db, "groups", editingGroupId), groupData);
            currentGroupName = groupData.name;
            currentGroupCategory = groupData.category;
            document.getElementById('inside-group-title').innerText = groupData.name;
        } else {
            groupData.order = Date.now();
            await addDoc(collection(db, "groups"), groupData);
        }
        
        groupModal.style.display = "none";
        fetchGroups();
        showToast("บันทึกกลุ่มสำเร็จ!");
    } catch (e) { console.error(e); }

    btn.disabled = false; loading.style.display = "none";
};

// ==========================================
// 6. จัดการข้อมูล ตัวละคร (Characters)
// ==========================================
let draggedCharNode = null;

async function fetchCharactersInGroup(groupId) {
    const grid = document.getElementById('character-grid');
    grid.innerHTML = ''; 

    try {
        const q = query(collection(db, "characters"), where("groupId", "==", groupId));
        const snap = await getDocs(q);

        if(snap.empty) return; 

        let chars = [];
        snap.forEach(doc => {
            const data = doc.data();
            const order = data.order || data.timestamp || 0;
            chars.push({ id: doc.id, data: data, order: order });
        });
        chars.sort((a, b) => a.order - b.order); 

        chars.forEach((charItem) => {
            const id = charItem.id;
            const data = charItem.data;
            const imgUrl = data.coverImage ? data.coverImage : COVER_PLACEHOLDER;

            const card = document.createElement('div');
            card.className = 'char-card';
            card.draggable = true;
            card.dataset.id = id;
            card.innerHTML = `
                <img src="${imgUrl}" class="char-img">
                <div class="char-name">${data.name}</div>
                <div class="card-actions">
                    <button class="action-btn edit" title="แก้ไข"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" title="ลบ"><i class="fas fa-trash"></i></button>
                </div>
            `;

            card.addEventListener('dragstart', (e) => {
                draggedCharNode = card;
                e.dataTransfer.effectAllowed = "move";
                setTimeout(() => card.classList.add('drag-over'), 0);
            });
            card.addEventListener('dragend', () => {
                card.classList.remove('drag-over');
                draggedCharNode = null;
            });
            card.addEventListener('dragover', (e) => e.preventDefault());
            card.addEventListener('drop', async (e) => {
                e.preventDefault();
                
                if(draggedCharNode && draggedCharNode !== card) {
                    const rect = card.getBoundingClientRect();
                    const midX = rect.left + rect.width / 2;
                    
                    if (e.clientX < midX) card.parentNode.insertBefore(draggedCharNode, card);
                    else card.parentNode.insertBefore(draggedCharNode, card.nextSibling);

                    const parent = card.parentNode;
                    const allCards = parent.querySelectorAll('.char-card');
                    allCards.forEach((c, i) => {
                        updateDoc(doc(db, "characters", c.dataset.id), { order: i });
                    });
                }
            });

            card.querySelector('.delete').onclick = async (e) => {
                e.stopPropagation();
                if(confirm('ยืนยันลบตัวละคร?')) {
                    await deleteDoc(doc(db, "characters", id));
                    fetchCharactersInGroup(groupId);
                }
            };

            card.querySelector('.edit').onclick = (e) => {
                e.stopPropagation();
                editingCharacterId = id;
                document.getElementById('form-modal-title').innerText = "แก้ไขข้อมูลตัวละคร";
                
                document.getElementById('char-name').value = data.name || '';
                document.getElementById('char-jp-name').value = data.jpName || '';
                document.getElementById('char-aliases').value = (data.aliases || []).join('\n');
                document.getElementById('char-year').value = data.year || '';
                document.getElementById('char-bday').value = data.birthday || '';
                document.getElementById('char-age').value = data.age || '';
                document.getElementById('char-height').value = data.height || '';
                document.getElementById('char-hand').value = data.dominantHand || '';
                document.getElementById('char-homeland').value = data.homeland || '';
                document.getElementById('char-city').value = data.city || '';
                document.getElementById('char-club').value = data.club || '';
                document.getElementById('char-subject').value = data.bestSubject || '';
                document.getElementById('char-hobby').value = data.hobby || '';
                document.getElementById('char-dislikes').value = data.dislikes || '';
                document.getElementById('char-fav-food').value = data.favFood || '';
                document.getElementById('char-dislike-food').value = data.dislikeFood || '';
                document.getElementById('char-talent').value = data.specialTalent || '';
                document.getElementById('char-va').value = data.va || '';
                document.getElementById('char-spell-name').value = data.spellName || '';
                document.getElementById('char-spell-desc').value = data.spellDesc || '';
                
                // ดึงข้อมูลสรรพนามลงฟอร์ม
                document.getElementById('char-pronouns').value = (data.pronouns || []).join('\n');
                
                document.getElementById('char-personality').value = data.personality || '';
                document.getElementById('char-relationships').value = (data.relationships || []).join('\n');
                document.getElementById('char-history').value = data.history || '';
                document.getElementById('char-trivia').value = (data.trivia || []).join('\n');

                charImgInput.value = ""; charImgRemoved = false; croppedCoverBlob = null;
                if(data.coverImage) { 
                    charFileName.innerText = getFileNameFromUrl(data.coverImage); 
                    charImgClearBtn.style.display = "inline-block"; 
                } else { 
                    charFileName.innerText = "ไม่ได้เลือกไฟล์"; 
                    charImgClearBtn.style.display = "none"; 
                }

                charProfileInput.value = ""; charProfileRemoved = false; croppedProfileBlob = null;
                if(data.profileImage) { 
                    charProfileFileName.innerText = getFileNameFromUrl(data.profileImage); 
                    charProfileClearBtn.style.display = "inline-block"; 
                } else { 
                    charProfileFileName.innerText = "ไม่ได้เลือกไฟล์"; 
                    charProfileClearBtn.style.display = "none"; 
                }

                charFormModal.style.display = "block";
            };

            card.onclick = () => {
                const viewLeft = document.querySelector('.view-left');
                if (data.profileImage) {
                    viewLeft.style.display = "block";
                    document.getElementById('view-img').src = data.profileImage;
                } else {
                    viewLeft.style.display = "none";
                    document.getElementById('view-img').src = "";
                }

                document.getElementById('view-name-top').innerText = data.name;

                const setField = (wrapId, textId, value) => {
                    const wrap = document.getElementById(wrapId);
                    if (!value || value.trim() === "") wrap.style.display = "none";
                    else { wrap.style.display = "flex"; document.getElementById(textId).innerHTML = value.replace(/\n/g, '<br>'); }
                };

                const setArrayField = (wrapId, textId, valueArr, bullet = '•', checkLength = false) => {
                    const wrap = document.getElementById(wrapId);
                    if (!valueArr || valueArr.length === 0 || valueArr.every(i => i.trim() === "")) wrap.style.display = "none";
                    else {
                        wrap.style.display = "flex";
                        if (checkLength && valueArr.length === 1) {
                            document.getElementById(textId).innerHTML = valueArr[0];
                        } else {
                            document.getElementById(textId).innerHTML = valueArr.map(i => `${bullet} ${i}`).join('<br>');
                        }
                    }
                };

                document.getElementById('view-name-inside').innerText = data.name;
                const jpNameEl = document.getElementById('view-jp-name-inside');
                if (data.jpName) { jpNameEl.innerText = data.jpName; jpNameEl.style.display = "block"; } else jpNameEl.style.display = "none";

                setArrayField('wrap-view-aliases', 'view-aliases', data.aliases, '•', true);
                setField('wrap-view-year', 'view-year', data.year);
                setField('wrap-view-bday', 'view-bday', data.birthday);
                setField('wrap-view-age', 'view-age', data.age);
                setField('wrap-view-height', 'view-height', data.height);
                setField('wrap-view-hand', 'view-hand', data.dominantHand);
                setField('wrap-view-homeland', 'view-homeland', data.homeland);
                setField('wrap-view-city', 'view-city', data.city);
                setField('wrap-view-club', 'view-club', data.club);
                setField('wrap-view-subject', 'view-subject', data.bestSubject);
                setField('wrap-view-hobby', 'view-hobby', data.hobby);
                setField('wrap-view-dislikes', 'view-dislikes', data.dislikes);
                setField('wrap-view-fav-food', 'view-fav-food', data.favFood);
                setField('wrap-view-dislike-food', 'view-dislike-food', data.dislikeFood);
                setField('wrap-view-talent', 'view-talent', data.specialTalent);
                setField('wrap-view-va', 'view-va', data.va);

                const spellWrap = document.getElementById('wrap-view-spell');
                if (!data.spellName && !data.spellDesc) spellWrap.style.display = "none";
                else {
                    spellWrap.style.display = "flex";
                    let h = "";
                    if (data.spellName) h += `<strong>${data.spellName}</strong><br>`;
                    if (data.spellDesc) h += `<span class="info-value">${data.spellDesc.replace(/\n/g, '<br>')}</span>`;
                    document.getElementById('view-spell-content').innerHTML = h;
                }

                // การแสดงผลของ สรรพนาม (ใช้ display: block ตามโครงสร้าง info-block)
                const pronounsWrap = document.getElementById('wrap-view-pronouns');
                if (!data.pronouns || data.pronouns.length === 0 || data.pronouns.every(i => i.trim() === "")) {
                    pronounsWrap.style.display = "none";
                } else {
                    pronounsWrap.style.display = "block";
                    document.getElementById('view-pronouns').innerHTML = data.pronouns.map(i => `◆ ${i}`).join('<br>');
                }

                // สำหรับอุปนิสัยและเนื้อเรื่อง
                const setBlockField = (wrapId, textId, value) => {
                    const wrap = document.getElementById(wrapId);
                    if (!value || value.trim() === "") wrap.style.display = "none";
                    else { wrap.style.display = "block"; document.getElementById(textId).innerHTML = value.replace(/\n/g, '<br>'); }
                };

                setBlockField('wrap-view-personality', 'view-personality', data.personality);
                setBlockField('wrap-view-history', 'view-history', data.history);
                
                // ความสัมพันธ์ เกร็ดความรู้
                const relWrap = document.getElementById('wrap-view-relationships');
                if (!data.relationships || data.relationships.length === 0 || data.relationships.every(i => i.trim() === "")) relWrap.style.display = "none";
                else {
                    relWrap.style.display = "block";
                    document.getElementById('view-relationships').innerHTML = data.relationships.map(i => `• ${i}`).join('<br>');
                }
                
                const triviaWrap = document.getElementById('wrap-view-trivia');
                if (!data.trivia || data.trivia.length === 0 || data.trivia.every(i => i.trim() === "")) triviaWrap.style.display = "none";
                else {
                    triviaWrap.style.display = "block";
                    document.getElementById('view-trivia').innerHTML = data.trivia.map(i => `◆ ${i}`).join('<br>');
                }

                viewModal.style.display = "block";
            };

            grid.appendChild(card);
        });
    } catch(e) { console.error(e); }
}

document.getElementById('character-form').onsubmit = async (e) => {
    e.preventDefault();
    if(!currentGroupId) return alert("Error: ไม่พบข้อมูลกลุ่มที่เลือกอยู่");

    const btn = document.getElementById('submit-btn');
    const load = document.getElementById('loading-text');
    btn.disabled = true; load.style.display = "inline";

    const charData = {
        groupId: currentGroupId,
        name: document.getElementById('char-name').value,
        jpName: document.getElementById('char-jp-name').value,
        aliases: textToArray(document.getElementById('char-aliases').value),
        year: document.getElementById('char-year').value,
        birthday: document.getElementById('char-bday').value,
        age: document.getElementById('char-age').value,
        height: document.getElementById('char-height').value,
        dominantHand: document.getElementById('char-hand').value,
        homeland: document.getElementById('char-homeland').value,
        city: document.getElementById('char-city').value,
        club: document.getElementById('char-club').value,
        bestSubject: document.getElementById('char-subject').value,
        hobby: document.getElementById('char-hobby').value,
        dislikes: document.getElementById('char-dislikes').value,
        favFood: document.getElementById('char-fav-food').value,
        dislikeFood: document.getElementById('char-dislike-food').value,
        specialTalent: document.getElementById('char-talent').value,
        va: document.getElementById('char-va').value,
        spellName: document.getElementById('char-spell-name').value,
        spellDesc: document.getElementById('char-spell-desc').value,
        
        pronouns: textToArray(document.getElementById('char-pronouns').value),
        
        personality: document.getElementById('char-personality').value,
        relationships: textToArray(document.getElementById('char-relationships').value),
        history: document.getElementById('char-history').value,
        trivia: textToArray(document.getElementById('char-trivia').value),
        timestamp: new Date()
    };

    if (croppedCoverBlob) {
        const coverUrl = await uploadImageToCloudinary(croppedCoverBlob);
        if(coverUrl) charData.coverImage = coverUrl;
    } else if (charImgRemoved) {
        charData.coverImage = deleteField();
    }
    
    if (croppedProfileBlob) {
        const profileUrl = await uploadImageToCloudinary(croppedProfileBlob);
        if(profileUrl) charData.profileImage = profileUrl;
    } else if (charProfileRemoved) {
        charData.profileImage = deleteField();
    }

    try {
        if (editingCharacterId) {
            await updateDoc(doc(db, "characters", editingCharacterId), charData);
        } else {
            charData.order = Date.now(); 
            await addDoc(collection(db, "characters"), charData);
        }

        charFormModal.style.display = "none";
        fetchCharactersInGroup(currentGroupId);
        showToast("บันทึกตัวละครสำเร็จ!");
    } catch(err) { console.error(err); }

    btn.disabled = false; load.style.display = "none";
};

// ==========================================
// 7. หน้า World & Rich Text Editor
// ==========================================
const worldEditor = document.getElementById('world-editor');
const worldToolbar = document.getElementById('world-toolbar');
const saveWorldBtn = document.getElementById('save-world-btn');
const btnWorldImage = document.getElementById('btn-world-image');
const btnWorldToggle = document.getElementById('btn-world-toggle');
const worldImageInput = document.getElementById('world-image-input');

async function fetchWorldData() {
    try {
        const docSnap = await getDoc(doc(db, "world", "mainData"));
        if (docSnap.exists()) worldEditor.innerHTML = docSnap.data().content;
        else worldEditor.innerHTML = "<p>พิมพ์ข้อมูลเกี่ยวกับ World ที่นี่...</p>";
    } catch (e) { console.error(e); }
}

worldEditor.addEventListener('dblclick', () => {
    worldEditor.setAttribute('contenteditable', 'true');
    worldToolbar.style.display = 'flex';
    worldEditor.focus();
});

btnWorldImage.onclick = () => worldImageInput.click();
worldImageInput.onchange = async (e) => {
    if (e.target.files.length > 0) {
        document.getElementById('world-loading').style.display = "inline";
        const url = await uploadImageToCloudinary(e.target.files[0]);
        if (url) { worldEditor.focus(); document.execCommand('insertImage', false, url); }
        document.getElementById('world-loading').style.display = "none";
        worldImageInput.value = "";
    }
};

btnWorldToggle.onclick = () => {
    worldEditor.focus();
    const toggleHTML = `<details class="world-toggle" open><summary><span class="toggle-title" contenteditable="true" data-placeholder="พิมพ์หัวข้อที่นี่..."></span><button contenteditable="false" class="delete-toggle-btn" title="ลบกล่องนี้">&times;</button></summary><div class="toggle-content" contenteditable="true" data-placeholder="พิมพ์เนื้อหาที่นี่..."></div></details>&nbsp;`;
    document.execCommand('insertHTML', false, toggleHTML);
};

worldEditor.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-toggle-btn')) {
        if(confirm("ลบกล่องหัวข้อนี้ใช่หรือไม่?")) {
            e.target.closest('details').remove();
        }
    }
});

saveWorldBtn.onclick = async () => {
    try {
        await setDoc(doc(db, "world", "mainData"), { content: worldEditor.innerHTML }, { merge: true });
        worldEditor.setAttribute('contenteditable', 'false');
        worldToolbar.style.display = 'none';
        showToast("บันทึกข้อมูล World สำเร็จ");
    } catch (e) { alert("บันทึกล้มเหลว"); }
};

fetchGroups();
fetchWorldData();