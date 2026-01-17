import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // Get git commit hash
  let commitHash = 'dev';
  try {
    commitHash = execSync('git rev-parse --short HEAD').toString().trim();
  } catch (e) {
    console.warn('Could not get git commit hash', e);
  }

  return {
    server: {
      port: 5000,
      host: '0.0.0.0',
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 5000,
        clientPort: 5000
      },
      // 👇 Esto permite que Vite acepte peticiones desde Replit
      allowedHosts: ['.netlify.app']
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
      'import.meta.env.VITE_COMMIT_HASH': JSON.stringify(commitHash)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
