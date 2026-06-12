// Date utility functions

export function formatDate(dateStr) {
    if (!dateStr) return '';
    return dateStr.slice(0, 10);
}

// Magyar nyelvű dátum megjelenítés az idővonalhoz
export function formatDateHu(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('hu-HU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export function formatDateShort(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('hu-HU', {
        month: 'short',
        day: 'numeric',
    });
}

// A FullCalendar exkluzív záró dátumot használ.
// A JSON-ban inkluzív záró dátumot tárolunk (az utolsó nap, amikor az esemény tart).
// FC-nek átadáskor +1 nap, visszaolvasáskor -1 nap.
export function inclusiveToExclusive(dateStr) {
    if (!dateStr) return undefined;
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
}

export function exclusiveToInclusive(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
}
