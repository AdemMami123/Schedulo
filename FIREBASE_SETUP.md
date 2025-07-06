# Firebase Console Setup Guide

## Quick Fix for "Missing or insufficient permissions" Error

### Step 1: Update Firestore Security Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `smart-scheduling-app-a94b1`
3. Go to **Firestore Database** → **Rules**
4. Replace the existing rules with this temporary development rule:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Temporary rules for development - allow all authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

5. Click **Publish**

### Step 2: Verify Authentication Settings

1. Go to **Authentication** → **Sign-in method**
2. Make sure **Google** is enabled
3. Check that your OAuth 2.0 Client ID is properly configured
4. Verify authorized domains include `localhost`

### Step 3: Test Database Access

1. Go to **Firestore Database** → **Data**
2. You should see collections being created when you sign in

### Step 4: Production Rules (Use Later)

Once everything is working, replace with these production-ready rules:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // User profiles collection - users can read/write their own profile
    match /userProfiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Bookings collection - users can read/write their own bookings
    match /bookings/{bookingId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         request.auth.uid == request.resource.data.userId);
    }
    
    // Allow reading user profiles for public booking pages
    match /userProfiles/{userId} {
      allow read: if true;
    }
    
    // Allow reading users collection for username lookup
    match /users/{userId} {
      allow read: if true;
    }
  }
}
```

## Common Issues and Solutions

### Issue: "Missing or insufficient permissions"
**Solution**: Make sure you've updated the Firestore rules as shown above

### Issue: Authentication not working
**Solution**: 
1. Check Google Cloud Console OAuth settings
2. Add your email as a test user
3. Verify authorized domains

### Issue: Collections not creating
**Solution**: 
1. Check Firestore rules
2. Verify user is authenticated
3. Check browser console for detailed errors

### Issue: "App not verified" during Google sign-in
**Solution**:
1. In Google Cloud Console → OAuth consent screen
2. Add your email as a test user
3. Set app to "Testing" mode

## Testing Checklist

- [ ] Firestore rules updated to allow authenticated users
- [ ] Google OAuth configured in Firebase Auth
- [ ] Test user email added in Google Cloud Console
- [ ] App in "Testing" mode in OAuth consent screen
- [ ] Authorized domains include `localhost`
- [ ] Browser console shows no Firebase errors
