import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

export function ProfileEdit({ onClose }) {
    const auth = getAuth();
    const firestore = getFirestore();
    const [displayName, setDisplayName] = useState("");
    const [hideEmail, setHideEmail] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Load the current user profile data
        const loadUserProfile = async () => {
            if (!auth.currentUser) return;

            try {
                const userDoc = await getDoc(doc(firestore, "userProfiles", auth.currentUser.uid));

                if (userDoc.exists()) {
                    // If the user profile exists, load the displayName and privacy settings
                    setDisplayName(userDoc.data().displayName || "");
                    setHideEmail(userDoc.data().hideEmail || false);
                } else {
                    // If no profile exists yet, use the auth displayName or a default
                    const defaultName = auth.currentUser.isAnonymous
                        ? "Guest User"
                        : (auth.currentUser.displayName || "");
                    setDisplayName(defaultName);
                    setHideEmail(false);
                }
                setLoading(false);
            } catch (err) {
                console.error("Error loading profile:", err);
                setError("Failed to load profile. Please try again.");
                setLoading(false);
            }
        };

        loadUserProfile();
    }, [auth.currentUser, firestore]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!auth.currentUser) return;

        const trimmedName = displayName.trim();
        if (!trimmedName) {
            setError("Username cannot be empty");
            return;
        }

        if (trimmedName.length > 30) {
            setError("Username must be less than 30 characters");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Save the profile data to Firestore
            await setDoc(doc(firestore, "userProfiles", auth.currentUser.uid), {
                displayName: trimmedName,
                hideEmail: hideEmail,
                updatedAt: new Date(),
                // You can add more profile fields here if needed
            }, { merge: true });

            setSuccess(true);
            setLoading(false);

            // Close the edit form after a brief delay to show success message
            setTimeout(() => {
                if (onClose) onClose();
            }, 1500);
        } catch (err) {
            console.error("Error saving profile:", err);
            setError("Failed to save profile. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="profile-edit-container">
            <h2>Edit Profile</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="displayName">Username:</label>
                    <input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your username"
                        disabled={loading}
                    />
                </div>

                <div className="form-group privacy-option">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={hideEmail}
                            onChange={(e) => setHideEmail(e.target.checked)}
                            disabled={loading}
                        />
                        Hide my email address
                    </label>
                </div>

                {error && <p className="error-message">{error}</p>}
                {success && <p className="success-message">Profile updated successfully!</p>}

                <div className="button-group">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="cancel-button"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="save-button"
                    >
                        {loading ? "Saving..." : "Save"}
                    </button>
                </div>
            </form>
        </div>
    );
}