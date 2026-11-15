import { readFileSync, readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const BUILD_ID = (process.env.GITHUB_SHA || Date.now().toString(36)).slice(0, 12);

function retailosPwaArtifacts(): Plugin {
  let appBase = '/';
  let projectRoot = process.cwd();
  let publicDirectory = '';
  return {
    name: 'retailos-pwa-artifacts',
    apply: 'build',
    configResolved(config) {
      appBase = config.base;
      projectRoot = config.root;
      publicDirectory = config.publicDir || '';
    },
    transformIndexHtml(html) {
      const bootGuard = `
    <meta name="retailos-build-id" content="${BUILD_ID}" />
    <script>
      (() => {
        const buildId = document.querySelector('meta[name="retailos-build-id"]')?.content;
        let healthy = false;
        window.addEventListener('retailos:boot-healthy', () => { healthy = true; }, { once: true });
        window.setTimeout(() => {
          if (healthy || !buildId) return;
          navigator.serviceWorker?.controller?.postMessage({ type: 'APP_BOOT_FAILED', buildId });
        }, 30000);
      })();
    </script>`;
      return html.replace('</head>', `${bootGuard}\n  </head>`);
    },
    generateBundle(_options, bundle) {
      const isCacheableAsset = (file: string) => /\.(?:js|css|wasm|woff2?|ttf|otf|png|jpe?g|svg|webp|avif)$/i.test(file);
      const bundledAssets = Object.keys(bundle).filter((file) => /^assets\//.test(file) && isCacheableAsset(file));
      const publicAssets: string[] = [];
      const collectPublicAssets = (directory: string) => {
        if (!directory || !publicDirectory) return;
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          const absolutePath = resolve(directory, entry.name);
          if (entry.isDirectory()) collectPublicAssets(absolutePath);
          else if (entry.isFile()) {
            const relativePath = relative(publicDirectory, absolutePath).split(sep).join('/');
            if (isCacheableAsset(relativePath)) publicAssets.push(relativePath);
          }
        }
      };
      collectPublicAssets(publicDirectory);
      const assetFiles = [...new Set([...bundledAssets, ...publicAssets])].sort();
      const template = readFileSync(resolve(projectRoot, 'src/sw/service-worker.template.js'), 'utf8');
      const worker = template
        .replace('__BUILD_ID__', BUILD_ID)
        .replace('__APP_BASE__', appBase)
        .replace('__ASSET_PATHS__', JSON.stringify(assetFiles));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: worker });
    },
  };
}

export default defineConfig({
  plugins: [react(), retailosPwaArtifacts()],
  define: { __RETAILOS_BUILD_ID__: JSON.stringify(BUILD_ID) },
  build: { manifest: true },
});
