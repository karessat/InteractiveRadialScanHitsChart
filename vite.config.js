import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Build optimizations
  build: {
    // Enable source maps for debugging
    sourcemap: false, // Set to true for debugging in production
    
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          vendor: ['react', 'react-dom'],
          utils: ['axios'],
        },
      },
    },
    
    // Optimize bundle size
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
    
    // Set chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  
  // Development server optimizations
  server: {
    port: 5173,
    open: true, // Auto-open browser
    cors: true,
  },
  
  // Preview server settings
  preview: {
    port: 4173,
    open: true,
  },
  
  // CSS optimization
  css: {
    devSourcemap: true,
  },
  
  // Asset optimization
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg'],
});

