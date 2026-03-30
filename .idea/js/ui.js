// UI rendering and DOM manipulation

import { Icons } from './icons.js';

export class UIManager {
    constructor(state) {
        this.state = state;
        this.activeTab = 'event';
        this.state.subscribe(this.handleStateChange.bind(this));
    }

    setActiveTab(tab) {
        this.activeTab = tab;
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
                if (data.form.id !== null) {
                    this.activeTab = 'event';
                }
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
        app.innerHTML = '';
        const isArchived = this.state.data.semester?.status === 'archived';
        app.innerHTML = `
      <div id="sidebar-backdrop" class="sidebar-backdrop"></div>
      <div class="app-container">
        ${this.renderHeader()}
        ${isArchived ? `
          <div class="archived-banner">
            ${Icons.Archive ?? '🗄'} Archivált félév – csak megtekintés, szerkesztés korlátozott
          </div>` : ''}
        <div class="app-layout">
          ${this.renderSidebar()}
          ${this.renderMainPanel()}
        </div>
      </div>
    `;
    }

    statusLabel(status) {
        return { active: 'Aktív', draft: 'Tervezett', archived: 'Archivált' }[status] || status;
    }

    renderSemesterSwitcher() {
        const sem = this.state.data.semester;
        const list = this.state.data.semesterList;

        if (!sem) return `<h1>Naptár Kezelő</h1>`;

        const status = sem.status || 'draft';
        const badgeHtml = `<span class="status-badge status-${status}">${this.statusLabel(status)}</span>`;

        if (list.length > 0) {
            return `
              <div class="semester-switcher">
                <button class="semester-switcher-btn" id="semester-switcher-btn" aria-label="Félév váltása">
                  <span class="sem-switcher-name">${this.escapeHtml(sem.name)}</span>
                  ${badgeHtml}
                  ${Icons.ChevronDown}
                </button>
              </div>`;
        }

        return `
          <div class="semester-switcher">
            <span class="sem-switcher-name">${this.escapeHtml(sem.name)}</span>
            ${sem.status ? badgeHtml : ''}
          </div>`;
    }

