import { initializeApp } from "https://esm.run/firebase@10.8.0/app";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc, query, where, deleteField } from "https://esm.run/firebase@10.8.0/firestore";

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

let editingStoryId = null;
let currentStoryContent = "";

let groupImgRemoved = false;
let charImgRemoved = false;
let charProfileRemoved = false;
let storyImgRemoved = false;

let cropper = null;
let currentCropTarget = ''; 
let croppedGroupBlob = null;
let croppedCoverBlob = null;
let croppedProfileBlob = null;
let croppedStoryBlob = null;

const TRANSPARENT_GROUP_PLACEHOLDER = "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22150%22%20height%3D%22150%22%3E%3Crect%20width%3D%22150%22%20height%3D%22150%22%20fill%3D%22transparent%22%20stroke%3D%22%23555%22%20stroke-width%3D%222%22%20stroke-dasharray%3D%225%2C5%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22%23555%22%3ENo%20Icon%3C%2Ftext%3E%3C%2Fsvg%3E";
const COVER_PLACEHOLDER = "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22140%22%20height%3D%22220%22%20style%3D%22background%3A%23555%22%3E%3C%2Fsvg%3E";
const STORY_PLACEHOLDER = "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22120%22%20height%3D%2260%22%20style%3D%22background%3A%23555%22%3E%3C%2Fsvg%3E";

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
let draggedStoryNode = null;

function getDragAfterElement(container, x, y, itemClass) {
    const draggableElements = [...container.querySelectorAll(`.${itemClass}:not(.dragging)`)];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const boxCenterX = box.left + box.width / 2;
        const boxCenterY = box.top + box.height / 2;
        const dist = Math.sqrt(Math.pow(x - boxCenterX, 2) + Math.pow((y - boxCenterY) * 2, 2));
        if (dist < closest.minDistance) {
            return {
                minDistance: dist,
                element: itemClass === 'story-card' ? (y < boxCenterY ? child : child.nextElementSibling) : (x < boxCenterX ? child : child.nextElementSibling)
            };
        }
        return closest;
    }, { minDistance: Number.POSITIVE_INFINITY }).element;
}

function setupGridDragAndDrop(gridId, itemClass) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.addEventListener('dragover', e => {
        e.preventDefault();
        let draggedNode = null;
        if(itemClass === 'char-card') draggedNode = draggedCharNode;
        else if(itemClass === 'group-card') draggedNode = draggedGroupNode;
        else if(itemClass === 'story-card') draggedNode = draggedStoryNode;

        if (!draggedNode) return;
        const afterElement = getDragAfterElement(grid, e.clientX, e.clientY, itemClass);
        if (afterElement == null || afterElement === draggedNode) {
            grid.appendChild(draggedNode);
        } else {
            grid.insertBefore(draggedNode, afterElement);
        }
    });
}
setupGridDragAndDrop('nrc-grid', 'group-card');
setupGridDragAndDrop('rsa-grid', 'group-card');
setupGridDragAndDrop('character-grid', 'char-card');
setupGridDragAndDrop('main-story-grid', 'story-card');
setupGridDragAndDrop('events-story-grid', 'story-card');

function setupTabs(tabSelector, contentSelector, callback = null) {
    document.querySelectorAll(tabSelector).forEach(tab => {
        tab.addEventListener('click', () => {
            const container = tab.closest('.view-section') || tab.closest('.modal-content') || document;
            container.querySelectorAll(tabSelector).forEach(t => t.classList.remove('active'));
            container.querySelectorAll(contentSelector).forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.target).classList.add('active');
            if (callback) callback(tab);
        });
    });
}

