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
// MODE TEST - repère visuel du site de test
// true  = site de TEST : bandeau orange + "[TEST]" dans le titre de l'onglet
// false = site OFFICIEL : rien n'est affiché
// (seule ligne à changer, avec firebaseConfig, pour passer sur l'officiel)
// ============================================================
export const MODE_TEST = false;

if (MODE_TEST && typeof document !== "undefined") {
  const afficherBandeauTest = function () {
    if (document.getElementById("ggt-mode-test")) return;
    if (!document.title.startsWith("[TEST]")) document.title = "[TEST] " + document.title;

    const barre = document.createElement("div");
    barre.id = "ggt-mode-test";
    barre.style.cssText = "position:fixed;top:0;left:0;right:0;height:4px;background:#fc4c02;z-index:99999;pointer-events:none";

    const pastille = document.createElement("div");
    pastille.textContent = "🧪 SITE DE TEST";
    pastille.style.cssText = "position:fixed;left:10px;bottom:10px;background:#fc4c02;color:#fff;font:700 11px/1 Outfit,sans-serif;letter-spacing:.06em;padding:6px 10px;border-radius:999px;z-index:99999;pointer-events:none;opacity:.92";

    barre.appendChild(pastille);
    document.body.appendChild(barre);
  };
  if (document.body) afficherBandeauTest();
  else document.addEventListener("DOMContentLoaded", afficherBandeauTest);
}

// ============================================================
// SESSION LIMITÉE À 1 H, MOT DE PASSE PROVISOIRE, PROFIL OBLIGATOIRE
// Tout est centralisé ici : les pages n'ont presque rien à gérer.
// ============================================================
export const SESSION_MINUTES = 60;        // durée maximale d'une connexion
export const AVERTISSEMENT_MINUTES = 5;   // le compte à rebours passe en orange à ce moment-là
export const MDP_PROVISOIRE = "genepi";   // comparé sans tenir compte des majuscules

const CLE_DEBUT = "ggt_session_debut";
const CLE_PROVISOIRE = "ggt_mdp_provisoire";
const CLE_EXPIREE = "ggt_session_expiree";
const CLE_SYNC = "ggt_profil_public_sync";
const URL_FIREBASE = "https://www.gstatic.com/firebasejs/10.12.0/";
const PAGES_LIBRES = ["index.html", "mon-profil.html", "guide.html"];
const PAGE = (typeof location !== "undefined" ? location.pathname.split("/").pop() : "") || "index.html";

export function motDePasseEstProvisoire(mdp) {
  return String(mdp == null ? "" : mdp).trim().toLowerCase() === MDP_PROVISOIRE;
}

/**
 * À appeler juste après une connexion réussie (index.html).
 * Démarre le compte à rebours et note si le mot de passe saisi est le provisoire.
 * Retourne true si c'est le mot de passe provisoire.
 */
export function marquerConnexion(motDePasseSaisi) {
  const provisoire = motDePasseEstProvisoire(motDePasseSaisi);
  try {
    sessionStorage.setItem(CLE_DEBUT, String(Date.now()));
    sessionStorage.removeItem(CLE_EXPIREE);
    sessionStorage.removeItem(CLE_SYNC);
    if (provisoire) sessionStorage.setItem(CLE_PROVISOIRE, "1");
    else sessionStorage.removeItem(CLE_PROVISOIRE);
  } catch (e) { /* stockage indisponible */ }
  return provisoire;
}

export function mdpProvisoireEnAttente() {
  try { return sessionStorage.getItem(CLE_PROVISOIRE) === "1"; } catch (e) { return false; }
}

export function mdpProvisoireResolu() {
  try { sessionStorage.removeItem(CLE_PROVISOIRE); } catch (e) { /* rien */ }
}

/** true (une seule fois) si la session vient d'expirer ; sert à afficher un message sur index.html */
export function sessionExpireeSignalee() {
  try {
    const v = sessionStorage.getItem(CLE_EXPIREE) === "1";
    sessionStorage.removeItem(CLE_EXPIREE);
    return v;
  } catch (e) { return false; }
}

/**
 * Liste des informations de profil manquantes ou invalides (tableau vide = profil complet)
 */
