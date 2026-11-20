#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Deterministically builds Tauri v2's `latest.json` updater manifest from a release-assets directory
 * containing signed bundles and `.sig` files, avoiding parallel CI matrix read-modify-write races.
 */
export function buildUpdaterManifest({ assetsDir, repo, tagName, notes }) {
  const files = new Set(readdirSync(assetsDir));
  const platforms = {};

  const attach = (key, filename) => {
    if (!filename) return;
    const sigName = `${filename}.sig`;
    if (!files.has(sigName)) return;
    const signature = readFileSync(join(assetsDir, sigName), 'utf8').trim();
    if (!signature) return;
    platforms[key] = {
      signature,
      url: `https://github.com/${repo}/releases/download/${encodeURIComponent(tagName)}/${encodeURIComponent(filename)}`,
    };
  };

  const findSignedAsset = (pattern) => {
    for (const f of files) {
      if (!f.endsWith('.sig') && pattern.test(f) && files.has(`${f}.sig`)) {
        return f;
      }
    }
    return null;
  };

  // macOS Universal (covers both Apple Silicon and Intel Macs)
  const macUniversalTar = findSignedAsset(/_universal\.app\.tar\.gz$/);
  for (const key of [
    'darwin-aarch64',
    'darwin-x86_64',
    'darwin-universal',
    'darwin-aarch64-app',
    'darwin-x86_64-app',
    'darwin-universal-app',
  ]) {
    attach(key, macUniversalTar);
  }

  // Windows x64
  const winX64Nsis = findSignedAsset(/_x64-setup\.exe$/);
  const winX64Msi = findSignedAsset(/_x64.*\.msi$/);
  attach('windows-x86_64', winX64Nsis || winX64Msi);
  attach('windows-x86_64-nsis', winX64Nsis);
  attach('windows-x86_64-msi', winX64Msi);

  // Windows ARM64
  const winArm64Nsis = findSignedAsset(/(?:_arm64|_aarch64)-setup\.exe$/);
  const winArm64Msi = findSignedAsset(/(?:_arm64|_aarch64).*\.msi$/);
  attach('windows-aarch64', winArm64Nsis || winArm64Msi);
  attach('windows-aarch64-nsis', winArm64Nsis);
  attach('windows-aarch64-msi', winArm64Msi);

  // Linux x86_64
  const linuxX64AppImage = findSignedAsset(/(?:_amd64|_x86_64)\.AppImage$/);
  const linuxX64Deb = findSignedAsset(/_amd64\.deb$/);
  const linuxX64Rpm = findSignedAsset(/\.x86_64\.rpm$/);
  attach('linux-x86_64', linuxX64AppImage || linuxX64Deb || linuxX64Rpm);
  attach('linux-x86_64-appimage', linuxX64AppImage);
  attach('linux-x86_64-deb', linuxX64Deb);
  attach('linux-x86_64-rpm', linuxX64Rpm);

  // Linux ARM64
  const linuxArm64AppImage = findSignedAsset(/(?:_aarch64|_arm64)\.AppImage$/);
  const linuxArm64Deb = findSignedAsset(/(?:_arm64|_aarch64)\.deb$/);
  const linuxArm64Rpm = findSignedAsset(/\.aarch64\.rpm$/);
  attach('linux-aarch64', linuxArm64AppImage || linuxArm64Deb || linuxArm64Rpm);
  attach('linux-aarch64-appimage', linuxArm64AppImage);
  attach('linux-aarch64-deb', linuxArm64Deb);
  attach('linux-aarch64-rpm', linuxArm64Rpm);

  return {
    version: tagName.replace(/^v/, ''),
    notes: notes?.trim() || 'Wildcat Studio desktop release.',
    pub_date: new Date().toISOString(),
    platforms,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [, , assetsDir = 'release-assets', repo, tagName, notesPath, outPath = join(assetsDir, 'latest.json')] = process.argv;
  if (!repo || !tagName) {
    console.error('Usage: generate-updater-manifest.mjs <assetsDir> <owner/repo> <tagName> [notesPath] [outPath]');
    process.exit(1);
  }
  const notes = notesPath && existsSync(notesPath) ? readFileSync(notesPath, 'utf8') : '';
  const manifest = buildUpdaterManifest({ assetsDir, repo, tagName, notes });
  const platformCount = Object.keys(manifest.platforms).length;
  if (platformCount === 0) {
    console.error(`No signed updater assets found in ${assetsDir}`);
    process.exit(1);
  }
  writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Generated ${outPath} with ${platformCount} platform mappings:`, Object.keys(manifest.platforms).join(', '));
}
