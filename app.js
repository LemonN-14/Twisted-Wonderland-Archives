import { uploadImageToCloudinary } from './firebase.js';

export const appState = {
    croppedGroupBlob: null, groupImgRemoved: false,
    croppedCoverBlob: null, charImgRemoved: false,
    croppedProfileBlob: null, charProfileRemoved: false,
    croppedStoryBlob: null, storyImgRemoved: false,
    isGroupsLoaded: false,
    isStoryLoaded: false,
    isWorldLoaded: false,
    isCalendarLoaded: false
};

export const PLACEHOLDERS = {
    GROUP: "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22150%22%20height%3D%22150%22%3E%3Crect%20width%3D%22150%22%20height%3D%22150%22%20fill%3D%22transparent%22%20stroke%3D%22%23555%22%20stroke-width%3D%222%22%20stroke-dasharray%3D%225%2C5%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22%23555%22%3ENo%20Icon%3C%2Ftext%3E%3C%2Fsvg%3E",
    COVER: "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22140%22%20height%3D%22220%22%20style%3D%22background%3A%23555%22%3E%3C%2Fsvg%3E",
    STORY: "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22120%22%20height%3D%2260%22%20style%3D%22background%3A%23555%22%3E%3C%2Fsvg%3E"
};

export function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

export function getFileNameFromUrl(url) {
    if (!url) return "ไม่ได้เลือกไฟล์";
    try { return url.split('/').pop(); } catch(e) { return "ไฟล์รูปภาพ"; }
}

export const textToArray = (text) => text.split('\n').map(item => item.trim()).filter(item => item !== "");

export const formatText = (text) => {
    if (!text) return "";
    let t = text.replace(/\n/g, '<br>');
    t = t.replace(/#([^#]+)#/g, '<span class="spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>');
    return typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(t) : t;
};

export function getDragAfterElement(container, x, y, itemClass) {
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

function setupTabs(tabSelector, contentSelector, callback = null) {
    document.querySelectorAll(tabSelector).forEach(tab => {
        tab.addEventListener('click', () => {
            const container = tab.closest('.view-section') || tab.closest('.modal-content') || document;
            container.querySelectorAll(tabSelector).forEach(t => t.classList.remove('active'));
            container.querySelectorAll(contentSelector).forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            if (tab.dataset.target) {
                const targetEl = document.getElementById(tab.dataset.target);
                if(targetEl) targetEl.classList.add('active');
            }
            if (callback) callback(tab);
        });
    });
}

setupTabs('.main-tabs li[data-target]', '.view-section', (tab) => {
    const targetId = tab.dataset.target;
    
    const addBtn = document.getElementById('add-btn');
    if(addBtn) {
        addBtn.style.display = (targetId === 'world-view' || targetId === 'gameplay-view') ? 'none' : 'block';
    }
    
    const targetView = document.getElementById(targetId);
    if (targetView) {
        const firstSubTab = targetView.querySelector('.sub-tabs li:first-child');
        if (firstSubTab && !firstSubTab.classList.contains('active')) {
            firstSubTab.click();
        }
    }
    
    if (targetId === 'characters-view' && !appState.isGroupsLoaded) {
        appState.isGroupsLoaded = true;
        import('./features/groups.js').then(module => module.initGroups());
    } 
    else if (targetId === 'story-view' && !appState.isStoryLoaded) {
        appState.isStoryLoaded = true;
        import('./features/stories.js').then(module => module.initStories());
    } 
    else if (targetId === 'world-view') {
        if (!appState.isWorldLoaded) {
            appState.isWorldLoaded = true;
            import('./features/world.js').then(module => module.initWorld());
        } else {
            window.scrollTo(0, 0);
            const viewArea = document.getElementById('world-display');
            if (viewArea) {
                viewArea.querySelectorAll('details.world-toggle').forEach(details => {
                    if(!details.hasAttribute('open')) details.setAttribute('open', '');
                });
            }
        }
    } 
    else if (targetId === 'calendar-view' && !appState.isCalendarLoaded) {
        appState.isCalendarLoaded = true;
        import('./features/calendar.js').then(module => module.initCalendar());
    }
});

setupTabs('.sub-tabs li', '.sub-view');
setupTabs('#character-modal .modal-tabs li', '#character-modal .form-tab');
setupTabs('#view-modal .modal-tabs li', '#view-modal .v-tab');
setupTabs('#auth-tabs li', '.auth-view');

document.querySelectorAll('.modal .close-btn, .modal .group-close-btn, #close-story-content-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.target.closest('.modal').style.display = "none";
    });
});

