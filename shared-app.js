/* ============================================================
   GGT PLANNING - JAVASCRIPT PARTAGÉ
   Configuration Firebase + Utilitaires réutilisables
   ============================================================ */

// Configuration Firebase (identique sur tous les fichiers)
export const firebaseConfig = {
  apiKey: "AIzaSyBfyEpytc8VEJ1sdJeCY2Imx5WAu-YazYI",
  authDomain: "ggt-plan-entrainement.firebaseapp.com",
  projectId: "ggt-plan-entrainement",
  storageBucket: "ggt-plan-entrainement.firebasestorage.app",
  messagingSenderId: "663631056543",
  appId: "1:663631056543:web:d8cb50121fcf8d1c635caa"
};

// ============================================================
// UTILITAIRES DE GESTION DES DATES - CORRECTIONS UTC
// ============================================================

/**
 * Retourne la date d'aujourd'hui à minuit en UTC
 * CORRECTION: Évite les problèmes timezone locale vs serveur
 */
export function getTodayUTC() {
  const now = new Date();
  const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return utcDate;
}

/**
 * Formate une date Firestore Timestamp en français
 * Ex: "24 avril 2026"
 */
export function formatDate(firestoreTimestamp) {
  if (!firestoreTimestamp) return '—';
  
  const d = firestoreTimestamp.toDate ? firestoreTimestamp.toDate() : new Date(firestoreTimestamp);
  
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Formate une date ET heure Firestore Timestamp
 * Ex: "24 avr à 18:30"
 */
export function formatDateTime(firestoreTimestamp) {
  if (!firestoreTimestamp) return '—';
  
  const d = firestoreTimestamp.toDate ? firestoreTimestamp.toDate() : new Date(firestoreTimestamp);
  
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  }) + ' à ' + d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Retourne le numéro de la semaine ISO
 * Ex: "S17"
 */
export function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return 'S' + String(weekNum).padStart(2, '0');
}

/**
 * Retourne le lundi de la semaine pour un offset donné
 * offset = 0 → cette semaine
 * offset = -1 → semaine dernière
 * offset = 1 → semaine prochaine
 */
export function getMondayOfWeek(offset = 0) {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1 + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Retourne la clé de semaine au format ISO
 * Ex: "2026-04-21"
 */
export function getWeekKey(mondayDate) {
  return mondayDate.toISOString().split('T')[0];
}

// ============================================================
// UTILITAIRES DE SÉCURITÉ - PRÉVENTION XSS
// ============================================================

/**
 * Échappe le texte pour éviter les injections HTML/XSS
 * SÉCURITÉ: Utiliser cette fonction pour tout texte dynamique
 * Ex: escapeHtml('<script>') → '&lt;script&gt;'
 */
export function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Crée un élément DOM en toute sécurité avec texte
 * SÉCURITÉ: Utiliser au lieu de innerHTML pour du contenu utilisateur
 */
export function createSafeElement(tag, className, textContent) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (textContent) el.textContent = textContent; // textContent = sûr, pas d'interprétation HTML
  return el;
}

/**
 * Remplit une cellule de tableau en toute sécurité
 * SÉCURITÉ: Pas de innerHTML, donc pas de XSS
 */
export function createTableCell(content, className = '') {
  const td = document.createElement('td');
  if (className) td.className = className;
  td.textContent = content;
  return td;
}

// ============================================================
// UTILITAIRES DE NOTIFICATIONS
// ============================================================

/**
 * Affiche une notification (toast) pendant 3 secondes
 * type: 'success' | 'error' | 'warn'
 */
export function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) {
    console.warn('Élément #toast non trouvé');
    return;
  }
  
  toast.textContent = message;
  toast.className = 'toast show';
  if (type === 'error') toast.classList.add('error');
  if (type === 'warn') toast.classList.add('warn');
  
  setTimeout(() => {
    toast.className = 'toast';
    if (type === 'error') toast.classList.add('error');
  }, 3000);
}

/**
 * Affiche un message d'erreur dans un conteneur
 */
export function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.classList.add('show');
  }
}

/**
 * Masque un message d'erreur
 */
export function hideError(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.classList.remove('show');
  }
}

// ============================================================
// UTILITAIRES FIREBASE AUTH
// ============================================================

/**
 * Récupère le nom d'un utilisateur (prénom + nom)
 * Fallback sur email si pas de prénom/nom
 */
export function getUserDisplayName(userData, userEmail) {
  if (!userData) return userEmail;
  const prenom = userData.prenom || '';
  const nom = userData.nom || '';
  const name = [prenom, nom].filter(Boolean).join(' ');
  return name || userEmail;
}

// ============================================================
// UTILITAIRES DE LOGGING CONNEXIONS
// ============================================================

/**
 * Enregistre une connexion utilisateur dans Firestore
 * IMPORTANT: Déduplication intégrée (une seule connexion par heure par page)
 */
export async function logUserConnection(db, uid, userName, pageName) {
  try {
    const { collection, getDocs, query, where, addDoc, serverTimestamp, Timestamp } = await import(
      'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'
    );
    
    // Vérifier s'il existe une connexion dans la dernière heure
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    const cutoff = Timestamp.fromDate(oneHourAgo);
    
    const q = query(
      collection(db, 'connexions'),
      where('uid', '==', uid),
      where('page', '==', pageName),
      where('ts', '>=', cutoff)
    );
    
    const existing = await getDocs(q);
    
    // Si aucune connexion récente, enregistrer
    if (existing.empty) {
      await addDoc(collection(db, 'connexions'), {
        uid: uid,
        nom: userName,
        page: pageName,
        ts: serverTimestamp()
      });
    }
  } catch (error) {
    console.warn('Erreur lors de l\'enregistrement de la connexion:', error);
    // Silencieux - ne pas bloquer l'app si la connexion échoue
  }
}

// ============================================================
// CONSTANTES RÉUTILISABLES
// ============================================================

export const JOURS_SEMAINE = [
  'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'
];

export const TYPES_SEANCES = {
  repos: { badge: 'badge-repos', emoji: '😴', label: 'Repos' },
  cotes: { badge: 'badge-cotes', emoji: '🏔️', label: 'Côtes' },
  seuil: { badge: 'badge-seuil', emoji: '⚡', label: 'Seuil' },
  sortie: { badge: 'badge-sortie', emoji: '🌲', label: 'Sortie' },
  footing: { badge: 'badge-footing', emoji: '🏃', label: 'Footing' },
  course: { badge: 'badge-course', emoji: '🏅', label: 'Course' },
  rm: { badge: 'badge-rm', emoji: '💪', label: 'Renforcement' },
  autre: { badge: 'badge-autre', emoji: '📋', label: 'Autre' }
};

/**
 * Retourne le type de séance par défaut
 */
export function getTypeSeance(type = 'repos') {
  return TYPES_SEANCES[type] || TYPES_SEANCES.autre;
}