setupTabs('.main-tabs li', '.view-section', (tab) => {
    const targetId = tab.dataset.target;
    document.getElementById('add-btn').style.display = targetId === 'world-view' || targetId === 'gameplay-view' ? 'none' : 'block';
    
    const targetView = document.getElementById(targetId);
    if (targetView) {
        const firstSubTab = targetView.querySelector('.sub-tabs li:first-child');
        if (firstSubTab && !firstSubTab.classList.contains('active')) {
            firstSubTab.click();
        }
    }
    
    if (targetId === 'world-view') {
        window.scrollTo(0, 0);
        const viewArea = document.getElementById('world-display');
        if (viewArea) {
            viewArea.querySelectorAll('details.world-toggle').forEach(details => {
                if(!details.hasAttribute('open')) details.setAttribute('open', '');
            });
        }
    }
});
setupTabs('.sub-tabs li', '.sub-view');
setupTabs('#character-modal .modal-tabs li', '#character-modal .form-tab');
setupTabs('#view-modal .modal-tabs li', '#view-modal .v-tab');

function openCropModal(imageSrc, target, ratio) {
    currentCropTarget = target;
    const img = document.getElementById('crop-image-target');
    img.src = imageSrc;
    document.getElementById('crop-modal').style.display = 'block';
    if (cropper) cropper.destroy();
    cropper = new Cropper(img, { aspectRatio: ratio, viewMode: 1, autoCropArea: 1 });
}

document.getElementById('cancel-crop-btn').onclick = () => {
    document.getElementById('crop-modal').style.display = 'none';
    if(currentCropTarget === 'group') document.getElementById('group-image').value = "";
    if(currentCropTarget === 'cover') document.getElementById('char-image').value = "";
    if(currentCropTarget === 'profile') document.getElementById('char-profile-image').value = "";
    if(currentCropTarget === 'story') document.getElementById('story-image').value = "";
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
        } else if (currentCropTarget === 'story') {
            croppedStoryBlob = blob;
            document.getElementById('story-file-name').innerText = "รูปภาพถูกครอบตัดแล้ว";
            document.getElementById('clear-story-img-btn').style.display = "inline-block";
            storyImgRemoved = false;
        }
        document.getElementById('crop-modal').style.display = 'none';
    }, 'image/png', 0.9);
};

function setupImageInput(inputId, clearBtnId, fileNameId, targetType, ratio) {
    const input = document.getElementById(inputId);
    const clearBtn = document.getElementById(clearBtnId);
    const fileName = document.getElementById(fileNameId);

    input.addEventListener('change', function(e) {
        if (this.files && this.files.length > 0) {
            const reader = new FileReader();
            reader.onload = (e) => openCropModal(e.target.result, targetType, ratio);
            reader.readAsDataURL(this.files[0]);
        }
    });
    clearBtn.addEventListener('click', () => {
        input.value = "";
        if (targetType === 'group') { croppedGroupBlob = null; groupImgRemoved = true; }
        if (targetType === 'cover') { croppedCoverBlob = null; charImgRemoved = true; }
        if (targetType === 'profile') { croppedProfileBlob = null; charProfileRemoved = true; }
        if (targetType === 'story') { croppedStoryBlob = null; storyImgRemoved = true; }
        fileName.innerText = "ไม่ได้เลือกไฟล์";
        clearBtn.style.display = "none";
    });
}

setupImageInput('group-image', 'clear-group-img-btn', 'group-file-name', 'group', 1/1);
setupImageInput('char-image', 'clear-char-img-btn', 'char-file-name', 'cover', 140/220);
setupImageInput('char-profile-image', 'clear-char-profile-btn', 'char-profile-file-name', 'profile', 1/1);
setupImageInput('story-image', 'clear-story-img-btn', 'story-file-name', 'story', 2.5/1);

const groupModal = document.getElementById('group-modal');
const insideGroupModal = document.getElementById('inside-group-modal');
const charFormModal = document.getElementById('character-modal');
const viewModal = document.getElementById('view-modal');
const storyCardModal = document.getElementById('story-card-modal');
const storyContentModal = document.getElementById('story-content-modal');

