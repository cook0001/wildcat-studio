'use strict';

const REPO = 'cook0001/wildcat-studio';
const RELEASES_URL = `https://github.com/${REPO}/releases`;
const LATEST_API = `https://api.github.com/repos/${REPO}/releases/latest`;

function escapeText(value) {
  return value == null ? '' : String(value);
}

function formatMb(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function initNav() {
  const btn = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (!btn || !links) return;
  btn.addEventListener('click', () => {
    const isOpen = links.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(isOpen));
  });
}

async function detectCpuArch() {
  try {
    if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
      const info = await navigator.userAgentData.getHighEntropyValues(['architecture']);
      if (info.architecture === 'arm') return 'arm64';
    }
  } catch {
    // Fallback to userAgent heuristic
  }
  const ua = (navigator.userAgent || '').toLowerCase();
  return ua.includes('arm64') || ua.includes('aarch64') ? 'arm64' : 'x64';
}

function matchAsset(assets, predicate) {
  return assets.find((a) => predicate(a.name));
}

function resolvePlatformInstallers(assets) {
  return {
    mac_universal: matchAsset(assets, (n) => n.endsWith('_universal.dmg')),
    win_x64_exe: matchAsset(assets, (n) => n.endsWith('_x64-setup.exe')),
    win_x64_msi: matchAsset(assets, (n) => n.endsWith('_x64_en-US.msi')),
    win_arm64_exe: matchAsset(assets, (n) => n.endsWith('_arm64-setup.exe')),
    linux_x64_appimage: matchAsset(assets, (n) => n.endsWith('_amd64.AppImage')),
    linux_x64_deb: matchAsset(assets, (n) => n.endsWith('_amd64.deb')),
    linux_x64_rpm: matchAsset(assets, (n) => n.endsWith('.x86_64.rpm')),
    linux_arm64_appimage: matchAsset(assets, (n) => n.endsWith('_aarch64.AppImage')),
    linux_arm64_deb: matchAsset(assets, (n) => n.endsWith('_arm64.deb')),
    linux_arm64_rpm: matchAsset(assets, (n) => n.endsWith('.aarch64.rpm')),
    sha256: matchAsset(assets, (n) => n === 'SHA256SUMS.txt'),
  };
}

function detectPlatformKey(arch) {
  const ua = (navigator.userAgent || '').toLowerCase();
  const pf = (navigator.platform || '').toLowerCase();
  if (ua.includes('win') || pf.includes('win')) {
    return arch === 'arm64' ? 'win_arm64_exe' : 'win_x64_exe';
  }
  if (ua.includes('linux') || pf.includes('linux')) {
    return arch === 'arm64' ? 'linux_arm64_appimage' : 'linux_x64_appimage';
  }
  return 'mac_universal';
}

const PLATFORM_LABELS = {
  mac_universal: {
    title: 'Wildcat Studio for macOS (Universal)',
    sub: 'Apple Silicon (M-series) & Intel 64-bit .dmg',
    btn: 'Download for macOS (.dmg)',
  },
  win_x64_exe: {
    title: 'Wildcat Studio for Windows (x64)',
    sub: 'Windows 10/11 64-bit NSIS installer (.exe)',
    btn: 'Download for Windows x64 (.exe)',
  },
  win_arm64_exe: {
    title: 'Wildcat Studio for Windows (ARM64)',
    sub: 'Windows 11 ARM64 native installer (.exe)',
    btn: 'Download for Windows ARM64 (.exe)',
  },
  linux_x64_appimage: {
    title: 'Wildcat Studio for Linux (x86_64)',
    sub: 'Universal AppImage, Debian/Ubuntu .deb & Fedora/RHEL .rpm',
    btn: 'Download Linux x64 AppImage',
  },
  linux_arm64_appimage: {
    title: 'Wildcat Studio for Linux (ARM64 / aarch64)',
    sub: 'ARM64 AppImage, .deb & .rpm builds',
    btn: 'Download Linux ARM64 AppImage',
  },
};

