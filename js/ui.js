// UI rendering and DOM manipulation

import { Icons } from './icons.js';

export class UIManager {
    constructor(state) {
        this.state = state;
        this.state.subscribe(this.handleStateChange.bind(this));
    }

    handleStateChange(key, data) {
        switch(key) {
            case 'events':
                this.updateEventCounter();
                this.updateDownloadButton();
                if (data.events.length === 0) {
                    this.renderMainPanel();
                }
                break;
            case 'form':
                this.renderSidebar();
                break;
            case 'data-loaded':
                // Update only necessary parts, don't re-render entire app
                this.updateHeader();
                this.updateMainPanel();
                this.renderSidebar();
                break;
            case 'fileName':
                this.updateFileName();
                break;
        }
    }

    renderApp() {
        const app = document.getElementById('app');
        app.innerHTML = `
      <div class="app-container">
        ${this.renderHeader()}
        <div class="app-layout">
          ${this.renderSidebar()}
          ${this.renderMainPanel()}
        </div>
      </div>
    `;
    }

    renderHeader() {
        return `
      <header class="app-header">
        <div class="header-left">
          <div class="header-logo">${Icons.CalendarDays}</div>
          <h1>Egyetemi Naptár Kezelő</h1>
          <span id="semester-name" class="semester-name">
            ${this.state.data.semester ? `— ${this.escapeHtml(this.state.data.semester.name)}` : ''}
          </span>
        </div>
        <div class="header-right">
          <button id="upload-btn" class="btn btn-primary">
            ${Icons.Upload}
            <span>JSON Betöltés</span>
          </button>
          <button id="download-btn" class="btn btn-success" ${this.state.data.events.length === 0 ? 'disabled' : ''}>
            ${Icons.Download}
            <span>JSON Letöltés</span>
          </button>
          <span id="file-name" class="file-name">
            ${this.state.data.fileName ? `Betöltve: ${this.escapeHtml(this.state.data.fileName)}` : ''}
          </span>
        </div>
      </header>
    `;
    }

    renderSidebar() {
        const isEditing = this.state.data.form.id !== null;
        const sidebar = document.querySelector('.sidebar');

        const content = `
      <h2>${isEditing ? 'Esemény szerkesztése' : 'Új esemény hozzáadása'}</h2>

      ${this.renderFormFields()}

      <div class="form-actions">
        <button id="save-btn" class="btn btn-primary btn-block">
          ${Icons.Save}
          <span>${isEditing ? 'Frissítés' : 'Mentés'}</span>
        </button>
        ${isEditing ? `
          <button id="delete-btn" class="btn btn-danger btn-block">
            ${Icons.Trash2}
            <span>Törlés</span>
          </button>
        ` : ''}
        <button id="clear-btn" class="btn btn-secondary btn-block">
          ${Icons.FilePlus}
          <span>Mégse / Új</span>
        </button>
      </div>

      ${this.renderEventCounter()}
    `;

        if (sidebar) {
            sidebar.innerHTML = content;
        } else {
            return `<aside class="sidebar">${content}</aside>`;
        }
    }

    renderFormFields() {
        const form = this.state.data.form;

        return `
      <div class="form-field">
        <label>Cím</label>
        <input type="text" id="form-title" value="${this.escapeHtml(form.title)}" placeholder="Esemény neve">
      </div>

      ${this.renderCategoryButtons()}

      <div class="form-field">
        <label>Kezdés</label>
        <input type="date" id="form-date" value="${form.date}">
      </div>

      <div class="form-field">
        <label>Vége (opcionális)</label>
        <input type="date" id="form-endDate" value="${form.endDate}">
      </div>

      <div class="form-field">
        <label>Leírás</label>
        <input type="text" id="form-description" value="${this.escapeHtml(form.description)}" placeholder="Esemény leírása">
      </div>

      <div class="form-field">
        <label>Helyszín</label>
        <input type="text" id="form-location" value="${this.escapeHtml(form.location)}" placeholder="Esemény helyszíne">
      </div>

      <div class="form-field">
        <label>Link</label>
        <input type="url" id="form-link" value="${this.escapeHtml(form.link)}" placeholder="https://...">
      </div>

      ${this.renderBilingualFields()}
    `;
    }

