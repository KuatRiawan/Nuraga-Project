import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

let socket = null;
let subscribers = 0;

export const useSocket = () => {
    const [isConnected, setIsConnected] = useState(socket?.connected || false);

    useEffect(() => {
        subscribers++;

        if (!socket) {
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
            const backendUrl = import.meta.env.VITE_SOCKET_URL ||
                (apiBaseUrl.startsWith('http') ? apiBaseUrl.replace(/\/api\/?$/, '') : window.location.origin);

            socket = io(backendUrl, {
                withCredentials: true,
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
            });
        }

        const handleConnect = () => setIsConnected(true);
        const handleDisconnect = () => setIsConnected(false);
        const handleError = (error) => {
            console.error('Socket connection error:', error.message);
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleError);
        
        setIsConnected(socket.connected);

        return () => {
            subscribers--;
            if (socket) {
                socket.off('connect', handleConnect);
                socket.off('disconnect', handleDisconnect);
                socket.off('connect_error', handleError);
            }

            if (subscribers === 0 && socket) {
                socket.disconnect();
                socket = null;
            }
        };
    }, []);

    return { socket, isConnected };
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
        subscribers = 0;
    }
};
