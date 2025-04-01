import "./App.css";
import {useEffect, useState} from "react";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";

// Import components
import { SignIn, SignOut } from './components/Auth';
import { ChatRoom } from './components/ChatComponents';
import { UserProfile } from './components/UserProfile';
import { Sidebar } from './components/Sidebar';
import { DirectMessage } from './components/DirectMessage';
import {setupOnlineStatus} from "./components/UserStatus";

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

function App() {
    const [user] = useAuthState(auth);
    const [showProfile, setShowProfile] = useState(false);
    const [currentChatId, setCurrentChatId] = useState("global");


    useEffect(() => {
        if (user) {
            setupOnlineStatus();
        }
    }, [user]);
    // Handle chat selection
    const handleSelectChat = (chatId) => {
        setCurrentChatId(chatId);
        // If showing profile, switch to chat view
        if (showProfile) {
            setShowProfile(false);
        }
    };

    // Render the appropriate chat component based on selected chat
    const renderChatComponent = () => {
        if (currentChatId === "global") {
            return <ChatRoom />;
        } else {
            return <DirectMessage chatId={currentChatId} />;
        }
    };

    return (
        <div className="App">
            <header>
                {user && <Sidebar onSelectChat={handleSelectChat} currentChatId={currentChatId} />}
                <h1>💬 Chat App</h1>
                <div className="header-buttons">
                    {user && (
                        <button
                            className="profile-button"
                            onClick={() => setShowProfile(!showProfile)}
                        >
                            {showProfile ? "Back to Chat" : "My Profile"}
                        </button>
                    )}
                    <SignOut />
                </div>
            </header>
            <section>
                {!user ? (
                    <SignIn />
                ) : showProfile ? (
                    <UserProfile />
                ) : (
                    renderChatComponent()
                )}
            </section>
        </div>
    );
}

export default App;