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
                // Empty state → első esemény hozzáadásakor váltson naptár nézetre
                if (data.events.length === 0 || document.querySelector('.empty-state')) {
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
                // file-name elem nincs a headerben, toast kezeli
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
          <button id="upload-btn" class="btn btn-ghost icon-only" aria-label="JSON fájl betöltése" title="JSON fájl betöltése">
            ${Icons.Upload}
          </button>
          <button id="download-btn" class="btn btn-ghost icon-only" aria-label="JSON letöltése" title="JSON letöltése" ${!hasEvents ? 'disabled' : ''}>
            ${Icons.Download}
          </button>
          <button id="semester-manager-btn" class="btn btn-ghost icon-only" aria-label="Félévek kezelése" title="Félévek kezelése">
            ${Icons.CalendarDays}
          </button>
          <div class="header-divider"></div>
          ${hasCloud ? `
            <button id="cloud-settings-btn" class="btn btn-ghost icon-only" aria-label="Felhő beállítása" title="Felhő beállítása">
              ${Icons.Settings}
            </button>
            <button id="cloud-load-btn" class="btn btn-ghost icon-only" aria-label="Betöltés felhőből" title="Betöltés felhőből">
              ${Icons.CloudDownload}
            </button>
            <button id="cloud-save-btn" class="btn btn-primary icon-only" aria-label="Mentés felhőbe" title="Mentés felhőbe">
              ${Icons.CloudUpload}
            </button>
          ` : `
            <button id="cloud-settings-btn" class="btn btn-ghost icon-only" aria-label="Felhő csatlakoztatása" title="Felhő csatlakoztatása">
              ${Icons.Cloud}
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
        <div class="wizard-box wizard-box--narrow">
          <div class="wizard-header">
            <h2>Felhő kapcsolat beállítása</h2>
            <button id="cloud-modal-close" class="btn btn-ghost icon-only" aria-label="Bezárás">${Icons.X}</button>
          </div>
          <div class="wizard-body">
            <div class="form-field">
              <label>Apps Script URL</label>
              <div class="cloud-url-field">
                <input type="password" id="cloud-url-input"
                       value="${this.escapeHtml(existingUrl)}"
                       placeholder="https://script.google.com/macros/s/…">
                <button id="cloud-url-toggle" class="btn btn-ghost icon-only" type="button" aria-label="Megjelenítés/elrejtés">${Icons.Eye}</button>
              </div>
            </div>
          </div>
          <div class="wizard-footer wizard-footer--split">
            <div>
              ${hasUrl ? `<button id="cloud-modal-delete" class="btn btn-danger">Kapcsolat törlése</button>` : ''}
            </div>
            <div class="wizard-footer-actions">
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
        const isIdle = !isEditing && !form.title && !form.date;

        if (isIdle && this.state.data.events.length > 0) {
            return this.renderSidebarIdle();
        }

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

    renderSidebarIdle() {
        const sem = this.state.data.semester;
        const events = this.state.data.events;
        const today = new Date().toISOString().slice(0, 10);
        const upcoming = events
            .filter(e => e.date >= today)
            .sort((a, b) => a.date.localeCompare(b.date))[0];

        const formatDate = (d) => {
            if (!d) return '–';
            const [, m, day] = d.split('-');
            const months = ['jan.', 'febr.', 'márc.', 'ápr.', 'máj.', 'jún.', 'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.'];
            return `${months[parseInt(m) - 1]} ${parseInt(day)}.`;
        };

        return `
      <div class="sidebar-idle">
        ${sem ? `
          <div class="sidebar-idle-sem">
            <span class="idle-sem-label">Aktív félév</span>
            <span class="idle-sem-name">${this.escapeHtml(sem.name || '')}</span>
            ${sem.startDate && sem.endDate ? `<span class="idle-sem-dates">${sem.startDate} – ${sem.endDate}</span>` : ''}
          </div>
          <div class="sidebar-idle-stats">
            <div class="idle-stat">
              <span class="idle-stat-num">${events.length}</span>
              <span class="idle-stat-label">esemény</span>
            </div>
            <div class="idle-stat">
              <span class="idle-stat-num">${this.state.data.categories.length}</span>
              <span class="idle-stat-label">kategória</span>
            </div>
          </div>
          ${upcoming ? `
            <div class="sidebar-idle-next">
              <span class="idle-next-label">Következő esemény</span>
              <span class="idle-next-title">${this.escapeHtml(upcoming.title)}</span>
              <span class="idle-next-date">${formatDate(upcoming.date)}</span>
            </div>
          ` : ''}
        ` : ''}
        <p class="sidebar-idle-hint">Kattints egy eseményre a szerkesztéshez, vagy a naptárra új esemény létrehozásához.</p>
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
            <input type="text" id="form-date" data-datepicker value="${form.date}" placeholder="éééé-hh-nn" autocomplete="off">
          </div>
          <div class="form-field">
            <label>Vége</label>
            <input type="text" id="form-endDate" data-datepicker value="${form.endDate}" placeholder="éééé-hh-nn" autocomplete="off">
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
            <input type="text" id="sem-startDate" data-datepicker value="${sem.startDate || ''}" placeholder="éééé-hh-nn" autocomplete="off">
          </div>
          <div class="form-field">
            <label>Vége</label>
            <input type="text" id="sem-endDate" data-datepicker value="${sem.endDate || ''}" placeholder="éééé-hh-nn" autocomplete="off">
          </div>
        </div>
        <div class="form-field">
          <label>Státusz</label>
          <div class="sem-status-auto">
            <span class="status-badge status-${status}">${this.statusLabel(status)}</span>
            <span class="sem-status-auto-hint">automatikusan számított</span>
          </div>
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
          <button class="btn-del-cat" title="Törlés" aria-label="Kategória törlése">${Icons.X}</button>
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
        <button id="add-category-btn" class="btn btn-secondary btn-block">
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
        const MAX_SEMESTERS = 3;
        const atLimit = list.length >= MAX_SEMESTERS;

        const statusOrder = { active: 0, draft: 1, archived: 2 };
        const sorted = [...list].sort((a, b) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3));

        const statusOptions = ['draft', 'active', 'archived'].map(v =>
            `<option value="${v}">${this.statusLabel(v)}</option>`
        ).join('');

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
                      ? `<button class="btn btn-ghost btn-sm sem-load-btn" data-sheet="${s.sheet}">Betölt</button>`
                      : `<span class="sem-row-active-label">Aktív szerkesztés</span>`
                  }
                  ${s.status !== 'active'
                      ? `<button class="btn btn-danger-ghost btn-sm sem-delete-btn" data-sheet="${s.sheet}" data-name="${this.escapeHtml(s.name)}" title="Félév törlése" aria-label="Félév törlése">${Icons.Trash2}</button>`
                      : ''
                  }
                </div>
              </div>`).join('');

        return `
      <div id="semester-manager-modal" class="wizard-overlay">
        <div class="wizard-box wizard-box--wide">
          <div class="wizard-header">
            <h2>Félévek kezelése</h2>
            <span class="sem-slot-counter ${atLimit ? 'sem-slot-full' : ''}">${list.length} / ${MAX_SEMESTERS}</span>
            <button id="sem-manager-close" class="btn btn-ghost icon-only" aria-label="Bezárás">${Icons.X}</button>
          </div>
          <div class="wizard-body wizard-body--flush">
            <div class="sem-manager-list">${rows}</div>
            ${atLimit ? `<p class="sem-limit-hint">Maximum ${MAX_SEMESTERS} félév tárolható (múlt · jelen · jövő). Törölj egy archivált félévet, hogy újat hozhass létre.</p>` : ''}
          </div>
          <div class="wizard-footer wizard-footer--split">
            <div class="wizard-footer-info">
              ${hasCloud ? `${list.length} félév a felhőben` : 'Felhő nincs csatlakoztatva'}
            </div>
            <div class="wizard-footer-actions">
              <button id="sem-manager-close2" class="btn btn-ghost">Bezár</button>
              <button id="sem-manager-new-btn" class="btn btn-primary" ${atLimit ? 'disabled title="Maximum 3 félév tárolható"' : ''}>
                ${Icons.FilePlus} Új félév
              </button>
            </div>
          </div>
        </div>
      </div>`;
    }

    renderSemesterDeleteConfirm(semName) {
        return `
      <div id="sem-delete-modal" class="wizard-overlay">
        <div class="wizard-box wizard-box--narrow">
          <div class="wizard-header">
            <h2>Félév törlése</h2>
          </div>
          <div class="wizard-body">
            <p class="sem-delete-warning">Ez a művelet <strong>nem visszavonható</strong>. A felhőből is törlődik a félév minden adata.</p>
            <p class="sem-delete-prompt">Megerősítéshez írd be a félév nevét:</p>
            <p class="sem-delete-name">${this.escapeHtml(semName)}</p>
            <div class="form-field">
              <input type="text" id="sem-delete-confirm-input" placeholder="Félév neve" autocomplete="off">
            </div>
          </div>
          <div class="wizard-footer wizard-footer--end">
            <button id="sem-delete-cancel" class="btn btn-ghost">Mégse</button>
            <button id="sem-delete-confirm-btn" class="btn btn-danger" disabled>${Icons.Trash2} Törlés</button>
          </div>
        </div>
      </div>`;
    }

    renderNewSemesterWizard() {
        // Magyar tanév: szeptembertől kezdődik (hónap index 8)
        const now = new Date();
        const minYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
        const shortEnd = String(minYear + 1).slice(-2);
        const defaultName = `${minYear}/${shortEnd}/1`;

        return `
      <div id="semester-wizard" class="wizard-overlay">
        <div class="wizard-box">
          <div class="wizard-header">
            <h2>Új félév létrehozása</h2>
            <button id="wizard-close-btn" class="btn btn-ghost icon-only" aria-label="Bezárás">${Icons.X}</button>
          </div>
          <div class="wizard-body">
            <p class="wizard-section-title">Félév kiválasztása</p>
            <div class="wiz-sem-picker" data-min-year="${minYear}" data-year="${minYear}" data-sem="1">
              <div class="wiz-year-row">
                <button class="btn btn-ghost icon-only wiz-year-dec" disabled aria-label="Előző tanév">−</button>
                <span class="wiz-year-label">${minYear}/${shortEnd}</span>
                <button class="btn btn-ghost icon-only wiz-year-inc" aria-label="Következő tanév">+</button>
              </div>
              <div class="wiz-sem-toggle">
                <button class="wiz-sem-btn active" data-sem="1">1. félév</button>
                <button class="wiz-sem-btn" data-sem="2">2. félév</button>
              </div>
              <div class="wiz-name-preview">
                Azonosító: <code class="wiz-name-code">${defaultName}</code>
              </div>
            </div>
            <div class="form-field wiz-date-section">
              <label>Kezdő dátum</label>
              <input type="text" id="wiz-startDate" data-datepicker placeholder="éééé-hh-nn" autocomplete="off">
            </div>
            <div class="form-field">
              <label>Záró dátum</label>
              <input type="text" id="wiz-endDate" data-datepicker placeholder="éééé-hh-nn" autocomplete="off">
            </div>

            <div class="wizard-cat-header">
              <p class="wizard-section-title" style="margin:0">Kategóriák</p>
              ${this.state.data.categories.length > 0
                  ? `<span class="wizard-cat-note">Átvéve az előző félévből – szerkeszthető</span>`
                  : ''}
            </div>
            <div id="wizard-cat-list">
              ${this.state.data.categories.map(cat => `
                <div class="wizard-cat-row">
                  <input type="color" class="wiz-cat-color" value="${cat.color || '#1099b3'}">
                  <input type="text" class="wiz-cat-name" placeholder="Magyar név" value="${this.escapeHtml(cat.name || '')}">
                  <input type="text" class="wiz-cat-nameEn" placeholder="English name" value="${this.escapeHtml(cat.nameEn || '')}">
                  <button class="btn btn-secondary btn-del-cat" style="flex-shrink:0">✕</button>
                </div>`).join('')}
            </div>
            <button id="wizard-add-cat-btn" class="btn btn-secondary">
              + Kategória hozzáadása
            </button>
          </div>
          <div class="wizard-footer">
            <button id="wizard-create-btn" class="btn btn-primary">
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
        const sem = this.state.data.semester;
        if (!sem) return;
        // Név frissítése a switcher gombban
        const nameEl = document.querySelector('.sem-switcher-name');
        if (nameEl) nameEl.textContent = sem.name || '';
        // Státusz badge frissítése
        const badge = document.querySelector('.semester-switcher .status-badge');
        if (badge) {
            badge.className = `status-badge status-${sem.status || 'draft'}`;
            badge.textContent = this.statusLabel(sem.status || 'draft');
        }
    }

    updateEventCounter() {
        const counter = document.querySelector('.event-counter');
        if (counter) {
            counter.outerHTML = this.renderEventCounter();
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
