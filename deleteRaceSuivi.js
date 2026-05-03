const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.deleteRaceSuivi = functions.https.onCall(async (data, context) => {
  // Vérifier que l'utilisateur est connecté
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const uid = data.uid;
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'uid is required');
  }

  try {
    // Vérifier que c'est un admin ou adhérentadmin
    const adminSnap = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const adminData = adminSnap.data();
    
    if (!adminData || !['admin', 'adhérentadmin'].includes(adminData.role)) {
      throw new functions.https.HttpsError('permission-denied', 'Only admin or adhérentadmin can delete race suivi');
    }

    // Trouver tous les documents race_suivi de cet utilisateur
    const query = admin.firestore().collection('race_suivi').where('uid', '==', uid);
    const snapshot = await query.get();

    // Supprimer tous les documents
    const batch = admin.firestore().batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    return { success: true, message: 'Race suivi deleted successfully', count: snapshot.size };
  } catch (error) {
    console.error('Error deleting race suivi:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