    renderCategoryButtons() {
        if (this.state.data.categories.length === 0) return '';

        const form = this.state.data.form;

        return `
      <div class="form-field">
        <label>Kategória</label>
        <div class="category-buttons">
          ${this.state.data.categories.map(cat => {
            const isSelected = form.category === cat.id;
            return `
              <button type="button"
                      class="category-btn ${isSelected ? 'selected' : ''}"
                      data-category="${cat.id}"
                      style="
                        background-color: ${isSelected ? cat.color : `${cat.color}20`};
                        color: ${isSelected ? '#fff' : cat.color};
                        border: 2px solid ${cat.color};
                      ">
                ${this.escapeHtml(cat.name)}
              </button>
            `;
        }).join('')}
        </div>
      </div>
    `;
    }

    renderBilingualFields() {
        const form = this.state.data.form;

        return `
      <details class="bilingual-fields">
        <summary>Angol mezők (English)</summary>
        <div class="bilingual-content">
          <div class="form-field">
            <label>Title (EN)</label>
            <input type="text" id="form-titleEn" value="${this.escapeHtml(form.titleEn)}" placeholder="English title">
          </div>
          <div class="form-field">
            <label>Description (EN)</label>
            <input type="text" id="form-descriptionEn" value="${this.escapeHtml(form.descriptionEn)}" placeholder="English description">
          </div>
          <div class="form-field">
            <label>Location (EN)</label>
            <input type="text" id="form-locationEn" value="${this.escapeHtml(form.locationEn)}" placeholder="English location">
          </div>
        </div>
      </details>
    `;
    }

    renderEventCounter() {
        if (this.state.data.events.length === 0) return '';

        return `
      <div class="event-counter">
        ${this.state.data.events.length} esemény betöltve${this.state.data.categories.length > 0 ? `, ${this.state.data.categories.length} kategória` : ''}
      </div>
    `;
    }

    renderMainPanel() {
        const mainPanel = document.querySelector('.main-panel');
        const content = this.state.data.events.length === 0 ? this.renderEmptyState() : this.renderContent();

        if (mainPanel) {
            mainPanel.innerHTML = content;
        } else {
            return `<main class="main-panel">${content}</main>`;
        }
    }

    renderEmptyState() {
        return `
      <div class="empty-state">
        <div class="empty-icon">${Icons.CalendarDays}</div>
        <p class="empty-title">Nincs betöltött esemény</p>
        <p class="empty-subtitle">Tölts be egy JSON fájlt a kezdéshez</p>
      </div>
    `;
    }

    renderContent() {
        return `
      <div class="view-switcher">
        <button id="view-calendar" class="view-btn ${this.state.data.currentView === 'calendar' ? 'active' : ''}">
          ${Icons.Calendar}
          <span>Naptár</span>
        </button>
        <button id="view-timeline" class="view-btn ${this.state.data.currentView === 'timeline' ? 'active' : ''}">
          ${Icons.List}
          <span>Idővonal</span>
        </button>
      </div>

      <div id="view-container" class="view-container">
        ${this.state.data.currentView === 'calendar' ?
            '<div id="calendar-container"></div>' :
            '<div id="timeline-container"></div>'
        }
      </div>
    `;
    }

    // Partial updates
    updateEventCounter() {
        const counter = document.querySelector('.event-counter');
        if (counter) {
            counter.outerHTML = this.renderEventCounter();
        }
    }

    updateFileName() {
        const fileNameEl = document.getElementById('file-name');
        if (fileNameEl) {
            fileNameEl.textContent = this.state.data.fileName ? `Betöltve: ${this.escapeHtml(this.state.data.fileName)}` : '';
        }
    }

    updateDownloadButton() {
        const btn = document.getElementById('download-btn');
        if (btn) {
            btn.disabled = this.state.data.events.length === 0;
        }
    }

    updateHeader() {
        const semesterName = document.getElementById('semester-name');
        if (semesterName) {
            semesterName.textContent = this.state.data.semester ? `— ${this.state.data.semester.name}` : '';
        }
        this.updateFileName();
        this.updateDownloadButton();
    }

    updateMainPanel() {
        const mainPanel = document.querySelector('.main-panel');
        if (mainPanel) {
            const hasEvents = this.state.data.events.length > 0;
            if (hasEvents) {
                mainPanel.innerHTML = this.renderContent();
            } else {
                mainPanel.innerHTML = this.renderEmptyState();
            }
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