document.getElementById('add-btn').onclick = () => {
    const activeTab = document.querySelector('.main-tabs li.active').dataset.target;
    
    if (activeTab === 'characters-view') {
        editingGroupId = null;
        document.getElementById('group-form').reset();
        document.getElementById('group-modal-title').innerText = "สร้างไอคอนกลุ่ม/หอใหม่";
        document.getElementById('group-file-name').innerText = "ไม่ได้เลือกไฟล์";
        document.getElementById('clear-group-img-btn').style.display = "none";
        groupImgRemoved = false;
        croppedGroupBlob = null;
        groupModal.style.display = "block";
    } else if (activeTab === 'story-view') {
        editingStoryId = null;
        document.getElementById('story-card-form').reset();
        document.getElementById('story-card-title').innerText = "สร้างสตอรี่ใหม่";
        document.getElementById('story-file-name').innerText = "ไม่ได้เลือกไฟล์";
        document.getElementById('clear-story-img-btn').style.display = "none";
        storyImgRemoved = false;
        croppedStoryBlob = null;
        
        const activeSubTab = document.querySelector('#story-view .sub-tabs li.active');
        if(activeSubTab) document.getElementById('story-category').value = activeSubTab.innerText.trim();
        
        storyCardModal.style.display = "block";
    }
};

document.getElementById('add-char-btn').onclick = () => {
    editingCharacterId = null;
    document.getElementById('character-form').reset();
    document.getElementById('form-modal-title').innerText = "เพิ่มข้อมูลตัวละคร";
    document.getElementById('char-file-name').innerText = "ไม่ได้เลือกไฟล์";
    document.getElementById('clear-char-img-btn').style.display = "none";
    document.getElementById('char-profile-file-name').innerText = "ไม่ได้เลือกไฟล์";
    document.getElementById('clear-char-profile-btn').style.display = "none";
    charImgRemoved = false;
    charProfileRemoved = false;
    croppedCoverBlob = null;
    croppedProfileBlob = null;
    
    const firstTab = charFormModal.querySelector('.modal-tabs li:first-child');
    if(firstTab) firstTab.click();
    charFormModal.querySelector('.modal-content').scrollTop = 0;
    
    charFormModal.style.display = "block";
};

document.querySelectorAll('.modal .close-btn, .modal .group-close-btn, #close-story-content-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.target.closest('.modal').style.display = "none";
    });
});

