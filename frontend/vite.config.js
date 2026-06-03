import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const backendUrl = env.VITE_BACKEND_BASE_URL || env.VITE_API_BASE_URL?.replace(/\/api\/?$/, '');

    return {
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        proxy: backendUrl ? {
            '/api': {
                target: backendUrl,
                changeOrigin: true,
                secure: false,
            },
            '/uploads': {
                target: backendUrl,
                changeOrigin: true,
                secure: false,
            },
            '/socket.io': {
                target: backendUrl,
                changeOrigin: true,
                ws: true,
                secure: false,
            },
        } : {},
    },
    css: {
        postcss: {
            plugins: [
                tailwindcss(),
                autoprefixer(),
            ],
        },
    },
    };
})