export function profilManquants(d) {
  d = d || {};
  const txt = function (v) { return String(v == null ? "" : v).trim(); };
  const manque = [];
  if (!txt(d.prenom)) manque.push("Prénom");
  if (!txt(d.nom)) manque.push("Nom");
  const dob = txt(d.dob);
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const dobOk = /^\d{4}-\d{2}-\d{2}$/.test(dob) && !isNaN(Date.parse(dob)) && dob >= "1900-01-01" && dob <= aujourdhui;
  if (!dobOk) manque.push("Date de naissance");
  if (txt(d.tel).replace(/\D/g, "").length < 10) manque.push("Téléphone (10 chiffres minimum)");
  if (txt(d.adresse).length < 5) manque.push("Adresse");
  return manque;
}

/**
 * Règles du nouveau mot de passe. Retourne un message d'erreur, ou "" si le mot de passe est valide.
 */
export function erreurNouveauMotDePasse(mdp) {
  mdp = String(mdp == null ? "" : mdp);
  if (motDePasseEstProvisoire(mdp)) return "Ce mot de passe est le mot de passe provisoire : choisis-en un autre.";
  if (mdp.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
  if (!/[A-Z]/.test(mdp)) return "Le mot de passe doit contenir au moins une majuscule.";
  if (!/[0-9]/.test(mdp)) return "Le mot de passe doit contenir au moins un chiffre.";
  return "";
}

/**
 * Analyse un lien Google Drive / Docs / Sheets / Slides / YouTube collé par l'administrateur.
 * Retourne { type, embed } où embed est l'adresse d'intégration (liste blanche stricte),
 * ou null si le lien n'est pas pris en charge. Rien d'autre que ces adresses ne peut être affiché.
 * type : "video" | "fichier" | "document" | "tableur" | "diaporama" | "dossier"
 */
export function analyserLienRessource(lien) {
  let u;
  try { u = new URL(String(lien == null ? "" : lien).trim()); } catch (e) { return null; }
  if (u.protocol !== "https:") return null;
  const hote = u.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
  const chemin = u.pathname;
  const idGoogle = function (id) { return typeof id === "string" && /^[A-Za-z0-9_-]{10,200}$/.test(id); };
  let m;

  if (hote === "drive.google.com") {
    m = chemin.match(/\/file\/d\/([^/]+)/);
    if (m && idGoogle(m[1])) return { type: "fichier", embed: "https://drive.google.com/file/d/" + m[1] + "/preview" };
    m = chemin.match(/\/folders\/([^/?]+)/);
    if (m && idGoogle(m[1])) return { type: "dossier", embed: "https://drive.google.com/embeddedfolderview?id=" + m[1] + "#grid" };
    const id = u.searchParams.get("id");
    if ((chemin === "/open" || chemin === "/uc") && idGoogle(id)) {
      return { type: "fichier", embed: "https://drive.google.com/file/d/" + id + "/preview" };
    }
    return null;
  }

  if (hote === "docs.google.com") {
    m = chemin.match(/^\/(document|spreadsheets|presentation)\/d\/([^/]+)/);
    if (m && idGoogle(m[2])) {
      const types = { document: "document", spreadsheets: "tableur", presentation: "diaporama" };
      return { type: types[m[1]], embed: "https://docs.google.com/" + m[1] + "/d/" + m[2] + "/preview" };
    }
    return null;
  }

  let v = null;
  if (hote === "youtu.be") {
    v = chemin.split("/")[1];
  } else if (hote === "youtube.com" || hote === "youtube-nocookie.com") {
    if (chemin === "/watch") {
      v = u.searchParams.get("v");
    } else {
      m = chemin.match(/^\/(shorts|embed|live|v)\/([^/?]+)/);
      if (m && m[2] !== "videoseries") v = m[2];
    }
    const liste = u.searchParams.get("list");
    if (!v && liste && /^[A-Za-z0-9_-]{10,100}$/.test(liste) && (chemin === "/playlist" || chemin === "/embed/videoseries")) {
      return { type: "video", embed: "https://www.youtube-nocookie.com/embed/videoseries?list=" + liste };
    }
  }
  if (typeof v === "string" && /^[A-Za-z0-9_-]{11}$/.test(v)) {
    return { type: "video", embed: "https://www.youtube-nocookie.com/embed/" + v };
  }
  return null;
}

/** Tri des ressources : sans catégorie d'abord, puis par catégorie, par ordre, par titre. */
export function comparerRessources(a, b) {
  const ca = String(a.categorie || "").trim().toLowerCase();
  const cb = String(b.categorie || "").trim().toLowerCase();
  if (ca !== cb) {
    if (!ca) return -1;
    if (!cb) return 1;
    return ca.localeCompare(cb, "fr");
  }
  const oa = typeof a.ordre === "number" ? a.ordre : 9999;
  const ob = typeof b.ordre === "number" ? b.ordre : 9999;
  if (oa !== ob) return oa - ob;
  return String(a.titre || "").localeCompare(String(b.titre || ""), "fr");
}

/**
 * Mini-fiche publique : seulement prénom, nom, jour et mois de naissance.
 * Elle sert aux anniversaires et au suivi du groupe, sans exposer téléphone, adresse ni année de naissance.
 * Retourne null s'il n'y a ni prénom ni nom.
 */
export function profilPublic(d) {
  d = d || {};
  const prenom = String(d.prenom == null ? "" : d.prenom).trim();
  const nom = String(d.nom == null ? "" : d.nom).trim();
  if (!prenom && !nom) return null;
  const pub = { prenom: prenom, nom: nom };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d.dob == null ? "" : d.dob).trim());
  if (m) {
    const mois = parseInt(m[2], 10);
    const jour = parseInt(m[3], 10);
    if (mois >= 1 && mois <= 12 && jour >= 1 && jour <= 31) {
      pub.jour = jour;
      pub.mois = mois;
    }
  }
  return pub;
}

