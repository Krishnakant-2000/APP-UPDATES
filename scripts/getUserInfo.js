// Quick script to get user information from Firestore
const admin = require('firebase-admin');
const serviceAccount = require('../functions/serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function getUserInfo(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      console.log('User not found');
      return;
    }

    const userData = userDoc.data();
    console.log('\n=== USER INFORMATION ===');
    console.log('User ID:', userId);
    console.log('Name:', userData.displayName || userData.name || 'N/A');
    console.log('Email:', userData.email || 'N/A');
    console.log('Account Type/Role:', userData.role || 'N/A');
    console.log('Player Type:', userData.playerType || 'N/A');
    console.log('Created At:', userData.createdAt?.toDate?.() || 'N/A');
    console.log('========================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error fetching user:', error);
    process.exit(1);
  }
}

const userId = process.argv[2];
if (!userId) {
  console.error('Please provide a user ID');
  process.exit(1);
}

getUserInfo(userId);
