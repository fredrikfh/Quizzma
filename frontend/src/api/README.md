## 🔧 Setting Up `firebaseConfig`

Quizzma relies on Firebase to handle authentication. To connect the frontend to the you need to fill out the missing fields in `firebaseClient.ts`.
Follow these stages to proceed:

### 1. Go to Firebase Console

- Open [Firebase Console](https://console.firebase.google.com/).
- Select your existing project or create a new one.

### 2. Register or Select a Web App

- In the **Project Overview**, click the **`</>` (Web)** icon to register a new web app, or select an existing one.
- If you're registering a new app, give it a nickname. Firebase Hosting is optional.

### 3. Get the Configuration Object

After registration, you’ll see a config object like this:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "G-MEASUREMENT_ID", // optional
};
```
