// Main application controller

import { AppState } from './state.js';
import { UIManager } from './ui.js';
import { CalendarView } from './calendar-view.js';
import { TimelineView } from './timeline-view.js';
import { FileHandler } from './file-handler.js';
import { EventManager } from './event-manager.js';
import { SearchManager } from './search.js';

// Debounce utility function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

class TimelineApp {
    constructor() {
        this.state = new AppState();
        this.ui = new UIManager(this.state);
        this.calendarView = new CalendarView(this.state);
        this.timelineView = new TimelineView(this.state);
        this.fileHandler = new FileHandler(this.state);
        this.eventManager = new EventManager(this.state);
        this.searchManager = new SearchManager(this.state);

        this.init();
    }

    init() {
        this.ui.renderApp();
        this.bindEvents();
        this.state.subscribe(this.handleStateChange.bind(this));
        this.loadDefaultData();
    }

    async loadDefaultData() {
        try {
            console.log('Loading data.json...');
            const response = await fetch('data.json');
            console.log('Fetch response:', response.status, response.ok);

            if (response.ok) {
                const data = await response.json();
                console.log('Data loaded successfully:', data);
                this.state.loadData(data);
                this.state.update('fileName', 'data.json');
            } else {
                console.error('Failed to load data.json:', response.status);
            }
        } catch (error) {
            console.error('Could not load default data.json:', error);
            console.log('Please make sure you are running a local web server (e.g., python -m http.server or Live Server in VS Code)');
            // App will work without default data, user can upload their own
        }
    }

    handleStateChange(key, data) {
        console.log('App handleStateChange:', key, data);
        if (key === 'data-loaded') {
            console.log('Data loaded, re-binding events and switching to view:', data.currentView);
            // Re-bind events after data loads and UI updates
            this.rebindEvents();
            this.switchView(data.currentView);
            console.log('Events re-bound successfully');
        } else if (key === 'events') {
            // Just refresh the current view when events change
            console.log('Events changed, refreshing view:', data.currentView);
            this.switchView(data.currentView);
        } else if (key === 'form') {
            // Re-bind form events after sidebar is re-rendered
            console.log('Form updated, re-binding form events');
            this.bindFormActions();
            this.bindFormInputs();
            this.bindCategoryButtons();

            // CRITICAL: Refresh timeline to update selection highlighting
            // When user clicks an event, form updates but timeline needs re-render
            // to show the 'active' class on the selected event
            if (data.currentView === 'timeline') {
                console.log('Refreshing timeline view to update event selection');
                this.timelineView.render();
            }
        } else if (key === 'search') {
            // Refresh current view when search query changes
            console.log('Search query changed, refreshing view:', data.currentView);
            this.switchView(data.currentView);
            this.updateSearchUI();
        }
    }

    bindEvents() {
        this.bindUploadDownload();
        this.bindFormActions();
        this.bindViewSwitcher();
        this.bindFormInputs();
        this.bindCategoryButtons();
        this.bindSearch();
    }

    rebindEvents() {
        this.bindUploadDownload();
        this.bindFormActions();
        this.bindViewSwitcher();
        this.bindFormInputs();
        this.bindCategoryButtons();
        this.bindSearch();
    }

    bindUploadDownload() {
        const uploadBtn = document.getElementById('upload-btn');
        const downloadBtn = document.getElementById('download-btn');

        if (uploadBtn) {
            uploadBtn.replaceWith(uploadBtn.cloneNode(true));
            document.getElementById('upload-btn').addEventListener('click', () => {
                this.fileHandler.triggerUpload();
            });
        }

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

    bindSearch() {
        const searchInput = document.getElementById('search-input');
        const searchClear = document.getElementById('search-clear');

        if (searchInput) {
            // Remove old event listeners by replacing the element
            searchInput.replaceWith(searchInput.cloneNode(true));
            const newSearchInput = document.getElementById('search-input');

            // Debounced search handler
            const handleSearch = debounce((e) => {
                const query = e.target.value;
                this.searchManager.setSearchQuery(query);
            }, 300);

            newSearchInput.addEventListener('input', handleSearch);

            // Update clear button visibility on input
            newSearchInput.addEventListener('input', (e) => {
                const clearBtn = document.getElementById('search-clear');
                if (clearBtn) {
                    clearBtn.classList.toggle('visible', e.target.value.length > 0);
                }
            });
        }

        if (searchClear) {
            searchClear.replaceWith(searchClear.cloneNode(true));
            const newSearchClear = document.getElementById('search-clear');

            newSearchClear.addEventListener('click', () => {
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    searchInput.value = '';
                    this.searchManager.clearSearch();
                    newSearchClear.classList.remove('visible');
                }
            });
        }
    }

    updateSearchUI() {
        const searchInput = document.getElementById('search-input');
        const resultsCount = document.getElementById('search-results-count');

        if (this.searchManager.isSearchActive() && resultsCount) {
            const totalEvents = this.state.data.events.length;
            const filteredCount = this.searchManager.getFilteredCount(this.state.data.events);

            resultsCount.textContent = `${filteredCount} / ${totalEvents} esemény`;
            resultsCount.classList.add('visible');
        } else if (resultsCount) {
            resultsCount.classList.remove('visible');
        }
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

            // Bind clear search button in empty state
            const clearSearchBtn = document.getElementById('clear-search-btn');
            if (clearSearchBtn) {
                clearSearchBtn.addEventListener('click', () => {
                    const searchInput = document.getElementById('search-input');
                    const searchClear = document.getElementById('search-clear');
                    if (searchInput) {
                        searchInput.value = '';
                    }
                    if (searchClear) {
                        searchClear.classList.remove('visible');
                    }
                    this.searchManager.clearSearch();
                });
            }
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TimelineApp();
});
