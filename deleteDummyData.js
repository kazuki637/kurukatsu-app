const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const deleteAllCircles = async () => {
  console.log("Deleting all circles...");
  const circlesRef = db.collection('circles');
  const snapshot = await circlesRef.get();

  if (snapshot.empty) {
    console.log("No circles found in the collection. Nothing to delete.");
    return;
  }

  const batchSize = 500; // Firestore limit for batch writes
  let deletedCount = 0;

  while (true) {
    const query = circlesRef.limit(batchSize);
    const batchSnapshot = await query.get();

    if (batchSnapshot.empty) {
      break; // No more documents to delete
    }

    const batch = db.batch();
    batchSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    try {
      await batch.commit();
      deletedCount += batchSnapshot.size;
      console.log(`Deleted ${deletedCount} circles so far.`);
    } catch (error) {
      console.error("Error deleting batch: ", error);
      break; // Stop on error
    }
  }

  console.log(`Successfully deleted a total of ${deletedCount} circles.`);
};

deleteAllCircles();