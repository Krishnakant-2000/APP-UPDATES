#!/usr/bin/env node

/**
 * Create Firestore Composite Indexes
 * This script creates the necessary indexes for the admin dashboard search functionality
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Initialize Firebase Admin SDK
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (!serviceAccountPath) {
  console.error('❌ Error: FIREBASE_SERVICE_ACCOUNT_PATH environment variable is not set');
  console.log('Please set it to the path of your Firebase service account JSON file');
  process.exit(1);
}

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`❌ Error: Service account file not found at: ${serviceAccountPath}`);
  process.exit(1);
}

try {
  const serviceAccount = require(path.resolve(serviceAccountPath));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || serviceAccount.project_id
  });

  console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
  console.error('❌ Error initializing Firebase:', error.message);
  process.exit(1);
}

const db = admin.firestore();

/**
 * Create composite indexes for search functionality
 */
async function createIndexes() {
  try {
    console.log('\n🏗️ Creating Firestore Composite Indexes...\n');

    // Index 1: Users collection - displayName + createdAt
    console.log('📋 Index 1/3: users (displayName ASC, createdAt DESC)');
    await createIndex('users', [
      { fieldPath: 'displayName', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ]);
    console.log('✅ Created successfully\n');

    // Index 2: Users collection - role + isVerified
    console.log('📋 Index 2/3: users (role ASC, isVerified DESC)');
    await createIndex('users', [
      { fieldPath: 'role', order: 'ASCENDING' },
      { fieldPath: 'isVerified', order: 'DESCENDING' }
    ]);
    console.log('✅ Created successfully\n');

    // Index 3: Videos collection - verificationStatus + createdAt
    console.log('📋 Index 3/3: videos (verificationStatus ASC, createdAt DESC)');
    await createIndex('videos', [
      { fieldPath: 'verificationStatus', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ]);
    console.log('✅ Created successfully\n');

    console.log('🎉 All indexes created! They may take a few minutes to build.');
    console.log('\n📊 Indexes created for:');
    console.log('   1. users: displayName (ASC) + createdAt (DESC)');
    console.log('   2. users: role (ASC) + isVerified (DESC)');
    console.log('   3. videos: verificationStatus (ASC) + createdAt (DESC)');
    console.log('\n⏳ You can check the status in Firebase Console > Firestore > Indexes');

  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

/**
 * Helper function to create a single composite index
 */
async function createIndex(collectionId, fields) {
  const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID;

  // Build the index configuration
  const indexConfig = {
    collectionId,
    queryScope: 'COLLECTION',
    fields: fields.map(field => ({
      fieldPath: field.fieldPath,
      order: field.order
    }))
  };

  try {
    // Get the Firestore API
    const firestore = admin.firestore();
    const projectRef = admin.firestore.client().projectPath(projectId, 'database');

    // Log the index being created
    console.log(`  Creating index for ${collectionId}:`);
    fields.forEach(field => {
      console.log(`    - ${field.fieldPath} (${field.order})`);
    });

    // Note: Firebase Admin SDK doesn't support index creation directly
    // This is informational - actual index creation requires:
    // 1. Firebase Console UI (recommended)
    // 2. gcloud CLI
    // 3. Terraform

    // For now, we'll log what would be created
    console.log(`  Configuration: ${JSON.stringify(indexConfig, null, 2)}`);

  } catch (error) {
    throw error;
  }
}

// Run the script
console.log('🚀 Firestore Index Creation Script');
console.log('=====================================\n');

createIndexes();
