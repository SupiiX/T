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
        }
    }

    bindEvents() {
        // Upload/download
        const uploadBtn = document.getElementById('upload-btn');
        const downloadBtn = document.getElementById('download-btn');

        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                this.fileHandler.triggerUpload();
            });
        }

        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.fileHandler.downloadJSON();
            });
        }

        // Form actions
        this.bindFormActions();

        // View switcher
        this.bindViewSwitcher();

        // Form inputs
        this.bindFormInputs();

        // Category buttons
        this.bindCategoryButtons();
    }

    rebindEvents() {
        this.bindFormActions();
        this.bindViewSwitcher();
        this.bindFormInputs();
        this.bindCategoryButtons();
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
            container.innerHTML = '<div id="calendar-container"></div>';
            this.calendarView.render();
        } else {
            container.innerHTML = '<div id="timeline-container"></div>';
            this.timelineView.render();
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TimelineApp();
});
