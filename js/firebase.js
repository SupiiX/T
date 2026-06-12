// ============================================================
//  Firebase Realtime Database + Auth réteg
// ------------------------------------------------------------
//  Ez váltja le a régi Apps Script "felhő" réteget.
//  Lényeg: minden esemény KÜLÖN ágon van (events/<id>), így
//  több területi szerkesztő egyszerre dolgozhat anélkül, hogy
//  felülírnák egymást. Új esemény id-ja atomi számlálóból jön.
//
//  Adatfa:
//   semesters/
//     <sheet>/
//       meta/        { id, name, nameEn, startDate, endDate, status }
//       categories/  { <catId>: { name, nameEn, color, ... } }
//       events/      { <eventId>: { title, date, category, ... } }
//       _counter:    <utolsó kiosztott esemény-id>
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getDatabase, ref, onValue, get, set, remove, runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

import { firebaseConfig, EDITOR_EMAIL } from "./firebase-config.js";

export class FirebaseSync {
    constructor() {
        this.app = initializeApp(firebaseConfig);
        this.auth = getAuth(this.app);
        this.db = getDatabase(this.app);
        this._semesterUnsub = null;
    }

    // ── Hitelesítés (közös csapat-fiók, jelszavas) ─────────
    //  Az e-mail be van drótozva (EDITOR_EMAIL), a felhasználó
    //  csak a közös jelszót adja meg. A háttérben valódi Firebase
    //  Email/Password bejelentkezés fut, így a DB-szabály (auth != null)
    //  ténylegesen véd.
    onAuthChanged(cb) { return onAuthStateChanged(this.auth, cb); }
    signIn(password) { return signInWithEmailAndPassword(this.auth, EDITOR_EMAIL, password); }
    signOutUser() { return signOut(this.auth); }
    get user() { return this.auth.currentUser; }

    // ── Félév lista (a semesters node metáiból) ────────────
    async listSemesters() {
        const snap = await get(ref(this.db, 'semesters'));
        const val = snap.val() || {};
        return Object.keys(val).map(sheet => {
            const meta = val[sheet].meta || {};
            return {
                sheet,
                name:      meta.name      || sheet,
                nameEn:    meta.nameEn    || '',
                status:    meta.status    || 'draft',
                startDate: meta.startDate || '',
                endDate:   meta.endDate   || '',
                statusOverride: meta.statusOverride || undefined
            };
        });
    }

    // ── Egy félév ÉLŐ figyelése ────────────────────────────
    //  cb({ semester, categories, events }) hívódik minden
    //  változáskor (a sajátodéra ÉS másokéra is – élő szinkron).
    listenSemester(sheet, cb) {
        this.stopListening();
        const node = ref(this.db, `semesters/${sheet}`);
        this._semesterUnsub = onValue(node, snap => {
            cb(this.treeToPayload(snap.val()));
        });
    }

    stopListening() {
        if (this._semesterUnsub) { this._semesterUnsub(); this._semesterUnsub = null; }
    }

    // Egyszeri betöltés (nem figyel tovább)
    async loadSemester(sheet) {
        const snap = await get(ref(this.db, `semesters/${sheet}`));
        return this.treeToPayload(snap.val());
    }

    // ── Fa → a weblapnak/appnak ismerős {semester, categories[], events[]} ──
    treeToPayload(tree) {
        if (!tree) return { semester: null, categories: [], events: [] };
        const semester = tree.meta || null;
        const categories = Object.entries(tree.categories || {})
            .map(([id, v]) => ({ id, ...v }));
        const events = Object.entries(tree.events || {})
            .map(([id, v]) => ({ id: Number(id), ...v }))
            .sort((a, b) => a.id - b.id);
        return { semester, categories, events };
    }

    // ── Esemény írása (új vagy módosítás) ──────────────────
    //  Új eseményhez (id == null) atomi id-t oszt a _counter-ből.
    //  Visszaadja a végleges id-t.
    async saveEvent(sheet, event) {
        let id = event.id;
        if (id === null || id === undefined || id === '') {
            id = await this.nextId(sheet);
        }
        const data = this._clean(event);
        delete data.id;
        await set(ref(this.db, `semesters/${sheet}/events/${id}`), data);
        return id;
    }

    async nextId(sheet) {
        const counterRef = ref(this.db, `semesters/${sheet}/_counter`);
        const res = await runTransaction(counterRef, cur => (cur || 0) + 1);
        return res.snapshot.val();
    }

    deleteEvent(sheet, id) {
        return remove(ref(this.db, `semesters/${sheet}/events/${id}`));
    }

    // ── Kategória írása / törlése ──────────────────────────
    saveCategory(sheet, cat) {
        const id = cat.id;
        const data = this._clean(cat);
        delete data.id;
        return set(ref(this.db, `semesters/${sheet}/categories/${id}`), data);
    }

    deleteCategory(sheet, id) {
        return remove(ref(this.db, `semesters/${sheet}/categories/${id}`));
    }

    // ── Félév metaadat írása ───────────────────────────────
    saveMeta(sheet, meta) {
        return set(ref(this.db, `semesters/${sheet}/meta`), this._clean(meta));
    }

    // Kézi státusz-felülbírálás – CSAK a statusOverride mezőt érinti (a meta többi
    // része érintetlen marad). override: 'archived' | 'active' | null (törlés).
    setSemesterOverride(sheet, override) {
        const r = ref(this.db, `semesters/${sheet}/meta/statusOverride`);
        return override ? set(r, override) : remove(r);
    }

    // ── Új félév létrehozása ───────────────────────────────
    async createSemester(sheet, meta, categories = []) {
        const catObj = {};
        categories.forEach(c => {
            const { id, ...rest } = c;
            catObj[id] = this._clean(rest);
        });
        await set(ref(this.db, `semesters/${sheet}`), {
            meta: this._clean(meta),
            categories: catObj,
            events: {},
            _counter: 0
        });
    }

    deleteSemester(sheet) {
        return remove(ref(this.db, `semesters/${sheet}`));
    }

    // RTDB nem tárol null / undefined értéket → kiszedjük.
    // Az üres stringeket MEGTARTJUK, hogy a kimenet a mostanival
    // egyezzen (a régi JSON is tartalmaz "" mezőket).
    _clean(obj) {
        const out = {};
        Object.entries(obj || {}).forEach(([k, v]) => {
            if (v === undefined || v === null) return;
            out[k] = v;
        });
        return out;
    }
}
