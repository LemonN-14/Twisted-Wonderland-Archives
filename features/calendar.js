import { db, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from '../firebase.js';
import { showToast, getDragAfterElement, PLACEHOLDERS, appState } from '../app.js';

let currentMonthIndex = 8; // เริ่มที่กันยายน
let editingCalendarEventId = null;
let allCharacters = [];
let allCalendarEvents = [];
let bdayMap = {};   
let eventMap = {};  
let activeCalendarDate = null; 
let draggedCalendarEventNode = null;

const MONTH_NAMES = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function parseDateToMMDD(dateStr) {
    if (!dateStr) return null;
    let s = String(dateStr).toLowerCase().trim();
    
    s = s.replace(/-/g, '/');
    
    // รองรับ 1 หรือ 2 หลัก (เช่น 10/25, 1/5, 18/1)
    if (s.match(/^\d{1,2}\/\d{1,2}$/)) {
        let parts = s.split('/');
        let p0 = parts[0].padStart(2, '0');
        let p1 = parts[1].padStart(2, '0');
        if (parseInt(p0) <= 12 && parseInt(p1) <= 31) return `${p0}/${p1}`; 
        if (parseInt(p1) <= 12 && parseInt(p0) <= 31) return `${p1}/${p0}`; 
    }
    
    const thMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const engMonths = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    
    let numbers = s.match(/\d+/g);
    if (!numbers) return null;
    let day = numbers[0].padStart(2, '0');
    let month = null;

    for (let i = 0; i < 12; i++) {
        if (s.includes(MONTH_NAMES[i].toLowerCase()) || s.includes(thMonths[i].toLowerCase()) || s.includes(engMonths[i])) {
            month = String(i + 1).padStart(2, '0');
            break;
        }
    }
    
    if (!month && numbers.length >= 2) {
        if (s.includes('/')) {
            month = numbers[1].padStart(2, '0');
        } else {
            month = numbers[1].padStart(2, '0');
        }
    }

    if (day && month && parseInt(month) <= 12 && parseInt(day) <= 31) return `${month}/${day}`;
    return null;
}

function buildCalendarMaps() {
    bdayMap = {};
    eventMap = {};

    allCharacters.forEach(c => {
        if (c.bday) {
            if (!bdayMap[c.bday]) bdayMap[c.bday] = [];
            bdayMap[c.bday].push(c);
        }
    });

    allCalendarEvents.forEach(ev => {
        if (!ev.startDate || !ev.endDate) return;
        
        let [sM, sD] = ev.startDate.split('/').map(Number);
        let [eM, eD] = ev.endDate.split('/').map(Number);

        let cStart = sM * 100 + sD;
        let cEnd = eM * 100 + eD;

        if (cStart <= cEnd) {
            for (let cm = sM; cm <= eM; cm++) {
                let startDay = (cm === sM) ? sD : 1;
                let endDay = (cm === eM) ? eD : DAYS_IN_MONTH[cm - 1];

                for (let cd = startDay; cd <= endDay; cd++) {
                    let key = String(cm).padStart(2, '0') + '/' + String(cd).padStart(2, '0');
                    if (!eventMap[key]) eventMap[key] = [];
                    eventMap[key].push(ev);
                }
            }
        } else {
            for (let cm = sM; cm <= 12; cm++) {
                let startDay = (cm === sM) ? sD : 1;
                let endDay = DAYS_IN_MONTH[cm - 1];

                for (let cd = startDay; cd <= endDay; cd++) {
                    let key = String(cm).padStart(2, '0') + '/' + String(cd).padStart(2, '0');
                    if (!eventMap[key]) eventMap[key] = [];
                    eventMap[key].push(ev);
                }
            }
            for (let cm = 1; cm <= eM; cm++) {
                let startDay = 1;
                let endDay = (cm === eM) ? eD : DAYS_IN_MONTH[cm - 1];

                for (let cd = startDay; cd <= endDay; cd++) {
                    let key = String(cm).padStart(2, '0') + '/' + String(cd).padStart(2, '0');
                    if (!eventMap[key]) eventMap[key] = [];
                    eventMap[key].push(ev);
                }
            }
        }
    });
}

export async function fetchAllCharactersForCalendar() {
    try {
        const snap = await getDocs(collection(db, "characters"));
        allCharacters = [];
        snap.forEach(doc => {
            const data = doc.data();
            if (data.birthday) {
                const parsedBday = parseDateToMMDD(data.birthday);
                if (parsedBday) {
                    allCharacters.push({ id: doc.id, name: data.name, bday: parsedBday, image: data.profileImage || data.coverImage || PLACEHOLDERS.COVER });
                }
            }
        });
    } catch (e) {}
}

async function fetchCalendarEvents() {
    try {
        const snap = await getDocs(collection(db, "calendar_events"));
        allCalendarEvents = [];
        snap.forEach(doc => {
            const data = doc.data();
            allCalendarEvents.push({ id: doc.id, ...data, order: data.order ?? data.timestamp ?? 0 });
        });
        allCalendarEvents.sort((a, b) => a.order - b.order);
    } catch (e) {}
}

window.deleteCalendarEvent = async (id) => {
    if(confirm("ต้องการลบ Event นี้ใช่หรือไม่?")) {
        await deleteDoc(doc(db, "calendar_events", id));
        await fetchCalendarEvents();
        buildCalendarMaps(); 
        renderCalendar();
        
        if (activeCalendarDate) {
            const parts = activeCalendarDate.split('/');
            const monthIdx = parseInt(parts[0]) - 1;
            const dayNum = parseInt(parts[1]);
            const bdayChars = bdayMap[activeCalendarDate] || [];
            const dayEvents = eventMap[activeCalendarDate] || [];
            showDateDetails(activeCalendarDate, dayNum, monthIdx, bdayChars, dayEvents);
        } else {
            document.getElementById('calendar-details-content').innerHTML = '<div class="empty-state" style="padding: 1rem; font-size: 0.9rem;">ลบข้อมูลเรียบร้อยแล้ว กรุณาเลือกวันที่ใหม่</div>';
        }
        showToast("ลบ Event เรียบร้อย");
    }
};

window.editCalendarEvent = async (id) => {
    const ev = allCalendarEvents.find(e => e.id === id);
    if(!ev) return;
    editingCalendarEventId = id;
    document.getElementById('calendar-modal-title').innerText = "แก้ไข Event";
    document.getElementById('cal-event-name').value = ev.name || "";
    document.getElementById('cal-event-start').value = ev.startDate || "";
    document.getElementById('cal-event-end').value = ev.endDate || "";
    document.getElementById('cal-event-desc').value = ev.desc || "";
    
    const colorVal = ev.color || "#448aff";
    document.getElementById('cal-event-color').value = colorVal;
    
    const colorBtns = document.querySelectorAll('.color-select-btn');
    colorBtns.forEach(b => b.classList.remove('active'));
    document.getElementById('cal-custom-color').classList.remove('active');
    
    let matchedPreset = false;
    colorBtns.forEach(btn => {
        if(btn.dataset.color === colorVal) {
            btn.classList.add('active');
            matchedPreset = true;
        }
    });
    
    if(!matchedPreset) {
        const customInput = document.getElementById('cal-custom-color');
        customInput.value = colorVal;
        customInput.classList.add('active');
    }
    
    document.getElementById('calendar-modal').style.display = "block";
};

const colorBtns = document.querySelectorAll('.color-select-btn');
const customColorInput = document.getElementById('cal-custom-color');
const hiddenColorInput = document.getElementById('cal-event-color');

if(colorBtns && customColorInput && hiddenColorInput) {
    colorBtns.forEach(btn => {
        btn.onclick = () => {
            colorBtns.forEach(b => b.classList.remove('active'));
            customColorInput.classList.remove('active');
            btn.classList.add('active');
            hiddenColorInput.value = btn.dataset.color;
        };
    });
    
    customColorInput.oninput = (e) => {
        colorBtns.forEach(b => b.classList.remove('active'));
        customColorInput.classList.add('active');
        hiddenColorInput.value = e.target.value;
    };
}

export function resetCalendarForm() {
    editingCalendarEventId = null;
    document.getElementById('calendar-form').reset();
    document.getElementById('calendar-modal-title').innerText = "เพิ่ม Event ใหม่";
    
    if (activeCalendarDate) {
        const parts = activeCalendarDate.split('/');
        if(parts.length === 2 && parts[0] && parts[1]) {
            const displayDate = `${parts[0]}/${parts[1]}`;
            document.getElementById('cal-event-start').value = displayDate;
            document.getElementById('cal-event-end').value = displayDate;
        }
    }

    document.querySelectorAll('.color-select-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.color-select-btn[data-color="#448aff"]').classList.add('active');
    document.getElementById('cal-event-color').value = "#448aff";
    document.getElementById('cal-custom-color').value = "#000000";

    const calendarModal = document.getElementById('calendar-modal');
    if(calendarModal) calendarModal.style.display = "block";
}

const calendarFormEl = document.getElementById('calendar-form');
if (calendarFormEl) {
    calendarFormEl.onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submit-calendar-btn');
        const loading = document.getElementById('calendar-loading-text');
        btn.disabled = true; loading.style.display = "inline";

        const sDate = parseDateToMMDD(document.getElementById('cal-event-start').value);
        const eDate = parseDateToMMDD(document.getElementById('cal-event-end').value);

        if(!sDate || !eDate) {
            alert("รูปแบบวันที่ไม่ถูกต้อง กรุณาใช้ เดือน/วัน เช่น 10/25");
            btn.disabled = false; loading.style.display = "none";
            return;
        }

        const eventData = {
            name: document.getElementById('cal-event-name').value,
            startDate: sDate,
            endDate: eDate,
            desc: document.getElementById('cal-event-desc').value,
            color: document.getElementById('cal-event-color').value
        };

        try {
            if (editingCalendarEventId) {
                await updateDoc(doc(db, "calendar_events", editingCalendarEventId), eventData);
            } else {
                eventData.order = Date.now();
                await addDoc(collection(db, "calendar_events"), eventData);
            }
            document.getElementById('calendar-modal').style.display = "none";
            await fetchCalendarEvents();
            buildCalendarMaps(); 
            renderCalendar();
            
            if (activeCalendarDate) {
                const parts = activeCalendarDate.split('/');
                const monthIdx = parseInt(parts[0]) - 1;
                const dayNum = parseInt(parts[1]);
                const bdayChars = bdayMap[activeCalendarDate] || [];
                const dayEvents = eventMap[activeCalendarDate] || [];
                showDateDetails(activeCalendarDate, dayNum, monthIdx, bdayChars, dayEvents);
            } else {
                document.getElementById('calendar-details-content').innerHTML = '<div class="empty-state" style="padding: 1rem; font-size: 0.9rem;">บันทึกสำเร็จ กรุณาเลือกวันที่ใหม่</div>';
            }
            
            showToast("บันทึก Event สำเร็จ!");
        } catch (e) {}

        btn.disabled = false; loading.style.display = "none";
    };
}