async function fetchLatestRelease() {
  const res = await fetch(LATEST_API, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function initDownloads() {
  const badge = document.getElementById('releaseBadge');
  const dTitle = document.getElementById('detectedTitle');
  const dSub = document.getElementById('detectedSub');
  const dBtn = document.getElementById('detectedBtn');
  if (!dTitle || !dBtn) return;

  const arch = await detectCpuArch();
  const key = detectPlatformKey(arch);
  const meta = PLATFORM_LABELS[key];
  dTitle.textContent = meta.title;
  dSub.textContent = meta.sub;
  dBtn.textContent = meta.btn;
  dBtn.href = `${RELEASES_URL}/latest`;

  try {
    const release = await fetchLatestRelease();
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const map = resolvePlatformInstallers(assets);
    if (badge && release.tag_name) {
      badge.textContent = `Latest Published ${release.tag_name}`;
    }

    const primary = map[key];
    if (primary) {
      dBtn.href = primary.browser_download_url;
      const sizeStr = formatMb(primary.size);
      dSub.textContent = sizeStr ? `${meta.sub} (${sizeStr})` : meta.sub;
    }

    document.querySelectorAll('[data-pkg]').forEach((card) => {
      const k = card.getAttribute('data-pkg');
      const asset = k ? map[k] : null;
      const sizeEl = card.querySelector('[data-size]');
      if (asset) {
        card.href = asset.browser_download_url;
        if (sizeEl) sizeEl.textContent = `${asset.name} (${formatMb(asset.size)})`;
      } else {
        card.href = `${RELEASES_URL}/latest`;
        if (sizeEl) sizeEl.textContent = 'Available in upcoming/latest GitHub Release';
      }
    });

    const sumsLink = document.getElementById('shaSumsLink');
    if (sumsLink && map.sha256) sumsLink.href = map.sha256.browser_download_url;
  } catch {
    if (badge) badge.textContent = 'GitHub Releases (v1.1.1 target)';
  }
}

function attachCopyHandler(btn, text) {
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(text).then(() => {
      const prev = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(() => { btn.textContent = prev; }, 1600);
    }).catch(() => {});
  });
}

async function initSecurityPage() {
  const tbody = document.getElementById('checksumBody');
  const tagLabel = document.getElementById('checksumReleaseTag');
  const downloadBtn = document.getElementById('downloadShaSums');
  if (!tbody) return;

  try {
    const release = await fetchLatestRelease();
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const shaAsset = assets.find((a) => a.name === 'SHA256SUMS.txt');
    if (tagLabel && release.tag_name) {
      tagLabel.textContent = `Official SHA-256 Checksums (${release.tag_name})`;
    }
    if (downloadBtn && shaAsset) {
      downloadBtn.href = shaAsset.browser_download_url;
    }

    const raw = await fetch(`https://github.com/${REPO}/releases/latest/download/SHA256SUMS.txt`);
    if (!raw.ok) throw new Error(`HTTP ${raw.status}`);
    const text = await raw.text();
    const rows = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^[a-f0-9]{64}\s+/i.test(l))
      .map((l) => {
        const [hash, file] = l.split(/\s+/, 2);
        return { hash, file };
      });

    if (rows.length === 0) throw new Error('No hashes found');
    tbody.textContent = '';

    rows.forEach(({ hash, file }) => {
      const tr = document.createElement('tr');

      const tdFile = document.createElement('td');
      const strong = document.createElement('strong');
      strong.textContent = file;
      tdFile.appendChild(strong);

      const tdHash = document.createElement('td');
      tdHash.className = 'mono';
      tdHash.textContent = hash;

      const tdAct = document.createElement('td');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-secondary';
      btn.textContent = 'Copy';
      attachCopyHandler(btn, hash);
      tdAct.appendChild(btn);

      tr.append(tdFile, tdHash, tdAct);
      tbody.appendChild(tr);
    });
  } catch {
    tbody.textContent = '';
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 3;
    td.textContent = 'Checksums are attached to each release as SHA256SUMS.txt on GitHub Releases.';
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
}