function memesProfilsPublics(a, b) {
  if (!a || !b) return false;
  return ["prenom", "nom", "jour", "mois"].every(function (k) { return a[k] === b[k]; });
}

/**
 * Une fois par connexion :
 *  - chaque adhérent met à jour sa propre mini-fiche ;
 *  - l'administrateur remet à niveau celles de tout le monde (création, mise à jour, suppression des orphelines).
 */
async function synchroniserProfilsPublics(mFs, app, user) {
  const db = mFs.getFirestore(app);
  const snap = await mFs.getDoc(mFs.doc(db, "users", user.uid));
  if (!snap.exists()) return;
  const d = snap.data();

  const pub = profilPublic(d);
  if (pub) await mFs.setDoc(mFs.doc(db, "profils_publics", user.uid), pub);
  if (d.role !== "admin") return;

  const lectures = await Promise.all([
    mFs.getDocs(mFs.collection(db, "users")),
    mFs.getDocs(mFs.collection(db, "profils_publics"))
  ]);
  const existants = {};
  lectures[1].forEach(function (x) { existants[x.id] = x.data(); });

  const operations = [];
  lectures[0].forEach(function (u) {
    const attendu = profilPublic(u.data());
    const present = existants[u.id];
    delete existants[u.id];
    if (attendu && !memesProfilsPublics(attendu, present)) operations.push({ type: "set", id: u.id, data: attendu });
    else if (!attendu && present) operations.push({ type: "delete", id: u.id });
  });
  Object.keys(existants).forEach(function (id) { operations.push({ type: "delete", id: id }); });

  for (let i = 0; i < operations.length; i += 400) {
    const lot = mFs.writeBatch(db);
    operations.slice(i, i + 400).forEach(function (op) {
      const ref = mFs.doc(db, "profils_publics", op.id);
      if (op.type === "set") lot.set(ref, op.data);
      else lot.delete(ref);
    });
    await lot.commit();
  }
}

// ---- Gardes automatiques sur toutes les pages sauf la page de connexion ----
if (typeof window !== "undefined" && typeof sessionStorage !== "undefined" && PAGE !== "index.html") {
  if (mdpProvisoireEnAttente() && !PAGES_LIBRES.includes(PAGE)) {
    // Mot de passe provisoire : on ne peut rien faire d'autre que changer le mot de passe
    location.replace("mon-profil.html");
  } else {
    demarrerGardes();
  }
}

