import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Path resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/stores': path.resolve(__dirname, './src/stores'),
      '@/styles': path.resolve(__dirname, './src/styles'),
      '@/assets': path.resolve(__dirname, './src/assets'),
      '@/config': path.resolve(__dirname, './src/config')
    }
  },

  // CSS configuration
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables.scss" as *; @use "@/styles/mixins.scss" as *;`,
        silenceDeprecations: ['legacy-js-api']
      }
    },
    modules: {
      localsConvention: 'camelCaseOnly'
    }
  },

  // Development server
  server: {
    port: 3000,
    host: true,
    open: true,
    cors: true,
    proxy: {
      // Proxy API requests to backend
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/health': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      // WebSocket proxy
      '/socket.io': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true
      }
    },
    // Hot Module Replacement
    hmr: {
      overlay: true
    }
  },

  // Build configuration
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    
    // Optimize chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk
          vendor: [
            'react',
            'react-dom',
            'react-router-dom'
          ],
          // UI chunk
          ui: [
            'framer-motion',
            'lucide-react',
            'react-hot-toast'
          ],
          // Utils chunk
          utils: [
            'lodash',
            'date-fns',
            'uuid'
          ],
          // Code highlighting chunk
          highlight: [
            'react-syntax-highlighter',
            'prism-react-renderer'
          ],
          // Charts chunk
          charts: [
            'recharts'
          ]
        }
      }
    },
    
    // Terser options for optimization
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    
    // Asset optimization
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000
  },

  // Preview server (for production build testing)
  preview: {
    port: 3000,
    host: true,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/health': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      }
    }
  },

  // Environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },

  // Optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'lucide-react',
      'react-markdown',
      'react-syntax-highlighter',
      'react-hot-toast',
      'zustand',
      'react-query',
      'axios',
      'socket.io-client',
      'lodash',
      'uuid',
      'date-fns',
      'recharts'
    ],
    exclude: [
      'react-error-boundary'
    ]
  },

  // Worker configuration
  worker: {
    format: 'es'
  },

  // Experimental features
  experimental: {
    renderBuiltUrl(filename: string, { hostType }: { hostType: 'js' | 'css' | 'html' }) {
      if (hostType === 'js') {
        return { js: `/${filename}` };
      } else {
        return { relative: true };
      }
    }
  },

  // ESBuild configuration
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    target: 'es2020',
    format: 'esm',
    platform: 'browser'
  },

  // JSON configuration
  json: {
    namedExports: true,
    stringify: false
  }
});