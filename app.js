import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc, query, where, deleteField } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const COVER_PLACEHOLDER = "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22140%22%20height%3D%22220%22%20style%3D%22background%3A%23555%22%3E%3C%2Fsvg%3E";

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

const formatText = (text) => {
    if (!text) return "";
    let t = text.replace(/\n/g, '<br>');
    t = t.replace(/#([^#]+)#/g, '<span class="spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>');
    return t;
};

let draggedGroupNode = null;
let draggedCharNode = null;

function getDragAfterElement(container, x, y, itemClass) {
    const draggableElements = [...container.querySelectorAll(`.${itemClass}:not(.dragging)`)];
    let closestElement = null;
    let minDistance = Number.POSITIVE_INFINITY;

    draggableElements.forEach(child => {
        const box = child.getBoundingClientRect();
        const boxCenterX = box.left + box.width / 2;
        const boxCenterY = box.top + box.height / 2;
        
        const dist = Math.sqrt(Math.pow(x - boxCenterX, 2) + Math.pow((y - boxCenterY) * 2, 2));
        if (dist < minDistance) {
            minDistance = dist;
            if (x < boxCenterX) {
                closestElement = child;
            } else {
                closestElement = child.nextElementSibling;
                while (closestElement && closestElement.classList.contains('dragging')) {
                    closestElement = closestElement.nextElementSibling;
                }
            }
        }
    });
    return closestElement;
}

function setupGridDragAndDrop(gridId, itemClass) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    
    grid.addEventListener('dragover', e => {
        e.preventDefault();
        const draggedNode = itemClass === 'char-card' ? draggedCharNode : draggedGroupNode;
        if (!draggedNode) return;
        
        const afterElement = getDragAfterElement(grid, e.clientX, e.clientY, itemClass);
        if (afterElement == null) {
            grid.appendChild(draggedNode);
        } else {
            grid.insertBefore(draggedNode, afterElement);
        }
    });
}
setupGridDragAndDrop('nrc-grid', 'group-card');
setupGridDragAndDrop('rsa-grid', 'group-card');
setupGridDragAndDrop('character-grid', 'char-card');

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
        reader.onload = (e) => openCropModal(e.target.result, 'cover', 140/220);
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
            const order = data.order ?? data.timestamp ?? 0;
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
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = "move";
            });
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                draggedGroupNode = null;
                
                const parent = card.parentNode;
                const allCards = parent.querySelectorAll('.group-card');
                allCards.forEach((c, i) => {
                    updateDoc(doc(db, "groups", c.dataset.id), { order: i });
                });
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
            const order = data.order ?? data.timestamp ?? 0;
            
            // ดึงเก็บแค่ข้อมูลพื้นฐานสำหรับโชว์บนการ์ด เพื่อลดการกิน Memory
            chars.push({ 
                id: doc.id, 
                order: order,
                name: data.name,
                coverImage: data.coverImage
            });
        });
        chars.sort((a, b) => a.order - b.order); 

        chars.forEach((charItem) => {
            const id = charItem.id;
            const name = charItem.name;
            const imgUrl = charItem.coverImage ? charItem.coverImage : COVER_PLACEHOLDER;

            const card = document.createElement('div');
            card.className = 'char-card';
            card.draggable = true;
            card.dataset.id = id;
            card.innerHTML = `
                <img src="${imgUrl}" class="char-img">
                <div class="char-name">${name}</div>
                <div class="card-actions">
                    <button class="action-btn edit" title="แก้ไข"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" title="ลบ"><i class="fas fa-trash"></i></button>
                </div>
            `;

            card.addEventListener('dragstart', (e) => {
                draggedCharNode = card;
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = "move";
            });
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                draggedCharNode = null;
                
                const parent = card.parentNode;
                const allCards = parent.querySelectorAll('.char-card');
                allCards.forEach((c, i) => {
                    updateDoc(doc(db, "characters", c.dataset.id), { order: i });
                });
            });

            card.querySelector('.delete').onclick = async (e) => {
                e.stopPropagation();
                if(confirm('ยืนยันลบตัวละคร?')) {
                    await deleteDoc(doc(db, "characters", id));
                    fetchCharactersInGroup(groupId);
                }
            };

            // เมื่อกด Edit ค่อยดึงข้อมูลเต็มของตัวละครนั้นมาแสดง
            card.querySelector('.edit').onclick = async (e) => {
                e.stopPropagation();
                
                try {
                    const docSnap = await getDoc(doc(db, "characters", id));
                    if (!docSnap.exists()) return;
                    const data = docSnap.data();

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
                    
                    document.getElementById('char-occupation').value = data.occupation || '';
                    document.getElementById('char-position').value = data.position || '';
                    
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
                } catch (err) {
                    console.error(err);
                    alert("เกิดข้อผิดพลาดในการดึงข้อมูล");
                }
            };

            // เมื่อกดดู (View) ค่อยดึงข้อมูลเต็มของตัวละครนั้นมาแสดง
            card.onclick = async () => {
                
                try {
                    const docSnap = await getDoc(doc(db, "characters", id));
                    if (!docSnap.exists()) return;
                    const data = docSnap.data();

                    const viewLeft = document.querySelector('.view-left');
                    if (data.profileImage) {
                        viewLeft.style.display = "flex";
                        document.getElementById('view-img').src = data.profileImage;
                    } else {
                        viewLeft.style.display = "none";
                        document.getElementById('view-img').src = "";
                    }

                    document.getElementById('view-name-top').innerText = data.name;

                    const setField = (wrapId, textId, value) => {
                        const wrap = document.getElementById(wrapId);
                        if (!value || value.trim() === "") wrap.style.display = "none";
                        else { wrap.style.display = "grid"; document.getElementById(textId).innerHTML = formatText(value); }
                    };

                    const setArrayField = (wrapId, textId, valueArr, bullet = '•', checkLength = false) => {
                        const wrap = document.getElementById(wrapId);
                        if (!valueArr || valueArr.length === 0 || valueArr.every(i => i.trim() === "")) wrap.style.display = "none";
                        else {
                            wrap.style.display = "grid";
                            if (checkLength && valueArr.length === 1) {
                                document.getElementById(textId).innerHTML = formatText(valueArr[0]);
                            } else {
                                document.getElementById(textId).innerHTML = valueArr.map(i => `${bullet} ${formatText(i)}`).join('<br>');
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
                    
                    setField('wrap-view-occupation', 'view-occupation', data.occupation);
                    setField('wrap-view-position', 'view-position', data.position);
                    
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
                        spellWrap.style.display = "block";
                        let h = "";
                        if (data.spellName) h += `<div style="text-align: center; font-weight: bold; color: var(--accent-color); margin-bottom: 5px;">${formatText(data.spellName)}</div>`;
                        if (data.spellDesc) h += `<div class="info-box">${formatText(data.spellDesc)}</div>`;
                        document.getElementById('view-spell-content').innerHTML = h;
                    }

                    const pronounsWrap = document.getElementById('wrap-view-pronouns');
                    if (!data.pronouns || data.pronouns.length === 0 || data.pronouns.every(i => i.trim() === "")) pronounsWrap.style.display = "none";
                    else {
                        pronounsWrap.style.display = "block";
                        document.getElementById('view-pronouns').innerHTML = data.pronouns.map(i => `◆ ${formatText(i)}`).join('<br>');
                    }

                    const setBlockField = (wrapId, textId, value) => {
                        const wrap = document.getElementById(wrapId);
                        if (!value || value.trim() === "") wrap.style.display = "none";
                        else { wrap.style.display = "block"; document.getElementById(textId).innerHTML = formatText(value); }
                    };

                    setBlockField('wrap-view-personality', 'view-personality', data.personality);
                    setBlockField('wrap-view-history', 'view-history', data.history);
                    
                    const relWrap = document.getElementById('wrap-view-relationships');
                    if (!data.relationships || data.relationships.length === 0 || data.relationships.every(i => i.trim() === "")) relWrap.style.display = "none";
                    else {
                        relWrap.style.display = "block";
                        document.getElementById('view-relationships').innerHTML = data.relationships.map(i => `• ${formatText(i)}`).join('<br>');
                    }
                    
                    const triviaWrap = document.getElementById('wrap-view-trivia');
                    if (!data.trivia || data.trivia.length === 0 || data.trivia.every(i => i.trim() === "")) triviaWrap.style.display = "none";
                    else {
                        triviaWrap.style.display = "block";
                        document.getElementById('view-trivia').innerHTML = data.trivia.map(i => `◆ ${formatText(i)}`).join('<br>');
                    }

                    viewModal.style.display = "block";
                } catch (err) {
                    console.error(err);
                    alert("เกิดข้อผิดพลาดในการดึงข้อมูลตัวละคร");
                }
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
        
        occupation: document.getElementById('char-occupation').value,
        position: document.getElementById('char-position').value,
        
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
// 7. หน้า World & Rich Text Editor แบบใหม่
// ==========================================
const worldEditor = document.getElementById('world-editor');
const worldDisplay = document.getElementById('world-display');
const worldToolbar = document.getElementById('world-toolbar');
const saveWorldBtn = document.getElementById('save-world-btn');
const cancelWorldBtn = document.getElementById('cancel-world-btn');
const btnWorldImage = document.getElementById('btn-world-image');
const btnWorldToggle = document.getElementById('btn-world-toggle');
const worldImageInput = document.getElementById('world-image-input');

let rawWorldContent = "";

// ฟังก์ชันแปลงแท็ก # ## ### #### เป็นหัวข้อ และสร้างสารบัญ
function parseWorldContent(rawHtml) {
    const temp = document.createElement('div');
    temp.innerHTML = rawHtml;
    const tocList = [];
    let idCounter = 0;

    // 1. ซ่อมแซมและจัดเตรียม Toggle 
    temp.querySelectorAll('.world-toggle').forEach(toggle => {
        // ห่อด้วย wrapper ถ้ายังไม่มี (เพื่อรองรับการลากในโหมดแก้ไข)
        let parent = toggle.parentElement;
        if (!parent || !parent.classList.contains('toggle-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'toggle-wrapper';
            toggle.parentNode.insertBefore(wrapper, toggle);
            wrapper.appendChild(toggle);
        }

        // จัดการไอคอนเปิดปิด
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

    // 2. หาข้อความที่ขึ้นต้นด้วย # และแปลงเป็น Headings (h1 - h4)
    const walker = document.createTreeWalker(temp, NodeFilter.SHOW_TEXT, null, false);
    const nodesToReplace = [];

    while(walker.nextNode()) {
        const node = walker.currentNode;
        const text = node.nodeValue;
        
        const match4 = text.match(/^\s*####\s+(.*)$/);
        const match3 = text.match(/^\s*###\s+(.*)$/);
        const match2 = text.match(/^\s*##\s+(.*)$/);
        const match1 = text.match(/^\s*#\s+(.*)$/);

        if (match4) nodesToReplace.push({ node, level: 4, text: match4[1] });
        else if (match3) nodesToReplace.push({ node, level: 3, text: match3[1] });
        else if (match2) nodesToReplace.push({ node, level: 2, text: match2[1] });
        else if (match1) nodesToReplace.push({ node, level: 1, text: match1[1] });
    }

    nodesToReplace.forEach(({node, level, text}) => {
        const heading = document.createElement('div');
        heading.className = `world-h${level} toc-item-element`;
        heading.innerText = text;
        heading.dataset.tocLevel = level;
        heading.dataset.tocText = text;

        // ดึงสีจากการตั้งค่าโดยผู้ใช้งานมาร่วมด้วย
        let p = node.parentElement;
        let customColor = null;
        while(p && p !== temp) {
            if (p.style && p.style.color) {
                customColor = p.style.color;
                break;
            }
            if (p.hasAttribute('color')) {
                customColor = p.getAttribute('color');
                break;
            }
            p = p.parentElement;
        }
        if (customColor) {
            heading.style.color = customColor;
        }

        node.replaceWith(heading);
    });

    // 3. เตรียมข้อมูลกล่อง Toggle ที่มีหัวข้อแล้ว ให้เข้าสู่สารบัญ
    temp.querySelectorAll('.world-toggle').forEach(toggle => {
        const titleEl = toggle.querySelector('.toggle-title');
        // ถ้าผู้ใช้พิมพ์ชื่อหัวข้อให้กล่อง Toggle แล้ว
        if(titleEl && titleEl.innerText.trim() !== "") {
            toggle.classList.add('toc-item-element');
            toggle.dataset.tocLevel = 'toggle'; // จะแสดงเป็นระดับ 2 ในสารบัญ
            toggle.dataset.tocText = titleEl.innerText.trim();
        }
    });

    // 4. สร้างสารบัญเรียงตามลำดับหน้ากระดาษ DOM Tree
    temp.querySelectorAll('.toc-item-element').forEach(el => {
        idCounter++;
        const id = `toc-heading-${idCounter}`;
        el.id = id;
        
        const isToggle = el.dataset.tocLevel === 'toggle';
        const lvl = isToggle ? 2 : parseInt(el.dataset.tocLevel);

        tocList.push({ 
            level: lvl, 
            text: el.dataset.tocText, 
            id: id,
            isToggle: isToggle
        });
    });

    // ปลดล็อกเนื้อหาในโหมดโชว์ข้อมูล
    temp.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    // เอา draggable ออกในโหมดโชว์ด้วย
    temp.querySelectorAll('.toggle-wrapper').forEach(w => w.removeAttribute('draggable'));

    return { html: temp.innerHTML, toc: tocList };
}

function updateWorldDisplay() {
    const { html, toc } = parseWorldContent(rawWorldContent);
    worldDisplay.innerHTML = html;
    
    const tocContainer = document.getElementById('world-toc');
    tocContainer.innerHTML = '';
    
    if (toc.length === 0) {
        tocContainer.innerHTML = '<li style="color:var(--text-secondary); font-size:0.9rem;">ยังไม่มีสารบัญ<br>(พิมพ์ # นำหน้าข้อความ หรือสร้าง Toggle เพื่อเพิ่มหัวข้อ)</li>';
    }

    toc.forEach(item => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${item.id}`;
        
        if(item.isToggle) {
            a.innerHTML = `<span style="color:var(--accent-color); font-size:0.75rem; margin-right:8px; vertical-align:middle;">◆</span>${item.text}`;
            a.style.paddingLeft = "25px";
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
        };
        
        if (item.level === 1) a.classList.add('toc-h1');
        else if (item.level === 2) a.classList.add('toc-h2');
        else if (item.level === 3) a.classList.add('toc-h3');
        else if (item.level === 4) a.classList.add('toc-h4');

        li.appendChild(a);
        tocContainer.appendChild(li);
    });
}

async function fetchWorldData() {
    try {
        const docSnap = await getDoc(doc(db, "world", "mainData"));
        if (docSnap.exists()) {
            rawWorldContent = docSnap.data().content;
        } else {
            rawWorldContent = "<p>พิมพ์ข้อมูลเกี่ยวกับ World ที่นี่... <br>พิมพ์ # นำหน้าเพื่อสร้างหัวข้อ</p>";
        }
        updateWorldDisplay();
    } catch (e) { console.error(e); }
}

worldDisplay.addEventListener('dblclick', () => {
    worldDisplay.style.display = 'none';
    worldEditor.style.display = 'block';
    worldToolbar.style.display = 'flex';
    
    // ซ่อมแซมเตรียมเข้าสู่โหมดแก้ไข
    const temp = document.createElement('div');
    temp.innerHTML = rawWorldContent;
    
    temp.querySelectorAll('.world-toggle').forEach(toggle => {
        let wrapper = toggle.parentElement;
        if (!wrapper || !wrapper.classList.contains('toggle-wrapper')) {
            wrapper = document.createElement('div');
            wrapper.className = 'toggle-wrapper';
            wrapper.setAttribute('contenteditable', 'false');
            toggle.parentNode.insertBefore(wrapper, toggle);
            wrapper.appendChild(toggle);
        } else {
            wrapper.setAttribute('contenteditable', 'false');
        }

        if(!wrapper.querySelector('.drag-handle')) {
            const handle = document.createElement('span');
            handle.className = 'drag-handle';
            handle.title = 'ลากสลับที่';
            handle.setAttribute('contenteditable', 'false');
            handle.innerText = '☰';
            wrapper.insertBefore(handle, toggle);
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

        // คืนค่าให้สามารถพิมพ์แก้หัวข้อ และ เนื้อหาได้สำหรับกล่องเก่า
        const title = toggle.querySelector('.toggle-title');
        if(title) title.setAttribute('contenteditable', 'true');
        
        const content = toggle.querySelector('.toggle-content');
        if(content) content.setAttribute('contenteditable', 'true');
        
        const delBtn = toggle.querySelector('.delete-toggle-btn');
        if(delBtn) delBtn.setAttribute('contenteditable', 'false');
    });

    worldEditor.innerHTML = temp.innerHTML;
    worldEditor.setAttribute('contenteditable', 'true');
    worldEditor.focus();
});

// อนุญาตให้กดปุ่ม Tab บนคีย์บอร์ดแล้วเว้นวรรค
worldEditor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
    }
});

// เลือกสี 5 สี
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.onclick = () => {
        document.execCommand('foreColor', false, btn.dataset.color);
        worldEditor.focus();
    };
});

cancelWorldBtn.onclick = () => {
    worldEditor.style.display = 'none';
    worldToolbar.style.display = 'none';
    worldDisplay.style.display = 'block';
};

saveWorldBtn.onclick = async () => {
    const newContent = worldEditor.innerHTML;
    try {
        await setDoc(doc(db, "world", "mainData"), { content: newContent }, { merge: true });
        rawWorldContent = newContent;
        worldEditor.style.display = 'none';
        worldToolbar.style.display = 'none';
        worldDisplay.style.display = 'block';
        updateWorldDisplay();
        showToast("บันทึกข้อมูล World สำเร็จ");
    } catch (e) { alert("บันทึกล้มเหลว"); }
};

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
    const toggleHTML = `<div class="toggle-wrapper" contenteditable="false"><span class="drag-handle" title="ลากสลับที่" contenteditable="false">☰</span><details class="world-toggle" open><summary><span class="toggle-icon" title="เปิด/ปิด">‣</span>&nbsp;<span class="toggle-title" contenteditable="true" data-placeholder="พิมพ์หัวข้อที่นี่..."></span><button contenteditable="false" class="delete-toggle-btn" title="ลบกล่องนี้">&times;</button></summary><div class="toggle-content" contenteditable="true" data-placeholder="พิมพ์เนื้อหาที่นี่..."></div></details></div><p>&nbsp;</p>`;
    document.execCommand('insertHTML', false, toggleHTML);
};

// ดัก Event คลิกสำหรับ Toggle: 
document.addEventListener('click', (e) => {
    const summary = e.target.closest('summary');
    if (summary && summary.closest('.world-toggle')) {
        // ให้คลิกที่ไอคอน ‣ เท่านั้น ถึงจะกาง/พับกล่องได้
        if (!e.target.classList.contains('toggle-icon')) {
            e.preventDefault();
            // ถ้าคลิกโดนชื่อหัวข้อ ให้สั่งโฟกัสเผื่อไว้เพื่อให้มั่นใจว่าพิมพ์แก้ต่อได้
            if (e.target.classList.contains('toggle-title')) {
                e.target.focus();
            }
        }
    }
});

// ฟังชั่นก์การลบกล่อง Toggle 
worldEditor.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-toggle-btn')) {
        if(confirm("ลบกล่องหัวข้อนี้ใช่หรือไม่?")) {
            const wrapper = e.target.closest('.toggle-wrapper');
            if (wrapper) wrapper.remove();
            else e.target.closest('details').remove(); 
        }
    }
});

// ระบบ Drag & Drop สำหรับเรียงลำดับกล่อง Toggle ในหน้า World Editor
let draggedToggle = null;

// ยอมให้ตั้งค่า Draggable = true เฉพาะตอนที่จิ้มเมาส์บนปุ่ม ☰
worldEditor.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('drag-handle')) {
        const wrapper = e.target.closest('.toggle-wrapper');
        if(wrapper) wrapper.setAttribute('draggable', 'true');
    }
});

// ปลดการลากออกเมื่อปล่อยเมาส์
worldEditor.addEventListener('mouseup', (e) => {
    const wrapper = e.target.closest('.toggle-wrapper');
    if(wrapper && wrapper.hasAttribute('draggable')) {
        wrapper.removeAttribute('draggable');
    }
});

worldEditor.addEventListener('dragstart', (e) => {
    const wrapper = e.target.closest('.toggle-wrapper');
    if (wrapper && wrapper.hasAttribute('draggable')) {
        draggedToggle = wrapper;
        e.dataTransfer.effectAllowed = "move";
        wrapper.classList.add('dragging-toggle');
        setTimeout(() => wrapper.style.opacity = '0.5', 0);
        
        // **ปิด contenteditable ชั่วคราวตอนลาก เพื่อกันเบราว์เซอร์กวนการย้ายตำแหน่ง**
        worldEditor.setAttribute('contenteditable', 'false');
    } else {
        e.preventDefault(); // บล็อกไม่ให้ลากได้ถ้าไม่ได้กดตรง ☰ มาก่อน
    }
});

worldEditor.addEventListener('dragend', (e) => {
    const wrapper = e.target.closest('.toggle-wrapper');
    if (wrapper) {
        wrapper.classList.remove('dragging-toggle');
        wrapper.style.opacity = '1';
        wrapper.removeAttribute('draggable');
        draggedToggle = null;
        
        // **คืนค่าให้พิมพ์เนื้อหาหน้า World ต่อได้เมื่อลากเสร็จ**
        worldEditor.setAttribute('contenteditable', 'true');
    }
});

worldEditor.addEventListener('dragover', (e) => {
    if (!draggedToggle) return;
    e.preventDefault(); 
    e.dataTransfer.dropEffect = "move";
});

// การย้าย DOM จะมาทำที่จังหวะ Drop ชัวร์ที่สุด ไม่เพี้ยน
worldEditor.addEventListener('drop', (e) => {
    if (!draggedToggle) return;
    e.preventDefault();
    const afterElement = getDragAfterToggle(worldEditor, e.clientY);
    if (afterElement == null) {
        worldEditor.appendChild(draggedToggle);
    } else {
        worldEditor.insertBefore(draggedToggle, afterElement);
    }
});

function getDragAfterToggle(container, y) {
    const draggableElements = [...container.querySelectorAll('.toggle-wrapper:not(.dragging-toggle)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

fetchGroups();
fetchWorldData();