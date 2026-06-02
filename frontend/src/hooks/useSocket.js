import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// Memory leak fix: Remove singleton pattern, manage socket lifecycle properly
let socket = null;

export const useSocket = () => {
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
        const backendUrl = import.meta.env.VITE_SOCKET_URL ||
            (apiBaseUrl.startsWith('http') ? apiBaseUrl.replace(/\/api\/?$/, '') : window.location.origin);

        // Get JWT token from localStorage
        const token = localStorage.getItem('token');

        // Create socket with reconnection strategy
        socket = io(backendUrl, {
            auth: {
                token: token
            },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        socket.on('connect', () => {
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error.message);
            if (error.message === 'Authentication error') {
                console.error('Socket authentication failed - invalid or missing token');
            }
        });

        // Cleanup: disconnect socket on unmount to prevent memory leak
        return () => {
            if (socket) {
                socket.disconnect();
                socket = null;
            }
        };
    }, []);

    return { socket, isConnected };
};

// Export disconnect function for manual cleanup (e.g., on logout)
export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
