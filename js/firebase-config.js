// Firebase webes konfiguráció (a Firebase konzolból: "Add app → Web").
// Ezek NYILVÁNOS azonosítók – nem titkos kulcsok. A biztonságot a
// Realtime Database security rules adja, nem ezek elrejtése.
//
// FONTOS: az apiKey és az appId értékét képről olvastam ki – kérlek
// vesd össze a Firebase konzolban lévővel, és ha eltér, javítsd itt.

export const firebaseConfig = {
    apiKey: "AIzaSyBbHZqehGWZJa08q91iYdKKV8Gr4sp9P0M",
    authDomain: "timeline-d447b.firebaseapp.com",
    databaseURL: "https://timeline-d447b-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "timeline-d447b",
    storageBucket: "timeline-d447b.firebasestorage.app",
    messagingSenderId: "739352917838",
    appId: "1:739352917838:web:7caa16dfc9ce184baf101f",
    measurementId: "G-GBB1VLW6X1"
};

// A közös szerkesztő-fiók e-mailje. EZ legyen pontosan ugyanaz, mint amit
// a Firebase konzolban létrehozol (Authentication → Users → Add user).
// A felhasználók csak a JELSZÓT írják be – ezt az e-mailt nem látják.
// Bármilyen érvényes formátumú cím jó, nem kell valódi postafiók.
export const EDITOR_EMAIL = "szerkeszto@hoknaptar.local";
