// StatusIndicator.js - A reusable component for displaying user online status

import React from 'react';
import { useUserStatus, formatLastSeen } from './UserStatus';

export const StatusIndicator = ({ userId, showLastSeen = false, size = 'medium' }) => {
    const { isOnline, lastSeen } = useUserStatus(userId);

    // Determine size class for dot
    let sizeClass;
    switch (size) {
        case 'small':
            sizeClass = 'status-indicator-sm';
            break;
        case 'large':
            sizeClass = 'status-indicator-lg';
            break;
        default:
            sizeClass = 'status-indicator-md';
    }

    return (
        <div className="status-indicator-container">
            <div className={`status-indicator ${isOnline ? 'online' : 'offline'} ${sizeClass}`}
                 title={isOnline ? 'Online' : lastSeen ? `Last seen ${formatLastSeen(lastSeen)}` : 'Offline'} />

            {showLastSeen && lastSeen && !isOnline && (
                <span className="last-seen-text">
          Last seen {formatLastSeen(lastSeen)}
        </span>
            )}
        </div>
    );
};