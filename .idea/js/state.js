// State management with observer pattern

export class AppState {
    constructor() {
        this.data = {
            events: [],
            categories: [],
            semester: null,
            semesterList: [],       // [{ sheet, name, nameEn, status, startDate, endDate }]
            activeSemesterSheet: null,  // active sheet name in Google Sheets
            form: this.getEmptyForm(),
            fileName: '',
            currentView: 'calendar'
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

    // Replace the entire form object and notify (use instead of direct mutation)
    updateForm(formData) {
        this.data.form = formData;
        this.notify('form');
    }

    // Update a single form field (silent – no re-render needed for keystrokes)
    updateFormField(field, value) {
        this.data.form[field] = value;
    }

    // Update a single category field silently (no re-render – for live typing in category cards)
    updateCategoryField(id, fields) {
        const index = this.data.categories.findIndex(c => c.id === id);
        if (index !== -1) {
            this.data.categories[index] = { ...this.data.categories[index], ...fields };
        }
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
            link: '',
            hungarianOnly: false
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

    // Update semester fields
    updateSemester(fields) {
        this.data.semester = { ...this.data.semester, ...fields };
        this.notify('semester');
    }

    // Add a new category
    addCategory(cat) {
        this.data.categories.push(cat);
        this.notify('categories');
    }

    // Update an existing category
    updateCategory(id, fields) {
        const index = this.data.categories.findIndex(c => c.id === id);
        if (index !== -1) {
            this.data.categories[index] = { ...this.data.categories[index], ...fields };
            this.notify('categories');
        }
    }

    // Delete a category
    deleteCategory(id) {
        this.data.categories = this.data.categories.filter(c => c.id !== id);
        this.notify('categories');
    }

    // Get category map for quick lookups
    getCategoryMap() {
        const map = {};
        this.data.categories.forEach(c => {
            map[c.id] = c;
        });
        return map;
    }

    // Reset form to empty state
    resetForm() {
        this.data.form = this.getEmptyForm();
        this.notify('form');
    }

    // Load semester list from cloud index
    loadSemesterList(list) {
        this.data.semesterList = list || [];
        this.notify('semesterList');
    }

    // Set which sheet is currently loaded
    setActiveSemesterSheet(sheet) {
        this.data.activeSemesterSheet = sheet;
    }
}
