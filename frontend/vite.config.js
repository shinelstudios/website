// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import compression from "vite-plugin-compression";

// PHASE 2 · TODO — add build-time OG image generator + pre-rendering.
//   OG: add `@vercel/og` or `satori` here; emit 1200x630 PNG per route to
//       public/og/<slug>.png. Reference via MetaTags.jsx ogImage prop.
//   Prerender: add `vite-plugin-prerender` for /, /work, /team, /team/:slug,
//       /pricing, /services/*, /blog, /case-studies. Dynamic slugs come
//       from a live fetch of /team and /blog.json at build time (mirror
//       the pattern already used in scripts/generate-sitemap.js).
// See CLAUDE.md "Phase 2 roadmap" #4 and #5.

export default defineConfig({
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
