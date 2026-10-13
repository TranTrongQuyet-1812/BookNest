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

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@booknest/shared/api': path.join(thuMucDuAn, 'packages/shared/src/api.js'),
      '@booknest/shared/auth': path.join(thuMucDuAn, 'packages/shared/src/context/AuthContext.jsx'),
      react: path.join(thuMucStorefront, 'node_modules/react'),
      'react-dom': path.join(thuMucStorefront, 'node_modules/react-dom'),
      'react-router-dom': path.join(thuMucStorefront, 'node_modules/react-router-dom'),
      axios: path.join(thuMucStorefront, 'node_modules/axios'),
      'lucide-react': path.join(thuMucStorefront, 'node_modules/lucide-react'),
      zustand: path.join(thuMucStorefront, 'node_modules/zustand')
    }
  },
  server: {
    port: 5174,
    fs: { allow: [thuMucDuAn] },
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } }
  }
});
