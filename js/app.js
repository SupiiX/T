// Main application controller

import { AppState } from './state.js';
import { UIManager } from './ui.js';
import { CalendarView } from './calendar-view.js';
import { TimelineView } from './timeline-view.js';
import { FileHandler } from './file-handler.js';
import { EventManager } from './event-manager.js';
import { FirebaseSync } from './firebase.js';
import { formatDateShort } from './utils.js';
import { Icons } from './icons.js';
import { computeSemesterStatus, getDefaultDates } from './semester-config.js';

// Toast notification utility (also exposed globally for other modules)
function showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toastIcons = {
        success: Icons.CheckCircle,
        error: Icons.XCircle,
        warning: Icons.AlertTriangle,
        info: Icons.Info
    };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${toastIcons[type] ?? Icons.Info}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" aria-label="Bezárás">${Icons.X}</button>
    `;
    const dismiss = () => {
        if (toast.classList.contains('toast-hiding')) return;
        toast.classList.add('toast-hiding');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    };
    toast.querySelector('.toast-close').addEventListener('click', dismiss);
    container.appendChild(toast);
    setTimeout(dismiss, duration);
}
window.showToast = showToast;

class TimelineApp {
    constructor() {
        this.state = new AppState();
        // Mobilon alapból az Idővonal nézet (a havi naptárrács kis kijelzőn szűkös)
        if (typeof window !== 'undefined' && window.innerWidth <= 768) {
            this.state.data.currentView = 'timeline';
        }
        this.ui = new UIManager(this.state);
        this.calendarView = new CalendarView(this.state);
        this.timelineView = new TimelineView(this.state);
        this.fileHandler = new FileHandler(this.state);
        this.eventManager = new EventManager(this.state, this);
        this.fb = new FirebaseSync();
        this._firstSnapshot = true;
        this._metaSaveTimer = null;

        this.init();
    }

    init() {
        this.ui.renderApp();
        this.bindEvents();
        this.state.subscribe(this.handleStateChange.bind(this));
        this.state.setSyncHandler((op, data) => this.persist(op, data));
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.header-search-wrapper')) this.closeSearchDropdown();
            if (!e.target.closest('.semester-switcher')) this.closeSemesterDropdown();
        });
        this.initAuth();
    }

    // Az aktív félév sheet-azonosítója (a Firebase ágneve)
    activeSheet() { return this.state.data.activeSemesterSheet; }

    handleStateChange(key, data) {
        if (key === 'semesterList') {
            this.rerenderHeader();
            return;
        }
        if (key === 'semester') {
            this.updateArchivedBanner();
            return;
        }
        if (key === 'remote') {
            // Élő (Firebase) frissítés: nézetek + fejléc, a sidebar űrlap érintetlen marad
            if (this.state.data.events.length > 0 && !document.getElementById('view-container')) {
                this.ui.renderMainPanel();
                this.rebindEvents();
            }
            this.switchView(this.state.data.currentView);
            this.ui.updateSemesterHeader();
            this.ui.updateEventCounter();
            this.updateArchivedBanner();
            return;
        }
        if (key === 'categories') {
            this.ui.renderSidebar();
            this.rebindEvents();
            if (this.state.data.events.length > 0) {
                this.switchView(this.state.data.currentView);
            }
            return;
        }
        if (key === 'data-loaded' || key === 'events') {
            this.rebindEvents();
            this.switchView(data.currentView);
        } else if (key === 'form') {
            // Re-bind after sidebar re-render triggered by UIManager
            this.rebindEvents();
            // Esemény kiválasztása vagy dátumra kattintás → panel nyitása
            const f = this.state.data.form;
            if (f.id !== null || f.date) this.openPanel();
            // Update active highlight in timeline without full re-render
            if (this.state.data.currentView === 'timeline') {
                const activeId = this.state.data.form.id;
                document.querySelectorAll('.timeline-item').forEach(item => {
                    const evId = Number(item.getAttribute('data-event-id'));
                    item.classList.toggle('active', evId === activeId);
                });
            }
        }
    }

    bindEvents() {
        this.bindUploadDownload();
        this.bindFormActions();
        this.bindViewSwitcher();
        this.bindFormInputs();
        this.bindCategoryButtons();
        this.bindHungarianOnly();
        this.bindSemesterInputs();
        this.bindCategoryManager();
        this.bindMobileToggle();
        this.bindNewSemesterBtn();
        this.bindCloudButtons();
        this.bindSearchEvents();
        this.bindSidebarTabs();
        this.bindSemesterSwitcher();
        this.bindNewEventBtn();
        this.bindSettingsBtn();
        this.bindPanelClose();
    }

    rebindEvents() {
        this.bindUploadDownload();
        this.bindFormActions();
        this.bindViewSwitcher();
        this.bindFormInputs();
        this.bindCategoryButtons();
        this.bindHungarianOnly();
        this.bindSemesterInputs();
        this.bindCategoryManager();
        this.bindMobileToggle();
        this.bindNewSemesterBtn();
        this.bindCloudButtons();
        this.bindSearchEvents();
        this.bindSidebarTabs();
        this.bindSemesterSwitcher();
        this.bindNewEventBtn();
        this.bindSettingsBtn();
        this.bindPanelClose();
        this.initDatePickers();
    }

    // ── Flatpickr dátumválasztó inicializálás ──────────────
    // Megkeresi az összes data-datepicker attribútumú inputot a megadott
    // konténerben és Flatpickr-rel helyettesíti a böngésző natív pickerét.
    initDatePickers(container = document) {
        if (typeof flatpickr === 'undefined') return;
        container.querySelectorAll('input[data-datepicker]').forEach(input => {
            if (input._flatpickr) return; // már inicializálva
            flatpickr(input, {
                locale: 'hu',
                dateFormat: 'Y-m-d',
                allowInput: true,
                disableMobile: true,
                // Mentés a state-be: az onChange a change eseményen át megy,
                // amit a bindFormInputs / bindSemesterInputs 'input' hallgatója fog
                onChange: (_dates, dateStr) => {
                    input.value = dateStr;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
        });
    }

    bindSidebarTabs() {
        document.querySelectorAll('.sidebar-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                this.ui.setActiveTab(tab);
                this.ui.renderSidebar();
                this.rebindEvents();
            });
        });
    }

    bindUploadDownload() {
        const uploadBtn = document.getElementById('upload-btn');
        if (uploadBtn && !uploadBtn.dataset.bound) {
            uploadBtn.dataset.bound = '1';
            uploadBtn.addEventListener('click', () => {
                this.fileHandler.triggerUpload();
            });
        }

        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn && !downloadBtn.dataset.bound) {
            downloadBtn.dataset.bound = '1';
            downloadBtn.addEventListener('click', () => {
                this.fileHandler.downloadJSON();
            });
        }
    }

    bindFormActions() {
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn && !saveBtn.dataset.bound) {
            saveBtn.dataset.bound = '1';
            saveBtn.addEventListener('click', () => {
                this.eventManager.saveEvent();
            });
        }

        const deleteBtn = document.getElementById('delete-btn');
        if (deleteBtn && !deleteBtn.dataset.bound) {
            deleteBtn.dataset.bound = '1';
            deleteBtn.addEventListener('click', () => {
                this.eventManager.deleteEvent();
            });
        }

        const clearBtn = document.getElementById('clear-btn');
        if (clearBtn && !clearBtn.dataset.bound) {
            clearBtn.dataset.bound = '1';
            clearBtn.addEventListener('click', () => {
                this.eventManager.clearForm();
            });
        }
    }

    bindViewSwitcher() {
        const calendarBtn = document.getElementById('view-calendar');
        if (calendarBtn && !calendarBtn.dataset.bound) {
            calendarBtn.dataset.bound = '1';
            calendarBtn.addEventListener('click', () => {
                this.state.update('currentView', 'calendar');
                this.switchView('calendar');
            });
        }

        const timelineBtn = document.getElementById('view-timeline');
        if (timelineBtn && !timelineBtn.dataset.bound) {
            timelineBtn.dataset.bound = '1';
            timelineBtn.addEventListener('click', () => {
                this.state.update('currentView', 'timeline');
                this.switchView('timeline');
            });
        }
    }

    bindFormInputs() {
        const formFields = ['title', 'titleEn', 'category', 'date', 'endDate',
            'description', 'descriptionEn', 'location', 'locationEn', 'link'];

        formFields.forEach(field => {
            const input = document.getElementById(`form-${field}`);
            if (input && !input.dataset.bound) {
                input.dataset.bound = '1';
                input.addEventListener('input', (e) => {
                    this.state.updateFormField(field, e.target.value);
                });
            }
        });
    }

    bindCategoryButtons() {
        document.querySelectorAll('.category-btn').forEach(btn => {
            if (btn.dataset.bound) return;
            btn.dataset.bound = '1';
            btn.addEventListener('click', () => {
                const categoryId = btn.getAttribute('data-category');
                this.state.updateFormField('category', categoryId);
                // Update button styles in-place – no full sidebar re-render
                document.querySelectorAll('.category-btn').forEach(b => {
                    const cat = this.state.data.categories.find(c => c.id === b.getAttribute('data-category'));
                    const selected = b.getAttribute('data-category') === categoryId;
                    b.classList.toggle('selected', selected);
                    if (cat) {
                        b.style.backgroundColor = selected ? cat.color : `${cat.color}20`;
                        b.style.color = selected ? '#fff' : cat.color;
                        b.style.borderColor = cat.color;
                    }
                });
            });
        });
    }

    bindHungarianOnly() {
        const checkbox = document.getElementById('form-hungarianOnly');
        if (checkbox && !checkbox.dataset.bound) {
            checkbox.dataset.bound = '1';
            checkbox.addEventListener('change', (e) => {
                this.state.updateFormField('hungarianOnly', e.target.checked);
                // Újrarenderelés: az angol mezők megjelennek / eltűnnek
                this.ui.renderSidebar();
                this.rebindEvents();
            });
        }
    }

    bindSemesterInputs() {
        const semFields = ['id', 'name', 'nameEn', 'startDate', 'endDate'];
        semFields.forEach(field => {
            const input = document.getElementById(`sem-${field}`);
            if (input && !input.dataset.bound) {
                input.dataset.bound = '1';
                input.addEventListener('input', (e) => {
                    this.state.updateSemester({ [field]: e.target.value });
                });
            }
        });
    }

    bindCategoryManager() {
        // Bind inline edit inputs on each category row (silent update on typing – no re-render)
        document.querySelectorAll('.cat-card').forEach(row => {
            if (row.dataset.bound) return;
            row.dataset.bound = '1';
            const catId = row.getAttribute('data-cat-id');

            const bindField = (selector, stateKey, isCheckbox = false) => {
                const el = row.querySelector(selector);
                if (!el) return;
                const evt = isCheckbox ? 'change' : 'input';
                el.addEventListener(evt, (e) => {
                    const value = isCheckbox ? e.target.checked : e.target.value;
                    // Silent update – no re-render, cursor stays put
                    this.state.updateCategoryField(catId, { [stateKey]: value });
                    // Live feedback: sync card header name display
                    if (stateKey === 'name') {
                        const nameSpan = row.querySelector('.cat-card-name');
                        if (nameSpan) nameSpan.textContent = value;
                    }
                });
            };

            bindField('.cat-name', 'name');
            bindField('.cat-nameEn', 'nameEn');
            // Color uses 'change' (fires on picker close) + notifying update so views refresh
            const colorEl = row.querySelector('.cat-color');
            if (colorEl) {
                colorEl.addEventListener('change', (e) => {
                    this.state.updateCategory(catId, { color: e.target.value });
                });
            }
            bindField('.cat-hu-only', 'hungarianOnly', true);
            bindField('.cat-en-only', 'englishOnly', true);

            // Firebase perzisztálás: szöveg mezők blur-re (change), checkboxok változásra
            ['.cat-name', '.cat-nameEn', '.cat-hu-only', '.cat-en-only'].forEach(sel => {
                const el = row.querySelector(sel);
                if (el) el.addEventListener('change', () => this.persistCategory(catId));
            });

            // Delete button – re-render is fine here (card is removed)
            const delBtn = row.querySelector('.btn-del-cat');
            if (delBtn) {
                delBtn.addEventListener('click', () => {
                    if (!confirm('Biztosan törölni szeretnéd ezt a kategóriát?')) return;
                    this.state.deleteCategory(catId);
                    this.ui.renderSidebar();
                    this.rebindEvents();
                });
            }
        });

        // Add new category button
        const addBtn = document.getElementById('add-category-btn');
        if (addBtn && !addBtn.dataset.bound) {
            addBtn.dataset.bound = '1';
            addBtn.addEventListener('click', () => {
                const newId = 'kat-' + Date.now();
                this.state.addCategory({
                    id: newId,
                    name: 'Új kategória',
                    nameEn: 'New category',
                    color: '#888888'
                });
                this.ui.renderSidebar();
                this.rebindEvents();
            });
        }
    }

    bindNewSemesterBtn() {
        ['new-semester-btn-empty'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn && !btn.dataset.bound) {
                btn.dataset.bound = '1';
                btn.addEventListener('click', () => {
                    this.openNewSemesterWizard();
                });
            }
        });
        // Félévek kezelő gomb a headerben
        const smBtn = document.getElementById('semester-manager-btn');
        if (smBtn && !smBtn.dataset.bound) {
            smBtn.dataset.bound = '1';
            smBtn.addEventListener('click', () => {
                this.openSemesterManager();
            });
        }
    }

    openSemesterManager() {
        document.getElementById('semester-manager-modal')?.remove();
        document.body.insertAdjacentHTML('beforeend', this.ui.renderSemesterManagerModal());

        const reopen = () => this.openSemesterManager();
        const close = () => document.getElementById('semester-manager-modal')?.remove();
        document.getElementById('sem-manager-close')?.addEventListener('click', close);
        document.getElementById('sem-manager-close2')?.addEventListener('click', close);
        document.getElementById('semester-manager-modal')?.addEventListener('click', e => {
            if (e.target.id === 'semester-manager-modal') close();
        });

        document.getElementById('sem-manager-new-btn')?.addEventListener('click', () => {
            close();
            this.openNewSemesterWizard();
        });

        document.querySelectorAll('.sem-load-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                close();
                this.switchSemester(btn.getAttribute('data-sheet'));
            });
        });

        // Törlés gomb – aktív félévhez nem jelenik meg
        document.querySelectorAll('.sem-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const sheet = btn.getAttribute('data-sheet');
                const name  = btn.getAttribute('data-name');
                close();
                this.openSemesterDeleteConfirm(sheet, name);
            });
        });

        // Kézi státusz-váltás (Archiválás / Aktiválás)
        document.querySelectorAll('.sem-status-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setSemesterStatus(btn.getAttribute('data-sheet'), btn.getAttribute('data-action'));
            });
        });
    }

    // ── Kézi félév-státusz (manuális archiválás / aktiválás) ───
    async setSemesterStatus(sheet, action) {
        const override = action === 'archive' ? 'archived' : 'active';
        const changes = [];

        let list = this.state.data.semesterList.map(s => ({ ...s }));

        // "Csak egy aktív" szabály: aktiváláskor a többi aktívat archiváljuk
        if (override === 'active') {
            list.forEach(s => {
                if (s.sheet !== sheet && computeSemesterStatus(s) === 'active') {
                    s.statusOverride = 'archived';
                    changes.push({ sheet: s.sheet, override: 'archived' });
                }
            });
        }

        list = list.map(s => {
            if (s.sheet === sheet) {
                s.statusOverride = override;
                changes.push({ sheet, override });
            }
            s.status = computeSemesterStatus(s);
            return s;
        });

        this.state.loadSemesterList(list);

        // A betöltött félév fejléc-státusza is frissüljön, ha érintett
        if (this.state.data.semester) {
            const hit = changes.find(c => c.sheet === this.activeSheet());
            if (hit) {
                this.state.data.semester.statusOverride = hit.override;
                this.state.data.semester.status = computeSemesterStatus(this.state.data.semester);
                this.state.notify('semester');
            }
        }

        // Perzisztálás a felhőbe (csak a statusOverride mező)
        for (const c of changes) {
            try { await this.fb.setSemesterOverride(c.sheet, c.override); }
            catch (e) { console.error('Státusz mentési hiba:', e); }
        }

        const label = override === 'archived' ? 'archiválva' : 'aktiválva';
        showToast(`Félév ${label}.`, 'success');
        this.rerenderHeader();
        this.openSemesterManager();
    }

    openSemesterDeleteConfirm(sheet, semName) {
        document.getElementById('sem-delete-modal')?.remove();
        document.body.insertAdjacentHTML('beforeend', this.ui.renderSemesterDeleteConfirm(semName));

        const cancelAndBack = () => {
            document.getElementById('sem-delete-modal')?.remove();
            this.openSemesterManager();
        };

        document.getElementById('sem-delete-cancel')?.addEventListener('click', cancelAndBack);
        document.getElementById('sem-delete-x')?.addEventListener('click', cancelAndBack);
        document.getElementById('sem-delete-modal')?.addEventListener('click', e => {
            if (e.target.id === 'sem-delete-modal') cancelAndBack();
        });

        const input = document.getElementById('sem-delete-confirm-input');
        const confirmBtn = document.getElementById('sem-delete-confirm-btn');

        input?.addEventListener('input', () => {
            confirmBtn.disabled = input.value.trim() !== semName.trim();
        });

        confirmBtn?.addEventListener('click', async () => {
            if (input.value.trim() !== semName.trim()) return;
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Törlés…';
            try {
                await this.fb.deleteSemester(sheet);
                // Eltávolítjuk a lokális listából
                this.state.data.semesterList = this.state.data.semesterList.filter(s => s.sheet !== sheet);
                this.state.notify('semesterList');
                // Ha az éppen betöltött félévet töröltük, tisztítjuk a state-et
                // (különben a "Mentés" gomb visszaírná a törölt adatokat a felhőbe)
                if (sheet === this.state.data.activeSemesterSheet) {
                    this.state.loadData({ events: [], categories: [], semester: null });
                    this.state.setActiveSemesterSheet(null);
                    this.state.update('fileName', '');
                }
                document.getElementById('sem-delete-modal')?.remove();
                showToast(`"${semName}" félév törölve`, 'success');
                this.openSemesterManager();
            } catch (err) {
                showToast('Törlés sikertelen: ' + err.message, 'error');
                cancelAndBack();
            }
        });
    }

    openNewSemesterWizard() {
        const list = this.state.data.semesterList;
        if (list.length >= 3) {
            showToast('Maximum 3 félév tárolható (előző · jelenlegi · következő). Törölj egy archivált félévet!', 'warning', 5000);
            return;
        }
        const hasDraft = list.some(s => computeSemesterStatus(s) === 'draft');
        if (hasDraft) {
            showToast('Már van egy tervezett félév. Előbb töröld azt, mielőtt újat hozol létre!', 'warning', 5000);
            return;
        }
        document.getElementById('semester-wizard')?.remove();
        document.body.insertAdjacentHTML('beforeend', this.ui.renderNewSemesterWizard());
        this.bindWizardEvents();
    }

    bindWizardEvents() {
        const close = () => document.getElementById('semester-wizard')?.remove();

        document.getElementById('wizard-close-btn')?.addEventListener('click', close);
        document.getElementById('wizard-cancel-btn')?.addEventListener('click', close);

        // Close on backdrop click
        document.getElementById('semester-wizard')?.addEventListener('click', (e) => {
            if (e.target.id === 'semester-wizard') close();
        });

        // ── Év/félév picker ───────────────────────────────────
        const picker = document.querySelector('.wiz-sem-picker');
        if (picker) {
            const updatePicker = () => {
                const year    = parseInt(picker.dataset.year);
                const minYear = parseInt(picker.dataset.minYear);
                const sem     = parseInt(picker.dataset.sem);
                const shortEnd = String(year + 1).slice(-2);
                picker.querySelector('.wiz-year-label').textContent = `${year}/${shortEnd}`;
                picker.querySelector('.wiz-name-code').textContent  = `${year}/${shortEnd}/${sem}`;
                picker.querySelector('.wiz-year-dec').disabled = year <= minYear;
                // Auto-kitöltés: dátummezők frissítése a config alapján
                const dates = getDefaultDates(year, sem);
                const startInput = document.getElementById('wiz-startDate');
                const endInput   = document.getElementById('wiz-endDate');
                if (startInput) {
                    if (startInput._flatpickr) startInput._flatpickr.setDate(dates.startDate, false);
                    else startInput.value = dates.startDate;
                }
                if (endInput) {
                    if (endInput._flatpickr) endInput._flatpickr.setDate(dates.endDate, false);
                    else endInput.value = dates.endDate;
                }
            };
            // Kezdeti kitöltés (Flatpickr még nem fut, value set elég)
            updatePicker();

            picker.querySelector('.wiz-year-dec')?.addEventListener('click', () => {
                picker.dataset.year = parseInt(picker.dataset.year) - 1;
                updatePicker();
            });
            picker.querySelector('.wiz-year-inc')?.addEventListener('click', () => {
                picker.dataset.year = parseInt(picker.dataset.year) + 1;
                updatePicker();
            });
            picker.querySelectorAll('.wiz-sem-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    picker.querySelectorAll('.wiz-sem-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    picker.dataset.sem = btn.dataset.sem;
                    updatePicker();
                });
            });
        }

        // Bind delete buttons on pre-populated rows (inherited from current semester)
        document.querySelectorAll('#wizard-cat-list .btn-del-cat').forEach(btn => {
            btn.addEventListener('click', () => btn.closest('.wizard-cat-row')?.remove());
        });

        // Add category row
        document.getElementById('wizard-add-cat-btn')?.addEventListener('click', () => {
            const list = document.getElementById('wizard-cat-list');
            const row = document.createElement('div');
            row.className = 'wizard-cat-row';
            row.innerHTML = `
                <input type="color" class="wiz-cat-color" value="#1099b3">
                <input type="text" class="wiz-cat-name" placeholder="Magyar név">
                <input type="text" class="wiz-cat-nameEn" placeholder="English name">
                <button class="btn btn-secondary btn-del-cat" aria-label="Sor törlése">${Icons.X}</button>
            `;
            row.querySelector('.btn-del-cat').addEventListener('click', () => row.remove());
            list.appendChild(row);
        });

        document.getElementById('wizard-create-btn')?.addEventListener('click', () => {
            this.createSemesterFromWizard();
        });

        // Flatpickr inicializálás a wizard dátummezőire (az updatePicker() után)
        this.initDatePickers(document.getElementById('semester-wizard'));
    }

    createSemesterFromWizard() {
        const picker = document.querySelector('.wiz-sem-picker');
        if (!picker) { showToast('Hiba: félév kiválasztó nem található.', 'error'); return; }

        const year     = parseInt(picker.dataset.year);
        const sem      = parseInt(picker.dataset.sem);
        const shortEnd = String(year + 1).slice(-2);

        // Generált nevek és sheet azonosító
        const name      = `${year}/${shortEnd}/${sem}`;          // pl. "2025/26/1"
        const nameEn    = `${year}/${shortEnd} Semester ${sem}`; // pl. "2025/26 Semester 1"
        const sheetName = `${year}-${shortEnd}-${sem}`;          // pl. "2025-26-1"

        // Duplikátum ellenőrzés
        const alreadyExists = this.state.data.semesterList.some(s => s.sheet === sheetName);
        if (alreadyExists) {
            showToast(`A(z) ${name} félév már létezik!`, 'warning');
            return;
        }

        // Max 3 félév, max 1 tervezett (draft)
        if (this.state.data.semesterList.length >= 3) {
            showToast('Maximum 3 félév tárolható egyszerre!', 'warning');
            return;
        }
        const hasDraft = this.state.data.semesterList.some(s => computeSemesterStatus(s) === 'draft');
        if (hasDraft) {
            showToast('Már van egy tervezett félév!', 'warning');
            return;
        }

        const val = id => document.getElementById(id)?.value.trim() || '';
        const semester = {
            id: sheetName,
            name,
            nameEn,
            startDate: val('wiz-startDate'),
            endDate:   val('wiz-endDate'),
        };
        // Kézi vezérlés: új félév alapból TERVEZETT; ha még nincs aktív, legyen aktív (ne maradjon üres a weblap)
        const hasActive = this.state.data.semesterList.some(s => computeSemesterStatus(s) === 'active');
        semester.status = hasActive ? 'draft' : 'active';

        const categories = [];
        document.querySelectorAll('.wizard-cat-row').forEach((row, i) => {
            const catName = row.querySelector('.wiz-cat-name')?.value.trim();
            if (!catName) return;
            categories.push({
                id:     String(i + 1),
                name:   catName,
                nameEn: row.querySelector('.wiz-cat-nameEn')?.value.trim() || '',
                color:  row.querySelector('.wiz-cat-color')?.value || '#1099b3'
            });
        });

        document.getElementById('semester-wizard')?.remove();

        const meta = {
            sheet: sheetName,
            name,
            nameEn,
            status:    semester.status,
            startDate: semester.startDate || '',
            endDate:   semester.endDate   || ''
        };
        this.showLoadingOverlay('Félév létrehozása…');
        this.fb.createSemester(
            sheetName,
            { id: sheetName, name, nameEn, status: semester.status, startDate: semester.startDate || '', endDate: semester.endDate || '' },
            categories
        ).then(() => {
            this.state.loadSemesterList([...this.state.data.semesterList.filter(s => s.sheet !== sheetName), meta]);
            this.openSemester(sheetName);
            showToast(`"${name}" félév létrehozva`, 'success');
        }).catch(e => {
            this.hideLoadingOverlay();
            showToast('Félév létrehozása sikertelen: ' + e.message, 'error', 5000);
        });
    }

    sanitizeSheetName(name) {
        return name.replace(/[\\/?*[\]:]/g, '-').substring(0, 100).trim();
    }

    bindMobileToggle() {
        const btn = document.getElementById('mobile-sidebar-btn');
        if (btn && !btn.dataset.bound) {
            btn.dataset.bound = '1';
            btn.addEventListener('click', () => {
                this.toggleMobileSidebar();
            });
        }
        const backdrop = document.getElementById('sidebar-backdrop');
        if (backdrop) {
            backdrop.onclick = () => this.eventManager.clearForm();
        }
    }

    toggleMobileSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');
        const isOpen = sidebar?.classList.contains('open');
        if (isOpen) {
            sidebar.classList.remove('open');
            backdrop?.classList.remove('visible');
        } else {
            sidebar?.classList.add('open');
            backdrop?.classList.add('visible');
        }
    }

    closeMobileSidebar() {
        document.querySelector('.sidebar')?.classList.remove('open');
        document.getElementById('sidebar-backdrop')?.classList.remove('visible');
    }

    // ── Csúszópanel nyitás/zárás ───────────────────────────
    openPanel() {
        document.querySelector('.sidebar')?.classList.add('open');
        document.getElementById('sidebar-backdrop')?.classList.add('visible');
    }

    closePanel() {
        this.closeMobileSidebar();
    }

    bindNewEventBtn() {
        const b = document.getElementById('new-event-btn');
        if (b && !b.dataset.bound) {
            b.dataset.bound = '1';
            b.addEventListener('click', () => {
                this.ui.setActiveTab('event');
                this.state.resetForm();   // üres űrlap (a 'form' kezelő rendereli)
                this.ui.renderSidebar();
                this.rebindEvents();
                this.openPanel();
            });
        }
    }

    bindSettingsBtn() {
        const b = document.getElementById('settings-btn');
        if (b && !b.dataset.bound) {
            b.dataset.bound = '1';
            b.addEventListener('click', () => {
                this.ui.setActiveTab('settings');
                this.ui.renderSidebar();
                this.rebindEvents();
                this.openPanel();
            });
        }
    }

    bindPanelClose() {
        const b = document.getElementById('panel-close');
        if (b && !b.dataset.bound) {
            b.dataset.bound = '1';
            b.addEventListener('click', () => this.eventManager.clearForm());
        }
    }

    // ── Esemény kereső ─────────────────────────────────────────────
    bindSearchEvents() {
        const input = document.getElementById('event-search-input');
        if (!input || input.dataset.bound) return;
        input.dataset.bound = '1';
        input.addEventListener('input', () => this.handleSearchInput(input.value));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { input.value = ''; this.closeSearchDropdown(); }
        });
    }

    handleSearchInput(query) {
        const q = query.trim().toLowerCase();
        if (!q) { this.closeSearchDropdown(); return; }
        const categoryMap = this.state.getCategoryMap();
        const results = this.state.data.events
            .filter(ev =>
                ev.title?.toLowerCase().includes(q) ||
                ev.titleEn?.toLowerCase().includes(q) ||
                ev.description?.toLowerCase().includes(q) ||
                ev.location?.toLowerCase().includes(q)
            ).slice(0, 6);
        this.renderSearchDropdown(results, q, categoryMap);
    }

    renderSearchDropdown(results, query, categoryMap) {
        const wrapper = document.querySelector('.header-search-wrapper');
        if (!wrapper) return;

        let dropdown = document.getElementById('search-dropdown');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = 'search-dropdown';
            dropdown.className = 'search-dropdown';
            wrapper.appendChild(dropdown);
        }

        if (results.length === 0) {
            dropdown.innerHTML = '<div class="search-no-result">Nincs találat</div>';
            return;
        }

        dropdown.innerHTML = results.map(ev => {
            const cat = categoryMap[ev.category];
            const color = cat?.color || '#1099b3';
            const highlightedTitle = this.highlightMatch(ev.title, query);
            const safeCatName = cat ? cat.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
            const dateMeta = formatDateShort(ev.date) + (cat ? ` · ${safeCatName}` : '');
            return `
              <div class="search-result-item" data-event-id="${ev.id}">
                <span class="search-result-dot" style="background:${color}"></span>
                <div class="search-result-body">
                  <div class="search-result-title">${highlightedTitle}</div>
                  <div class="search-result-meta">${dateMeta}</div>
                </div>
              </div>`;
        }).join('');

        dropdown.querySelectorAll('.search-result-item').forEach(item => {
            const evId = Number(item.getAttribute('data-event-id'));
            const ev = this.state.data.events.find(e => e.id === evId);
            if (ev) item.addEventListener('click', () => this.selectSearchResult(ev));
        });
    }

    highlightMatch(text, query) {
        if (!text) return '';
        const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return safe.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
    }

    selectSearchResult(ev) {
        this.timelineView.handleEventClick(ev);
        if (this.state.data.currentView === 'calendar') {
            this.calendarView.calendar?.gotoDate(ev.date);
        } else {
            document.getElementById(`event-${ev.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        const input = document.getElementById('event-search-input');
        if (input) input.value = '';
        this.closeSearchDropdown();
    }

    closeSearchDropdown() {
        document.getElementById('search-dropdown')?.remove();
    }

    switchView(view) {
        const container = document.getElementById('view-container');
        if (!container) return;

        // Update view switcher buttons
        const calendarBtn = document.getElementById('view-calendar');
        const timelineBtn = document.getElementById('view-timeline');

        if (calendarBtn && timelineBtn) {
            calendarBtn.classList.toggle('active', view === 'calendar');
            timelineBtn.classList.toggle('active', view === 'timeline');
        }

        // Render appropriate view
        if (view === 'calendar') {
            // Destroy and reinit calendar so it always mounts into the fresh container
            this.calendarView.destroy();
            container.innerHTML = '<div id="calendar-container"></div>';
            this.calendarView.render();
        } else {
            this.calendarView.destroy();
            container.innerHTML = '<div id="timeline-container"></div>';
            this.timelineView.render();
        }
    }

    bindCloudButtons() {
        const lo = document.getElementById('cloud-logout-btn');
        if (lo && !lo.dataset.bound) {
            lo.dataset.bound = '1';
            lo.addEventListener('click', () => this.logout());
        }
    }

    // ── Hitelesítés (közös jelszó · Firebase Email/Password) ─
    initAuth() {
        this.fb.onAuthChanged(user => {
            if (user) {
                this.removeLoginOverlay();
                this.afterLogin();
            } else {
                this.showLoginOverlay();
            }
        });
    }

    showLoginOverlay() {
        if (document.getElementById('login-overlay')) return;
        const el = document.createElement('div');
        el.id = 'login-overlay';
        el.className = 'login-overlay';
        el.innerHTML = `
          <div class="login-box">
            <div class="login-logo">${Icons.CalendarDays}</div>
            <h1 class="login-title">HÖK Naptár</h1>
            <p class="login-subtitle">Add meg a közös szerkesztői jelszót</p>
            <input type="password" id="login-password" class="login-input" placeholder="Jelszó" autocomplete="current-password">
            <button id="login-btn" class="btn btn-primary btn-block">Belépés</button>
            <p class="login-error"></p>
          </div>`;
        document.body.appendChild(el);
        const pw = el.querySelector('#login-password');
        const submit = () => this.doLogin(pw.value);
        el.querySelector('#login-btn').addEventListener('click', submit);
        pw.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
        pw.focus();
    }

    removeLoginOverlay() { document.getElementById('login-overlay')?.remove(); }

    async doLogin(password) {
        const errEl = document.querySelector('#login-overlay .login-error');
        const btn = document.getElementById('login-btn');
        if (!password) { if (errEl) errEl.textContent = 'Írd be a jelszót.'; return; }
        if (btn) { btn.disabled = true; btn.textContent = 'Belépés…'; }
        try {
            await this.fb.signIn(password);
            // a sikeres belépést az onAuthChanged kezeli
        } catch (e) {
            console.error('Belépési hiba:', e.code, e.message);
            if (btn) { btn.disabled = false; btn.textContent = 'Belépés'; }
            if (errEl) errEl.textContent = 'Hibás jelszó vagy hálózati hiba.';
        }
    }

    async logout() {
        try { await this.fb.signOutUser(); } catch (e) { /* ignoráljuk */ }
        this.fb.stopListening();
        this._firstSnapshot = true;
        this.state.setActiveSemesterSheet(null);
        this.state.loadSemesterList([]);
        this.state.loadData({ events: [], categories: [], semester: null });
        this.showLoginOverlay();
    }

    // ── Belépés utáni betöltés ─────────────────────────────
    async afterLogin() {
        try {
            const list = await this.fb.listSemesters();
            this.state.loadSemesterList(list);
            this.syncComputedStatuses();
            const active = list.find(s => computeSemesterStatus(s) === 'active') || list[0];
            if (active) {
                this.openSemester(active.sheet);
            } else {
                this.state.loadData({ events: [], categories: [], semester: null });
            }
        } catch (e) {
            console.error('Félév betöltése sikertelen:', e);
            showToast('Nem sikerült betölteni a félévet a felhőből.', 'error', 5000);
        }
    }

    // ── Egy félév megnyitása + ÉLŐ figyelése ───────────────
    openSemester(sheet) {
        this.state.setActiveSemesterSheet(sheet);
        this._firstSnapshot = true;
        this.showLoadingOverlay('Félév betöltése…');
        this.fb.listenSemester(sheet, payload => {
            this.hideLoadingOverlay();
            this.onRemote(payload);
        });
    }

    switchSemester(sheet) {
        if (!sheet || sheet === this.activeSheet()) return;
        this.openSemester(sheet);
    }

    onRemote(payload) {
        if (payload.semester) payload.semester.status = computeSemesterStatus(payload.semester);
        if (this._firstSnapshot) {
            this._firstSnapshot = false;
            this.state.loadData(payload);
            this.syncComputedStatuses();
            const name = payload.semester?.name?.replace(/\s+/g, '_') || this.activeSheet();
            this.state.update('fileName', (name || 'naptar') + '.json');
        } else {
            this.state.applyRemote(payload);
        }
    }

    // ── Perzisztencia: state-mutáció → Firebase írás ───────
    //  A state minden mutáció után meghívja ezt (setSyncHandler).
    //  Minden írás CSAK az adott elemet érinti → nincs felülírás.
    persist(op, data) {
        const sheet = this.activeSheet();
        if (!this.fb || !sheet) return;   // nincs hova írni (offline / kilépve)
        try {
            switch (op) {
                case 'event':          this.fb.saveEvent(sheet, data); break;
                case 'deleteEvent':    this.fb.deleteEvent(sheet, data); break;
                case 'category':       this.fb.saveCategory(sheet, data); break;
                case 'deleteCategory': this.fb.deleteCategory(sheet, data); break;
                case 'semester':
                    clearTimeout(this._metaSaveTimer);
                    this._metaSaveTimer = setTimeout(() => {
                        this.fb.saveMeta(sheet, this.state.data.semester);
                    }, 600);
                    break;
            }
        } catch (e) {
            console.error('Mentési hiba:', e);
            showToast('Mentési hiba: ' + e.message, 'error', 4000);
        }
    }

    persistCategory(catId) {
        const sheet = this.activeSheet();
        const cat = this.state.data.categories.find(c => c.id === catId);
        if (this.fb && sheet && cat) this.fb.saveCategory(sheet, cat);
    }

    rerenderHeader() {
        const header = document.querySelector('.app-header');
        if (!header) return;
        header.outerHTML = this.ui.renderHeader();
        this.bindUploadDownload();
        this.bindNewSemesterBtn();
        this.bindCloudButtons();
        this.bindSearchEvents();
        this.bindSemesterSwitcher();
        this.bindNewEventBtn();
        this.bindSettingsBtn();
    }

    updateArchivedBanner() {
        // Fejléc alatti figyelmeztető sáv kezelése
        this.ui.updateSemesterHeader();
        const isArchived = this.state.data.semester?.status === 'archived';
        const existing = document.querySelector('.archived-banner');
        if (isArchived && !existing) {
            const header = document.querySelector('.app-header');
            header?.insertAdjacentHTML('afterend',
                `<div class="archived-banner">${Icons.Archive} Archivált félév – csak megtekintés, szerkesztés korlátozott</div>`
            );
        } else if (!isArchived && existing) {
            existing.remove();
        }
    }

    bindSemesterSwitcher() {
        const btn = document.getElementById('semester-switcher-btn');
        if (btn && !btn.dataset.bound) {
            btn.dataset.bound = '1';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSemesterDropdown();
            });
        }
    }

    toggleSemesterDropdown() {
        const existing = document.getElementById('semester-dropdown');
        if (existing) { existing.remove(); return; }

        const switcher = document.querySelector('.semester-switcher');
        if (!switcher) return;

        const list = this.state.data.semesterList;
        if (!list.length) return;

        const active = list.filter(s => s.status === 'active');
        const drafts = list.filter(s => s.status === 'draft');
        const archived = list.filter(s => s.status === 'archived');

        const renderItem = (s) => {
            const isCurrent = s.sheet === this.state.data.activeSemesterSheet;
            return `
              <div class="semester-dropdown-item ${isCurrent ? 'current' : ''}" data-sheet="${s.sheet}">
                <span class="sem-drop-name">${this.ui.escapeHtml(s.name)}</span>
                <span class="status-badge status-${s.status}">${this.ui.statusLabel(s.status)}</span>
              </div>`;
        };

        const dropdown = document.createElement('div');
        dropdown.id = 'semester-dropdown';
        dropdown.className = 'semester-dropdown';
        dropdown.innerHTML = [
            ...active.map(renderItem),
            ...drafts.map(renderItem),
            archived.length ? `<div class="semester-dropdown-divider">Archivált</div>` + archived.map(renderItem).join('') : ''
        ].join('');

        switcher.appendChild(dropdown);

        dropdown.querySelectorAll('.semester-dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const sheet = item.getAttribute('data-sheet');
                this.closeSemesterDropdown();
                if (sheet !== this.state.data.activeSemesterSheet) {
                    this.switchSemester(sheet);
                }
            });
        });
    }

    closeSemesterDropdown() {
        document.getElementById('semester-dropdown')?.remove();
    }

    showLoadingOverlay(text = 'Adatok betöltése…') {
        const existing = document.getElementById('loading-overlay');
        if (existing) return;
        const el = document.createElement('div');
        el.id = 'loading-overlay';
        el.className = 'loading-overlay';
        el.innerHTML = `<div class="loading-spinner"></div><div class="loading-text">${text}</div>`;
        document.body.appendChild(el);
    }

    hideLoadingOverlay() {
        document.getElementById('loading-overlay')?.remove();
    }

    // ── Számított státuszok szinkronizálása ────────────────
    // A státusz mindig a tárolt startDate/endDate alapján kerül meghatározásra.
    // Ezt hívjuk meg minden betöltés után, hogy a UI mindig naprakész legyen.
    syncComputedStatuses() {
        this.state.data.semesterList = this.state.data.semesterList.map(s => ({
            ...s, status: computeSemesterStatus(s)
        }));
        if (this.state.data.semester) {
            this.state.data.semester.status = computeSemesterStatus(this.state.data.semester);
        }
        // Notify so the header re-renders with the newly computed statuses
        this.state.notify('semesterList');
        if (this.state.data.semester) {
            this.state.notify('semester');
        }
    }

    // (A régi Apps Script hálózati metódusok helyét a Firebase-réteg vette át:
    //  initAuth / afterLogin / openSemester / onRemote / persist / fb.* – fentebb.)

}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TimelineApp();
});
