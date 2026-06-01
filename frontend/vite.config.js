import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    // Pengaturan server Ngrok kamu tetap aman di sini
    server: {
        host: '0.0.0.0',
        allowedHosts: ['unfoolishly-horsiest-gudrun.ngrok-free.dev', '.ngrok-free.dev'],
        proxy: {
            '/api': {
                target: 'http://localhost:5001',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, '/api'),
            },
            '/uploads': {
                target: 'http://localhost:5001',
                changeOrigin: true,
            },
            '/socket.io': {
                target: 'http://localhost:5001',
                changeOrigin: true,
                ws: true,
            },
        },
    },
    // Pengaturan Tailwind tetap dipertahankan
    css: {
        postcss: {
            plugins: [
                tailwindcss(),
                autoprefixer(),
            ],
        },
    }
})