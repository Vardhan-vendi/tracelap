import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "zustand",
      "lucide-react",
      "@monaco-editor/react",
      "@xyflow/react",
    ],
    exclude: ["monaco-editor"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("monaco-editor") || id.includes("@monaco-editor")) {
            return "vendor-monaco";
          }
          if (id.includes("@xyflow")) {
            return "vendor-xyflow";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-icons";
          }
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/zustand/")
          ) {
            return "vendor-react";
          }
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
})
