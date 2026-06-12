/**
 * Félév időszak konfiguráció.
 * Ha a félév hossza változik, CSAK ezt a fájlt kell módosítani.
 *
 * yearOffset: 0 = a tanév első éve (pl. 2025), 1 = a tanév második éve (pl. 2026)
 *
 * Őszi félév  (1): szeptember 1. → január 31. (következő év)
 * Tavaszi félév (2): február 1.  → június 15. (következő év)
 */
export const SEMESTER_RANGES = {
    1: {
        start: { month: 9,  day: 1,  yearOffset: 0 },
        end:   { month: 1,  day: 31, yearOffset: 1 }
    },
    2: {
        start: { month: 2,  day: 1,  yearOffset: 1 },
        end:   { month: 6,  day: 15, yearOffset: 1 }
    }
};

/**
 * A wizard dátummezőihez generál alapértelmezett start/end dátumot.
 * @param {number} year    - A tanév első éve (pl. 2025 a 2025/26-os tanévhez)
 * @param {number} semNum  - Félév száma (1 vagy 2)
 * @returns {{ startDate: string, endDate: string }}  YYYY-MM-DD formátum
 */
export function getDefaultDates(year, semNum) {
    const range = SEMESTER_RANGES[semNum];
    if (!range) return { startDate: '', endDate: '' };

    const pad = n => String(n).padStart(2, '0');
    const startYear = year + (range.start.yearOffset || 0);
    const endYear   = year + (range.end.yearOffset   || 0);

    return {
        startDate: `${startYear}-${pad(range.start.month)}-${pad(range.start.day)}`,
        endDate:   `${endYear}-${pad(range.end.month)}-${pad(range.end.day)}`
    };
}

/**
 * Kiszámítja egy félév státuszát a tárolt dátumok és a mai nap alapján.
 * - Ha mindkét dátum ismert: dátum alapján dönt (draft / active / archived)
 * - Ha csak az egyik dátum ismert: részleges döntés
 * - Ha egyik sem ismert: visszaesik a tárolt státuszra, végső fallback: 'draft'
 *
 * @param {{ startDate?: string, endDate?: string, status?: string }} sem
 * @returns {'draft' | 'active' | 'archived'}
 */
export function computeSemesterStatus(sem) {
    if (!sem) return 'draft';

    // KÉZI vezérlés: a státusz TÁROLT érték, nem a dátumokból számolódik
    // (a dátumok csak információ). A felülbírálás mező elsőbbséget élvez,
    // különben a tárolt status, alapértelmezésben 'draft' (tervezett).
    if (sem.statusOverride === 'archived' || sem.statusOverride === 'active' || sem.statusOverride === 'draft') {
        return sem.statusOverride;
    }
    return sem.status || 'draft';
}