window.onclick = (e) => {
    if (e.target.classList.contains('modal')) e.target.style.display = "none";
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
            groups.push({ id: doc.id, data: data, order: data.order ?? data.timestamp ?? 0 });
        });
        groups.sort((a, b) => a.order - b.order); 

        groups.forEach((groupItem, index) => {
            const { id, data } = groupItem;
            const imgUrl = data.image ? data.image : TRANSPARENT_GROUP_PLACEHOLDER;
            const card = document.createElement('div');
            card.className = 'group-card';
            card.style.animationDelay = `${index * 0.05}s`;
            card.draggable = true;
            card.dataset.id = id;
            card.innerHTML = `<img src="${imgUrl}" class="group-img"><div class="group-name">${data.name}</div>`;

            card.addEventListener('dragstart', (e) => {
                draggedGroupNode = card;
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = "move";
            });
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                draggedGroupNode = null;
                card.parentNode.querySelectorAll('.group-card').forEach((c, i) => {
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
    } catch (error) { console.error(error); }
}

document.getElementById('edit-group-btn').onclick = async () => {
    if (!currentGroupId) return;
    editingGroupId = currentGroupId;
    document.getElementById('group-modal-title').innerText = "แก้ไขกลุ่ม/หอ";
    document.getElementById('group-name').value = currentGroupName;
    document.getElementById('group-category').value = currentGroupCategory;
    
    const grpImgInputLocal = document.getElementById('group-image');
    const grpImgClearBtnLocal = document.getElementById('clear-group-img-btn');
    const grpFileNameLocal = document.getElementById('group-file-name');

    grpImgInputLocal.value = "";
    groupImgRemoved = false;
    croppedGroupBlob = null;
    grpFileNameLocal.innerText = "ไม่ได้เลือกไฟล์";
    
    const docSnap = await getDoc(doc(db, "groups", currentGroupId));
    if (docSnap.exists() && docSnap.data().image) {
        grpFileNameLocal.innerText = getFileNameFromUrl(docSnap.data().image);
        grpImgClearBtnLocal.style.display = "inline-block";
    } else {
        grpImgClearBtnLocal.style.display = "none";
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

function renderViewField(type, wrapId, textId, value, bullet = '') {
    const wrap = document.getElementById(wrapId);
    if (!value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && value.trim() === "")) {
        wrap.style.display = "none";
    } else {
        if (type === 'block') wrap.style.display = "block";
        else wrap.style.display = "grid";
        
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
            chars.push({ id: doc.id, order: data.order ?? data.timestamp ?? 0, name: data.name, coverImage: data.coverImage });
        });
        chars.sort((a, b) => a.order - b.order); 

        chars.forEach((charItem) => {
            const { id, name, coverImage } = charItem;
            const imgUrl = coverImage || COVER_PLACEHOLDER;
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
                card.parentNode.querySelectorAll('.char-card').forEach((c, i) => {
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
                        if (f.type === 'array') el.value = (data[f.key] || []).join('\n');
                        else el.value = data[f.key] || '';
                    });

                    document.getElementById('char-image').value = ""; charImgRemoved = false; croppedCoverBlob = null;
                    const cName = document.getElementById('char-file-name');
                    const cClear = document.getElementById('clear-char-img-btn');
                    if(data.coverImage) { cName.innerText = getFileNameFromUrl(data.coverImage); cClear.style.display = "inline-block"; } 
                    else { cName.innerText = "ไม่ได้เลือกไฟล์"; cClear.style.display = "none"; }

                    document.getElementById('char-profile-image').value = ""; charProfileRemoved = false; croppedProfileBlob = null;
                    const pName = document.getElementById('char-profile-file-name');
                    const pClear = document.getElementById('clear-char-profile-btn');
                    if(data.profileImage) { pName.innerText = getFileNameFromUrl(data.profileImage); pClear.style.display = "inline-block"; } 
                    else { pName.innerText = "ไม่ได้เลือกไฟล์"; pClear.style.display = "none"; }

                    const firstTab = charFormModal.querySelector('.modal-tabs li:first-child');
                    if(firstTab) firstTab.click();
                    charFormModal.querySelector('.modal-content').scrollTop = 0;

                    charFormModal.style.display = "block";
                } catch (err) { console.error(err); alert("เกิดข้อผิดพลาดในการดึงข้อมูล"); }
            };

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
                    }

                    document.getElementById('view-name-top').innerText = data.name;
                    document.getElementById('view-name-inside').innerText = data.name;
                    const jpNameEl = document.getElementById('view-jp-name-inside');
                    if (data.jpName) { jpNameEl.innerText = data.jpName; jpNameEl.style.display = "block"; } else jpNameEl.style.display = "none";

                    viewFieldsConfig.forEach(f => {
                        renderViewField(f.type, f.idWrap, f.idText, data[f.key], f.bullet);
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
                    renderViewField('block', 'wrap-view-trivia', 'view-trivia', data.trivia, '<span style="font-size:0.75rem;">◆</span>');

                    const firstTab = viewModal.querySelector('.modal-tabs li:first-child');
                    if(firstTab) firstTab.click();
                    viewModal.querySelector('.modal-content').scrollTop = 0;

                    viewModal.style.display = "block";
                } catch (err) { console.error(err); alert("เกิดข้อผิดพลาดในการดึงข้อมูลตัวละคร"); }
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

    const charData = { groupId: currentGroupId, timestamp: new Date() };
    
    charFieldsConfig.forEach(f => {
        const val = document.getElementById(f.id).value;
        charData[f.key] = f.type === 'array' ? textToArray(val) : val;
    });

    if (croppedCoverBlob) {
        const coverUrl = await uploadImageToCloudinary(croppedCoverBlob);
        if(coverUrl) charData.coverImage = coverUrl;
    } else if (charImgRemoved) charData.coverImage = deleteField();
    
    if (croppedProfileBlob) {
        const profileUrl = await uploadImageToCloudinary(croppedProfileBlob);
        if(profileUrl) charData.profileImage = profileUrl;
    } else if (charProfileRemoved) charData.profileImage = deleteField();

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

async function fetchStories() {
    const mainGrid = document.getElementById('main-story-grid');
    const eventGrid = document.getElementById('events-story-grid');
    mainGrid.innerHTML = '';
    eventGrid.innerHTML = '';

    try {
        const snap = await getDocs(collection(db, "stories"));
        if(snap.empty) return; 

        let stories = [];
        snap.forEach(doc => {
            const data = doc.data();
            stories.push({ id: doc.id, data: data, order: data.order ?? data.timestamp ?? 0 });
        });
        stories.sort((a, b) => a.order - b.order); 

        stories.forEach(storyItem => {
            const { id, data } = storyItem;
            const imgUrl = data.image ? data.image : STORY_PLACEHOLDER;

            const card = document.createElement('div');
            card.className = 'story-card';
            card.draggable = true;
            card.dataset.id = id;

            card.innerHTML = `
                <img src="${imgUrl}" class="story-img">
                <div class="story-name">${data.name}</div>
                <div class="card-actions">
                    <button class="action-btn edit" title="แก้ไข"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" title="ลบ"><i class="fas fa-trash"></i></button>
                </div>
            `;

            card.addEventListener('dragstart', (e) => {
                draggedStoryNode = card;
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = "move";
            });
            card.addEventListener('dragend', () => {
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
                storyImgRemoved = false; 
                croppedStoryBlob = null;
                
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
                
                const { html } = parseWorldContent(currentStoryContent);
                const displayArea = document.getElementById('story-display');
                displayArea.innerHTML = html;
                
                displayArea.querySelectorAll('details.world-toggle').forEach(details => {
                    details.removeAttribute('open');
                });
                
                document.getElementById('story-editor').style.display = 'none';
                document.getElementById('story-toolbar').style.display = 'none';
                displayArea.style.display = 'block';
                
                storyContentModal.style.display = "block";
            };

            if(data.category === 'Main Story') mainGrid.appendChild(card);
            else eventGrid.appendChild(card);
        });
    } catch (error) { console.error(error); }
}

document.getElementById('story-card-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-story-btn');
    const loading = document.getElementById('story-loading-text');
    btn.disabled = true; loading.style.display = "inline";

    const storyData = {
        name: document.getElementById('story-name').value,
        category: document.getElementById('story-category').value
    };

    if (croppedStoryBlob) {
        const imageUrl = await uploadImageToCloudinary(croppedStoryBlob);
        if(imageUrl) storyData.image = imageUrl;
    } else if (storyImgRemoved) {
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
    } catch (e) { console.error(e); }

    btn.disabled = false; loading.style.display = "none";
};

function setupRichEditor(editorId, displayId, toolbarId, saveBtnId, cancelBtnId, imgBtnId, imgInputId, dashedBtnId, toggleBtnId) {
    const editor = document.getElementById(editorId);
    const display = document.getElementById(displayId);
    const toolbar = document.getElementById(toolbarId);
    const imgInput = document.getElementById(imgInputId);
    
    document.getElementById(dashedBtnId).onclick = () => {
        editor.focus();
        document.execCommand('insertHTML', false, '<hr class="dashed-hr"><p>&nbsp;</p>');
    };

    document.getElementById(cancelBtnId).onclick = () => {
        editor.style.display = 'none';
        toolbar.style.display = 'none';
        display.style.display = 'block';
        window.scrollTo(0, 0);
    };

    document.getElementById(imgBtnId).onclick = () => imgInput.click();
    imgInput.onchange = async (e) => {
        if (e.target.files.length > 0) {
            const loadingSpan = toolbar.querySelector('.action-group span');
            if(loadingSpan) loadingSpan.style.display = "inline";
            const url = await uploadImageToCloudinary(e.target.files[0]);
            if (url) { 
                editor.focus(); 
                const imgHtml = `<span class="resize-wrapper" contenteditable="false"><img src="${url}" class="resizing-img"></span>`;
                document.execCommand('insertHTML', false, imgHtml); 
            }
            if(loadingSpan) loadingSpan.style.display = "none";
            imgInput.value = "";
        }
    };

    document.getElementById(toggleBtnId).onclick = () => {
        editor.focus();
        const toggleHTML = `<div class="toggle-wrapper" contenteditable="false"><span class="drag-handle" title="ลากสลับที่" contenteditable="false">☰</span><details class="world-toggle" open><summary><span class="toggle-icon" title="เปิด/ปิด">‣</span>&nbsp;<span class="toggle-title" contenteditable="true" data-placeholder="พิมพ์หัวข้อที่นี่..."></span><button contenteditable="false" class="delete-toggle-btn" title="ลบกล่องนี้">&times;</button></summary><div class="toggle-content" contenteditable="true" data-placeholder="พิมพ์เนื้อหาที่นี่..."></div></details></div><p>&nbsp;</p>`;
        document.execCommand('insertHTML', false, toggleHTML);
    };
    
    toolbar.querySelectorAll('.color-btn').forEach(btn => {
        btn.onclick = () => {
            document.execCommand('foreColor', false, btn.dataset.color);
            editor.focus();
        };
    });
}

setupRichEditor('story-editor', 'story-display', 'story-toolbar', 'save-story-content-btn', 'cancel-story-content-btn', 'btn-story-image', 'story-image-input', 'btn-story-dashed-line', 'btn-story-toggle');

document.getElementById('story-display').addEventListener('dblclick', () => {
    const display = document.getElementById('story-display');
    const editor = document.getElementById('story-editor');
    const toolbar = document.getElementById('story-toolbar');
    
    display.style.display = 'none';
    editor.style.display = 'block';
    toolbar.style.display = 'flex';
    
    const temp = document.createElement('div');
    temp.innerHTML = currentStoryContent;
    
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

        const title = toggle.querySelector('.toggle-title');
        if(title) title.setAttribute('contenteditable', 'true');
        const content = toggle.querySelector('.toggle-content');
        if(content) content.setAttribute('contenteditable', 'true');
        const delBtn = toggle.querySelector('.delete-toggle-btn');
        if(delBtn) delBtn.setAttribute('contenteditable', 'false');
    });
    
    temp.querySelectorAll('img:not(.resizing-img)').forEach(img => {
        const wrapper = document.createElement('span');
        wrapper.className = 'resize-wrapper';
        wrapper.setAttribute('contenteditable', 'false');
        img.className = 'resizing-img';
        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);
    });

    editor.innerHTML = temp.innerHTML;
    editor.setAttribute('contenteditable', 'true');
    editor.querySelectorAll('details.world-toggle').forEach(details => {
        if(!details.hasAttribute('open')) details.setAttribute('open', '');
    });
    editor.focus();
});

