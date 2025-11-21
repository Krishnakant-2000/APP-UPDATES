// Quick script to get user information from Firestore using client SDK
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read Firebase config from the source file
const firebaseConfigPath = join(__dirname, '../src/lib/firebase.ts');
const firebaseConfigFile = readFileSync(firebaseConfigPath, 'utf-8');

// Extract Firebase config (simple regex extraction)
const apiKeyMatch = firebaseConfigFile.match(/apiKey:\s*['"]([^'"]+)['"]/);
const authDomainMatch = firebaseConfigFile.match(/authDomain:\s*['"]([^'"]+)['"]/);
const projectIdMatch = firebaseConfigFile.match(/projectId:\s*['"]([^'"]+)['"]/);
const storageBucketMatch = firebaseConfigFile.match(/storageBucket:\s*['"]([^'"]+)['"]/);
const messagingSenderIdMatch = firebaseConfigFile.match(/messagingSenderId:\s*['"]([^'"]+)['"]/);
const appIdMatch = firebaseConfigFile.match(/appId:\s*['"]([^'"]+)['"]/);

const firebaseConfig = {
  apiKey: apiKeyMatch?.[1],
  authDomain: authDomainMatch?.[1],
  projectId: projectIdMatch?.[1],
  storageBucket: storageBucketMatch?.[1],
  messagingSenderId: messagingSenderIdMatch?.[1],
  appId: appIdMatch?.[1]
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function getUserInfo(userId) {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      console.log('\n❌ User not found');
      return;
    }

    const userData = userDoc.data();
    console.log('\n=== USER INFORMATION ===');
    console.log('User ID:', userId);
    console.log('Name:', userData.displayName || userData.name || 'N/A');
    console.log('Email:', userData.email || 'N/A');
    console.log('Account Type/Role:', userData.role || 'N/A');
    console.log('Player Type:', userData.playerType || 'N/A');
    console.log('Sport:', userData.sport || (userData.sports && userData.sports[0]) || 'N/A');
    console.log('Position:', userData.position || 'N/A');
    console.log('========================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error fetching user:', error.message);
    process.exit(1);
  }
}

const userId = process.argv[2];
if (!userId) {
  console.error('Please provide a user ID');
  console.error('Usage: node getUserInfo.mjs <userId>');
  process.exit(1);
}

getUserInfo(userId);
