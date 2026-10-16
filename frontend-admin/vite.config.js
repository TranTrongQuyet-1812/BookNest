import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const thuMucDuAn = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const thuMucStorefront = path.join(thuMucDuAn, 'frontend');
const requireTuAdmin = createRequire(import.meta.url);
const requireTuStorefront = createRequire(path.join(thuMucStorefront, 'package.json'));
const timModule = (tenModule) => {
  try { return requireTuAdmin.resolve(tenModule); }
  catch { return requireTuStorefront.resolve(tenModule); }
};
const [{ defineConfig }, { default: react }] = await Promise.all([
  import(pathToFileURL(timModule('vite'))),
  import(pathToFileURL(timModule('@vitejs/plugin-react')))
]);

import fs from 'node:fs';

const timDuongDanModule = (ten) => {
  const oAdmin = path.join(thuMucDuAn, 'frontend-admin/node_modules', ten);
  if (fs.existsSync(oAdmin)) return oAdmin;
  const oStorefront = path.join(thuMucStorefront, 'node_modules', ten);
  if (fs.existsSync(oStorefront)) return oStorefront;
  const oRoot = path.join(thuMucDuAn, 'node_modules', ten);
  if (fs.existsSync(oRoot)) return oRoot;
  return ten;
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@booknest/shared/api': path.join(thuMucDuAn, 'packages/shared/src/api.js'),
      '@booknest/shared/auth': path.join(thuMucDuAn, 'packages/shared/src/context/AuthContext.jsx'),
      react: timDuongDanModule('react'),
      'react-dom': timDuongDanModule('react-dom'),
      'react-router-dom': timDuongDanModule('react-router-dom'),
      axios: timDuongDanModule('axios'),
      'lucide-react': timDuongDanModule('lucide-react'),
      zustand: timDuongDanModule('zustand')
    }
  },
  server: {
    port: 5174,
    fs: { allow: [thuMucDuAn] },
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } }
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-lucide';
          }
        }
      }
    }
  }
});