document.getElementById('save-story-content-btn').onclick = async () => {
    const editor = document.getElementById('story-editor');
    const temp = document.createElement('div');
    temp.innerHTML = editor.innerHTML;
    
    temp.querySelectorAll('.resize-wrapper').forEach(wrapper => {
        const img = wrapper.querySelector('img');
        if (img) wrapper.replaceWith(img);
    });

    temp.querySelectorAll('.drag-handle').forEach(el => el.remove());
    temp.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    temp.querySelectorAll('.toggle-wrapper').forEach(w => w.removeAttribute('draggable'));

    try {
        await updateDoc(doc(db, "stories", editingStoryId), { content: temp.innerHTML });
        currentStoryContent = temp.innerHTML;
        editor.style.display = 'none';
        document.getElementById('story-toolbar').style.display = 'none';
        const display = document.getElementById('story-display');
        display.style.display = 'block';
        
        const { html } = parseWorldContent(currentStoryContent);
        display.innerHTML = html;
        
        display.querySelectorAll('details.world-toggle').forEach(details => {
            details.removeAttribute('open');
        });
        
        showToast("บันทึกเนื้อหาสตอรี่สำเร็จ");
    } catch (e) { alert("บันทึกล้มเหลว"); }
};

const worldEditor = document.getElementById('world-editor');
const worldDisplay = document.getElementById('world-display');
const worldToolbar = document.getElementById('world-toolbar');
const saveWorldBtn = document.getElementById('save-world-btn');
const cancelWorldBtn = document.getElementById('cancel-world-btn');
const btnWorldImage = document.getElementById('btn-world-image');
const btnWorldToggle = document.getElementById('btn-world-toggle');
const worldImageInput = document.getElementById('world-image-input');

