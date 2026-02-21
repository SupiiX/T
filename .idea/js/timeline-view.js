// Timeline view rendering

import { Icons } from './icons.js';
import { formatDateHu, formatDateShort } from './utils.js';

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

        container.innerHTML = `
      <div class="timeline">
        <div class="timeline-line"></div>
        ${sortedEvents.map(ev => this.renderEventCard(ev)).join('')}
      </div>
    `;

        // Add click listeners
        sortedEvents.forEach(ev => {
            const card = document.getElementById(`event-${ev.id}`);
            if (card) {
                card.addEventListener('click', () => this.handleEventClick(ev));
            }
        });
    }

    renderEventCard(ev) {
        const categoryMap = this.state.getCategoryMap();
        const cat = categoryMap[ev.category];
        const color = cat?.color || '#6366f1';
        const isActive = this.state.data.form.id === ev.id;

        return `
      <div id="event-${ev.id}" class="timeline-item ${isActive ? 'active' : ''}" data-event-id="${ev.id}" style="--cat-color: ${color}">
        <div class="timeline-dot" style="background-color: ${color}"></div>
        <div class="timeline-card">
          <div class="timeline-card-header">
            <div class="timeline-card-title">
              <h3>${this.escapeHtml(ev.title)}</h3>
              <p class="timeline-card-date">
                ${formatDateHu(ev.date)}
                ${ev.endDate && ev.endDate !== ev.date ? ` — ${formatDateShort(ev.endDate)}` : ''}
              </p>
            </div>
            <span class="timeline-category-badge" style="background-color: ${color}">
              ${this.escapeHtml(cat?.name || ev.category)}
            </span>
          </div>
          ${this.renderEventDetails(ev)}
        </div>
      </div>
    `;
    }

    renderEventDetails(ev) {
        if (!ev.description?.trim() && !ev.location?.trim()) return '';

        return `
      <div class="timeline-card-details">
        ${ev.description?.trim() ? `<p class="timeline-description">${this.escapeHtml(ev.description)}</p>` : ''}
        ${ev.location?.trim() ? `
          <p class="timeline-location">
            ${Icons.MapPin}
            ${this.escapeHtml(ev.location)}
          </p>
        ` : ''}
      </div>
    `;
    }

    handleEventClick(ev) {
        this.state.data.form = {
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
        };
        this.state.notify('form');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