    renderHeader() {
        const hasCloud = !!localStorage.getItem('calendar_script_url');
        const hasEvents = this.state.data.events.length > 0;
        return `
      <header class="app-header">
        <div class="header-left">
          <button id="mobile-sidebar-btn" class="btn btn-ghost icon-only mobile-only" aria-label="Form megnyitása">
            ${Icons.Menu}
          </button>
          <div class="header-logo">${Icons.CalendarDays}</div>
          ${this.renderSemesterSwitcher()}
        </div>
        <div class="header-center">
          <div class="header-search-wrapper">
            <span class="header-search-icon">${Icons.Search}</span>
            <input id="event-search-input" class="header-search-input"
                   type="search" placeholder="Esemény keresése…" autocomplete="off">
          </div>
        </div>
        <div class="header-right">
          <div class="header-btn-group">
            <button id="semester-manager-btn" class="btn btn-ghost" aria-label="Félévek kezelése">
              ${Icons.CalendarDays}
              <span>Félévek</span>
            </button>
          </div>
          <div class="header-divider"></div>
          <div class="header-btn-group">
            <button id="upload-btn" class="btn btn-ghost icon-only" aria-label="JSON fájl betöltése" title="JSON fájl betöltése">
              ${Icons.Upload}
            </button>
            <button id="download-btn" class="btn btn-ghost icon-only" aria-label="JSON letöltése" title="JSON letöltése" ${!hasEvents ? 'disabled' : ''}>
              ${Icons.Download}
            </button>
          </div>
          <div class="header-divider"></div>
          ${hasCloud ? `
          <div class="header-btn-group">
            <button id="cloud-settings-btn" class="btn btn-ghost icon-only" aria-label="Felhő beállítása" title="Felhő beállítása">
              ${Icons.Settings}
            </button>
            <button id="cloud-load-btn" class="btn btn-ghost" aria-label="Betöltés felhőből">
              ${Icons.CloudDownload} <span>Betöltés</span>
            </button>
            <button id="cloud-save-btn" class="btn btn-primary" aria-label="Mentés felhőbe">
              ${Icons.CloudUpload} <span>Mentés</span>
            </button>
          </div>
          ` : `
          <button id="cloud-settings-btn" class="btn btn-ghost" aria-label="Felhő csatlakoztatása">
            ${Icons.Cloud} <span>Felhő csatlakoztatása</span>
          </button>
          `}
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
        const sidebar = document.querySelector('.sidebar');
        const catCount = this.state.data.categories.length;

        const content = `
      <nav class="sidebar-tabs">
        <button class="sidebar-tab ${this.activeTab === 'event' ? 'active' : ''}" data-tab="event">
          Esemény
        </button>
        <button class="sidebar-tab ${this.activeTab === 'settings' ? 'active' : ''}" data-tab="settings">
          Adatok${catCount > 0 ? `<span class="tab-count">${catCount}</span>` : ''}
        </button>
      </nav>
      ${this.activeTab === 'event' ? this.renderEventTab() : this.renderSettingsTab()}
    `;

        if (sidebar) {
            sidebar.innerHTML = content;
        } else {
            return `<aside class="sidebar">${content}</aside>`;
        }
    }

    renderEventTab() {
        const isEditing = this.state.data.form.id !== null;
        const form = this.state.data.form;

        return `
      <div class="tab-context ${isEditing ? 'context-edit' : 'context-new'}">
        <span class="sidebar-badge ${isEditing ? 'badge-edit' : 'badge-new'}">
          ${isEditing ? 'Szerkesztés' : 'Új esemény'}
        </span>
        ${isEditing ? `<span class="context-title">${this.escapeHtml(form.title || 'Névtelen esemény')}</span>` : ''}
      </div>

      <div class="sidebar-body">
        ${this.renderFormFields()}

        <div class="form-actions">
          <button id="save-btn" class="btn btn-primary btn-block">
            ${Icons.Save}
            <span>${isEditing ? 'Frissítés' : 'Mentés'}</span>
          </button>
          <div class="form-actions-row">
            ${isEditing ? `
              <button id="delete-btn" class="btn btn-danger-ghost">
                ${Icons.Trash2} <span>Törlés</span>
              </button>
            ` : ''}
            <button id="clear-btn" class="btn btn-ghost ${isEditing ? '' : 'btn-block'}">
              ${Icons.FilePlus} <span>Mégse / Új</span>
            </button>
          </div>
        </div>
      </div>
    `;
    }

    renderSettingsTab() {
        return `
      <div class="sidebar-body settings-body">
        ${this.renderSemesterSection()}
        ${this.renderCategoryCards()}
        ${this.renderEventCounter()}
      </div>
    `;
    }

    renderFormFields() {
        const form = this.state.data.form;

        return `
      <div class="event-form">
        <div class="form-field">
          <label>Cím</label>
          <input type="text" id="form-title" value="${this.escapeHtml(form.title)}" placeholder="Esemény neve">
        </div>

        ${this.renderCategoryButtons()}

        <div class="form-divider"></div>

        <div class="form-row">
          <div class="form-field">
            <label>Kezdés</label>
            <input type="date" id="form-date" value="${form.date}">
          </div>
          <div class="form-field">
            <label>Vége</label>
            <input type="date" id="form-endDate" value="${form.endDate}">
          </div>
        </div>

        <div class="form-divider"></div>

        <div class="form-field">
          <label>Leírás</label>
          <input type="text" id="form-description" value="${this.escapeHtml(form.description)}" placeholder="Rövid leírás">
        </div>
        <div class="form-field">
          <label>Helyszín</label>
          <input type="text" id="form-location" value="${this.escapeHtml(form.location)}" placeholder="Terem, épület…">
        </div>
        <div class="form-field">
          <label>Link</label>
          <input type="url" id="form-link" value="${this.escapeHtml(form.link)}" placeholder="https://…">
        </div>

        <div class="toggle-field">
          <label class="toggle-switch">
            <input type="checkbox" id="form-hungarianOnly" ${form.hungarianOnly ? 'checked' : ''}>
            <span class="toggle-track"></span>
          </label>
          <span class="toggle-label-text">Csak magyar oldal</span>
        </div>
      </div>

      ${this.renderBilingualFields()}
    `;
    }

    renderCategoryButtons() {
        if (this.state.data.categories.length === 0) return `
      <p class="no-categories-hint">Kategóriák az <strong>Adatok</strong> fülön adhatók hozzá.</p>
    `;

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
      <details class="accordion">
        <summary class="accordion-summary">
          <span>Angol mezők</span>
          <span class="accordion-chevron">${Icons.ChevronDown}</span>
        </summary>
        <div class="accordion-body">
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

    renderSemesterSection() {
        const sem = this.state.data.semester || {};
        const status = sem.status || 'draft';
        return `
      <div class="settings-section">
        <p class="section-label">Félév</p>
        <div class="form-field">
          <label>Azonosító</label>
          <input type="text" id="sem-id" value="${this.escapeHtml(sem.id || '')}" placeholder="pl. 2026-tavasz">
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>Neve (HU)</label>
            <input type="text" id="sem-name" value="${this.escapeHtml(sem.name || '')}" placeholder="pl. 2026 Tavasz">
          </div>
          <div class="form-field">
            <label>Name (EN)</label>
            <input type="text" id="sem-nameEn" value="${this.escapeHtml(sem.nameEn || '')}" placeholder="e.g. Spring 2026">
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>Kezdete</label>
            <input type="date" id="sem-startDate" value="${sem.startDate || ''}">
          </div>
          <div class="form-field">
            <label>Vége</label>
            <input type="date" id="sem-endDate" value="${sem.endDate || ''}">
          </div>
        </div>
        <div class="form-field">
          <label>Státusz</label>
          <select id="sem-status" class="sem-status-select">
            <option value="draft" ${status === 'draft' ? 'selected' : ''}>Tervezett</option>
            <option value="active" ${status === 'active' ? 'selected' : ''}>Aktív</option>
            <option value="archived" ${status === 'archived' ? 'selected' : ''}>Archivált</option>
          </select>
        </div>
      </div>
    `;
    }

    renderCategoryCards() {
        const cats = this.state.data.categories;

        const cards = cats.map(cat => `
      <div class="cat-card" data-cat-id="${this.escapeHtml(String(cat.id))}">
        <div class="cat-card-top">
          <input type="color" class="cat-color cat-color-swatch" value="${cat.color}" title="Szín">
          <span class="cat-card-name">${this.escapeHtml(cat.name)}</span>
          <button class="btn-del-cat" title="Törlés">✕</button>
        </div>
        <div class="cat-card-fields">
          <div class="form-row">
            <div class="form-field">
              <label>HU</label>
              <input type="text" class="cat-name" value="${this.escapeHtml(cat.name)}" placeholder="Magyar név">
            </div>
            <div class="form-field">
              <label>EN</label>
              <input type="text" class="cat-nameEn" value="${this.escapeHtml(cat.nameEn || '')}" placeholder="English name">
            </div>
          </div>
          <div class="cat-card-flags">
            <label class="flag-toggle">
              <input type="checkbox" class="cat-hu-only" ${cat.hungarianOnly ? 'checked' : ''}>
              <span>Csak HU</span>
            </label>
            <label class="flag-toggle">
              <input type="checkbox" class="cat-en-only" ${cat.englishOnly ? 'checked' : ''}>
              <span>Csak EN</span>
            </label>
          </div>
        </div>
      </div>
    `).join('');

        return `
      <div class="settings-section">
        <p class="section-label">Kategóriák</p>
        ${cats.length === 0 ? `
          <p class="settings-empty">Még nincs kategória. Adj hozzá egyet!</p>
        ` : `
          <div id="category-list">${cards}</div>
        `}
        <button id="add-category-btn" class="btn btn-secondary btn-block" style="margin-top:0.5rem">
          + Új kategória
        </button>
      </div>
    `;
    }

    renderEventCounter() {
        const evCount = this.state.data.events.length;
        const catCount = this.state.data.categories.length;
        if (evCount === 0 && catCount === 0) return '';

        return `
      <div class="event-counter">
        <span>${evCount} esemény</span>
        ${catCount > 0 ? `<span class="counter-dot">·</span><span>${catCount} kategória</span>` : ''}
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

    renderSemesterManagerModal() {
        const list = this.state.data.semesterList;
        const current = this.state.data.activeSemesterSheet;
        const hasCloud = !!localStorage.getItem('calendar_script_url');

        const statusOrder = { active: 0, draft: 1, archived: 2 };
        const sorted = [...list].sort((a, b) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3));

        const rows = sorted.length === 0
            ? `<p class="sem-manager-empty">Még nincs nyilvántartott félév.<br>Hozz létre egyet az alábbi gombbal, vagy töltsd be a felhőből.</p>`
            : sorted.map(s => `
              <div class="sem-manager-row ${s.sheet === current ? 'sem-row-current' : ''}">
                <div class="sem-row-info">
                  <span class="sem-row-name">${this.escapeHtml(s.name)}</span>
                  ${s.startDate ? `<span class="sem-row-dates">${s.startDate}${s.endDate ? ' – ' + s.endDate : ''}</span>` : ''}
                </div>
                <div class="sem-row-actions">
                  <span class="status-badge status-${s.status}">${this.statusLabel(s.status)}</span>
                  ${s.sheet !== current
                      ? `<button class="btn btn-ghost sem-load-btn" data-sheet="${s.sheet}" style="font-size:0.78rem;padding:0.25rem 0.6rem">Betölt</button>`
                      : `<span class="sem-row-active-label">Aktív szerkesztés</span>`
                  }
                </div>
              </div>`).join('');

        return `
      <div id="semester-manager-modal" class="wizard-overlay">
        <div class="wizard-box" style="width:520px">
          <div class="wizard-header">
            <h2>Félévek kezelése</h2>
            <button id="sem-manager-close" class="btn btn-ghost icon-only" style="padding:0.3rem">✕</button>
          </div>
          <div class="wizard-body" style="padding:0">
            <div class="sem-manager-list">${rows}</div>
          </div>
          <div class="wizard-footer" style="justify-content:space-between">
            <div style="font-size:0.75rem;color:var(--color-gray-400)">
              ${hasCloud ? `${list.length} félév a felhőben` : 'Felhő nincs csatlakoztatva'}
            </div>
            <div style="display:flex;gap:0.5rem">
              <button id="sem-manager-close2" class="btn btn-ghost">Bezár</button>
              <button id="sem-manager-new-btn" class="btn btn-primary">
                ${Icons.FilePlus} Új félév
              </button>
            </div>
          </div>
        </div>
      </div>`;
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
