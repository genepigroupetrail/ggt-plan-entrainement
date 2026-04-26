#!/usr/bin/env node

/**
 * SCRIPT DE CRÉATION DES COMPTES TEST GGT
 * Utilisation: node create-test-users.js
 * 
 * Crée 6 comptes dans Firebase Authentication:
 * - 5 adhérents ordinaires
 * - 1 admin (toi - David ROUSSEL)
 * 
 * IMPORTANT: Tu dois d'abord:
 * 1. Installer Node.js (https://nodejs.org)
 * 2. Installer Firebase CLI: npm install -g firebase-tools
 * 3. Configurer Firebase: firebase init firestore
 * 4. Être authentifié: firebase login
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Chercher le fichier serviceAccountKey.json dans le répertoire courant
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ ERREUR : Fichier serviceAccountKey.json non trouvé');
  console.error('');
  console.error('Pour obtenir ce fichier:');
  console.error('1. Aller à https://console.firebase.google.com');
  console.error('2. Sélectionner le projet "ggt-plan-entrainement"');
  console.error('3. Paramètres du projet → Comptes de service');
  console.error('4. Cliquer "Générer une nouvelle clé privée"');
  console.error('5. Sauvegarder le fichier JSON dans ce dossier');
  console.error('');
  process.exit(1);
}

// Initialiser Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
  projectId: 'ggt-plan-entrainement'
});

const auth = admin.auth();
const db = admin.firestore();

// Les comptes à créer
const users = [
  // Adhérents ordinaires (rôle: 'adhérent')
  {
    email: 'yann.pouliquen@ggt.fr',
    password: 'Test123456!',
    prenom: 'Yann',
    nom: 'POULIQUEN',
    role: 'adhérent'
  },
  {
    email: 'yannick.mauxion@ggt.fr',
    password: 'Test123456!',
    prenom: 'Yannick',
    nom: 'MAUXION',
    role: 'adhérent'
  },
  {
    email: 'jerome.rudelle@ggt.fr',
    password: 'Test123456!',
    prenom: 'Jérôme',
    nom: 'RUDELLE',
    role: 'adhérent'
  },
  {
    email: 'brice.meudec@ggt.fr',
    password: 'Test123456!',
    prenom: 'Brice',
    nom: 'MEUDEC',
    role: 'adhérent'
  },
  {
    email: 'fabrice.lebouedec@ggt.fr',
    password: 'Test123456!',
    prenom: 'Fabrice',
    nom: 'LEBOUEDEC',
    role: 'adhérent'
  },
  // Admin (toi)
  {
    email: 'rousseldav@gmail.com',
    password: 'Test123456!',
    prenom: 'David',
    nom: 'ROUSSEL',
    role: 'admin'
  }
];

async function createUsers() {
  console.log('🚀 Création des comptes test GGT...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const user of users) {
    try {
      // Créer le compte dans Firebase Authentication
      const userRecord = await auth.createUser({
        email: user.email,
        password: user.password,
        displayName: `${user.prenom} ${user.nom}`
      });

      // Créer le document utilisateur dans Firestore
      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: user.email,
        prenom: user.prenom,
        nom: user.nom,
        role: user.role,
        createdAt: new Date(),
        vma: null,
        fcm: null
      });

      console.log(`✅ ${user.prenom} ${user.nom}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Mot de passe: ${user.password}`);
      console.log(`   Rôle: ${user.role === 'admin' ? '👤 ADMIN' : '👥 Adhérent'}`);
      console.log('');

      successCount++;
    } catch (error) {
      console.error(`❌ Erreur lors de la création de ${user.prenom} ${user.nom}:`);
      console.error(`   ${error.message}`);
      console.error('');
      errorCount++;
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ ${successCount} comptes créés avec succès`);
  if (errorCount > 0) {
    console.log(`❌ ${errorCount} erreur(s) rencontrée(s)`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('🎯 Prochaines étapes:');
  console.log('1. Aller sur: https://genepigroupetrail.github.io/ggt-plan-entrainement/');
  console.log('2. Se connecter avec l\'un des comptes créés');
  console.log('3. Vérifier que tout fonctionne\n');

  process.exit(successCount === users.length ? 0 : 1);
}

// Lancer la création
createUsers().catch(error => {
  console.error('❌ Erreur fatale:', error.message);
  process.exit(1);
});
