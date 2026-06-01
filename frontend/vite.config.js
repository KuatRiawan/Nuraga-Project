import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import commonjs from '@rollup/plugin-commonjs'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
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
    css: {
        postcss: {
            plugins: [
                tailwindcss(),
                autoprefixer(),
            ],
        },
    },
    build: {
        rollupOptions: {
            plugins: [
                commonjs({
                    transformMixedEsModules: true,
                    include: /node_modules/,
                })
            ]
        },
        commonjsOptions: {
            transformMixedEsModules: true,
        },
    },
    optimizeDeps: {
        esbuildOptions: {
            loader: {
                '.js': 'jsx'
            }
        },
        include: ['react', 'react-dom', 'recharts', 'prop-types', 'react-is']
    },
})