setupRichEditor('world-editor', 'world-display', 'world-toolbar', 'save-world-btn', 'cancel-world-btn', 'btn-world-image', 'world-image-input', 'btn-dashed-line', 'btn-world-toggle');

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
    worldSidebar.classList.remove('show');
    tocOverlay.classList.remove('show');
    if (toggleTocBtn) {
        toggleTocBtn.classList.remove('show');
        if(toggleIcon) toggleIcon.className = 'fas fa-chevron-right';
    }
};

if (closeTocInsideBtn) closeTocInsideBtn.onclick = hideSidebar;
if (tocOverlay) tocOverlay.onclick = hideSidebar;

let rawWorldContent = "";

function parseWorldContent(rawHtml) {
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
        if (img) wrapper.replaceWith(img);
    });

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
        tocContainer.appendChild(li);
    });
}

async function fetchWorldData() {
    try {
        const docSnap = await getDoc(doc(db, "world", "mainData"));
        if (docSnap.exists()) rawWorldContent = docSnap.data().content;
        else rawWorldContent = "<p>พิมพ์ข้อมูลเกี่ยวกับ World ที่นี่... <br>พิมพ์ # นำหน้าเพื่อสร้างหัวข้อ</p>";
        updateWorldDisplay();
    } catch (e) { console.error(e); }
}

