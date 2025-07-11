import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, provider } from "./firebase";

// Sign in with Google
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log("✅ Signed in as:", user.displayName);
    return user;
  } catch (error) {
    console.error("❌ Sign-in error:", error);
    return null;
  }
}

// Sign out
export async function signOutUser() {
  try {
    await signOut(auth);
    console.log("🚪 Signed out successfully");
  } catch (error) {
    console.error("❌ Sign-out error:", error);
  }
}

// Listen for auth state changes
export function listenToAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}
