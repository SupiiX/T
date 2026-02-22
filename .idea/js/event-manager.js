// Event CRUD operations

export class EventManager {
    constructor(state) {
        this.state = state;
    }

    saveEvent() {
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
            // Create new event
            this.state.addEvent({
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
            });
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
    }
}
