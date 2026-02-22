// Main application controller

import { AppState } from './state.js';
import { UIManager } from './ui.js';
import { CalendarView } from './calendar-view.js';
import { TimelineView } from './timeline-view.js';
import { FileHandler } from './file-handler.js';
import { EventManager } from './event-manager.js';
import { formatDateShort } from './utils.js';

// Toast notification utility (also exposed globally for other modules)
function showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icons[type] ?? 'ℹ'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('toast-hiding');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, duration);
}
window.showToast = showToast;

class TimelineApp {
    constructor() {
        this.state = new AppState();
        this.ui = new UIManager(this.state);
        this.calendarView = new CalendarView(this.state);
        this.timelineView = new TimelineView(this.state);
        this.fileHandler = new FileHandler(this.state);
        this.eventManager = new EventManager(this.state);

        this.init();
    }

    init() {
        this.ui.renderApp();
        this.bindEvents();
        this.state.subscribe(this.handleStateChange.bind(this));
        // Close search dropdown on outside click (registered once)
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.header-search-wrapper')) this.closeSearchDropdown();
        });
    }

    handleStateChange(key, data) {
        if (key === 'data-loaded' || key === 'events') {
            this.rebindEvents();
            this.switchView(data.currentView);
        } else if (key === 'form') {
            // Re-bind after sidebar re-render triggered by UIManager
            this.rebindEvents();
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

        // Form actions
        this.bindFormActions();

        // View switcher
        this.bindViewSwitcher();

        // Form inputs
        this.bindFormInputs();

        // Category buttons
        this.bindCategoryButtons();

        // Hungarian-only toggle
        this.bindHungarianOnly();

        // Semester panel inputs
        this.bindSemesterInputs();

        // Category manager
        this.bindCategoryManager();

        // Mobile sidebar toggle
        this.bindMobileToggle();

        // New semester wizard
        this.bindNewSemesterBtn();

        // Cloud buttons
        this.bindCloudButtons();

        // Search
        this.bindSearchEvents();
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
    }

    bindUploadDownload() {
        const uploadBtn = document.getElementById('upload-btn');
        if (uploadBtn) {
            uploadBtn.replaceWith(uploadBtn.cloneNode(true));
            document.getElementById('upload-btn').addEventListener('click', () => {
                this.fileHandler.triggerUpload();
            });
        }

        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn) {
            downloadBtn.replaceWith(downloadBtn.cloneNode(true));
            document.getElementById('download-btn').addEventListener('click', () => {
                this.fileHandler.downloadJSON();
            });
        }
    }

    bindFormActions() {
        const saveBtn = document.getElementById('save-btn');
        const deleteBtn = document.getElementById('delete-btn');
        const clearBtn = document.getElementById('clear-btn');

        if (saveBtn) {
            saveBtn.replaceWith(saveBtn.cloneNode(true));
            document.getElementById('save-btn').addEventListener('click', () => {
                this.eventManager.saveEvent();
            });
        }

        if (deleteBtn) {
            deleteBtn.replaceWith(deleteBtn.cloneNode(true));
            document.getElementById('delete-btn').addEventListener('click', () => {
                this.eventManager.deleteEvent();
            });
        }

        if (clearBtn) {
            clearBtn.replaceWith(clearBtn.cloneNode(true));
            document.getElementById('clear-btn').addEventListener('click', () => {
                this.eventManager.clearForm();
            });
        }
    }

    bindViewSwitcher() {
        const calendarBtn = document.getElementById('view-calendar');
        const timelineBtn = document.getElementById('view-timeline');

        if (calendarBtn) {
            calendarBtn.replaceWith(calendarBtn.cloneNode(true));
            document.getElementById('view-calendar').addEventListener('click', () => {
                this.state.update('currentView', 'calendar');
                this.switchView('calendar');
            });
        }

        if (timelineBtn) {
            timelineBtn.replaceWith(timelineBtn.cloneNode(true));
            document.getElementById('view-timeline').addEventListener('click', () => {
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
            if (input) {
                input.replaceWith(input.cloneNode(true));
                document.getElementById(`form-${field}`).addEventListener('input', (e) => {
                    this.state.updateFormField(field, e.target.value);
                });
            }
        });
    }

    bindCategoryButtons() {
        const categoryButtons = document.querySelectorAll('.category-btn');
        categoryButtons.forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.replaceWith(newBtn);
            newBtn.addEventListener('click', () => {
                const categoryId = newBtn.getAttribute('data-category');
                this.state.updateFormField('category', categoryId);
                this.ui.renderSidebar();
                this.rebindEvents();
            });
        });
    }

    bindHungarianOnly() {
        const checkbox = document.getElementById('form-hungarianOnly');
        if (checkbox) {
            const newCb = checkbox.cloneNode(true);
            checkbox.replaceWith(newCb);
            newCb.addEventListener('change', (e) => {
                this.state.updateFormField('hungarianOnly', e.target.checked);
            });
        }
    }

    bindSemesterInputs() {
        const semFields = ['id', 'name', 'nameEn', 'startDate', 'endDate'];
        semFields.forEach(field => {
            const input = document.getElementById(`sem-${field}`);
            if (input) {
                const newInput = input.cloneNode(true);
                input.replaceWith(newInput);
                newInput.addEventListener('input', (e) => {
                    this.state.updateSemester({ [field]: e.target.value });
                });
            }
        });
    }

    bindCategoryManager() {
        // Bind inline edit inputs on each category row (update on input, no re-render)
        document.querySelectorAll('.category-row').forEach(row => {
            const catId = row.getAttribute('data-cat-id');

            const bindField = (selector, stateKey, isCheckbox = false) => {
                const el = row.querySelector(selector);
                if (!el) return;
                const newEl = el.cloneNode(true);
                el.replaceWith(newEl);
                const evt = isCheckbox ? 'change' : 'input';
                newEl.addEventListener(evt, (e) => {
                    this.state.updateCategory(catId, { [stateKey]: isCheckbox ? e.target.checked : e.target.value });
                });
            };

            bindField('.cat-name', 'name');
            bindField('.cat-nameEn', 'nameEn');
            bindField('.cat-color', 'color');
            bindField('.cat-hu-only', 'hungarianOnly', true);
            bindField('.cat-en-only', 'englishOnly', true);

            // Delete button
            const delBtn = row.querySelector('.btn-del-cat');
            if (delBtn) {
                const newDelBtn = delBtn.cloneNode(true);
                delBtn.replaceWith(newDelBtn);
                newDelBtn.addEventListener('click', () => {
                    if (!confirm('Biztosan törölni szeretnéd ezt a kategóriát?')) return;
                    this.state.deleteCategory(catId);
                    this.ui.renderSidebar();
                    this.rebindEvents();
                });
            }
        });

        // Add new category button
        const addBtn = document.getElementById('add-category-btn');
        if (addBtn) {
            const newAddBtn = addBtn.cloneNode(true);
            addBtn.replaceWith(newAddBtn);
            newAddBtn.addEventListener('click', () => {
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
        ['new-semester-btn', 'new-semester-btn-empty'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.replaceWith(btn.cloneNode(true));
                document.getElementById(id).addEventListener('click', () => {
                    this.openNewSemesterWizard();
                });
            }
        });
    }

    openNewSemesterWizard() {
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

        // Add category row
        document.getElementById('wizard-add-cat-btn')?.addEventListener('click', () => {
            const list = document.getElementById('wizard-cat-list');
            const row = document.createElement('div');
            row.className = 'wizard-cat-row';
            row.innerHTML = `
                <input type="color" class="wiz-cat-color" value="#6366f1">
                <input type="text" class="wiz-cat-name" placeholder="Magyar név">
                <input type="text" class="wiz-cat-nameEn" placeholder="English name">
                <button class="btn btn-secondary btn-del-cat" style="flex-shrink:0">✕</button>
            `;
            row.querySelector('.btn-del-cat').addEventListener('click', () => row.remove());
            list.appendChild(row);
        });

        document.getElementById('wizard-create-btn')?.addEventListener('click', () => {
            this.createSemesterFromWizard();
        });
    }

    createSemesterFromWizard() {
        const val = id => document.getElementById(id)?.value.trim() || '';
        const name = val('wiz-name');

        if (!name) {
            showToast('Kérlek add meg a félév nevét!', 'warning');
            return;
        }

        const semester = {
            id: val('wiz-id'),
            name,
            nameEn: val('wiz-nameEn'),
            startDate: val('wiz-startDate'),
            endDate: val('wiz-endDate')
        };

        const categories = [];
        document.querySelectorAll('.wizard-cat-row').forEach((row, i) => {
            const catName = row.querySelector('.wiz-cat-name')?.value.trim();
            if (!catName) return;
            categories.push({
                id: String(i + 1),
                name: catName,
                nameEn: row.querySelector('.wiz-cat-nameEn')?.value.trim() || '',
                color: row.querySelector('.wiz-cat-color')?.value || '#6366f1'
            });
        });

        document.getElementById('semester-wizard')?.remove();

        this.state.loadData({ semester, categories, events: [] });
        this.state.update('fileName', name.replace(/\s+/g, '_') + '.json');
    }

    bindMobileToggle() {
        const btn = document.getElementById('mobile-sidebar-btn');
        if (btn) {
            btn.replaceWith(btn.cloneNode(true));
            document.getElementById('mobile-sidebar-btn').addEventListener('click', () => {
                this.toggleMobileSidebar();
            });
        }
        const backdrop = document.getElementById('sidebar-backdrop');
        if (backdrop) {
            backdrop.onclick = () => this.closeMobileSidebar();
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

    // ── Esemény kereső ─────────────────────────────────────────────
    bindSearchEvents() {
        const input = document.getElementById('event-search-input');
        if (!input) return;
        input.replaceWith(input.cloneNode(true));
        const fresh = document.getElementById('event-search-input');
        fresh.addEventListener('input', () => this.handleSearchInput(fresh.value));
        fresh.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { fresh.value = ''; this.closeSearchDropdown(); }
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
            const color = cat?.color || '#6366f1';
            const highlightedTitle = this.highlightMatch(ev.title, query);
            const dateMeta = formatDateShort(ev.date) + (cat ? ` · ${cat.name}` : '');
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
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
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
        const s = document.getElementById('cloud-settings-btn');
        if (s) {
            s.replaceWith(s.cloneNode(true));
            document.getElementById('cloud-settings-btn').addEventListener('click', () => this.openCloudSettings());
        }

        const l = document.getElementById('cloud-load-btn');
        if (l) {
            l.replaceWith(l.cloneNode(true));
            document.getElementById('cloud-load-btn').addEventListener('click', () => this.loadFromCloud());
        }

        const sv = document.getElementById('cloud-save-btn');
        if (sv) {
            sv.replaceWith(sv.cloneNode(true));
            document.getElementById('cloud-save-btn').addEventListener('click', () => this.saveToCloud());
        }
    }

    openCloudSettings() {
        document.getElementById('cloud-settings-modal')?.remove();
        document.body.insertAdjacentHTML('beforeend', this.ui.renderCloudSettingsModal());
        this.bindCloudSettingsEvents();
    }

    bindCloudSettingsEvents() {
        const close = () => document.getElementById('cloud-settings-modal')?.remove();

        document.getElementById('cloud-modal-close')?.addEventListener('click', close);
        document.getElementById('cloud-modal-cancel')?.addEventListener('click', close);

        // Close on backdrop click
        document.getElementById('cloud-settings-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'cloud-settings-modal') close();
        });

        // Toggle password visibility
        document.getElementById('cloud-url-toggle')?.addEventListener('click', () => {
            const input = document.getElementById('cloud-url-input');
            if (input) {
                input.type = input.type === 'password' ? 'text' : 'password';
            }
        });

        document.getElementById('cloud-modal-save')?.addEventListener('click', () => this.saveCloudSettings(close));

        document.getElementById('cloud-modal-delete')?.addEventListener('click', () => {
            localStorage.removeItem('calendar_script_url');
            close();
            this.rerenderHeader();
        });
    }

    async saveCloudSettings(closeModal) {
        const url = document.getElementById('cloud-url-input')?.value.trim();
        if (!url) { showToast('Kérlek add meg az URL-t!', 'warning'); return; }

        if (!url.startsWith('https://script.google.com/macros/s/')) {
            showToast('Hibás URL formátum. Így kell kezdődnie: https://script.google.com/macros/s/…', 'warning', 5000);
            return;
        }

        const saveBtn = document.getElementById('cloud-modal-save');
        if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Tesztelés...'; }

        try {
            const testUrl = url.includes('?') ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;
            // no-cors: opaque választ kapunk, de legalább CORS nem blokkolja
            // Ha TypeError-t dob, akkor hálózati hiba vagy rossz URL
            await fetch(testUrl, { mode: 'no-cors' });
            console.log('Apps Script teszt: URL elérhető');
            localStorage.setItem('calendar_script_url', url);
            closeModal?.();
            this.rerenderHeader();
        } catch (e) {
            console.error('Apps Script kapcsolat hiba:', e.name, e.message);
            if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 Mentés'; }
            if (e instanceof TypeError) {
                showToast('Nem sikerült csatlakozni. Ellenőrizd az URL-t és az „Anyone" hozzáférést!', 'error', 6000);
            } else {
                showToast('Csatlakozási hiba: ' + e.message, 'error', 5000);
            }
        }
    }

    rerenderHeader() {
        const header = document.querySelector('.app-header');
        if (!header) return;
        header.outerHTML = this.ui.renderHeader();
        this.bindUploadDownload();
        this.bindNewSemesterBtn();
        this.bindCloudButtons();
        this.bindSearchEvents();
    }

    async loadFromCloud() {
        const url = localStorage.getItem('calendar_script_url');
        if (!url) return;
        const btn = document.getElementById('cloud-load-btn');
        if (btn) btn.disabled = true;
        try {
            const res = await fetch(`${url}?t=${Date.now()}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            if (!text || text.trim() === '{}') {
                showToast('A felhőben még nincs mentett adat.', 'info');
                return;
            }
            const data = JSON.parse(text);
            this.state.loadData(data);
            const name = data.semester?.name?.replace(/\s+/g, '_') || 'felho';
            this.state.update('fileName', name + '.json');
            showToast('Sikeresen betöltve a felhőből!', 'success');
        } catch (e) {
            if (e instanceof TypeError) {
                showToast('Nem sikerült csatlakozni a felhőhöz. Ellenőrizd az URL-t és az internet kapcsolatot!', 'error', 6000);
            } else {
                showToast('Betöltési hiba: ' + e.message, 'error', 5000);
            }
        } finally {
            const b = document.getElementById('cloud-load-btn');
            if (b) b.disabled = false;
        }
    }

    async saveToCloud() {
        const url = localStorage.getItem('calendar_script_url');
        if (!url) return;
        const btn = document.getElementById('cloud-save-btn');
        if (btn) btn.disabled = true;
        try {
            const payload = JSON.stringify(this.fileHandler.buildPayload(), null, 2);
            await fetch(url, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: payload
            });
            showToast('Mentve a felhőbe!', 'success');
        } catch (e) {
            showToast('Nem sikerült menteni: ' + e.message, 'error', 5000);
        } finally {
            const b = document.getElementById('cloud-save-btn');
            if (b) b.disabled = false;
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TimelineApp();
});
