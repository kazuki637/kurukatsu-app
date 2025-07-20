const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const resetAllCircleLikesAndFavorites = async () => {
  console.log("Resetting 'likes' count for all circles and deleting all user favorites...");

  // --- Resetting likes count for all circles ---
  const circlesRef = db.collection('circles');
  const circlesSnapshot = await circlesRef.get();

  if (circlesSnapshot.empty) {
    console.log("No circles found in the collection.");
  } else {
    const circlesBatchSize = 500;
    let updatedCirclesCount = 0;

    for (let i = 0; i < circlesSnapshot.docs.length; i += circlesBatchSize) {
      const batch = db.batch();
      const currentBatchDocs = circlesSnapshot.docs.slice(i, i + circlesBatchSize);

      currentBatchDocs.forEach(doc => {
        const docRef = circlesRef.doc(doc.id);
        batch.update(docRef, { likes: 0 });
        updatedCirclesCount++;
      });

      try {
        await batch.commit();
        console.log(`Successfully processed circles batch ${Math.floor(i / circlesBatchSize) + 1}/${Math.ceil(circlesSnapshot.docs.length / circlesBatchSize)}`);
      } catch (error) {
        console.error("Error updating circles batch: ", error);
      }
    }
    console.log(`Successfully reset 'likes' count for ${updatedCirclesCount} circles.`);
  }

  // --- Deleting all user favorites ---
  const usersRef = db.collection('users');
  const usersSnapshot = await usersRef.get();

  if (usersSnapshot.empty) {
    console.log("No users found in the collection.");
  } else {
    const favoritesBatchSize = 500;
    let deletedFavoritesCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const favoritesRef = usersRef.doc(userDoc.id).collection('favorites');
      const favoritesSnapshot = await favoritesRef.get();

      if (!favoritesSnapshot.empty) {
        const favoritesToDelete = [];
        favoritesSnapshot.forEach(favDoc => favoritesToDelete.push(favDoc.id));

        for (let i = 0; i < favoritesToDelete.length; i += favoritesBatchSize) {
          const batch = db.batch();
          const currentBatchFavIds = favoritesToDelete.slice(i, i + favoritesBatchSize);

          currentBatchFavIds.forEach(favId => {
            const favDocRef = favoritesRef.doc(favId);
            batch.delete(favDocRef);
            deletedFavoritesCount++;
          });

          try {
            await batch.commit();
            console.log(`Successfully deleted favorites batch for user ${userDoc.id}`);
          } catch (error) {
            console.error(`Error deleting favorites batch for user ${userDoc.id}: `, error);
          }
        }
      }
    }
    console.log(`Successfully deleted ${deletedFavoritesCount} user favorites.`);
  }

  console.log("Reset process completed.");
};

resetAllCircleLikesAndFavorites();
