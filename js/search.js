/**
 * SearchManager - Handles event search and filtering functionality
 */
export class SearchManager {
    constructor(state) {
        this.state = state;
        this.searchQuery = '';
    }

    /**
     * Updates the search query and triggers filtering
     * @param {string} query - Search query string
     */
    setSearchQuery(query) {
        this.searchQuery = query.toLowerCase().trim();
        this.state.updateSearch(this.searchQuery);
    }

    /**
     * Clears the search query
     */
    clearSearch() {
        this.searchQuery = '';
        this.state.updateSearch('');
    }

    /**
     * Filters events based on search query
     * @param {Array} events - Array of events to filter
     * @returns {Array} Filtered events
     */
    filterEvents(events) {
        if (!this.searchQuery) {
            return events;
        }

        return events.filter(event => this.matchesSearch(event));
    }

    /**
     * Checks if an event matches the search query
     * @param {Object} event - Event object
     * @returns {boolean} True if event matches
     */
    matchesSearch(event) {
        const query = this.searchQuery;

        // Search in title
        if (event.title && event.title.toLowerCase().includes(query)) {
            return true;
        }

        // Search in description
        if (event.description && event.description.toLowerCase().includes(query)) {
            return true;
        }

        // Search in location
        if (event.location && event.location.toLowerCase().includes(query)) {
            return true;
        }

        // Search in category
        if (event.category && event.category.toLowerCase().includes(query)) {
            return true;
        }

        return false;
    }

    /**
     * Gets the count of filtered events
     * @param {Array} events - All events
     * @returns {number} Number of matching events
     */
    getFilteredCount(events) {
        return this.filterEvents(events).length;
    }

    /**
     * Checks if search is active
     * @returns {boolean} True if search query is not empty
     */
    isSearchActive() {
        return this.searchQuery.length > 0;
    }
}
