// Timeline view rendering

import { Icons } from './icons.js';
import { formatDateHu, formatDateShort } from './utils.js';
import { SearchManager } from './search.js';

export class TimelineView {
    constructor(state) {
        this.state = state;
        this.searchManager = new SearchManager(state);
    }

    render() {
        const container = document.getElementById('timeline-container');
        if (!container) return;

        // Update searchManager query from state
        this.searchManager.searchQuery = this.state.data.searchQuery.toLowerCase().trim();

        // Filter events based on search query
        const filteredEvents = this.searchManager.filterEvents(this.state.data.events);

        const sortedEvents = [...filteredEvents].sort((a, b) =>
            a.date.localeCompare(b.date)
        );

        // Show empty state if no results
        if (sortedEvents.length === 0 && this.searchManager.isSearchActive()) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

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
      <div id="event-${ev.id}" class="timeline-item ${isActive ? 'active' : ''}" data-event-id="${ev.id}">
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
            link: ev.link || ''
        };
        this.state.notify('form');
    }

    renderEmptyState() {
        return `
      <div class="search-empty-state">
        <div class="search-empty-state-icon">🔍</div>
        <h3 class="search-empty-state-title">Nincs találat</h3>
        <p class="search-empty-state-message">
          Nem található esemény a keresett kifejezésre:
          <strong>"${this.escapeHtml(this.searchManager.searchQuery)}"</strong>
        </p>
        <button id="clear-search-btn" class="search-empty-state-action">
          Keresés törlése
        </button>
      </div>
    `;
    }

    escapeHtml(text) {
        if (!text && text !== 0) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
