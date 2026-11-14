import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function retailosPwaArtifacts(): Plugin {
  let appBase = '/';
  let projectRoot = process.cwd();
  return {
    name: 'retailos-pwa-artifacts',
    apply: 'build',
    configResolved(config) {
      appBase = config.base;
      projectRoot = config.root;
    },
    generateBundle(_options, bundle) {
      const assetFiles = Object.keys(bundle).filter((file) =>
        /^assets\//.test(file) && /\.(?:js|css|woff2?|ttf|otf|png|jpe?g|svg|webp|avif)$/i.test(file)
      ).sort();
      const buildId = (process.env.GITHUB_SHA || Date.now().toString(36)).slice(0, 12);
      const template = readFileSync(resolve(projectRoot, 'src/sw/service-worker.template.js'), 'utf8');
      const worker = template
        .replace('__BUILD_ID__', buildId)
        .replace('__APP_BASE__', appBase)
        .replace('__ASSET_PATHS__', JSON.stringify(assetFiles));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: worker });
    },
  };
}

export default defineConfig({
  plugins: [react(), retailosPwaArtifacts()],
  build: {
    manifest: true,
  },
});
