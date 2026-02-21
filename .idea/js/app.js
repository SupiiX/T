// Main application controller

import { AppState } from './state.js';
import { UIManager } from './ui.js';
import { CalendarView } from './calendar-view.js';
import { TimelineView } from './timeline-view.js';
import { FileHandler } from './file-handler.js';
import { EventManager } from './event-manager.js';

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
            alert('Kérlek add meg a félév magyar nevét.');
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
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TimelineApp();
});
