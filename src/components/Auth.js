import { useState } from "react";
import { setupOnlineStatus } from './UserStatus';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously as firebaseSignInAnonymously,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";

// Function to generate a random username
const generateRandomUsername = () => {
  const adjectives = [
    'Happy', 'Brave', 'Clever', 'Daring', 'Eager', 'Funny', 'Gentle',
    'Humble', 'Jolly', 'Kind', 'Lively', 'Merry', 'Noble', 'Optimistic',
    'Playful', 'Quirky', 'Radiant', 'Silly', 'Triumph', 'Unique'
  ];

  const nouns = [
    'Penguin', 'Rocket', 'Wizard', 'Dragon', 'Ninja', 'Pirate', 'Astronaut',
    'Shark', 'Wolf', 'Eagle', 'Phoenix', 'Knight', 'Sphinx', 'Unicorn',
    'Kraken', 'Sorcerer', 'Titan', 'Warrior', 'Ghost', 'Explorer'
  ];

  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNumber = Math.floor(Math.random() * 1000);

  return `${randomAdjective}${randomNoun}${randomNumber}`;
};

// SignIn Component
export function SignIn() {
  const [authError, setAuthError] = useState(null);
  const auth = getAuth();
  const firestore = getFirestore();

  // Function to create user profile in Firestore
  const createUserProfile = async (user, isAnonymous = false) => {
    try {
      const userProfileRef = doc(firestore, "userProfiles", user.uid);

      // Generate a random username for anonymous users
      const displayName = isAnonymous
          ? generateRandomUsername()
          : (user.displayName || "Guest User");

      await setDoc(userProfileRef, {
        displayName: displayName,
        email: user.email,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        isAnonymous: isAnonymous
      }, { merge: true });
      setupOnlineStatus();
    } catch (error) {
      console.error("Error creating user profile:", error);
    }
  };

  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();

    signInWithPopup(auth, provider)
        .then((result) => {
          // Create user profile after successful Google sign-in
          createUserProfile(result.user, false);
          setAuthError(null);
        })
        .catch((error) => {
          if (error.code === 'auth/cancelled-popup-request' ||
              error.code === 'auth/popup-closed-by-user') {
            setAuthError("Sign-in was cancelled. You can try again.");
          } else {
            setAuthError(error.message);
          }
          console.log("Auth error:", error.code, error.message);
        });
  };

  const signInAnonymously = () => {
    firebaseSignInAnonymously(auth)
        .then((result) => {
          // Create user profile after successful anonymous sign-in
          createUserProfile(result.user, true);
          setAuthError(null);
        })
        .catch((error) => {
          setAuthError(error.message);
          console.log("Anonymous auth error:", error.code, error.message);
        });
  };

  return (
      <div className="sign-in-container">
        <h2>Welcome to IGuess</h2>
        <div className="auth-buttons">
          <button className="sign-in" onClick={signInWithGoogle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>
          <button className="sign-in anonymous" onClick={signInAnonymously}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 10c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z" />
            </svg>
            Continue as Guest
          </button>
        </div>
        {authError && <p className="error-message">{authError}</p>}
        <p className="community-guidelines">
          Do not violate the community guidelines or you will be banned for life!
        </p>
      </div>
  );
}

// SignOut Component
export function SignOut() {
  const auth = getAuth();

  return (
      auth.currentUser && (
          <button className="sign-out" onClick={() => signOut(auth)}>
            Sign Out
          </button>
      )
  );
}