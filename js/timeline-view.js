// Timeline view rendering – modern, hónapokra bontott kártyás lista

import { Icons } from './icons.js';
import { formatDateShort } from './utils.js';

const MONTHS_HU = ['jan', 'feb', 'márc', 'ápr', 'máj', 'jún', 'júl', 'aug', 'szept', 'okt', 'nov', 'dec'];

export class TimelineView {
    constructor(state) {
        this.state = state;
    }

    render() {
        const container = document.getElementById('timeline-container');
        if (!container) return;

        const sortedEvents = [...this.state.data.events].sort((a, b) =>
            a.date.localeCompare(b.date)
        );

        const nextId = this.findNextId(sortedEvents);

        // Csoportosítás hónap szerint (a sorrend megmarad)
        const groups = [];
        let currentKey = null;
        sortedEvents.forEach(ev => {
            const key = ev.date.slice(0, 7); // YYYY-MM
            if (key !== currentKey) {
                groups.push({ key, events: [] });
                currentKey = key;
            }
            groups[groups.length - 1].events.push(ev);
        });

        container.innerHTML = `
      <div class="timeline">
        ${groups.map(g => `
          <div class="timeline-month">${this.monthLabel(g.key)}</div>
          ${g.events.map(ev => this.renderEventCard(ev, nextId)).join('')}
        `).join('')}
      </div>
    `;

        sortedEvents.forEach(ev => {
            const card = document.getElementById(`event-${ev.id}`);
            if (card) card.addEventListener('click', () => this.handleEventClick(ev));
        });
    }

    findNextId(sortedEvents) {
        const today = new Date().toISOString().slice(0, 10);
        for (const ev of sortedEvents) {
            const end = ev.endDate || ev.date;
            if (end >= today) return ev.id;
        }
        return null;
    }

    monthLabel(key) {
        const [y, m] = key.split('-');
        return `${y}. ${this.fullMonth(parseInt(m, 10) - 1)}`;
    }

    fullMonth(i) {
        return ['január', 'február', 'március', 'április', 'május', 'június',
            'július', 'augusztus', 'szeptember', 'október', 'november', 'december'][i] || '';
    }

    renderEventCard(ev, nextId) {
        const categoryMap = this.state.getCategoryMap();
        const cat = categoryMap[ev.category];
        const color = cat?.color || 'var(--color-primary)';
        const isActive = this.state.data.form.id === ev.id;
        const isNext = ev.id === nextId;

        const day = ev.date.slice(8, 10);
        const mon = MONTHS_HU[parseInt(ev.date.slice(5, 7), 10) - 1] || '';

        const multiDay = ev.endDate && ev.endDate !== ev.date;
        const metaParts = [];
        if (multiDay) {
            metaParts.push(`<span>${formatDateShort(ev.date)} – ${formatDateShort(ev.endDate)}</span>`);
        }
        if (ev.location?.trim()) {
            metaParts.push(`<span class="tl-loc">${Icons.MapPin}${this.escapeHtml(ev.location)}</span>`);
        }
        const meta = metaParts.length ? `<div class="tl-meta">${metaParts.join('<span class="tl-dot">·</span>')}</div>` : '';
        const desc = ev.description?.trim()
            ? `<div class="tl-desc">${this.escapeHtml(ev.description)}</div>` : '';

        return `
      <div id="event-${ev.id}" class="timeline-item ${isActive ? 'active' : ''}"
           data-event-id="${ev.id}" style="--cat: ${color}">
        <span class="tl-accent"></span>
        <div class="tl-date">
          <span class="tl-day">${day}</span>
          <span class="tl-mon">${mon}</span>
        </div>
        <div class="tl-body">
          <div class="tl-title">
            <span class="tl-title-text">${this.escapeHtml(ev.title)}</span>
          </div>
          ${meta}
          ${desc}
        </div>
        <span class="tl-chip">${this.escapeHtml(cat?.name || ev.category)}</span>
      </div>
    `;
    }

    handleEventClick(ev) {
        this.state.updateForm({
            id: ev.id,
            title: ev.title,
            titleEn: ev.titleEn || '',
            date: ev.date,
            endDate: ev.endDate || '',
            category: ev.category || '',
            description: ev.description || '',
            descriptionEn: ev.descriptionEn || '',
            location: ev.location || '',
            locationEn: ev.locationEn || '',
            link: ev.link || '',
            hungarianOnly: ev.hungarianOnly || false
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
