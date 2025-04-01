import { useRef, useState, useEffect } from "react";
import { addDoc, collection, query, orderBy, limit, serverTimestamp, getDoc, doc, getDocs, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { useCollectionData } from "react-firebase-hooks/firestore";
import { filterBadWords } from "./BadWordFilter.js";
import { getAvatarForUser } from "./UserProfile.js";
// Import React Markdown
import ReactMarkdown from "react-markdown";
import StatusDot from "./StatusDot";

// ChatMessage Component for rendering individual messages
export function ChatMessage(props) {
  const auth = getAuth();
  const firestore = getFirestore();
  const { text, uid, photoURL, createdAt, displayName } = props.message;
  const messageClass = uid === auth.currentUser?.uid ? "sent" : "received";
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  // Function to start a direct message chat
  const startDirectMessage = async () => {
    // Don't allow starting a chat with yourself
    if (uid === auth.currentUser?.uid) return;

    try {
      const chatsRef = collection(firestore, "chats");

      // Check if a chat already exists
      const q1 = query(
          chatsRef,
          where("participants", "array-contains", auth.currentUser.uid),
          where("type", "==", "direct")
      );

      const querySnapshot = await getDocs(q1);

      let existingChat = null;

      querySnapshot.forEach((doc) => {
        const chatData = doc.data();
        if (chatData.participants.includes(uid)) {
          existingChat = {
            id: doc.id,
            ...chatData
          };
        }
      });

      // If no existing chat, create a new one
      if (!existingChat) {
        await addDoc(chatsRef, {
          type: "direct",
          participants: [auth.currentUser.uid, uid],
          createdAt: serverTimestamp(),
          lastMessageTime: serverTimestamp(),
          lastMessage: "No messages yet"
        });
      }

      // You might want to add logic here to switch to the new/existing chat
      // This would typically be handled by a parent component or context
      console.log("Chat initiated with user:", uid);
    } catch (error) {
      console.error("Error starting chat:", error);
    }
  };

  useEffect(() => {
    // Fetch the username for this message
    const fetchUserName = async () => {
      try {
        // If this message already has a displayName, use it (for newer messages)
        if (displayName) {
          setUserName(displayName);
          setLoading(false);
          return;
        }

        // Otherwise fetch it from user profiles (for older messages)
        const userDoc = await getDoc(doc(firestore, "userProfiles", uid));

        if (userDoc.exists() && userDoc.data().displayName) {
          setUserName(userDoc.data().displayName);
        } else {
          // Fallback to the original behavior
          if (uid === auth.currentUser?.uid) {
            setUserName(auth.currentUser?.isAnonymous ? "You (Guest)" : "You");
          } else {
            setUserName("Guest User");
          }
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching username:", error);
        // Fallback
        setUserName(uid === auth.currentUser?.uid ? "You" : "User");
        setLoading(false);
      }
    };

    fetchUserName();
  }, [uid, auth.currentUser, firestore, displayName]);

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';

    const date = timestamp.toDate();

    // Format time as HH:MM (24-hour format)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get appropriate avatar image
  const getAvatarSrc = () => {
    // If there's a photoURL from the message, use it
    if (photoURL) return photoURL;

    // For other users, generate a consistent avatar based on UID
    const isAnonymousUser = !photoURL || uid.startsWith('anonymous');
    return getAvatarForUser(uid, isAnonymousUser);
  };

  // Apply the bad word filter to the message text
  const filteredText = filterBadWords(text || "");

  return (
      <div className={`message ${messageClass}`}>
        <div className="avatar-wrapper">
          <img
              src={getAvatarSrc()}
              alt="Avatar"
              onClick={startDirectMessage}
              style={{cursor: uid !== auth.currentUser?.uid ? 'pointer' : 'default'}}
              onError={(e) => {
                // Fallback if image fails to load
                e.target.onerror = null;
                e.target.src = "https://ui-avatars.com/api/?name=?&background=808080&color=fff";
              }}
          />
          {/* Only show status for other users, not for current user's messages */}
          {uid !== auth.currentUser?.uid && <StatusDot userId={uid}/>}
        </div>
        <div className="message-content">
          {!loading && <span className="username">{userName}</span>}
          {/* Replace the plain text with ReactMarkdown component */}
          <div className="message-text">
            <ReactMarkdown>{filteredText}</ReactMarkdown>
          </div>
          <span className="timestamp">{formatTimestamp(createdAt)}</span>
        </div>
      </div>
  );
}

// ChatRoom Component for the main chat interface
export function ChatRoom() {
  const auth = getAuth();
  const firestore = getFirestore();
  const messagesRef = collection(firestore, 'messages');
  const q = query(messagesRef, orderBy("createdAt"), limit(25));
  const [formValue, setFormValue] = useState("");
  const [messages] = useCollectionData(q, { idField: "id" });
  const dummy = useRef();
  const [profileData, setProfileData] = useState(null);

  // Get user profile data
  useEffect(() => {
    if (!auth.currentUser) return;

    const getUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(firestore, "userProfiles", auth.currentUser.uid));
        if (userDoc.exists()) {
          setProfileData(userDoc.data());
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    getUserProfile();
  }, [auth.currentUser, firestore]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!formValue.trim()) return;

    const { uid } = auth.currentUser;
    // Get photoURL but handle anonymous users differently
    const photoURL = auth.currentUser.isAnonymous ?
        getAvatarForUser(uid, true) :
        auth.currentUser.photoURL;

    // Get the display name from profile data or fallback
    const displayName = profileData?.displayName ||
        (auth.currentUser.isAnonymous ? "Guest User" : auth.currentUser.displayName || "User");

    try {
      await addDoc(messagesRef, {
        text: formValue,
        createdAt: serverTimestamp(),
        uid,
        photoURL,
        displayName, // Add the display name to the message
      });

      setFormValue('');
      dummy.current.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Add a help button/popup to show markdown formatting options
  const [showFormatHelp, setShowFormatHelp] = useState(false);

  const formatHelp = (
      <div className={`format-help ${showFormatHelp ? 'visible' : ''}`}>
        <h4>Markdown Formatting</h4>
        <ul>
          <li><code>**bold**</code> for <strong>bold</strong></li>
          <li><code>*italic*</code> for <em>italic</em></li>
          <li><code>~~strikethrough~~</code> for <del>strikethrough</del></li>
          <li><code>`code`</code> for <code>code</code></li>
          <li><code>```code block```</code> for code blocks</li>
          <li><code>[link](https://example.com)</code> for <a href="#">links</a></li>
        </ul>
        <button onClick={() => setShowFormatHelp(false)}>Close</button>
      </div>
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    dummy.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
      <>
        <main>
          {messages && messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
          ))}
          <div ref={dummy}></div>
        </main>
        <form onSubmit={sendMessage}>
          <button
              type="button"
              className="format-help-button"
              onClick={() => setShowFormatHelp(!showFormatHelp)}
              title="Formatting Help"
          >
            Aa
          </button>
          {showFormatHelp && formatHelp}
          <input
              value={formValue}
              onChange={(e) => setFormValue(e.target.value)}
              placeholder="Type a message... (supports markdown)"
          />
          <button type="submit" disabled={!formValue.trim()}>
            🕊️
          </button>
        </form>
      </>
  );
}