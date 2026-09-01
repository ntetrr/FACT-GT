// =================================================================
// FESTO GT - CONFIGURACIÓN DE FIREBASE CLOUD FIRESTORE (REAL)
// Proyecto: fact-gt
// =================================================================

const firebaseConfig = {
  apiKey: "AIzaSyCJ0NLDNzHNUJYlQz6BDxew_h-BXB9VW5I",
  authDomain: "fact-gt.firebaseapp.com",
  projectId: "fact-gt",
  storageBucket: "fact-gt.firebasestorage.app",
  messagingSenderId: "466963174802",
  appId: "1:466963174802:web:ddbd16d829923a3f615d4b",
  measurementId: "G-TF3B64P5S9"
};

let dbFs = null;
let isFirebaseConnected = false;

function initFirebase() {
  if (typeof firebase === 'undefined') {
    console.warn("⚠️ SDK de Firebase no cargado.");
    updateFirebaseBadgeStatus(false);
    return;
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    dbFs = firebase.firestore();
    
    // Intentar persistencia offline
    dbFs.enablePersistence().catch(err => {
      if (err.code === 'failed-precondition') {
        console.warn("Persistencia de Firestore en múltiples pestañas.");
      } else if (err.code === 'unimplemented') {
        console.warn("El navegador no soporta persistencia offline.");
      }
    });

    isFirebaseConnected = true;
    updateFirebaseBadgeStatus(true);
    console.log("🔥 FESTO GT: Conectado exitosamente a Firebase Cloud Firestore (fact-gt).");

    // Activar auto-creación de colección usuarios si está vacía
    autoSyncUsersToFirestore();

    // Activar sincronización en tiempo real
    subscribeToFirestoreCollections();

    // Escuchar cambios de estado en Firebase Auth
    firebase.auth().onAuthStateChanged(firebaseUser => {
      if (firebaseUser) {
        const fEmail = (firebaseUser.email || '').toLowerCase();
        let userProfile = (db.usuarios || []).find(u => u && (u.id === firebaseUser.uid || (u.email && u.email.toLowerCase() === fEmail)));
        
        if (!userProfile) {
          const isCoord = fEmail === "ipavelek@gmail.com" || firebaseUser.uid === "YN8KgpP4RrcHC7YrYm30rBHLFxt1";
          userProfile = {
            id: firebaseUser.uid,
            nombre: isCoord ? "Israel Pavelek" : (firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : "Usuario")),
            apellido: isCoord ? "Coordinador General ETRR" : "Usuario ETRR",
            email: firebaseUser.email,
            rol: isCoord ? "coordinador" : "escuela_admin",
            escuela_id: fEmail.includes("eest1") || fEmail.includes("est1") ? "est1" : (fEmail.includes("ees4") || fEmail.includes("est4") ? "est4" : null)
          };
        }
        
        currentUser = userProfile;
        localStorage.setItem("festo_gt_user", JSON.stringify(currentUser));
        if (typeof updateAuthUI === 'function') updateAuthUI();
      }
    });
  } catch (error) {
    console.error("⚠️ Error de conexión a Firebase:", error.message);
    updateFirebaseBadgeStatus(false);
  }
}

function updateFirebaseBadgeStatus(connected) {
  const badge = document.getElementById("firebase-status-badge");
  if (!badge) return;

  if (connected) {
    badge.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
      <span class="text-emerald-400 font-bold">Firebase Conectado Real (fact-gt)</span>
    `;
  } else {
    badge.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-amber-400"></span>
      <span class="text-amber-400">Firebase Mock / LocalStorage</span>
    `;
  }
}