function renderCalendar() {
    const container = document.getElementById('calendar-main-content');
    if (!container) return;
    container.innerHTML = '';

    const titleEl = document.getElementById('current-month-title');
    if (titleEl) {
        titleEl.innerText = MONTH_NAMES[currentMonthIndex];
    }

    const m = currentMonthIndex;
    const monthNumStr = String(m + 1).padStart(2, '0');
    
    const monthBlock = document.createElement('div');
    monthBlock.className = 'month-block';
    monthBlock.innerHTML = `<div class="days-container" id="days-container-${m}"></div>`;
    container.appendChild(monthBlock);

    const daysContainer = monthBlock.querySelector('.days-container');
    const calFrag = document.createDocumentFragment();

    for (let d = 1; d <= DAYS_IN_MONTH[m]; d++) {
        const dayStr = String(d).padStart(2, '0');
        const mmdd = `${monthNumStr}/${dayStr}`;
        
        const dayBox = document.createElement('div');
        dayBox.className = 'day-box';
        dayBox.dataset.date = mmdd;
        if(activeCalendarDate === mmdd) dayBox.classList.add('active');
        
        const dayNum = document.createElement('span');
        dayNum.className = 'day-number';
        dayNum.innerText = d;
        dayBox.appendChild(dayNum);

        const bdayChars = bdayMap[mmdd] || [];
        if (bdayChars.length > 0) {
            dayBox.classList.add('has-bday');
            const iconsContainer = document.createElement('div');
            iconsContainer.className = 'bday-icons-container';
            
            bdayChars.slice(0, 2).forEach(c => {
                const img = document.createElement('img');
                const optimizedImgUrl = c.image.replace('/upload/', '/upload/w_50,h_50,c_fill,q_auto,f_auto/');
                img.src = optimizedImgUrl;
                img.setAttribute('loading', 'lazy');
                img.className = 'bday-icon';
                iconsContainer.appendChild(img);
            });
            
            if (bdayChars.length > 2) {
                const moreSpan = document.createElement('span');
                moreSpan.className = 'bday-more';
                moreSpan.innerText = `+${bdayChars.length - 2}`;
                iconsContainer.appendChild(moreSpan);
            }
            dayBox.appendChild(iconsContainer);
        }

        const dayEvents = eventMap[mmdd] || [];
        if (dayEvents.length > 0) {
            const barsContainer = document.createElement('div');
            barsContainer.className = 'event-bars';
            
            const uniqueEvents = Array.from(new Set(dayEvents.map(e => e.id)))
                .map(id => dayEvents.find(e => e.id === id)).slice(0, 3);
                
            uniqueEvents.forEach(ev => {
                const bar = document.createElement('div');
                bar.className = 'event-bar';
                bar.style.backgroundColor = ev.color;
                
                const isStart = (ev.startDate === mmdd);
                const isEnd = (ev.endDate === mmdd);
                
                if (isStart && isEnd) bar.classList.add('start', 'end');
                else if (isStart) bar.classList.add('start');
                else if (isEnd) bar.classList.add('end');
                
                barsContainer.appendChild(bar);
            });
            dayBox.appendChild(barsContainer);
        }

        dayBox.onclick = () => {
            document.querySelectorAll('.day-box').forEach(el => el.classList.remove('active'));
            dayBox.classList.add('active');
            activeCalendarDate = mmdd;
            showDateDetails(mmdd, d, m, bdayChars, dayEvents);
        };

        calFrag.appendChild(dayBox);
    }
    
    daysContainer.appendChild(calFrag);
}

