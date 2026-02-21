// Event CRUD operations

export class EventManager {
    constructor(state) {
        this.state = state;
    }

    saveEvent() {
        const form = this.state.data.form;

        // Validation
        if (!form.title.trim()) {
            alert('Kérlek adj meg egy eseménynevet.');
            return;
        }
        if (!form.date) {
            alert('Kérlek válassz egy kezdő dátumot.');
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
        }

        this.clearForm();
    }

    deleteEvent() {
        const form = this.state.data.form;
        if (form.id === null) return;

        if (!confirm('Biztosan törölni szeretnéd ezt az eseményt?')) return;

        this.state.deleteEvent(form.id);
        this.clearForm();
    }

    clearForm() {
        this.state.resetForm();
    }
}
