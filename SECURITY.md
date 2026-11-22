# Security Policy

## Supported Versions

Wildcat Studio is actively maintained. Security updates, cryptographic patches, and critical hotfixes are provided for the following versions:

| Version | Supported | Notes |
| :--- | :--- | :--- |
| **1.1.x** | Yes | Current release |
| **< 1.1.0** | No | Superseded releases (unsupported) |

---

## Reporting a Vulnerability

We take the security and mathematical integrity of Wildcat Studio seriously. If you discover a potential security vulnerability, memory corruption bug, or algorithmic integrity issue, please disclose it responsibly.

### How to Report

1. **GitHub Private Vulnerability Reporting (Preferred)**:
   - Navigate to the **Security** tab of the repository.
   - Click **Report a vulnerability** to open a confidential advisory draft.
   - This ensures the issue is reviewed in private before public disclosure.

2. **Responsible Disclosure Guidelines**:
   - **Do NOT** open a public issue or discussion thread disclosing the vulnerability details.
   - Provide a detailed description including:
     - The type of vulnerability (e.g., buffer overflow, file path traversal during export, binary corruption).
     - The affected platform(s) (macOS Universal, Windows x64, Linux amd64).
     - Step-by-step reproduction instructions or a minimal Proof of Concept (PoC).
     - Expected vs actual behavior.

### Response & Remediation Timelines

- **Initial Acknowledgment**: Within **48 hours** of report receipt.
- **Triage & Impact Assessment**: Within **5 business days**.
- **Remediation & Patch Release**: A hotfix release will be built via the hardened CI pipeline, accompanied by updated `SHA256SUMS.txt` cryptographic signatures and a coordinated security advisory.

---

## Scope & Security Architecture

Wildcat Studio operates strictly as an offline, zero-telemetry desktop application. The following areas are strictly monitored:

- **Mathematical & Telemetry Accuracy**: Consistency of the 1,000-slice Simpson composite volumetrics solver, chamber reamer tolerance calculations, and live clearance callouts.
- **Export Sanitization**: Escaping and safe generation of printable HTML/Typst templates, AutoCAD DXF vectors, QuickLOAD VOL, and binary STL meshes.
- **Binary Integrity**: Native Mach-O, PE, and ELF binaries built in GitHub Actions with `opt-level = 3`, `lto = true`, and symbol stripping. macOS releases support Developer ID code signing with Hardened Runtime and Apple notarization.
- **Data Privacy**: All custom cartridge records and screen calibration DPI data reside in local client storage without external telemetry.

---

## Cryptographic Binary Verification

To verify that a downloaded installer package matches the release build, compare its SHA-256 hash against the `SHA256SUMS.txt` asset on the [Releases](https://github.com/cook0001/wildcat-studio/releases) page.

### Verification Commands:

#### macOS / Linux
```bash
# Verify checksums file directly
shasum -a 256 -c SHA256SUMS.txt

# Or check an individual package
shasum -a 256 Wildcat.Studio_1.1.1_universal.dmg

# Verify macOS Developer ID signature and notarization ticket
codesign --verify --deep --strict "/Applications/Wildcat Studio.app"
spctl --assess --type execute --verbose "/Applications/Wildcat Studio.app"
```

#### Windows (PowerShell)
```powershell
# Check hash
Get-FileHash -Algorithm SHA256 .\Wildcat.Studio_1.1.1_x64-setup.exe

# Or using certutil
certutil -hashfile .\Wildcat.Studio_1.1.1_x64-setup.exe SHA256
```

---

Released under the [MIT License](LICENSE). Copyright (c) 2026 Daniel Cook / Wildcat Studio.