function showDateDetails(mmdd, day, monthIndex, bdayChars, events) {
    document.getElementById('selected-date-display').innerText = `${day} ${MONTH_NAMES[monthIndex]}`;
    const detailsContainer = document.getElementById('calendar-details-content');
    if(!detailsContainer) return;
    
    const uniqueEvents = Array.from(new Set(events.map(e => e.id)))
        .map(id => events.find(e => e.id === id));

    if (bdayChars.length === 0 && uniqueEvents.length === 0) {
        detailsContainer.innerHTML = '<div class="empty-state" style="padding: 1rem; font-size: 0.9rem;">ไม่มีกิจกรรมหรือวันเกิดในวันนี้</div>';
        return;
    }

    let html = '';
    
    if (bdayChars.length > 0) {
        html += `<div style="width:100%;"><h4 style="color:#ff9800; margin-bottom:10px;"><i class="fas fa-birthday-cake"></i> วันเกิด</h4></div>`;
        bdayChars.forEach(c => {
            html += `<div class="cal-bday-item" style="width:100%;">
                <img src="${c.image}" loading="lazy" class="cal-bday-img">
                <div class="cal-bday-name">${c.name}</div>
            </div>`;
        });
    }

    if (uniqueEvents.length > 0) {
        if(bdayChars.length > 0) html += `<div style="width:100%;"><hr style="border-color:var(--border-color); margin:5px 0 15px 0;"></div>`;
        html += `<div style="width:100%;"><h4 style="color:var(--accent-color); margin-bottom:10px;"><i class="fas fa-star"></i> กิจกรรม / Events</h4></div>`;
        
        uniqueEvents.forEach(ev => {
            html += `<div class="cal-event-item" draggable="${document.body.classList.contains('is-admin')}" data-id="${ev.id}" style="border-left-color: ${ev.color}; width:100%;">
                <div class="cal-event-title">${ev.name}</div>
                <div class="cal-event-date">${ev.startDate} ถึง ${ev.endDate}</div>
                ${ev.desc ? `<div class="cal-event-desc">${ev.desc.replace(/\n/g, '<br>')}</div>` : ''}
                <div class="cal-event-actions admin-only">
                    <button class="action-btn edit" onclick="window.editCalendarEvent('${ev.id}')"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="window.deleteCalendarEvent('${ev.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        });
    }

    detailsContainer.innerHTML = html;
    
    detailsContainer.querySelectorAll('.cal-event-item').forEach(item => {
        item.addEventListener('dragstart', (e) => {
            if(!document.body.classList.contains('is-admin')) { e.preventDefault(); return; }
            draggedCalendarEventNode = item;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = "move";
        });
        
        item.addEventListener('dragend', () => {
            if(!document.body.classList.contains('is-admin')) return;
            item.classList.remove('dragging');
            draggedCalendarEventNode = null;
            
            const currentEventIds = Array.from(detailsContainer.querySelectorAll('.cal-event-item')).map(el => el.dataset.id);
            
            currentEventIds.forEach((id, idx) => {
                const targetEv = allCalendarEvents.find(e => e.id === id);
                if(targetEv) targetEv.order = idx;
                updateDoc(doc(db, "calendar_events", id), { order: idx });
            });
            
            allCalendarEvents.sort((a, b) => a.order - b.order);
            buildCalendarMaps(); 
            renderCalendar(); 
        });
    });
    
    detailsContainer.addEventListener('dragover', e => {
        if(!document.body.classList.contains('is-admin')) return;
        e.preventDefault();
        if (!draggedCalendarEventNode) return;
        const afterElement = getDragAfterElement(detailsContainer, e.clientX, e.clientY, 'cal-event-item');
        if (afterElement == null || afterElement === draggedCalendarEventNode) {
            detailsContainer.appendChild(draggedCalendarEventNode);
        } else {
            detailsContainer.insertBefore(draggedCalendarEventNode, afterElement);
        }
    });
    
    if (window.innerWidth <= 768) {
        document.getElementById('calendar-sidebar').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

const closeCalendarModalBtn = document.getElementById('close-calendar-modal');
if (closeCalendarModalBtn) {
    closeCalendarModalBtn.onclick = () => {
        document.getElementById('calendar-modal').style.display = "none";
    };
}

export async function initCalendar() {
    const calContainer = document.getElementById('calendar-main-content');
    if (!calContainer) return;
    
    calContainer.innerHTML = '<div class="loading-state">กำลังโหลดข้อมูลปฏิทิน...</div>';
    
    const prevBtn = document.getElementById('prev-month-btn');
    const nextBtn = document.getElementById('next-month-btn');
    if (prevBtn && nextBtn) {
        prevBtn.onclick = () => {
            currentMonthIndex = (currentMonthIndex === 0) ? 11 : currentMonthIndex - 1;
            renderCalendar();
        };
        nextBtn.onclick = () => {
            currentMonthIndex = (currentMonthIndex === 11) ? 0 : currentMonthIndex + 1;
            renderCalendar();
        };
    }

    try {
        await Promise.all([
            fetchAllCharactersForCalendar(),
            fetchCalendarEvents()
        ]);
        buildCalendarMaps(); 
        renderCalendar();
    } catch(e) {
        calContainer.innerHTML = '<div class="error-state">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่</div>';
    }
}