// Calendar view using FullCalendar

import { inclusiveToExclusive, exclusiveToInclusive, formatDate } from './utils.js';
import { SearchManager } from './search.js';

export class CalendarView {
    constructor(state) {
        this.state = state;
        this.calendar = null;
        this.searchManager = new SearchManager(state);
    }

    render() {
        const calendarEl = document.getElementById('calendar-container');
        if (!calendarEl) return;

        // Always destroy existing calendar before creating new one
        // This ensures handlers are bound to current DOM after view switching
        if (this.calendar) {
            this.calendar.destroy();
            this.calendar = null;
        }

        // Create fresh calendar instance
        this.calendar = new FullCalendar.Calendar(calendarEl, {
            plugins: [ FullCalendar.DayGridPlugin, FullCalendar.Interaction ],
            initialView: 'dayGridMonth',
            locale: 'hu',
            editable: true,
            selectable: true,
            height: '100%',
            dayMaxEvents: 3,
            eventDisplay: 'block',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: ''
            },
            events: this.getCalendarEvents(),
            eventClick: this.handleEventClick.bind(this),
            dateClick: this.handleDateClick.bind(this),
            eventDrop: this.handleEventDrop.bind(this)
        });

        this.calendar.render();
    }

    getCalendarEvents() {
        const categoryMap = this.state.getCategoryMap();

        // Update searchManager query from state
        this.searchManager.searchQuery = this.state.data.searchQuery.toLowerCase().trim();

        // Filter events based on search query
        const filteredEvents = this.searchManager.filterEvents(this.state.data.events);

        return filteredEvents.map(ev => {
            const cat = categoryMap[ev.category];
            return {
                id: String(ev.id),
                title: ev.title,
                start: ev.date,
                end: ev.endDate ? inclusiveToExclusive(ev.endDate) : undefined,
                backgroundColor: cat?.color || '#6366f1',
                borderColor: cat?.color || '#6366f1',
                textColor: '#ffffff',
                extendedProps: {
                    category: ev.category,
                    description: ev.description,
                    location: ev.location
                }
            };
        });
    }

    handleEventClick(info) {
        const ev = info.event;
        const original = this.state.data.events.find(e => e.id === Number(ev.id));

        if (original) {
            this.state.loadForm({
                id: original.id,
                title: original.title,
                titleEn: original.titleEn || '',
                date: formatDate(ev.startStr),
                endDate: ev.endStr ? exclusiveToInclusive(ev.endStr) : '',
                category: original.category || '',
                description: original.description || '',
                descriptionEn: original.descriptionEn || '',
                location: original.location || '',
                locationEn: original.locationEn || '',
                link: original.link || ''
            });
        }
    }

    handleDateClick(info) {
        this.state.loadForm({
            ...this.state.getEmptyForm(),
            date: info.dateStr
        });
    }

    handleEventDrop(info) {
        const ev = info.event;
        const newDate = formatDate(ev.startStr);
        const newEndDate = ev.endStr ? exclusiveToInclusive(ev.endStr) : null;

        this.state.updateEvent(Number(ev.id), {
            date: newDate,
            endDate: newEndDate
        });
    }

    destroy() {
        if (this.calendar) {
            this.calendar.destroy();
            this.calendar = null;
        }
    }
}
