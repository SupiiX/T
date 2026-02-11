// State management with observer pattern

export class AppState {
    constructor() {
        this.data = {
            events: [],
            categories: [],
            semester: null,
            form: this.getEmptyForm(),
            fileName: '',
            currentView: 'calendar',
            searchQuery: ''
        };
        this.listeners = [];
    }

    // Observer pattern: subscribe to state changes
    subscribe(listener) {
        this.listeners.push(listener);
    }

    // Notify all listeners when state changes
    notify(changedKey) {
        this.listeners.forEach(listener => listener(changedKey, this.data));
    }

    // Update a top-level state property
    update(key, value) {
        this.data[key] = value;
        this.notify(key);
    }

    // Update a single form field (silent update, no re-render)
    // This allows typing in input fields without losing focus
    updateFormField(field, value) {
        this.data.form[field] = value;
        // Note: No notify() call here - prevents re-rendering on every keystroke
        // UI will only update when explicitly needed (event selection, clear, etc.)
    }

    // Get empty form template
    getEmptyForm() {
        return {
            id: null,
            title: '',
            titleEn: '',
            category: '',
            date: '',
            endDate: '',
            description: '',
            descriptionEn: '',
            location: '',
            locationEn: '',
            link: ''
        };
    }

    // Load data from JSON
    loadData(jsonData) {
        this.data.semester = jsonData.semester || null;
        this.data.categories = jsonData.categories || [];
        this.data.events = jsonData.events || [];
        this.notify('data-loaded');
    }

    // Add new event with auto-incremented ID
    addEvent(event) {
        const maxId = this.data.events.length > 0
            ? Math.max(...this.data.events.map(e => e.id))
            : 0;
        event.id = maxId + 1;
        this.data.events.push(event);
        this.notify('events');
    }

    // Update existing event
    updateEvent(id, updatedEvent) {
        const index = this.data.events.findIndex(e => e.id === id);
        if (index !== -1) {
            this.data.events[index] = { ...this.data.events[index], ...updatedEvent };
            this.notify('events');
        }
    }

    // Delete event
    deleteEvent(id) {
        this.data.events = this.data.events.filter(e => e.id !== id);
        this.notify('events');
    }

    // Get category map for quick lookups
    getCategoryMap() {
        const map = {};
        this.data.categories.forEach(c => {
            map[c.id] = c;
        });
        return map;
    }

    // Load form data (e.g., when selecting an event)
    // This DOES trigger UI update
    loadForm(formData) {
        this.data.form = formData;
        this.notify('form');
    }

    // Reset form to empty state
    resetForm() {
        this.data.form = this.getEmptyForm();
        this.notify('form');
    }

    // Update search query
    updateSearch(query) {
        this.data.searchQuery = query;
        this.notify('search');
    }
}
