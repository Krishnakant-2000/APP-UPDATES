#!/bin/bash

# Firestore Index Creation Script
# Creates composite indexes needed for admin dashboard search functionality

echo "🚀 Creating Firestore Composite Indexes"
echo "========================================="
echo ""

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | xargs)
fi

PROJECT_ID=${REACT_APP_FIREBASE_PROJECT_ID}

if [ -z "$PROJECT_ID" ]; then
  echo "❌ Error: REACT_APP_FIREBASE_PROJECT_ID not set"
  exit 1
fi

echo "📁 Project ID: $PROJECT_ID"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
  echo "❌ gcloud CLI is not installed"
  echo "📥 Please install it from: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

echo "🔑 Authenticating with Firebase..."
gcloud auth login
gcloud config set project $PROJECT_ID

echo ""
echo "🏗️ Creating Indexes..."
echo ""

# Index 1: users collection - displayName + createdAt
echo "📋 Creating Index 1: users (displayName ASC, createdAt DESC)"
gcloud firestore indexes composite create \
  --collection=users \
  --field-config=field-path=displayName,order=ASCENDING \
  --field-config=field-path=createdAt,order=DESCENDING

echo "✅ Index 1 creation initiated"
echo ""

# Index 2: users collection - role + isVerified
echo "📋 Creating Index 2: users (role ASC, isVerified DESC)"
gcloud firestore indexes composite create \
  --collection=users \
  --field-config=field-path=role,order=ASCENDING \
  --field-config=field-path=isVerified,order=DESCENDING

echo "✅ Index 2 creation initiated"
echo ""

# Index 3: videos collection - verificationStatus + createdAt
echo "📋 Creating Index 3: videos (verificationStatus ASC, createdAt DESC)"
gcloud firestore indexes composite create \
  --collection=videos \
  --field-config=field-path=verificationStatus,order=ASCENDING \
  --field-config=field-path=createdAt,order=DESCENDING

echo "✅ Index 3 creation initiated"
echo ""

echo "🎉 All indexes have been created!"
echo ""
echo "⏳ Status: Building indexes..."
echo "   This may take 2-10 minutes"
echo ""
echo "📊 Check status at:"
echo "   https://console.firebase.google.com/project/$PROJECT_ID/firestore/indexes"
echo ""

# List all indexes
echo "📋 Current Indexes:"
gcloud firestore indexes composite list

echo ""
echo "✅ Done!"
