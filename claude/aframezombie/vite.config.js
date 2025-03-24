// vite.config.js
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    // Define the public folder assets to include GLB files
    assetsInclude: ['**/*.glb'],

    // For css URL for FONT and path aliases
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '')
        }
    },

    // Development server configuration
    server: {
        host: true,
        open: true
    }
});