// Date utility functions

// Dátum -> "YYYY-MM-DD" a LOKÁLIS naptári nap szerint.
// FONTOS: nem toISOString()-et használunk, mert az UTC-re vált,
// és UTC+1/+2-ben (Magyarország) éjfélnél egy nappal visszacsúszna a dátum.
export function toLocalDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// Mai nap "YYYY-MM-DD" formában, lokális időzóna szerint
export function todayStr() {
    return toLocalDateStr(new Date());
}

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
    return toLocalDateStr(d);
}

export function exclusiveToInclusive(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    return toLocalDateStr(d);
}
