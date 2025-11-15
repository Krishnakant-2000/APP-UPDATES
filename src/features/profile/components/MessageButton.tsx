import React, { useState, useEffect } from 'react';
import { MessageSquare, Link2, Loader } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { organizationConnectionService } from '../../../services/api/organizationConnectionService';
import { db } from '../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface MessageButtonProps {
  targetUserId: string;
  targetUserName: string;
  targetUserRole?: string;
  connectionStatus: 'connected' | 'pending' | 'none';
  onConnectionRequest?: () => void;
  onOpenChat?: () => void;
}

/**
 * MessageButton Component
 * Displays the appropriate action button based on user roles and connection status
 * - For org→athlete or athlete→org: "Send Connection Request"
 * - For athlete→athlete friends: "Message"
 * - For approved connections: "Open Chat"
 */
const MessageButton: React.FC<MessageButtonProps> = ({
  targetUserId,
  targetUserName,
  targetUserRole = 'athlete',
  connectionStatus,
  onConnectionRequest,
  onOpenChat
}) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('athlete');

  // Fetch current user's role from Firestore or localStorage
  useEffect(() => {
    // First try localStorage (most reliable for immediate role check)
    const storedRole = localStorage.getItem('selectedUserRole');
    if (storedRole) {
      setCurrentUserRole(storedRole);
      return;
    }

    // Then try to fetch from Firestore if not in localStorage
    if (!currentUser) {
      setCurrentUserRole('athlete');
      return;
    }

    const fetchUserRole = async () => {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUserRole(userData.role || 'athlete');
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
        // Fallback to default if error
        setCurrentUserRole('athlete');
      }
    };

    fetchUserRole();
  }, [currentUser]);

  const isOrgToAthleteConnection =
    (currentUserRole === 'organization' && targetUserRole === 'athlete') ||
    (currentUserRole === 'athlete' && targetUserRole === 'organization');

  const handleSendConnectionRequest = async () => {
    if (!currentUser || !targetUserId) {
      setError('Please sign in to send a message');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Handle athlete-to-athlete friend requests
      if (currentUserRole === 'athlete' && targetUserRole === 'athlete') {
        // Import friend request service on demand
        const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');

        // Create friend request in Firestore
        await addDoc(collection(db, 'friendRequests'), {
          requesterId: currentUser.uid,
          requesterName: currentUser.displayName || 'Unknown Athlete',
          requesterPhotoURL: currentUser.photoURL || '',
          recipientId: targetUserId,
          recipientName: targetUserName,
          status: 'pending',
          timestamp: serverTimestamp(),
          message: `${currentUser.displayName || 'An athlete'} wants to be your friend`
        });

        console.log('✅ Friend request sent from athlete to athlete');
      } else if (currentUserRole === 'organization' || (currentUserRole === 'athlete' && targetUserRole === 'organization')) {
        // Handle organization-to-athlete connections
        if (currentUserRole === 'organization') {
          // Organization initiating connection to athlete
          await organizationConnectionService.sendConnectionRequest({
            organizationId: currentUser.uid,
            organizationName: currentUser.displayName || 'Unknown Organization',
            athleteId: targetUserId,
            athleteName: targetUserName,
            athletePhotoURL: currentUser.photoURL || '',
            requestedByUserId: currentUser.uid
          });

          console.log('✅ Connection request sent from organization');
        } else {
          // Athlete initiating connection to organization
          await organizationConnectionService.sendConnectionRequest({
            organizationId: targetUserId,
            organizationName: targetUserName,
            athleteId: currentUser.uid,
            athleteName: currentUser.displayName || 'Unknown Athlete',
            athletePhotoURL: currentUser.photoURL || '',
            requestedByUserId: currentUser.uid
          });

          console.log('✅ Connection request sent from athlete');
        }
      } else {
        // Generic connection request for other role combinations
        const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');

        await addDoc(collection(db, 'friendRequests'), {
          requesterId: currentUser.uid,
          requesterName: currentUser.displayName || 'Unknown User',
          requesterPhotoURL: currentUser.photoURL || '',
          recipientId: targetUserId,
          recipientName: targetUserName,
          status: 'pending',
          timestamp: serverTimestamp(),
          message: `${currentUser.displayName || 'A user'} wants to connect with you`
        });

        console.log('✅ Connection request sent');
      }

      if (onConnectionRequest) {
        onConnectionRequest();
      }
    } catch (err: any) {
      console.error('Error sending connection request:', err);
      setError(err.message || 'Failed to send connection request');
    } finally {
      setLoading(false);
    }
  };

  // Organization to Athlete: Show "Send Connection Request"
  if (isOrgToAthleteConnection) {
    if (connectionStatus === 'connected') {
      return (
        <button
          className="profile-action-btn message-btn"
          onClick={onOpenChat}
          disabled={loading}
          title="Open chat with this user"
        >
          <MessageSquare size={18} />
          Open Chat
        </button>
      );
    }

    if (connectionStatus === 'pending') {
      return (
        <button
          className="profile-action-btn pending-btn"
          disabled={true}
          title="Connection request pending admin approval"
        >
          <Loader size={18} className="spinning" />
          Request Pending
        </button>
      );
    }

    return (
      <>
        <button
          className="profile-action-btn connect-btn"
          onClick={handleSendConnectionRequest}
          disabled={loading}
          title="Send connection request to this user"
        >
          {loading ? (
            <>
              <Loader size={18} className="spinning" />
              Sending...
            </>
          ) : (
            <>
              <Link2 size={18} />
              Send Connection Request
            </>
          )}
        </button>
        {error && <div className="message-btn-error">{error}</div>}
      </>
    );
  }

  // Athlete to Athlete: Show connection/message button
  if (currentUserRole === 'athlete' && targetUserRole === 'athlete') {
    if (connectionStatus === 'connected') {
      return (
        <button
          className="profile-action-btn message-btn"
          onClick={onOpenChat}
          disabled={loading}
          title="Message this athlete"
        >
          <MessageSquare size={18} />
          Message
        </button>
      );
    }

    if (connectionStatus === 'pending') {
      return (
        <button
          className="profile-action-btn pending-btn"
          disabled={true}
          title="Connection request pending"
        >
          <Loader size={18} className="spinning" />
          Request Pending
        </button>
      );
    }

    // If not connected, show "Send Friend Request" button with actual functionality
    return (
      <button
        className="profile-action-btn connect-btn"
        onClick={handleSendConnectionRequest}
        disabled={loading}
        title="Send friend request to this athlete"
      >
        {loading ? (
          <>
            <Loader size={18} className="spinning" />
            Sending...
          </>
        ) : (
          <>
            <Link2 size={18} />
            Send Friend Request
          </>
        )}
      </button>
    );
  }

  // For other role combinations, show message button if connected or generic connect button
  if (connectionStatus === 'connected') {
    return (
      <button
        className="profile-action-btn message-btn"
        onClick={onOpenChat}
        disabled={loading}
        title="Message this user"
      >
        <MessageSquare size={18} />
        Message
      </button>
    );
  }

  // Default: Show generic "Connect" button for any other role combination not yet handled
  return (
    <button
      className="profile-action-btn connect-btn"
      onClick={handleSendConnectionRequest}
      disabled={loading}
      title="Connect with this user"
    >
      {loading ? (
        <>
          <Loader size={18} className="spinning" />
          Sending...
        </>
      ) : (
        <>
          <Link2 size={18} />
          Connect
        </>
      )}
    </button>
  );
};

export default MessageButton;
