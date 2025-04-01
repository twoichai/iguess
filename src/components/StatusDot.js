// StatusDot.js - Minimal status indicator component

import React from 'react';
import { useIsUserOnline } from './UserStatus';

function StatusDot({ userId }) {
    const isOnline = useIsUserOnline(userId);

    return (
        <div
            className={`status-dot ${isOnline ? 'online' : 'offline'}`}
            title={isOnline ? 'Online' : 'Offline'}
        />
    );
}

export default StatusDot;