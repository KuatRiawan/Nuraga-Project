import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import commonjs from '@rollup/plugin-commonjs'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        mainFields: ['module', 'main', 'browser'],
        alias: {
            // recharts 2.11.0 has a packaging bug: es6/index.js references ./numberAxis/Funnel
            // which is missing from the published package. Force the UMD pre-bundled build
            // to avoid the broken ES6 module resolution during Vite/Rollup production build.
            recharts: path.resolve(__dirname, 'node_modules/recharts/umd/Recharts.js'),
        },
    },
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
        target: 'es2020',
    },
    optimizeDeps: {
        esbuildOptions: {
            loader: {
                '.js': 'jsx'
            },
            target: 'es2020',
        },
        include: ['react', 'react-dom', 'react-is', 'recharts']
    },
})
