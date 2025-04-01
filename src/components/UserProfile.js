import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { ProfileEdit } from "./ProfileEdit";

// Function to generate consistent avatar for users (moved from ChatComponents.js)
export const getAvatarForUser = (uid, isAnonymous) => {
    // Use the uid to generate a consistent color and image
    // This ensures the same user always gets the same avatar
    const colors = [
        '#FF5252', '#FF4081', '#E040FB', '#7C4DFF',
        '#536DFE', '#448AFF', '#40C4FF', '#18FFFF',
        '#64FFDA', '#69F0AE', '#B2FF59', '#EEFF41',
        '#FFFF00', '#FFD740', '#FFAB40', '#FF6E40'
    ];

    // Get a consistent index based on the uid
    const colorIndex = Math.abs(
        uid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    ) % colors.length;

    const color = colors[colorIndex];

    // Get initials (for anonymous users we'll use 'G' for Guest)
    const initials = isAnonymous ? 'G' : 'U';

    // Create a data URL for a colored circle with text
    return `https://ui-avatars.com/api/?name=${initials}&background=${color.replace('#', '')}&color=fff`;
};

export function UserProfile() {
    const auth = getAuth();
    const firestore = getFirestore();
    const [displayName, setDisplayName] = useState("");
    const [showEditForm, setShowEditForm] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth.currentUser) return;

        // Set up a listener for the user profile
        const unsubscribe = onSnapshot(
            doc(firestore, "userProfiles", auth.currentUser.uid),
            (doc) => {
                if (doc.exists()) {
                    setDisplayName(doc.data().displayName || "");
                } else {
                    // Default name if no profile exists
                    setDisplayName(auth.currentUser.isAnonymous
                        ? "Guest User"
                        : (auth.currentUser.displayName || "User"));
                }
                setLoading(false);
            },
            (error) => {
                console.error("Error getting profile:", error);
                // Default name if error
                setDisplayName(auth.currentUser.isAnonymous
                    ? "Guest User"
                    : (auth.currentUser.displayName || "User"));
                setLoading(false);
            }
        );

        // Cleanup the listener when component unmounts
        return () => unsubscribe();
    }, [auth.currentUser, firestore]);

    // Get appropriate avatar image
    const getAvatarSrc = () => {
        if (!auth.currentUser) return "";

        // If there's a photoURL, use it (for Google sign-in users)
        if (auth.currentUser.photoURL && !auth.currentUser.isAnonymous) {
            return auth.currentUser.photoURL;
        }

        // Generate a consistent avatar based on UID
        return getAvatarForUser(auth.currentUser.uid, auth.currentUser.isAnonymous);
    };

    if (showEditForm) {
        return <ProfileEdit onClose={() => setShowEditForm(false)} />;
    }

    return (
        <div className="user-profile">
            <div className="profile-header">
                <img
                    src={getAvatarSrc()}
                    alt="Profile"
                    className="profile-avatar"
                />
                <div className="profile-info">
                    <h3>{loading ? "Loading..." : displayName}</h3>
                    <p>{auth.currentUser?.isAnonymous ? "Guest Account" : "Signed In User"}</p>
                </div>
            </div>
            <button
                onClick={() => setShowEditForm(true)}
                className="edit-profile-button"
            >
                Edit Profile
            </button>
        </div>
    );
}