worldDisplay.addEventListener('dblclick', () => {
    worldDisplay.style.display = 'none';
    worldEditor.style.display = 'block';
    worldToolbar.style.display = 'flex';
    
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

        const title = toggle.querySelector('.toggle-title');
        if(title) title.setAttribute('contenteditable', 'true');
        
        const content = toggle.querySelector('.toggle-content');
        if(content) content.setAttribute('contenteditable', 'true');
        
        const delBtn = toggle.querySelector('.delete-toggle-btn');
        if(delBtn) delBtn.setAttribute('contenteditable', 'false');
    });
    
    temp.querySelectorAll('img:not(.resizing-img)').forEach(img => {
        const wrapper = document.createElement('span');
        wrapper.className = 'resize-wrapper';
        wrapper.setAttribute('contenteditable', 'false');
        
        img.className = 'resizing-img';
        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);
    });

    worldEditor.innerHTML = temp.innerHTML;
    worldEditor.setAttribute('contenteditable', 'true');
    
    window.scrollTo(0, 0);
    worldEditor.querySelectorAll('details.world-toggle').forEach(details => {
        if(!details.hasAttribute('open')) details.setAttribute('open', '');
    });
    
    worldEditor.focus();
});

saveWorldBtn.onclick = async () => {
    const temp = document.createElement('div');
    temp.innerHTML = worldEditor.innerHTML;
    
    temp.querySelectorAll('.resize-wrapper').forEach(wrapper => {
        const img = wrapper.querySelector('img');
        if (img) wrapper.replaceWith(img);
    });

    temp.querySelectorAll('.drag-handle').forEach(el => el.remove());
    temp.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    temp.querySelectorAll('.toggle-wrapper').forEach(w => w.removeAttribute('draggable'));

    try {
        await setDoc(doc(db, "world", "mainData"), { content: temp.innerHTML }, { merge: true });
        rawWorldContent = temp.innerHTML;
        worldEditor.style.display = 'none';
        worldToolbar.style.display = 'none';
        worldDisplay.style.display = 'block';
        updateWorldDisplay();
        showToast("บันทึกข้อมูล World สำเร็จ");
        window.scrollTo(0, 0);
    } catch (e) { alert("บันทึกล้มเหลว"); }
};

document.addEventListener('click', (e) => {
    const summary = e.target.closest('summary');
    if (summary && summary.closest('.world-toggle')) {
        if (!e.target.classList.contains('toggle-icon')) {
            e.preventDefault();
            if (e.target.classList.contains('toggle-title')) {
                e.target.focus();
            }
        }
    }
});

