# Android Setup

## Before you can build

### 1. Add google-services.json

Go to the [Firebase Console](https://console.firebase.google.com/) → your project → Project Settings → "Your apps".

Add an Android app:
- **Package name**: `in.devlune.voltex`
- **App nickname**: Voltex Notes Android
- **SHA-1**: Run `./gradlew signingReport` and paste the debug SHA-1

Download `google-services.json` and place it at:
```
android/app/google-services.json
```

This file is gitignored — never commit it.

### 2. Enable Authentication in Firebase Console

If not already enabled for the web app, go to Authentication → Sign-in method and enable:
- Email/Password
- Google

### 3. Build and run

```bash
cd android
./gradlew assembleDebug            # build APK
./gradlew installDebug             # install on connected device/emulator
```

Or open `android/` in Android Studio (File → Open → select the `android/` folder).

## Cross-platform sync

The Android app uses the **same Firebase project** as the web app. Notes created on the web appear on Android in real time (via Firestore `onSnapshot`) and vice versa.

The sync uses the exact same Firestore field names as the web app's `lib/firebase/sync.ts` `noteToFirestore()` function, particularly:
- `folder` (not `folderId`) — matches what the web sync writes
- `_serverUpdatedAt: serverTimestamp()` — required for conflict detection
