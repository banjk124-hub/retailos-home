import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const BUILD_ID = (process.env.GITHUB_SHA || Date.now().toString(36)).slice(0, 12);
const APP_VERSION = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')).version as string;
const SHELL_PATHS = new Set(['index.html', 'manifest.webmanifest', 'icon.svg']);

function toBuffer(source: string | Uint8Array): Buffer {
  return typeof source === 'string' ? Buffer.from(source) : Buffer.from(source);
}

function describeResource(path: string, source: string | Uint8Array, cache: 'shell' | 'assets') {
  const bytes = toBuffer(source);
  return {
    path,
    cache,
    size: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

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
      return html.replace('</head>', `${bootGuard}
  </head>`);
    },
    generateBundle(_options, bundle) {
      const assetResources: Array<{ path: string; source: string | Uint8Array; cache: 'assets' }> = [];
      for (const fileName of Object.keys(bundle).sort()) {
        if (!fileName.startsWith('assets/') || fileName.endsWith('.map')) continue;
        const output = bundle[fileName];
        assetResources.push({
          path: fileName,
          source: output.type === 'chunk' ? output.code : output.source,
          cache: 'assets',
        });
      }

      const collectPublicAssets = (directory: string) => {
        if (!directory || !publicDirectory) return;
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          const absolutePath = resolve(directory, entry.name);
          if (entry.isDirectory()) {
            collectPublicAssets(absolutePath);
          } else if (entry.isFile() && !entry.name.endsWith('.map')) {
            const path = relative(publicDirectory, absolutePath).split(sep).join('/');
            if (!SHELL_PATHS.has(path)) {
              assetResources.push({ path, source: readFileSync(absolutePath), cache: 'assets' });
            }
          }
        }
      };
      collectPublicAssets(publicDirectory);

      const indexOutput = bundle['index.html'];
      if (!indexOutput || indexOutput.type !== 'asset') {
        throw new Error('RetailOS release manifest requires the final generated index.html asset.');
      }
      const shellResources = [
        describeResource('index.html', indexOutput.source, 'shell'),
        describeResource('manifest.webmanifest', readFileSync(resolve(publicDirectory, 'manifest.webmanifest')), 'shell'),
        describeResource('icon.svg', readFileSync(resolve(publicDirectory, 'icon.svg')), 'shell'),
      ];
      const resources = [
        ...shellResources,
        ...assetResources.map((resource) => describeResource(resource.path, resource.source, resource.cache)),
      ];
      const releaseNotes = JSON.parse(readFileSync(resolve(projectRoot, 'release-notes.json'), 'utf8'));
      if (!releaseNotes.version || !releaseNotes.title || !releaseNotes.summary || !Array.isArray(releaseNotes.sections)) {
        throw new Error('release-notes.json must define version, title, summary and sections.');
      }
      const manifest = {
        schemaVersion: 1,
        buildId: BUILD_ID,
        base: appBase,
        publishedAt: new Date().toISOString(),
        version: releaseNotes.version,
        title: releaseNotes.title,
        summary: releaseNotes.summary,
        sections: releaseNotes.sections,
        compatibility: Array.isArray(releaseNotes.compatibility) ? releaseNotes.compatibility : [],
        warnings: Array.isArray(releaseNotes.warnings) ? releaseNotes.warnings : [],
        resources,
      };
      this.emitFile({
        type: 'asset',
        fileName: 'release-manifest.json',
        source: JSON.stringify(manifest),
      });

      const assetFiles = [...new Set(assetResources.map((resource) => resource.path))].sort();
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
  define: {
    __RETAILOS_BUILD_ID__: JSON.stringify(BUILD_ID),
    __RETAILOS_APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  build: { manifest: true },
});
