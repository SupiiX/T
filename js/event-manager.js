// Event CRUD operations (Firebase: az új esemény id-ja a számlálóból jön)

export class EventManager {
    constructor(state, app = null) {
        this.state = state;
        this.app = app;   // hozzáférés a Firebase-réteghez és az aktív félévhez
    }

    async saveEvent() {
        const form = this.state.data.form;

        // Validation
        if (!form.title.trim()) {
            window.showToast('Add meg az esemény nevét!', 'warning');
            return;
        }
        if (!form.date) {
            window.showToast('Adj meg egy kezdő dátumot!', 'warning');
            return;
        }
        if (form.endDate && form.endDate < form.date) {
            window.showToast('A záró dátum nem lehet korábbi a kezdő dátumnál!', 'warning');
            return;
        }

        if (form.id !== null) {
            // Update existing event
            this.state.updateEvent(form.id, {
                title: form.title,
                titleEn: form.titleEn,
                date: form.date,
                endDate: form.endDate || null,
                category: form.category,
                description: form.description,
                descriptionEn: form.descriptionEn,
                location: form.location,
                locationEn: form.locationEn,
                link: form.link || null,
                hungarianOnly: form.hungarianOnly || undefined
            });
            window.showToast('Esemény módosítva!', 'success');
        } else {
            // Create new event – az id-t lehetőleg a Firebase atomi számlálójából
            // kérjük, hogy két szerkesztő egyszerre se kaphassa ugyanazt.
            const newEvent = {
                title: form.title,
                titleEn: form.titleEn || '',
                date: form.date,
                endDate: form.endDate || null,
                category: form.category,
                description: form.description || '',
                descriptionEn: form.descriptionEn || '',
                location: form.location || '',
                locationEn: form.locationEn || '',
                link: form.link || null,
                hungarianOnly: form.hungarianOnly || undefined
            };
            let explicitId = null;
            const sheet = this.app && this.app.activeSheet && this.app.activeSheet();
            if (this.app && this.app.fb && sheet) {
                try { explicitId = await this.app.fb.nextId(sheet); }
                catch (e) { console.error('Id-foglalás hiba:', e); }
            }
            this.state.addEvent(newEvent, explicitId);
            window.showToast('Esemény hozzáadva!', 'success');
        }

        this.clearForm();
    }

    deleteEvent() {
        const form = this.state.data.form;
        if (form.id === null) return;

        if (!confirm('Biztosan törölni szeretnéd ezt az eseményt?')) return;

        this.state.deleteEvent(form.id);
        this.clearForm();
        window.showToast('Esemény törölve.', 'success');
    }

    clearForm() {
        this.state.resetForm();
        // Csúszópanel bezárása (mentés / törlés / mégse után)
        if (this.app && this.app.closePanel) this.app.closePanel();
    }
}
