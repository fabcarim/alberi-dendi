// ============================================================
// CONFIGURAZIONE FIREBASE
// ============================================================
// Per far funzionare login e salvataggio progressi:
//
// 1. Vai su https://console.firebase.google.com/
// 2. Crea un nuovo progetto (es. "alberi-daily")
// 3. Nella console Firebase vai su "Authentication" > "Sign-in method"
//    e abilita "Email/Password"
// 4. Vai su "Firestore Database" > "Create database" (modalita' test per iniziare)
// 5. Vai su impostazioni progetto (icona ingranaggio) > "Le tue app" > "Web" (icona </>)
// 6. Copia i valori della configurazione qui sotto
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyAyZ7tu2DOCRMbkow-v9vNkMVDsh9oL6ko",
    authDomain: "alberi-daily.firebaseapp.com",
    projectId: "alberi-daily",
    storageBucket: "alberi-daily.firebasestorage.app",
    messagingSenderId: "594278291229",
    appId: "1:594278291229:web:dfac0f401a2af308cab3f4"
};

// Inizializza Firebase
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;

function initFirebase() {
    try {
        if (firebaseConfig.apiKey === "LA-TUA-API-KEY") {
            console.warn("Firebase non configurato. Il gioco funzionera' solo in modalita' locale (localStorage).");
            window.firebaseReady = false;
            return;
        }
        firebaseApp = firebase.initializeApp(firebaseConfig);
        firebaseAuth = firebase.auth();
        firebaseDb = firebase.firestore();
        window.firebaseReady = true;
        console.log("Firebase inizializzato correttamente.");
    } catch (e) {
        console.error("Errore inizializzazione Firebase:", e);
        window.firebaseReady = false;
    }
}

initFirebase();