window.onclick = (e) => {
    if (e.target.classList.contains('modal')) e.target.style.display = "none";
};

const addBtn = document.getElementById('add-btn');
if(addBtn) {
    addBtn.onclick = () => {
        if (window.location.pathname.includes('calendar.html') || document.getElementById('calendar-main-content')) {
            import('./features/calendar.js').then(m => m.resetCalendarForm());
            return;
        }

        const activeTabObj = document.querySelector('.main-tabs li.active');
        if (!activeTabObj) return;
        const activeTab = activeTabObj.dataset.target;
        
        if (activeTab === 'characters-view') {
            import('./features/groups.js').then(m => m.resetGroupForm());
        } else if (activeTab === 'story-view') {
            import('./features/stories.js').then(m => m.resetStoryForm());
        }
    };
}

const addCharBtn = document.getElementById('add-char-btn');
if(addCharBtn) {
    addCharBtn.onclick = () => {
        import('./features/characters.js').then(m => m.resetCharacterForm());
    }
}

let cropper = null;
let currentCropTarget = ''; 

function openCropModal(imageSrc, target, ratio) {
    currentCropTarget = target;
    const cropModal = document.getElementById('crop-modal');
    const img = document.getElementById('crop-image-target');
    if(!cropModal || !img) return;
    
    img.src = imageSrc;
    cropModal.style.display = 'block';
    if (cropper) cropper.destroy();
    cropper = new Cropper(img, { aspectRatio: ratio, viewMode: 1, autoCropArea: 1 });
}

const cancelCropBtn = document.getElementById('cancel-crop-btn');
if(cancelCropBtn) {
    cancelCropBtn.onclick = () => {
        document.getElementById('crop-modal').style.display = 'none';
        if(currentCropTarget === 'group') document.getElementById('group-image').value = "";
        if(currentCropTarget === 'cover') document.getElementById('char-image').value = "";
        if(currentCropTarget === 'profile') document.getElementById('char-profile-image').value = "";
        if(currentCropTarget === 'story') document.getElementById('story-image').value = "";
    };
}

const confirmCropBtn = document.getElementById('confirm-crop-btn');
if(confirmCropBtn) {
    confirmCropBtn.onclick = () => {
        if (!cropper) return;
        cropper.getCroppedCanvas({ fillColor: 'transparent' }).toBlob((blob) => {
            if (currentCropTarget === 'group') {
                appState.croppedGroupBlob = blob;
                document.getElementById('group-file-name').innerText = "รูปภาพถูกครอบตัดแล้ว";
                document.getElementById('clear-group-img-btn').style.display = "inline-block";
                appState.groupImgRemoved = false;
            } else if (currentCropTarget === 'cover') {
                appState.croppedCoverBlob = blob;
                document.getElementById('char-file-name').innerText = "รูปปกถูกครอบตัดแล้ว";
                document.getElementById('clear-char-img-btn').style.display = "inline-block";
                appState.charImgRemoved = false;
            } else if (currentCropTarget === 'profile') {
                appState.croppedProfileBlob = blob;
                document.getElementById('char-profile-file-name').innerText = "รูปโปรไฟล์ถูกครอบตัดแล้ว";
                document.getElementById('clear-char-profile-btn').style.display = "inline-block";
                appState.charProfileRemoved = false;
            } else if (currentCropTarget === 'story') {
                appState.croppedStoryBlob = blob;
                document.getElementById('story-file-name').innerText = "รูปภาพถูกครอบตัดแล้ว";
                document.getElementById('clear-story-img-btn').style.display = "inline-block";
                appState.storyImgRemoved = false;
            }
            document.getElementById('crop-modal').style.display = 'none';
        }, 'image/png', 0.9);
    };
}

