# Wildcat Studio

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-Proprietary%20Freeware-green.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)
![macOS Architecture](https://img.shields.io/badge/macOS-Apple%20Silicon%20%26%20Intel%20Universal-purple.svg)

**Wildcat Studio** is an industrial-grade desktop computer-aided drafting (CAD) and internal ballistics volumetrics suite engineered for custom cartridge wildcatters, custom gunsmiths, reamer toolmakers, and ballistics researchers.

---

## 📥 Downloads & Installation

Pre-compiled standalone installers are available on the **[Releases](https://github.com/cook0001/wildcat-studio/releases)** page:

| Operating System | Architecture | Package Format | Direct Download Link |
| :--- | :--- | :--- | :--- |
| **macOS** | Apple Silicon (M1/M2/M3/M4) & Intel (x86_64) | Universal `.dmg` (7.2 MB) | [📥 Download macOS Universal DMG](https://github.com/cook0001/wildcat-studio/releases/download/v1.0.0/Wildcat-Studio-v1.0.0-universal.dmg) |
| **Windows** | Windows 10 / 11 (64-bit) | `.exe` Setup (3.2 MB) | [📥 Download Windows Setup (.exe)](https://github.com/cook0001/wildcat-studio/releases/download/v1.0.0/Wildcat.Studio_1.0.0_x64-setup.exe) |
| **Windows** | Windows 10 / 11 (64-bit) | `.msi` Package (3.8 MB) | [📥 Download Windows MSI (.msi)](https://github.com/cook0001/wildcat-studio/releases/download/v1.0.0/Wildcat.Studio_1.0.0_x64_en-US.msi) |
| **Linux** | Modern 64-bit Linux (All distros) | Standalone `.AppImage` (78 MB) | [📥 Download Linux AppImage](https://github.com/cook0001/wildcat-studio/releases/download/v1.0.0/Wildcat.Studio_1.0.0_amd64.AppImage) |
| **Linux** | Ubuntu / Debian (64-bit) | `.deb` Package (4.2 MB) | [📥 Download Debian/Ubuntu (.deb)](https://github.com/cook0001/wildcat-studio/releases/download/v1.0.0/Wildcat.Studio_1.0.0_amd64.deb) |
| **Linux** | Fedora / RHEL (64-bit) | `.rpm` Package (4.2 MB) | [📥 Download RedHat/Fedora (.rpm)](https://github.com/cook0001/wildcat-studio/releases/download/v1.0.0/Wildcat.Studio-1.0.0-1.x86_64.rpm) |

### macOS Installation Note
1. Download `Wildcat-Studio-v1.0.0-universal.dmg`.
2. Double-click the `.dmg` and drag **Wildcat Studio** into your **Applications** folder.
3. On first launch, if macOS displays an unidentified developer prompt, right-click the app in Applications and click **Open**.

---

## 🔐 Cryptographic Verification & Checksums

To verify binary package authenticity and guard against corrupted or tampered downloads, verify your downloaded file's SHA-256 digest against [`SHA256SUMS.txt`](https://github.com/cook0001/wildcat-studio/releases/download/v1.0.0/SHA256SUMS.txt):

| Release Asset | SHA-256 Digest |
| :--- | :--- |
| `Wildcat-Studio-v1.0.0-universal.dmg` | `f614dcb79e9ff58aa4288443c642f36b643aca8e387d95f7f0418177fac62432` |
| `Wildcat.Studio_1.0.0_x64-setup.exe` | `73899bcf9b6bc481e060f5da4fe8f2ea3bba6cb0cdcb20aa53242711b0ae05e9` |
| `Wildcat.Studio_1.0.0_x64_en-US.msi` | `cb71586868a28ff381bb9755a971c65a31e3596a33599ab91be0353f17c9d72f` |
| `Wildcat.Studio_1.0.0_amd64.AppImage` | `c0ad4713d8c6f17477f869d7699e254ab7d400f5e2f1f23af3e307a1ce045908` |
| `Wildcat.Studio_1.0.0_amd64.deb` | `de40c7be793061927fa29b4f4a71411bebb4d2a547961c55ac05a75ec316d9ca` |
| `Wildcat.Studio-1.0.0-1.x86_64.rpm` | `4548d97236d1ef6612f295ad2dde6b307952886d99a3b6837b56ce0dc1280b20` |

### How to Verify:
```bash
# macOS / Linux
shasum -a 256 <downloaded-file>

# Windows (PowerShell)
Get-FileHash -Algorithm SHA256 .\<downloaded-file>
```

For security policies, responsible disclosure guidelines, and vulnerability reporting, see [SECURITY.md](SECURITY.md).

---

## 🌐 ArmoryVault & Firearms Ecosystem

Wildcat Studio is designed as part of the specialized shooting sports and firearms management ecosystem:

- 🛒 **[ArmsTrader Store (armstrader.store)](https://armstrader.store)** — Firearms, ammunition, optics, parts, and reloading supplies marketplace.
- 🛡️ **[ArmoryVault Platform](https://cook0001.github.io/ArmoryVault/)** — Secure at-home firearms, ammunition stockpile, and range gear inventory tracker.
- 📱 **[ArmoryVault Companion](https://github.com/cook0001/ArmoryVault-Companion)** — Dedicated mobile companion app for field inventory audits.

---

## ✨ Key Capabilities

### 1. Encyclopedic Cartridge Database (⌘O / Ctrl+O)
- **408 Verified Presets** across 11 category modules matching official SAAMI and CIP standards:
  - Standard Hunting & Varmint Rifles
  - Modern PRS/NRL Precision Rifle Cartridges (6mm ARC, 6.5 PRC, 7mm PRC, .300 PRC, .224 Valkyrie, .277 SIG FURY)
  - British & European Dangerous Game (.375 H&H, .416 Rigby, .470 Nitro, .700 Nitro Express)
  - Historic Blackpowder & Straight-Wall (.45-70 Gov't, .50-110, .350 Legend, .450 Bushmaster)
  - Military Small Arms (5.56 NATO, 7.62 NATO, 7.62×39, 7.62×54R, 8×57 Mauser, .50 BMG)
  - Iconic Historic Wildcats (.22 CHeetah, 6mm PPC, 6.5-284 Norma, 7mm STW)
- Instant sub-millisecond search and caliber-band filtering.
- Dedicated persistent database for saving and managing custom wildcats.

### 2. 2D CAD Blueprint Drafting & In-Place Dimension Editing
- Vector drafting engine with smooth pan, zoom (20% to 500%), 90° clockwise rotation (<kbd>R</kbd>), and fit-to-view (<kbd>F</kbd>).
- Click directly on any dimension callout on the drawing to open an interactive numeric editing popover with `±0.001"` (`±0.01 mm`) micro-steppers.
- Full multi-level Undo/Redo (<kbd>⌘Z</kbd> / <kbd>⌘⇧Z</kbd>).
- 5 Visualization Modes:
  - **Exterior Outline**: Official SAAMI/CIP silhouette.
  - **CAD Wireframe**: Internal extraction groove, web floor, and centerlines.
  - **Longitudinal Cutaway**: Solid brass wall thickness, web floor, and powder chamber.
  - **ISO Half-Section**: Industrial standard upper solid / lower cutaway view.
  - **Chamber Fit**: Cartridge nested inside chamber cut with clearance callouts.

### 3. Volumetric Physics & 1000-Slice Simpson Integration
- Slices the internal powder cavity into 1,000 distinct axial cross-sections and integrates volume using Simpson's Composite 1/3 Rule:
  $$\text{Volume} = \frac{h}{3} \sum \left[ A(x_{2k}) + 4 A(x_{2k+1}) + A(x_{2k+2}) \right]$$
- Live telemetry metrics:
  - **Gross Overflow Water Capacity** ($\text{gr } \text{H}_2\text{O}$ and $\text{cm}^3$)
  - **Seated Projectile Shank Displacement**
  - **Net Usable Powder Capacity**
  - **Bore Index** ($V_{\text{overflow}} / A_{\text{bore}}$) and **Expansion Ratio** ($E_r$)

### 4. Wildcatting & Case Forming Engine (⌘W / Ctrl+W)
- **Necking Up & Down**: Instant caliber matrix conversions (.172 to .50 BMG) preserving wall thickness and neck tension.
- **Ackley Improved 40° Fireforming**: Blows out shallow shoulders to 40°, straightens body taper, and preserves SAAMI neck-shoulder headspace crush fit for safe factory ammo fireforming (+5% to +12% capacity gains).
- **Action Truncation**: Shortens long action brass to fit short bolt actions or AR-15 magazine lengths with automatic datum recalculation.

### 5. Chamber Reamer Design & Toolmaker Direct Orders
- Formatted direct order specifications for major precision reamer manufacturers:
  - **Pacific Tool & Gauge (PTG)**
  - **Dave Manson Precision Reamers**
  - **JGS Precision Tool Mfg**
  - **Clymer Precision Tools**
- Configurable freebore diameter, freebore length, throat leade angle ($1.5^\circ$ match vs $2^\circ$ standard), and fitted tight-neck vs factory no-turn release options.
- Export reamer requisition as formatted `.txt` file, clipboard copy, or printable shop sheet.
- Includes **Headspace Gauge Suite** (GO / NO-GO / FIELD) and **Chamber Setback Analyzer**.

### 6. 1:1 True-Scale Physical Display Calibration & Rulers
- Interactive Calibration Wizard with physical standards:
  - Standard Credit Card / Driver's License (ISO ID-1: $3.370" \times 2.125"$)
  - 1.000" Precision Calipers graduation line
  - 50.00 mm Metric Scale
  - US 25¢ Quarter Coin target ($0.955"$)
- Calibrated On-Screen Engineering Ruler: Hold physical cartridge cases, case gauges, or reamers directly against the monitor glass for true 1:1 physical inspection.

### 7. Dual Tolerance Envelope Overlay (MMC vs LMC)
- Simultaneous rendering of **Maximum Material Cartridge (MMC solid line)** against **Minimum Material Chamber (LMC dashed line)** with live clearance delta callouts ($\Delta$) at the base, shoulder, neck, and freebore.

### 8. Technical CAD Exports & Engineering Drawings (⌘P / Ctrl+P)
- **AutoCAD DXF Vector**: Layered CAD vectors for AutoCAD, SolidWorks, Autodesk Fusion 360, and CNC lathe turning toolpaths.
- **QuickDESIGN QDF**: Cleanroom exchange file compatible with QuickDESIGN.
- **QuickLOAD VOL**: Direct import file for QuickLOAD interior ballistics simulation.
- **STL 3D Solid Mesh**: Watertight 3D mesh for 3D printing dummy rounds, check plugs, and headspace gauges.
- **Print-Ready Engineering Drawing Sheet (⌘P)**: ANSI B / ISO A3 technical drawing sheets with projection views, title block, and SAAMI tolerance tables.

---

## ⌨️ Master Keyboard Shortcuts

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| <kbd>⌘O</kbd> / <kbd>Ctrl+O</kbd> | Open Cartridge Database & Search | Global |
| <kbd>⌘S</kbd> / <kbd>Ctrl+S</kbd> | Save Custom Cartridge to Database | Global |
| <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> | Open Wildcatting & Case Forming Wizard | Global |
| <kbd>⌘P</kbd> / <kbd>Ctrl+P</kbd> | Open Engineering Drawing Print Sheet | Global |
| <kbd>⌘B</kbd> / <kbd>Ctrl+B</kbd> | Toggle Parametric Parameters Sidebar | Global |
| <kbd>⌘Z</kbd> / <kbd>Ctrl+Z</kbd> | Undo Last Dimension Modification | Global |
| <kbd>⌘⇧Z</kbd> / <kbd>Ctrl+Y</kbd> | Redo Dimension Modification | Global |
| <kbd>F1</kbd> | Open Comprehensive User Guide & Manual | Global |
| <kbd>F</kbd> | Fit Blueprint Drawing to Canvas | Canvas |
| <kbd>R</kbd> | Rotate Drawing 90° Clockwise | Canvas |
| <kbd>Esc</kbd> | Close Modal / Dismiss Popover | Global |

---

## 📄 License & Terms of Use

**Wildcat Studio** is distributed as **Proprietary Freeware**:
- **Free to Use**: You are granted a free, non-exclusive license to download, run, and use Wildcat Studio for personal, academic, and commercial firearms design and manufacturing.
- **Restrictions**: All intellectual property, mathematical algorithms, parametric definitions, and compiled code remain the sole property of the author. Reverse-engineering, decompilation, code extraction, or redistribution of modified binaries is strictly prohibited.

---

*Copyright © 2026 Wildcat Studio. All rights reserved.*
