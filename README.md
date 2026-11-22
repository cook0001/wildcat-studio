# Wildcat Studio

![Version](https://img.shields.io/badge/version-1.1.1-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Tauri](https://img.shields.io/badge/tauri-v2-24C8DB.svg)
[![Website](https://img.shields.io/badge/website-wildcat.armstrader.store-06b6d4.svg)](https://wildcat.armstrader.store/)

Desktop cartridge CAD, chamber reamer specification, and internal ballistics volumetrics suite built with **Tauri 2**, **Rust**, **React 19**, **TypeScript**, and **Three.js**.

This repository ([`cook0001/wildcat-studio`](https://github.com/cook0001/wildcat-studio)) is the single public home for source code, signed release builds, and the project website ([wildcat.armstrader.store](https://wildcat.armstrader.store/)).

---

## Downloads & Built-In Auto-Updater

Installers for **macOS (Universal: Apple Silicon & Intel)**, **Windows (x64 & ARM64)**, and **Linux (x64 & ARM64: AppImage / deb / rpm)** are published on the [GitHub Releases](https://github.com/cook0001/wildcat-studio/releases) page alongside `SHA256SUMS.txt`.

- **Auto-Updater**: Release builds check [`latest.json`](https://github.com/cook0001/wildcat-studio/releases/latest/download/latest.json) via `@tauri-apps/plugin-updater`, download platform updates with progress feedback, verify signatures against the bundled Minisign public key, and relaunch natively (`restart_app`).
- **Signing & Notarization**:
  - **Updater payload signing**: Controlled by `bundle.createUpdaterArtifacts: true` in [`src-tauri/tauri.conf.json`](src-tauri/tauri.conf.json) and `TAURI_SIGNING_PRIVATE_KEY` (with optional `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`) during builds and [`.github/workflows/release.yml`](.github/workflows/release.yml).
  - **macOS Developer ID signing & notarization**: Configured with `"hardenedRuntime": true` and `"minimumSystemVersion": "10.15"`. CI signs with `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, and `APPLE_SIGNING_IDENTITY`, and notarizes via App Store Connect API (`APPLE_API_KEY`, `APPLE_API_ISSUER`, `APPLE_API_KEY_P8`). If `APPLE_CERTIFICATE` is omitted, CI falls back to ad-hoc signing (`-`).

---

## Architecture & Capabilities

- **Frontend (`src/`)**: React 19, TypeScript, interactive SVG 2D blueprint/cutaway drafting canvas with direct dimension editing, Three.js 3D solid lathe viewport with cutaway & binary STL export, Miller twist stability, case forming, chamber setback, headspace gauge, and cartridge comparison tools.
- **Rust Backend (`src-tauri/`)**: Tauri 2 desktop runtime, 1,000-slice composite Simpson volumetric integrator, chamber reamer clearance solver, rechamber setback analyzer, AutoCAD `.dxf` and QuickLOAD `.vol` generators, Typst PDF / native OS print bridges, and macOS/desktop document associations.
- **File Interchange**: `.wildcat` / `.wcs`, QuickLOAD `.vol` / `.qdf`, LoadBench `.loadbench`, RangeStudio `.rsb`, AutoCAD `.dxf`, and binary `.stl` meshes.

---

## Local Development & Verification

```bash
# Install frontend dependencies
npm ci

# Run desktop development app
npm run tauri dev

# Frontend typecheck and production bundle
npm run typecheck
npm run build

# Rust backend checks and unit tests
cargo check --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml

# Full pre-flight verification script
npm run verify
```

To create signed local release bundles with updater artifacts, set `TAURI_SIGNING_PRIVATE_KEY` (generated via `npx tauri signer generate`) in your environment before running `npm run tauri build`.

---

## Security Policy & Checksums

- See [SECURITY.md](SECURITY.md) for vulnerability disclosure guidelines and binary hash verification.
- Official release checksums are attached to every release in `SHA256SUMS.txt`.

---

## Reloading & Tooling Safety Disclaimer

All dimensions, water capacity calculations, forming notes, and predicted pressures or trajectories are mathematical approximations intended strictly for drafting, chamber comparison, and reference. Always verify chamber headspace with physical GO / NO-GO / FIELD gauges and consult published reloading manuals before chambering barrels or assembling live ammunition.

---

## Related Projects

- **[ArmsTrader (armstrader.store)](https://armstrader.store)** — Web utilities suite for firearm owners.
- **[ArmoryVault](https://github.com/cook0001/armoryvault)** — Desktop firearm inventory, compliance & vault logistics suite.
- **[LoadBench Studio](https://armstrader.store/loadbench)** & **[RangeStudio](https://armstrader.store/rangestudio)** — Companion interior/exterior ballistics tools.

---

## License

Released under the [MIT License](LICENSE). Copyright (c) 2026 Daniel Cook / Wildcat Studio.