export function setupImageInput(inputId, clearBtnId, fileNameId, targetType, ratio) {
    const input = document.getElementById(inputId);
    const clearBtn = document.getElementById(clearBtnId);
    const fileName = document.getElementById(fileNameId);
    if(!input || !clearBtn || !fileName) return;

    input.addEventListener('change', function(e) {
        if (this.files && this.files.length > 0) {
            const reader = new FileReader();
            reader.onload = (e) => openCropModal(e.target.result, targetType, ratio);
            reader.readAsDataURL(this.files[0]);
        }
    });
    clearBtn.addEventListener('click', () => {
        input.value = "";
        if (targetType === 'group') { appState.croppedGroupBlob = null; appState.groupImgRemoved = true; }
        if (targetType === 'cover') { appState.croppedCoverBlob = null; appState.charImgRemoved = true; }
        if (targetType === 'profile') { appState.croppedProfileBlob = null; appState.charProfileRemoved = true; }
        if (targetType === 'story') { appState.croppedStoryBlob = null; appState.storyImgRemoved = true; }
        fileName.innerText = "ไม่ได้เลือกไฟล์";
        clearBtn.style.display = "none";
    });
}

setupImageInput('group-image', 'clear-group-img-btn', 'group-file-name', 'group', 1/1);
setupImageInput('char-image', 'clear-char-img-btn', 'char-file-name', 'cover', 140/220);
setupImageInput('char-profile-image', 'clear-char-profile-btn', 'char-profile-file-name', 'profile', 1/1);
setupImageInput('story-image', 'clear-story-img-btn', 'story-file-name', 'story', 2.5/1);

export function setupRichEditor(editorId, displayId, toolbarId, saveBtnId, cancelBtnId, imgBtnId, imgInputId, dashedBtnId, toggleBtnId) {
    const editor = document.getElementById(editorId);
    const display = document.getElementById(displayId);
    const toolbar = document.getElementById(toolbarId);
    const imgInput = document.getElementById(imgInputId);
    if(!editor || !display || !toolbar) return;
    
    toolbar.querySelectorAll('button').forEach(btn => {
        if (btn.id !== cancelBtnId && btn.id !== saveBtnId) {
            btn.onmousedown = e => e.preventDefault(); 
        }
    });
    
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
                const imgHtml = `<span class="resize-wrapper" contenteditable="false"><img src="${url}" loading="lazy" class="resizing-img"></span>`;
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
            editor.focus();
            document.execCommand('foreColor', false, btn.dataset.color);
        };
    });

    toolbar.querySelectorAll('.btn-insert-text').forEach(btn => {
        btn.onclick = () => {
            editor.focus();
            const openChar = btn.dataset.open;
            const closeChar = btn.dataset.close;
            const sel = window.getSelection();
            if(!sel.rangeCount) return;
            const text = sel.toString();
            if (text) {
                document.execCommand('insertText', false, openChar + text + closeChar);
            } else {
                document.execCommand('insertText', false, openChar + closeChar);
                if(closeChar) sel.modify('move', 'backward', 'character');
            }
        };
    });

    editor.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
        }
    });
}

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

export function handleToggleDelete(editorElement) {
    if(!editorElement) return;
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
handleToggleDelete(document.getElementById('world-editor'));
handleToggleDelete(document.getElementById('story-editor'));

export function prepareHtmlForEditor(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
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
    
    temp.querySelectorAll('img').forEach(img => {
        if (img.parentElement && img.parentElement.classList.contains('resize-wrapper')) return;
        const wrapper = document.createElement('span');
        wrapper.className = 'resize-wrapper';
        wrapper.setAttribute('contenteditable', 'false');
        img.classList.add('resizing-img');
        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);
    });

    return temp.innerHTML;
}