async function initCartridgeDirectory() {
  const tbody = document.getElementById('cartBody');
  const searchInput = document.getElementById('cartSearch');
  const catContainer = document.getElementById('catFilters');
  const stdContainer = document.getElementById('stdFilters');
  const visibleEl = document.getElementById('visibleCount');
  const totalEl = document.getElementById('totalCount');
  if (!tbody || !searchInput || !catContainer) return;

  let cartridges = [];
  let activeCat = 'all';
  let activeStd = 'all';

  function render() {
    const query = searchInput.value.trim().toLowerCase();
    const filtered = cartridges.filter((c) => {
      if (activeCat !== 'all' && c.category !== activeCat) return false;
      if (activeStd !== 'all' && c.standard !== activeStd) return false;
      if (!query) return true;
      const hay = `${c.name} ${c.standard} ${c.category} ${c.rim_type} ${c.parent_case}`.toLowerCase();
      return hay.includes(query);
    });

    if (visibleEl) visibleEl.textContent = String(filtered.length);
    tbody.textContent = '';

    if (filtered.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 9;
      td.textContent = 'No cartridges matched the current filter criteria.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    const frag = document.createDocumentFragment();
    filtered.forEach((c) => {
      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      const strong = document.createElement('strong');
      strong.textContent = escapeText(c.name);
      tdName.appendChild(strong);

      const tdStd = document.createElement('td');
      const badge = document.createElement('span');
      const stdLower = (c.standard || 'Wildcat').toLowerCase();
      badge.className = `std-badge std-${stdLower === 'saami' || stdLower === 'cip' ? stdLower : 'wildcat'}`;
      badge.textContent = escapeText(c.standard || 'Wildcat');
      tdStd.appendChild(badge);

      const tdBullet = document.createElement('td');
      tdBullet.className = 'mono';
      tdBullet.textContent = c.bullet_diameter ? `${Number(c.bullet_diameter).toFixed(3)}"` : '-';

      const tdBase = document.createElement('td');
      tdBase.className = 'mono';
      tdBase.textContent = c.base_diameter ? `${Number(c.base_diameter).toFixed(3)}"` : '-';

      const tdRim = document.createElement('td');
      tdRim.className = 'mono';
      tdRim.textContent = c.rim_diameter ? `${Number(c.rim_diameter).toFixed(3)}"` : '-';

      const tdStyle = document.createElement('td');
      tdStyle.textContent = escapeText(c.rim_type || 'rimless');

      const tdAngle = document.createElement('td');
      tdAngle.className = 'mono';
      tdAngle.textContent = c.shoulder_angle ? `${c.shoulder_angle}°` : '0°';

      const tdCase = document.createElement('td');
      tdCase.className = 'mono';
      tdCase.textContent = c.case_length ? `${Number(c.case_length).toFixed(3)}"` : '-';

      const tdPress = document.createElement('td');
      tdPress.className = 'mono';
      tdPress.textContent = c.max_pressure_bar ? `${Number(c.max_pressure_bar).toLocaleString()} bar` : '-';

      tr.append(tdName, tdStd, tdBullet, tdBase, tdRim, tdStyle, tdAngle, tdCase, tdPress);
      frag.appendChild(tr);
    });
    tbody.appendChild(frag);
  }

  function buildFilterButtons(items, container, onSelect) {
    container.textContent = '';
    items.forEach(({ key, label }, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = idx === 0 ? 'pill-btn active' : 'pill-btn';
      btn.dataset.value = key;
      btn.textContent = label;
      btn.addEventListener('click', () => {
        container.querySelectorAll('.pill-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        onSelect(key);
        render();
      });
      container.appendChild(btn);
    });
  }

  try {
    const res = await fetch('./data/cartridges.json');
    cartridges = await res.json();
    if (totalEl) totalEl.textContent = String(cartridges.length);

    const catCounts = new Map();
    const stdCounts = new Map();
    cartridges.forEach((c) => {
      catCounts.set(c.category, (catCounts.get(c.category) || 0) + 1);
      stdCounts.set(c.standard, (stdCounts.get(c.standard) || 0) + 1);
    });

    const catItems = [{ key: 'all', label: `All Presets (${cartridges.length})` }];
    Array.from(catCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, count]) => catItems.push({ key: name, label: `${name} (${count})` }));
    buildFilterButtons(catItems, catContainer, (v) => { activeCat = v; });

    if (stdContainer) {
      const stdItems = [{ key: 'all', label: 'All Standards' }];
      ['SAAMI', 'CIP', 'Wildcat'].forEach((s) => {
        if (stdCounts.has(s)) stdItems.push({ key: s, label: `${s} (${stdCounts.get(s)})` });
      });
      buildFilterButtons(stdItems, stdContainer, (v) => { activeStd = v; });
    }

    searchInput.addEventListener('input', render);
    const initialQuery = new URLSearchParams(window.location.search).get('q');
    if (initialQuery) {
      searchInput.value = initialQuery;
    }
    render();
  } catch {
    tbody.textContent = '';
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 9;
    td.textContent = 'Unable to load cartridge directory JSON.';
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initDownloads();
  initSecurityPage();
  initCartridgeDirectory();
});
