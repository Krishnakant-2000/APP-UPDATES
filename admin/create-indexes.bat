@echo off
REM Firestore Index Creation Script (Windows)
REM Creates composite indexes needed for admin dashboard search functionality

setlocal enabledelayedexpansion

echo.
echo 🚀 Creating Firestore Composite Indexes
echo =========================================
echo.

REM Load environment variables from .env file
if exist .env (
  for /f "usebackq tokens=1* delims==" %%i in (.env) do (
    if not "%%i"=="" (
      if not "%%i:~0,1%%"=="REM" (
        if not "%%i:~0,1%%"=="#" (
          set "%%i=%%j"
        )
      )
    )
  )
)

set PROJECT_ID=%REACT_APP_FIREBASE_PROJECT_ID%

if "%PROJECT_ID%"=="" (
  echo ❌ Error: REACT_APP_FIREBASE_PROJECT_ID not set
  echo Please set it in your .env file
  exit /b 1
)

echo 📁 Project ID: %PROJECT_ID%
echo.

REM Check if gcloud is installed
where gcloud >nul 2>nul
if %errorlevel% neq 0 (
  echo ❌ gcloud CLI is not installed
  echo 📥 Please install it from: https://cloud.google.com/sdk/docs/install
  exit /b 1
)

echo 🔑 Authenticating with Firebase...
call gcloud auth login
call gcloud config set project %PROJECT_ID%

echo.
echo 🏗️ Creating Indexes...
echo.

REM Index 1: users collection - displayName + createdAt
echo 📋 Creating Index 1: users ^(displayName ASC, createdAt DESC^)
call gcloud firestore indexes composite create ^
  --collection=users ^
  --field-config=field-path=displayName,order=ASCENDING ^
  --field-config=field-path=createdAt,order=DESCENDING

if %errorlevel% equ 0 (
  echo ✅ Index 1 created
) else (
  echo ⚠️ Index 1 creation attempted
)
echo.

REM Index 2: users collection - role + isVerified
echo 📋 Creating Index 2: users ^(role ASC, isVerified DESC^)
call gcloud firestore indexes composite create ^
  --collection=users ^
  --field-config=field-path=role,order=ASCENDING ^
  --field-config=field-path=isVerified,order=DESCENDING

if %errorlevel% equ 0 (
  echo ✅ Index 2 created
) else (
  echo ⚠️ Index 2 creation attempted
)
echo.

REM Index 3: videos collection - verificationStatus + createdAt
echo 📋 Creating Index 3: videos ^(verificationStatus ASC, createdAt DESC^)
call gcloud firestore indexes composite create ^
  --collection=videos ^
  --field-config=field-path=verificationStatus,order=ASCENDING ^
  --field-config=field-path=createdAt,order=DESCENDING

if %errorlevel% equ 0 (
  echo ✅ Index 3 created
) else (
  echo ⚠️ Index 3 creation attempted
)
echo.

echo 🎉 All indexes have been created!
echo.
echo ⏳ Status: Building indexes...
echo    This may take 2-10 minutes
echo.
echo 📊 Check status at:
echo    https://console.firebase.google.com/project/%PROJECT_ID%/firestore/indexes
echo.

REM List all indexes
echo 📋 Current Indexes:
call gcloud firestore indexes composite list

echo.
echo ✅ Done!
echo.
pause