export function cleanHtmlFromEditor(editorHtml) {
    const temp = document.createElement('div');
    temp.innerHTML = editorHtml;
    
    temp.querySelectorAll('.resize-wrapper').forEach(wrapper => {
        const img = wrapper.querySelector('img');
        if (img) {
            img.classList.remove('resizing-img');
            if (img.className === '') img.removeAttribute('class');
            wrapper.replaceWith(img);
        }
    });

    temp.querySelectorAll('.drag-handle').forEach(el => el.remove());
    temp.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    temp.querySelectorAll('.toggle-wrapper').forEach(w => w.removeAttribute('draggable'));
    
    return typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(temp.innerHTML, { ADD_TAGS: ['details', 'summary'] }) : temp.innerHTML;
}

let draggedToggle = null;
const dragPlaceholder = document.createElement('div');
dragPlaceholder.className = 'drag-placeholder';

export function setupEditorDrag(editorElement) {
    if(!editorElement) return;
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
        
        const draggableElements = [...editorElement.children].filter(child => {
            return child !== draggedToggle && child !== dragPlaceholder;
        });
        
        const afterElement = draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = e.clientY - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;

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

let isResizing = false;
let currentResizingImg = null;
let currentTooltip = null;
let startX, startWidth;

document.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('resize-wrapper')) {
        const afterStyle = window.getComputedStyle(e.target, '::after');
        if (afterStyle.content) {
            const rect = e.target.getBoundingClientRect();
            if (e.clientX >= rect.right - 20 && e.clientY >= rect.bottom - 20) {
                e.preventDefault();
                isResizing = true;
                currentResizingImg = e.target.querySelector('img');
                startX = e.clientX;
                startWidth = currentResizingImg.offsetWidth;

                currentTooltip = document.createElement('div');
                currentTooltip.className = 'resize-tooltip';
                currentTooltip.innerText = `${startWidth}px`;
                document.body.appendChild(currentTooltip);
                
                if (currentTooltip) {
                    currentTooltip.style.left = (e.clientX + 15) + 'px';
                    currentTooltip.style.top = (e.clientY + 15) + 'px';
                }
            }
        }
    }
});

document.addEventListener('mousemove', (e) => {
    if (!isResizing || !currentResizingImg) return;
    const dx = e.clientX - startX;
    const newWidth = Math.max(50, startWidth + dx); 
    currentResizingImg.style.width = newWidth + 'px';
    currentResizingImg.style.height = 'auto';
    
    if (currentTooltip) {
        currentTooltip.innerText = `${Math.round(newWidth)}px`;
        currentTooltip.style.left = (e.clientX + 15) + 'px';
        currentTooltip.style.top = (e.clientY + 15) + 'px';
    }
});

document.addEventListener('mouseup', () => {
    if (isResizing) {
        isResizing = false;
        currentResizingImg = null;
        if (currentTooltip) {
            currentTooltip.remove();
            currentTooltip = null;
        }
    }
});

window.addEventListener("DOMContentLoaded", () => {
    import('./features/auth.js').then(m => m.initAuth());

    document.querySelectorAll('.view-section').forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none'; 
    });

    if (window.location.pathname.includes('calendar.html') || window.location.pathname.endsWith('calendar')) {
        appState.isCalendarLoaded = true;
        
        const calView = document.getElementById('calendar-view');
        if(calView) {
            calView.style.display = 'block';
            calView.classList.add('active');
        }

        import('./features/calendar.js').then(module => module.initCalendar());
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        const hash = tabParam || window.location.hash.substring(1) || 'characters-view';

        document.querySelectorAll('.main-tabs li').forEach(t => t.classList.remove('active'));

        const targetTab = document.querySelector(`.main-tabs li[data-target="${hash}"]`);
        if (targetTab) {
            document.querySelectorAll('.view-section').forEach(c => c.style.display = '');
            targetTab.click(); 
        } else {
            document.querySelectorAll('.view-section').forEach(c => c.style.display = '');
            const defaultTab = document.querySelector(`.main-tabs li[data-target="characters-view"]`);
            if(defaultTab) defaultTab.click();
        }

        if (tabParam) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
});