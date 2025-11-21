// Script to update a user's role in Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env file
const envPath = join(__dirname, '../.env');
const envFile = readFileSync(envPath, 'utf-8');

const getEnvValue = (key) => {
  const match = envFile.match(new RegExp(`${key}=(.+)`));
  return match ? match[1].trim() : '';
};

const firebaseConfig = {
  apiKey: getEnvValue('REACT_APP_FIREBASE_API_KEY'),
  authDomain: getEnvValue('REACT_APP_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvValue('REACT_APP_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvValue('REACT_APP_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvValue('REACT_APP_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvValue('REACT_APP_FIREBASE_APP_ID')
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateUserRole(userId, newRole) {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      console.log('\n❌ User not found');
      return;
    }

    const userData = userDoc.data();
    console.log('\n=== CURRENT USER DATA ===');
    console.log('User ID:', userId);
    console.log('Name:', userData.displayName || userData.name || 'N/A');
    console.log('Email:', userData.email || 'N/A');
    console.log('Current Role:', userData.role || 'N/A');
    console.log('========================\n');

    if (newRole) {
      console.log(`Updating role to: ${newRole}...`);
      await updateDoc(userDocRef, {
        role: newRole,
        updatedAt: new Date()
      });
      console.log('✅ Role updated successfully!\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

const userId = process.argv[2];
const newRole = process.argv[3];

if (!userId) {
  console.error('Usage: node updateUserRole.mjs <userId> [newRole]');
  console.error('Example: node updateUserRole.mjs 8zlP5FgXHoUvldNUahtTCi9J5282 athlete');
  console.error('Valid roles: athlete, organization, parents, coaches');
  process.exit(1);
}

updateUserRole(userId, newRole);
