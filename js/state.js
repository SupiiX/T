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
        this._sync = null;   // perzisztencia hook (Firebase) – setSyncHandler állítja be
    }

    // Perzisztencia hook beállítása (Firebase írások).
    // op: 'event' | 'deleteEvent' | 'category' | 'deleteCategory' | 'semester'
    setSyncHandler(fn) { this._sync = fn; }
    _emit(op, data) {
        if (this._sync) { try { this._sync(op, data); } catch (e) { console.error('sync hiba:', e); } }
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
        this.data.form = this.getEmptyForm();
        this.notify('data-loaded');
    }

    // Élő (Firebase) frissítés alkalmazása a szerkesztett űrlap MEGZAVARÁSA nélkül.
    // Frissíti az adatot és a nézeteket, de NEM vált ki perzisztens írást
    // (nincs visszhang a felhőbe) és nem rendereli újra a sidebar űrlapot.
    applyRemote(payload) {
        this.data.semester   = payload.semester   || null;
        this.data.categories = payload.categories || [];
        this.data.events     = payload.events     || [];
        this.notify('remote');
    }

    // Add new event. Ha explicitId adott (pl. Firebase számláló), azt használja;
    // különben helyi auto-increment (offline fallback).
    addEvent(event, explicitId = null) {
        if (explicitId !== null && explicitId !== undefined) {
            event.id = explicitId;
        } else {
            const maxId = this.data.events.length > 0
                ? Math.max(...this.data.events.map(e => Number(e.id) || 0))
                : 0;
            event.id = maxId + 1;
        }
        this.data.events.push(event);
        this._emit('event', event);
        this.notify('events');
    }

    // Update existing event
    updateEvent(id, updatedEvent) {
        const index = this.data.events.findIndex(e => Number(e.id) === Number(id));
        if (index !== -1) {
            this.data.events[index] = { ...this.data.events[index], ...updatedEvent };
            this._emit('event', this.data.events[index]);
            this.notify('events');
        }
    }

    // Delete event
    deleteEvent(id) {
        this.data.events = this.data.events.filter(e => Number(e.id) !== Number(id));
        this._emit('deleteEvent', id);
        this.notify('events');
    }

    // Update semester fields
    updateSemester(fields) {
        this.data.semester = { ...this.data.semester, ...fields };
        this._emit('semester', this.data.semester);
        this.notify('semester');
    }

    // Add a new category
    addCategory(cat) {
        this.data.categories.push(cat);
        this._emit('category', cat);
        this.notify('categories');
    }

    // Update an existing category
    updateCategory(id, fields) {
        const index = this.data.categories.findIndex(c => c.id === id);
        if (index !== -1) {
            this.data.categories[index] = { ...this.data.categories[index], ...fields };
            this._emit('category', this.data.categories[index]);
            this.notify('categories');
        }
    }

    // Delete a category
    deleteCategory(id) {
        this.data.categories = this.data.categories.filter(c => c.id !== id);
        this._emit('deleteCategory', id);
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
