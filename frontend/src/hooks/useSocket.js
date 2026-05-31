import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

let socket;

export const useSocket = () => {
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!socket) {
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
            const backendUrl = import.meta.env.VITE_SOCKET_URL ||
                (apiBaseUrl.startsWith('http') ? apiBaseUrl.replace(/\/api\/?$/, '') : window.location.origin);

            // Get JWT token from localStorage
            const token = localStorage.getItem('token');

            socket = io(backendUrl, {
                auth: {
                    token: token
                }
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
        }

        return () => {
            // Keep socket alive across unmounts to prevent reconnection spam
            // if we want it to be app-wide.
        };
    }, []);

    return { socket, isConnected };
};
