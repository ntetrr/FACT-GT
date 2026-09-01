// =================================================================
// FESTO GT - ESTADO DE DATOS (CLOUD FIRESTORE 100% EN TIEMPO REAL)
// =================================================================

let db = {
  escuelas: [],
  cronogramas: [],
  estudiantes: [],
  calificaciones: {},
  avisos_logisticos: [],
  usuarios: []
};

function saveDB() {
  try {
    localStorage.setItem('festo_gt_db', JSON.stringify(db));
  } catch(e) {
    console.warn("Error al guardar db en localStorage:", e);
  }
}

function loadDB() {
  try {
    const saved = localStorage.getItem('festo_gt_db');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed) {
        if (Array.isArray(parsed.cronogramas) && parsed.cronogramas.length > 0) {
          db.cronogramas = parsed.cronogramas.filter(c => c && c.id && !c.id.includes('sample'));
        }
        if (Array.isArray(parsed.escuelas) && parsed.escuelas.length > 0) {
          db.escuelas = parsed.escuelas;
        }
        if (Array.isArray(parsed.estudiantes) && parsed.estudiantes.length > 0) {
          db.estudiantes = parsed.estudiantes;
        }
        if (parsed.calificaciones) {
          db.calificaciones = parsed.calificaciones;
        }
        if (Array.isArray(parsed.avisos_logisticos)) {
          db.avisos_logisticos = parsed.avisos_logisticos;
        }
        if (Array.isArray(parsed.usuarios)) {
          db.usuarios = parsed.usuarios;
        }
      }
    }
  } catch(e) {
    console.warn("Error al cargar db desde localStorage:", e);
  }
}