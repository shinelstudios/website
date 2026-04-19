// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import compression from "vite-plugin-compression";

export default defineConfig({
  // Honour VITE_BASE at build time. In CI (GitHub Pages workflow) we set it to
  // "/" for a custom-domain setup or "/website/" for the default github.io subpath.
  // Locally (`npm run dev` / `npm run build`) it defaults to "/" so nothing breaks.
  base: process.env.VITE_BASE || "/",
  plugins: [
    react(),
    // Brotli compression (better than gzip, ~20% smaller)
    compression({
      algorithm: "brotliCompress",
      ext: ".br",
      threshold: 1024, // Only compress files > 1KB
      deleteOriginFile: false,
    }),
    // Gzip compression (fallback for older browsers)
    compression({
      algorithm: "gzip",
      ext: ".gz",
      threshold: 1024,
      deleteOriginFile: false,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@components": path.resolve(__dirname, "src/components"),
      "@pages": path.resolve(__dirname, "src/pages"),
      "@assets": path.resolve(__dirname, "src/assets"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Optimized manual chunking for better caching
        manualChunks: {
          // Core React libraries (rarely changes)
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Animation library (medium size, separate for better caching)
          "vendor-motion": ["framer-motion"],
          // Icon library (large, separate chunk)
          "vendor-icons": ["lucide-react"],
          // Helmet for SEO (small but separate)
          "vendor-helmet": ["react-helmet-async"],
        },
        // Standard naming for better compatibility
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    // esbuild minifier is faster than terser; drop console/debugger via its own options.
    // The prior `terserOptions` block was dead code (terser only runs when minify:"terser").
    minify: "esbuild",
    sourcemap: false,
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 600, // Warn if chunk > 600KB
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Target modern browsers for smaller bundles
    target: 'es2015',
    // Optimize asset inlining
    assetsInlineLimit: 4096, // Inline assets < 4KB as base64
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
        ws: true,
        // keep the path as-is
        rewrite: (p) => p,
      },
    },
  },
  // esbuild options: strip console/debugger from production bundle.
  esbuild: {
    drop: ['console', 'debugger'],
    legalComments: 'none',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
    exclude: [],
  },
});