async function demarrerGardes() {
  let mApp, mAuth, mFs;
  try {
    mApp = await import(URL_FIREBASE + "firebase-app.js");
    mAuth = await import(URL_FIREBASE + "firebase-auth.js");
    mFs = await import(URL_FIREBASE + "firebase-firestore.js");
  } catch (e) {
    console.warn("Gardes de session indisponibles :", e);
    return;
  }

  let minuteur = null;
  let pastille = null;
  let profilVerifie = false;
  let syncLancee = false;
  let enCours = false;

  const afficher = function (restantMs) {
    if (!document.body) return;
    if (!pastille) {
      pastille = document.createElement("div");
      pastille.id = "ggt-compte-a-rebours";
      pastille.style.cssText = "position:fixed;right:10px;bottom:10px;font:600 11px/1 Outfit,sans-serif;padding:6px 10px;border-radius:999px;z-index:99998;pointer-events:none;border:0.5px solid rgba(255,255,255,.12)";
      document.body.appendChild(pastille);
    }
    const s = Math.max(0, Math.ceil(restantMs / 1000));
    const urgent = restantMs <= AVERTISSEMENT_MINUTES * 60000;
    pastille.textContent = "⏱ " + Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0") + (urgent ? " — enregistre ton travail" : "");
    pastille.style.background = urgent ? "#fc4c02" : "rgba(30,35,48,.92)";
    pastille.style.color = urgent ? "#fff" : "#9aa3bd";
  };

  const verifier = async function () {
    if (enCours) return;
    enCours = true;
    try {
      const app = mApp.getApps()[0];
      if (!app) return;
      const auth = mAuth.getAuth(app);
      const user = auth.currentUser;
      if (!user) return;

      // Compte à rebours de la session
      let debut = Number(sessionStorage.getItem(CLE_DEBUT));
      if (!debut) {
        debut = Date.now();
        sessionStorage.setItem(CLE_DEBUT, String(debut));
      }
      const restant = SESSION_MINUTES * 60000 - (Date.now() - debut);
      if (restant <= 0) {
        clearInterval(minuteur);
        sessionStorage.setItem(CLE_EXPIREE, "1");
        sessionStorage.removeItem(CLE_DEBUT);
        try { await mAuth.signOut(auth); } catch (e) { /* on redirige quand même */ }
        location.replace("index.html");
        return;
      }
      afficher(restant);

      // Mini-fiches publiques (anniversaires, suivi du groupe) : une fois par connexion, sans bloquer la page
      if (!syncLancee && sessionStorage.getItem(CLE_SYNC) !== "1") {
        syncLancee = true;
        sessionStorage.setItem(CLE_SYNC, "1");
        synchroniserProfilsPublics(mFs, app, user).catch(function (e) { console.warn("Mini-fiches publiques :", e); });
      }

      // Profil obligatoire : toutes les informations doivent être renseignées
      if (!profilVerifie && !PAGES_LIBRES.includes(PAGE)) {
        profilVerifie = true;
        const snap = await mFs.getDoc(mFs.doc(mFs.getFirestore(app), "users", user.uid));
        if (snap.exists() && profilManquants(snap.data()).length > 0) {
          location.replace("mon-profil.html");
        }
      }
    } catch (e) {
      console.warn("Garde de session :", e);
    } finally {
      enCours = false;
    }
  };

  minuteur = setInterval(verifier, 1000);
  verifier();
}

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

// ── Enregistrer une connexion utilisateur ──
// Simple: juste uid, nom, et date/heure
export async function logLogin(db, uid, userName) {
  try {
    const { collection, addDoc, serverTimestamp } = await import(
      'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'
    );
    
    console.log('logLogin appelé:', uid, userName);
    
    const result = await addDoc(collection(db, 'connexions'), {
      uid: uid,
      nom: userName,
      ts: serverTimestamp()
    });
    
    console.log('Connexion enregistrée:', result.id);
  } catch (error) {
    console.error('Erreur logLogin:', error);
    throw error;
  }
}