// Subscripciones en tiempo real a las colecciones de Firestore
function subscribeToFirestoreCollections() {
  if (!dbFs || !isFirebaseConnected) return;

  // 1. Escuelas
  dbFs.collection("escuelas").onSnapshot(snapshot => {
    const fsEscuelas = [];
    snapshot.forEach(doc => fsEscuelas.push({ id: doc.id, ...doc.data() }));
    if (fsEscuelas.length > 0) {
      db.escuelas = fsEscuelas;
    } else if (db.escuelas && db.escuelas.length > 0) {
      db.escuelas.forEach(esc => syncToFirestore("escuelas", esc.id, esc));
    }
    if (typeof saveDB === 'function') saveDB();
    if (typeof renderAll === 'function') renderAll();
  }, err => console.warn("Modo fallback/escuelas:", err.message));

  // 2. Cronogramas — Firestore es la fuente de verdad en tiempo real.
  dbFs.collection("cronogramas").onSnapshot(snapshot => {
    const cronogramas = [];
    snapshot.forEach(doc => {
      cronogramas.push({ id: doc.id, ...doc.data() });
    });
    db.cronogramas = typeof applyCustomOverrides === 'function'
      ? applyCustomOverrides(cronogramas)
      : cronogramas;
    
    // Guardar en localStorage para soporte offline
    if (typeof saveDB === 'function') saveDB();

    if (typeof refreshAllCronogramasStructure === 'function') refreshAllCronogramasStructure();
    if (typeof renderAll === 'function') renderAll();
  }, err => console.warn("Modo fallback/cronogramas:", err.message));

  // 3. Estudiantes - Firestore es la fuente de verdad en tiempo real
  dbFs.collection("estudiantes").onSnapshot(snapshot => {
    const fsEstudiantes = [];
    snapshot.forEach(doc => fsEstudiantes.push({ id: doc.id, ...doc.data() }));
    db.estudiantes = fsEstudiantes;
    if (typeof saveDB === 'function') saveDB();
    if (typeof renderAll === 'function') renderAll();
  }, err => console.warn("Modo fallback/estudiantes:", err.message));

  // 4. Calificaciones - Firestore es la fuente de verdad en tiempo real
  dbFs.collection("calificaciones").onSnapshot(snapshot => {
    const fsCalifs = {};
    snapshot.forEach(doc => { fsCalifs[doc.id] = doc.data(); });
    db.calificaciones = fsCalifs;

    if (typeof saveDB === 'function') saveDB();
    if (typeof renderAll === 'function') renderAll();
  }, err => console.warn("Modo fallback/calificaciones:", err.message));

  // 5. Avisos Logísticos
  dbFs.collection("avisos_logisticos").onSnapshot(snapshot => {
    const avisos = [];
    snapshot.forEach(doc => avisos.push({ id: doc.id, ...doc.data() }));
    if (avisos.length > 0) {
      db.avisos_logisticos = avisos;
    } else if (db.avisos_logisticos && db.avisos_logisticos.length > 0) {
      db.avisos_logisticos.forEach(av => syncToFirestore("avisos_logisticos", av.id, av));
    }
    if (typeof renderAvisosLogisticos === 'function') renderAvisosLogisticos();
    if (typeof renderAll === 'function') renderAll();
  }, err => console.warn("Modo fallback/avisos:", err.message));

  // 6. Usuarios y Perfiles (Role Assignment)
  dbFs.collection("usuarios").onSnapshot(snapshot => {
    const usuarios = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data) usuarios.push({ id: doc.id, ...data });
    });
    db.usuarios = usuarios;

    // Actualizar dinámicamente el perfil del usuario autenticado desde Firestore
    const authUser = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
    const activeEmail = authUser ? (authUser.email || '').toLowerCase() : (currentUser ? (currentUser.email || '').toLowerCase() : '');
    const activeUid = authUser ? authUser.uid : (currentUser ? currentUser.id : '');

    if (activeEmail || activeUid) {
      const match = usuarios.find(u => u && (u.id === activeUid || (u.email && u.email.toLowerCase() === activeEmail)));
      if (match) {
        currentUser = match;
        localStorage.setItem("festo_gt_user", JSON.stringify(currentUser));
        if (typeof updateAuthUI === 'function') updateAuthUI();
      }
    }

    if (typeof renderUsersTable === 'function') renderUsersTable();
    if (typeof renderAll === 'function') renderAll();
  }, err => console.warn("Error snapshot usuarios:", err.message));
}

async function autoSyncUsersToFirestore() {
  if (!dbFs || !isFirebaseConnected) return;
  try {
    const snap = await dbFs.collection("usuarios").get();
    if (snap.empty) {
      console.log("🔥 Sembrando usuario Coordinador en Cloud Firestore...");
      const defaultCoord = {
        id: "YN8KgpP4RrcHC7YrYm30rBHLFxt1",
        nombre: "Israel Pavelek",
        apellido: "Coordinador General ETRR",
        email: "ipavelek@gmail.com",
        rol: "coordinador",
        escuela_id: null
      };
      await dbFs.collection("usuarios").doc(defaultCoord.id).set(defaultCoord, { merge: true });
    }
  } catch(e) {
    console.warn("Auto sync usuarios error:", e);
  }
}

// Función auxiliar para subir / sincronizar datos individuales a Firestore
async function syncToFirestore(collectionName, docId, data) {
  if (dbFs && isFirebaseConnected) {
    try {
      const cleanData = JSON.parse(JSON.stringify(data));
      await dbFs.collection(collectionName).doc(String(docId)).set(cleanData, { merge: true });
      console.log(`🔥 Sincronizado a Firestore [${collectionName}/${docId}]`);
    } catch (err) {
      console.error(`Error al guardar en Firestore [${collectionName}/${docId}]:`, err);
    }
  }
}

// Función auxiliar para sincronización por lotes (batch) en Firestore.
// Firestore limita cada batch a 500 escrituras, por eso se divide en trozos.
async function syncBatchToFirestore(collectionName, items) {
  if (!items || items.length === 0) return;
  if (!dbFs || !isFirebaseConnected) return;

  const validItems = items.filter(item => item && item.id);
  const CHUNK_SIZE = 450;

  for (let start = 0; start < validItems.length; start += CHUNK_SIZE) {
    const chunk = validItems.slice(start, start + CHUNK_SIZE);
    try {
      const batch = dbFs.batch();
      chunk.forEach(item => {
        const cleanData = JSON.parse(JSON.stringify(item));
        const docRef = dbFs.collection(collectionName).doc(String(item.id));
        batch.set(docRef, cleanData, { merge: true });
      });
      await batch.commit();
      console.log(`🔥 Sincronizado por lotes a Firestore [${collectionName}]: ${chunk.length} docs`);
    } catch (err) {
      console.warn(`Fallback individual para lote [${collectionName}]:`, err.message);
      for (const item of chunk) {
        await syncToFirestore(collectionName, item.id, item);
      }
    }
  }
}

