import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

let socket;

export const useSocket = () => {
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!socket) {
            // Adjust URL to point to backend. 
            // In dev mode, React runs on 5173 and Node on 5000.
            const backendUrl = import.meta.env.VITE_API_URL 
                ? import.meta.env.VITE_API_URL.replace('/api', '') 
                : 'http://localhost:5000';
                
            socket = io(backendUrl);

            socket.on('connect', () => {
                setIsConnected(true);
            });

            socket.on('disconnect', () => {
                setIsConnected(false);
            });
        }

        return () => {
            // Keep socket alive across unmounts to prevent reconnection spam
            // if we want it to be app-wide.
        };
    }, []);

    return { socket, isConnected };
};
