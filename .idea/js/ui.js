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
                this.renderApp();
                break;
            case 'fileName':
                this.updateFileName();
                break;
            case 'semester':
                this.updateSemesterHeader();
                break;
        }
    }

    renderApp() {
        const app = document.getElementById('app');
        app.innerHTML = '';  // clear first so querySelector finds no stale elements
        app.innerHTML = `
      <div id="sidebar-backdrop" class="sidebar-backdrop"></div>
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
        const hasCloud = !!localStorage.getItem('calendar_script_url');
        return `
      <header class="app-header">
        <div class="header-left">
          <button id="mobile-sidebar-btn" class="btn btn-secondary mobile-only" aria-label="Form megnyitása">
            ${Icons.Menu}
          </button>
          <div class="header-logo">${Icons.CalendarDays}</div>
          <h1>Naptár Kezelő</h1>
          <span id="semester-name" class="semester-name">
            ${this.state.data.semester ? `— ${this.escapeHtml(this.state.data.semester.name)}` : ''}
          </span>
        </div>
        <div class="header-center">
          <div class="header-search-wrapper">
            <span class="header-search-icon">${Icons.Search}</span>
            <input id="event-search-input" class="header-search-input"
                   type="search" placeholder="Esemény keresése…" autocomplete="off">
          </div>
        </div>
        <div class="header-right">
          <button id="new-semester-btn" class="btn btn-secondary">
            ${Icons.FilePlus}
            <span>Új félév</span>
          </button>
          ${hasCloud ? `
          <button id="cloud-load-btn" class="btn btn-secondary">
            ${Icons.CloudDownload} <span>Betöltés</span>
          </button>
          <button id="cloud-save-btn" class="btn btn-secondary">
            ${Icons.CloudUpload} <span>Mentés</span>
          </button>
          <button id="cloud-settings-btn" class="btn btn-secondary icon-only" aria-label="Felhő beállítása">
            ${Icons.Settings}
          </button>
          ` : `
          <button id="cloud-settings-btn" class="btn btn-secondary">
            ${Icons.Cloud} <span>Felhő beállítása</span>
          </button>
          `}
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

    renderCloudSettingsModal() {
        const existingUrl = localStorage.getItem('calendar_script_url') || '';
        const hasUrl = !!existingUrl;
        return `
      <div id="cloud-settings-modal" class="wizard-overlay">
        <div class="wizard-box" style="width:460px">
          <div class="wizard-header">
            <h2>Felhő kapcsolat beállítása</h2>
            <button id="cloud-modal-close" class="btn btn-secondary" style="padding:0.25rem 0.5rem">✕</button>
          </div>
          <div class="wizard-body">
            <div class="form-field">
              <label>Apps Script URL</label>
              <div class="cloud-url-field">
                <input type="password" id="cloud-url-input"
                       value="${this.escapeHtml(existingUrl)}"
                       placeholder="https://script.google.com/macros/s/…">
                <button id="cloud-url-toggle" class="btn btn-secondary" type="button" aria-label="Megjelenítés/elrejtés">👁</button>
              </div>
            </div>
            <p class="cloud-help-text">
              Az Apps Script deploymentnél <strong>Who has access: Anyone</strong> (nem "Anyone with Google account") beállítás szükséges, különben a kapcsolat nem működik.
            </p>
          </div>
          <div class="wizard-footer" style="justify-content:space-between">
            <div>
              ${hasUrl ? `<button id="cloud-modal-delete" class="btn btn-danger">Kapcsolat törlése</button>` : ''}
            </div>
            <div style="display:flex;gap:0.5rem">
              <button id="cloud-modal-cancel" class="btn btn-secondary">Mégse</button>
              <button id="cloud-modal-save" class="btn btn-primary">${Icons.Save} Mentés</button>
            </div>
          </div>
        </div>
      </div>
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

      ${this.renderSemesterPanel()}

      ${this.renderCategoryManager()}
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

      <div class="form-field form-field-toggle">
        <input type="checkbox" id="form-hungarianOnly" ${form.hungarianOnly ? 'checked' : ''}>
        <label for="form-hungarianOnly">Csak magyar</label>
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
        <summary>Angol mezők</summary>
        <div class="bilingual-content">
          <div class="form-field">
            <label>Title</label>
            <input type="text" id="form-titleEn" value="${this.escapeHtml(form.titleEn)}" placeholder="English title">
          </div>
          <div class="form-field">
            <label>Description</label>
            <input type="text" id="form-descriptionEn" value="${this.escapeHtml(form.descriptionEn)}" placeholder="English description">
          </div>
          <div class="form-field">
            <label>Location</label>
            <input type="text" id="form-locationEn" value="${this.escapeHtml(form.locationEn)}" placeholder="English location">
          </div>
        </div>
      </details>
    `;
    }

    renderSemesterPanel() {
        const sem = this.state.data.semester || {};
        return `
      <details class="semester-panel">
        <summary>Félév beállításai</summary>
        <div class="bilingual-content">
          <div class="form-field">
            <label>Azonosító (id)</label>
            <input type="text" id="sem-id" value="${this.escapeHtml(sem.id || '')}" placeholder="pl. 2026-tavasz">
          </div>
          <div class="form-field">
            <label>Neve (HU)</label>
            <input type="text" id="sem-name" value="${this.escapeHtml(sem.name || '')}" placeholder="pl. 2026 Tavaszi félév">
          </div>
          <div class="form-field">
            <label>Name</label>
            <input type="text" id="sem-nameEn" value="${this.escapeHtml(sem.nameEn || '')}" placeholder="e.g. 2026 Spring Semester">
          </div>
          <div class="form-field">
            <label>Kezdete</label>
            <input type="date" id="sem-startDate" value="${sem.startDate || ''}">
          </div>
          <div class="form-field">
            <label>Vége</label>
            <input type="date" id="sem-endDate" value="${sem.endDate || ''}">
          </div>
        </div>
      </details>
    `;
    }

    renderCategoryManager() {
        if (this.state.data.categories.length === 0) return '';

        const rows = this.state.data.categories.map(cat => `
      <div class="category-row" data-cat-id="${this.escapeHtml(String(cat.id))}">
        <div class="cat-row-header">
          <span class="cat-color-dot" style="background:${cat.color}"></span>
          <strong>${this.escapeHtml(cat.name)}</strong>
          <button class="btn-del-cat" title="Törlés">✕</button>
        </div>
        <div class="cat-row-fields">
          <div class="form-field">
            <label>Neve (HU)</label>
            <input type="text" class="cat-name" value="${this.escapeHtml(cat.name)}" placeholder="Magyar név">
          </div>
          <div class="form-field">
            <label>Name</label>
            <input type="text" class="cat-nameEn" value="${this.escapeHtml(cat.nameEn || '')}" placeholder="English name">
          </div>
          <div class="form-field">
            <label>Szín</label>
            <input type="color" class="cat-color" value="${cat.color}">
          </div>
          <div class="form-field form-field-toggle">
            <input type="checkbox" class="cat-hu-only" ${cat.hungarianOnly ? 'checked' : ''}>
            <label>Csak magyar</label>
          </div>
          <div class="form-field form-field-toggle">
            <input type="checkbox" class="cat-en-only" ${cat.englishOnly ? 'checked' : ''}>
            <label>Csak angol</label>
          </div>
        </div>
      </div>
    `).join('');

        return `
      <details class="category-panel">
        <summary>Kategóriák kezelése</summary>
        <div id="category-list">
          ${rows}
        </div>
        <button id="add-category-btn" class="btn btn-secondary btn-block" style="margin-top:0.5rem">
          + Új kategória
        </button>
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
        <p class="empty-subtitle">Hozz létre egy új félévet, vagy tölts be egy meglévő JSON fájlt</p>
        <div class="empty-actions">
          <button id="new-semester-btn-empty" class="btn btn-primary">
            ${Icons.FilePlus} Új félév létrehozása
          </button>
          <span class="empty-or">vagy</span>
          <span class="empty-subtitle">Betöltés a fejlécben lévő gombbal</span>
        </div>
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

    renderNewSemesterWizard() {
        return `
      <div id="semester-wizard" class="wizard-overlay">
        <div class="wizard-box">
          <div class="wizard-header">
            <h2>Új félév létrehozása</h2>
            <button id="wizard-close-btn" class="btn btn-secondary" style="padding:0.25rem 0.5rem">✕</button>
          </div>
          <div class="wizard-body">
            <p class="wizard-section-title">Félév adatai</p>
            <div class="form-field">
              <label>Azonosító (id)</label>
              <input type="text" id="wiz-id" placeholder="pl. 2024-25-2">
            </div>
            <div class="form-field">
              <label>Magyar neve</label>
              <input type="text" id="wiz-name" placeholder="pl. 2024/25 tavaszi félév">
            </div>
            <div class="form-field">
              <label>Angol neve (nameEn)</label>
              <input type="text" id="wiz-nameEn" placeholder="e.g. Spring semester 2024/25">
            </div>
            <div class="form-field">
              <label>Kezdő dátum</label>
              <input type="date" id="wiz-startDate">
            </div>
            <div class="form-field">
              <label>Záró dátum</label>
              <input type="date" id="wiz-endDate">
            </div>

            <p class="wizard-section-title">Kategóriák (opcionális)</p>
            <div id="wizard-cat-list"></div>
            <button id="wizard-add-cat-btn" class="btn btn-secondary" style="width:100%;margin-top:0.25rem">
              + Kategória hozzáadása
            </button>
          </div>
          <div class="wizard-footer">
            <button id="wizard-create-btn" class="btn btn-primary" style="flex:1">
              ${Icons.Save} Félév létrehozása
            </button>
            <button id="wizard-cancel-btn" class="btn btn-secondary">Mégse</button>
          </div>
        </div>
      </div>
    `;
    }

    // Partial updates
    updateSemesterHeader() {
        const el = document.getElementById('semester-name');
        if (el && this.state.data.semester) {
            el.textContent = `— ${this.state.data.semester.name || ''}`;
        }
    }

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

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