function handleToggleDelete(editorElement) {
    editorElement.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-toggle-btn')) {
            if(confirm("ลบกล่องหัวข้อนี้ใช่หรือไม่?")) {
                const wrapper = e.target.closest('.toggle-wrapper');
                if (wrapper) wrapper.remove();
                else e.target.closest('details').remove(); 
            }
        }
    });
}
handleToggleDelete(worldEditor);
handleToggleDelete(document.getElementById('story-editor'));

let draggedToggle = null;
const dragPlaceholder = document.createElement('div');
dragPlaceholder.className = 'drag-placeholder';

function setupEditorDrag(editorElement) {
    editorElement.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('drag-handle')) {
            const wrapper = e.target.closest('.toggle-wrapper');
            if(wrapper) wrapper.setAttribute('draggable', 'true');
        }
    });

    editorElement.addEventListener('mouseup', (e) => {
        const wrapper = e.target.closest('.toggle-wrapper');
        if(wrapper && wrapper.hasAttribute('draggable')) {
            wrapper.removeAttribute('draggable');
        }
    });

    editorElement.addEventListener('dragstart', (e) => {
        const wrapper = e.target.closest('.toggle-wrapper');
        if (wrapper && wrapper.hasAttribute('draggable')) {
            draggedToggle = wrapper;
            e.dataTransfer.effectAllowed = "move";
            setTimeout(() => {
                wrapper.style.display = 'none';
                wrapper.parentNode.insertBefore(dragPlaceholder, wrapper.nextSibling);
            }, 0);
            editorElement.setAttribute('contenteditable', 'false');
        } else {
            e.preventDefault(); 
        }
    });

    editorElement.addEventListener('dragend', (e) => {
        if (draggedToggle) {
            if (dragPlaceholder.parentNode) {
                dragPlaceholder.parentNode.insertBefore(draggedToggle, dragPlaceholder);
                dragPlaceholder.parentNode.removeChild(dragPlaceholder);
            }
            draggedToggle.style.display = 'block';
            draggedToggle.removeAttribute('draggable');
            draggedToggle = null;
            editorElement.setAttribute('contenteditable', 'true');
        }
    });

    editorElement.addEventListener('dragover', (e) => {
        if (!draggedToggle) return;
        e.preventDefault(); 
        e.dataTransfer.dropEffect = "move";
        
        let range;
        if (document.caretRangeFromPoint) {
            range = document.caretRangeFromPoint(e.clientX, e.clientY);
        } else if (document.caretPositionFromPoint) {
            let pos = document.caretPositionFromPoint(e.clientX, e.clientY);
            if (pos) {
                range = document.createRange();
                range.setStart(pos.offsetNode, pos.offset);
                range.collapse(true);
            }
        }

        if (range && range.startContainer) {
            let container = range.startContainer;
            if (container.nodeType === 3) container = container.parentNode;

            if (editorElement.contains(container)) {
                const toggleBlock = container.closest('.toggle-wrapper');
                if (toggleBlock && toggleBlock !== draggedToggle) {
                    const box = toggleBlock.getBoundingClientRect();
                    if (e.clientY < box.top + box.height / 2) {
                        toggleBlock.parentNode.insertBefore(dragPlaceholder, toggleBlock);
                    } else {
                        toggleBlock.parentNode.insertBefore(dragPlaceholder, toggleBlock.nextSibling);
                    }
                } else if (!toggleBlock) {
                    range.insertNode(dragPlaceholder);
                }
                return;
            }
        }
        
        const afterElement = getDragAfterEditorElement(editorElement, e.clientY);
        if (afterElement == null) {
            editorElement.appendChild(dragPlaceholder);
        } else {
            editorElement.insertBefore(dragPlaceholder, afterElement);
        }
    });

    editorElement.addEventListener('drop', (e) => {
        if (!draggedToggle) return;
        e.preventDefault();
    });
}

function getDragAfterEditorElement(container, y) {
    const draggableElements = [...container.children].filter(child => {
        return child !== draggedToggle && child !== dragPlaceholder;
    });
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

setupEditorDrag(worldEditor);
setupEditorDrag(document.getElementById('story-editor'));

fetchGroups();
fetchStories();
fetchWorldData();