import { BulletMaterial, BulletOgiveType, BulletProfile, CartridgeSpec } from '../types/cartridge';
import { BULLET_OPTIONS } from '../data/bullets';

function inferProfileFromFactoryCatalog(spec: CartridgeSpec): Partial<BulletProfile> {
  const match = BULLET_OPTIONS.find(
    (b) =>
      Math.abs(b.caliber_inches - spec.bullet_diameter) < 0.003 &&
      Math.abs(b.weight_grains - spec.bullet_weight_grains) <= 1 &&
      Math.abs(b.length_inches - spec.bullet_length) <= 0.025
  );
  if (!match) return {};

  const cat = match.category;
  const name = match.name.toLowerCase();
  const isFlatBase =
    name.includes('flat base') ||
    name.includes('rn') ||
    name.includes('round nose') ||
    name.includes('flat nose') ||
    name.includes('xtp') ||
    name.includes('jhp') ||
    name.includes('fmj') ||
    name.includes('solid') ||
    cat.includes('Handgun') ||
    cat.includes('Lever-Action') ||
    cat.includes('Dangerous Game');

  let material: BulletMaterial = 'lead_core';
  let plasticTip = 0;
  if (cat.includes('Monolithic')) {
    material = 'monolithic_copper';
    if (name.includes('ttsx') || name.includes('lrx') || name.includes('tipped')) {
      plasticTip = Math.min(0.18, spec.bullet_length * 0.11);
    }
  } else if (name.includes('eld') || name.includes('v-max') || name.includes('tmk') || name.includes('sst') || name.includes('ballistic tip') || name.includes('accubond') || name.includes('a-max') || name.includes('blitzking') || name.includes('ftx')) {
    material = 'polymer_tip';
    plasticTip = Math.min(0.22, spec.bullet_length * 0.12);
  }

  let ogiveType: BulletOgiveType = 'tangent';
  let crh = 8.0;
  if (cat.includes('ELD / Hybrid') || name.includes('hybrid')) {
    ogiveType = 'hybrid';
    crh = 11.0;
  } else if (name.includes('vld') || name.includes('eld')) {
    ogiveType = 'secant';
    crh = 12.0;
  } else if (cat.includes('Handgun') || name.includes('rn') || name.includes('round nose')) {
    ogiveType = 'round_nose';
    crh = 2.5;
  } else if (cat.includes('Lever-Action') || name.includes('flat nose')) {
    ogiveType = 'flat_nose';
    crh = 3.0;
  } else if (cat.includes('Match')) {
    ogiveType = 'tangent';
    crh = 9.0;
  }

  const btLen = isFlatBase ? 0 : Math.min(spec.bullet_length * 0.22, spec.bullet_diameter * 0.65);
  // Standard 7.5-9 degree boat tail taper: d_base = d - 2 * L_bt * tan(8 deg)
  const btBaseDia = isFlatBase
    ? spec.bullet_diameter
    : Math.max(spec.bullet_diameter * 0.72, spec.bullet_diameter - 2 * btLen * Math.tan((8 * Math.PI) / 180));

  return {
    base_type: isFlatBase ? 'flat_base' : 'boat_tail',
    boat_tail_length_in: +btLen.toFixed(4),
    boat_tail_base_dia_in: +btBaseDia.toFixed(4),
    ogive_type: ogiveType,
    ogive_radius_calibers: crh,
    meplat_diameter_in: +(
      material === 'polymer_tip'
        ? spec.bullet_diameter * 0.08
        : ogiveType === 'round_nose' || ogiveType === 'flat_nose'
        ? spec.bullet_diameter * 0.50
        : spec.bullet_diameter * 0.20
    ).toFixed(4),
    material,
    plastic_tip_length_in: +plasticTip.toFixed(4),
  };
}

export function resolveBulletProfile(spec: CartridgeSpec): BulletProfile {
  const d = Math.max(0.100, spec.bullet_diameter);
  const len = Math.max(d * 1.1, spec.bullet_length || d * 3.2);
  const lOverD = len / d;
  const isShortOrPistol = lOverD < 2.6 || spec.category.toLowerCase().includes('handgun') || spec.category.toLowerCase().includes('rimfire');

  const catalog = inferProfileFromFactoryCatalog(spec);
  const ov = spec.bullet_profile || {};

  const baseType = ov.base_type ?? catalog.base_type ?? (isShortOrPistol ? 'flat_base' : 'boat_tail');
  const rawBtLen =
    baseType === 'flat_base'
      ? 0
      : ov.boat_tail_length_in ?? catalog.boat_tail_length_in ?? Math.min(len * 0.20, d * 0.58);
  const btLen = Math.max(0, Math.min(len * 0.35, rawBtLen));

  const defaultBtBase =
    baseType === 'flat_base'
      ? d
      : Math.max(d * 0.72, d - 2 * btLen * Math.tan((8.0 * Math.PI) / 180));
  const btBaseDia =
    baseType === 'flat_base'
      ? d
      : Math.min(d, Math.max(d * 0.55, ov.boat_tail_base_dia_in ?? catalog.boat_tail_base_dia_in ?? defaultBtBase));

  const ogiveType: BulletOgiveType =
    ov.ogive_type ?? catalog.ogive_type ?? (isShortOrPistol ? 'round_nose' : lOverD > 4.2 ? 'hybrid' : 'tangent');

  const defaultCrh =
    ogiveType === 'round_nose'
      ? 2.2
      : ogiveType === 'flat_nose'
      ? 3.0
      : ogiveType === 'secant'
      ? 12.0
      : ogiveType === 'hybrid'
      ? 10.5
      : 8.0;

  const crh = Math.max(1.0, ov.ogive_radius_calibers ?? catalog.ogive_radius_calibers ?? defaultCrh);
  const material: BulletMaterial = ov.material ?? catalog.material ?? 'lead_core';
  const defaultTip =
    material === 'polymer_tip' ? Math.min(0.22, len * 0.11) : 0;
  const plasticTipLen = Math.max(
    0,
    Math.min(len * 0.25, ov.plastic_tip_length_in ?? catalog.plastic_tip_length_in ?? defaultTip)
  );

  const defaultMeplat =
    ogiveType === 'flat_nose'
      ? d * 0.55
      : ogiveType === 'round_nose'
      ? d * 0.30
      : material === 'polymer_tip'
      ? d * 0.08
      : d * 0.22;
  const meplatDia = Math.min(d * 0.85, Math.max(0.010, ov.meplat_diameter_in ?? catalog.meplat_diameter_in ?? defaultMeplat));

  // Nose length derived from CRH when tangent, clamped cleanly so bearing surface remains positive.
  const dr = Math.max(0.005, (d - meplatDia) / 2);
  const R = crh * d;
  const tangentNose = Math.sqrt(Math.max(0, 2 * R * dr - dr * dr));
  const maxNose = Math.max(0.05, (len - btLen) * 0.72);
  const defaultNoseLen = Math.min(maxNose, Math.max((len - btLen) * 0.35, tangentNose * (ogiveType === 'secant' ? 0.90 : 1.0)));

  const bearingSurface =
    ov.bearing_surface_length_in !== undefined
      ? Math.max(0.02, Math.min(len - btLen - 0.04, ov.bearing_surface_length_in))
      : Math.max(0.04, len - btLen - defaultNoseLen);

  return {
    base_type: baseType,
    boat_tail_length_in: Math.round(btLen * 10000) / 10000,
    boat_tail_base_dia_in: Math.round(btBaseDia * 10000) / 10000,
    ogive_type: ogiveType,
    ogive_radius_calibers: Math.round(crh * 10) / 10,
    meplat_diameter_in: Math.round(meplatDia * 10000) / 10000,
    bearing_surface_length_in: Math.round(bearingSurface * 10000) / 10000,
    material,
    plastic_tip_length_in: Math.round(plasticTipLen * 10000) / 10000,
  };
}

/**
 * Returns the bullet's exact outer radius at axial coordinate xFromBase in [0, bullet_length].
 */
export function getBulletRadiusAt(spec: CartridgeSpec, xFromBase: number, profile?: BulletProfile): number {
  const p = profile ?? resolveBulletProfile(spec);
  const len = Math.max(0.05, spec.bullet_length);
  const rFull = spec.bullet_diameter / 2;
  const rBtBase = p.boat_tail_base_dia_in / 2;
  const rMeplat = p.meplat_diameter_in / 2;
  const btLen = p.boat_tail_length_in;
  const bearingEnd = Math.min(len - 0.01, btLen + (p.bearing_surface_length_in ?? len * 0.35));

  if (xFromBase <= 0) return rBtBase;
  if (xFromBase >= len) return rMeplat;

  // 1. Boat-tail frustum
  if (btLen > 0.0005 && xFromBase <= btLen) {
    const t = xFromBase / btLen;
    return rBtBase + (rFull - rBtBase) * t;
  }

  // 2. Cylindrical bearing surface
  if (xFromBase <= bearingEnd) {
    return rFull;
  }

  // 3. Nose / Ogive section from bearingEnd -> len
  const noseLen = Math.max(0.005, len - bearingEnd);
  const xRel = xFromBase - bearingEnd;
  const dr = Math.max(0.001, rFull - rMeplat);

  if (p.ogive_type === 'flat_nose') {
    // Truncated conical/ogive flat nose
    const t = xRel / noseLen;
    return rFull - dr * Math.pow(t, 1.35);
  }

  // Circular-arc ogive passing exactly through (0, rFull) and (noseLen, rMeplat).
  // Minimum feasible circle radius connecting the two endpoints is R_min = (noseLen^2 + dr^2) / (2 * dr).
  const rMin = (noseLen * noseLen + dr * dr) / (2 * dr);
  const requestedR = p.ogive_radius_calibers * spec.bullet_diameter;

  if (p.ogive_type === 'round_nose') {
    const t = xRel / noseLen;
    return rMeplat + dr * Math.sqrt(Math.max(0, 1 - t * t));
  }

  // For tangent ogive use R = rMin (exact horizontal tangent at xRel=0);
  // for secant / hybrid use a larger radius shifted along x so slope at nose start is steeper.
  const R =
    p.ogive_type === 'tangent'
      ? rMin
      : p.ogive_type === 'hybrid'
      ? Math.max(rMin, (rMin + Math.max(rMin, requestedR)) * 0.5)
      : Math.max(rMin, requestedR);

  // Solve circle center (xc, yc) passing through (0, rFull) and (noseLen, rMeplat) with radius R.
  const chord = Math.hypot(noseLen, dr);
  const halfChord = chord / 2;
  const h = Math.sqrt(Math.max(0, R * R - halfChord * halfChord));
  const midX = noseLen / 2;
  const midY = (rFull + rMeplat) / 2;
  // Normal pointing downward/inward from chord (dx = noseLen, dy = -dr) -> (-dr, -noseLen)
  const nx = -dr / chord;
  const ny = -noseLen / chord;
  const xc = midX + h * nx;
  const yc = midY + h * ny;

  const dx = xRel - xc;
  const r = yc + Math.sqrt(Math.max(0, R * R - dx * dx));
  return Math.max(rMeplat, Math.min(rFull, r));
}

/**
 * Exact numerical volume (in^3) of the seated bullet portion inside the cartridge case
 * from x = 0 (bullet base) to x = seatingDepthIn via Simpson's rule (200 slices).
 */
export function computeBulletDisplacementCuIn(
  spec: CartridgeSpec,
  seatingDepthIn: number,
  profile?: BulletProfile
): number {
  const depth = Math.max(0, Math.min(seatingDepthIn, spec.bullet_length));
  if (depth <= 0.0001) return 0;

  const p = profile ?? resolveBulletProfile(spec);
  const n = 200;
  const dx = depth / n;
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const x = i * dx;
    const r = getBulletRadiusAt(spec, x, p);
    const area = Math.PI * r * r;
    const w = i === 0 || i === n ? 1 : i % 2 === 1 ? 4 : 2;
    sum += w * area;
  }
  return (dx / 3) * sum;
}

/**
 * Solves exact axial distance from bullet base where the nose ogive shrinks to targetDia.
 * Used for CBTO (Cartridge Base To Ogive) and bullet-to-lands contact geometry.
 */
export function getOgiveDistanceFromBaseAtDia(
  spec: CartridgeSpec,
  targetDiaIn: number,
  profile?: BulletProfile
): number {
  const p = profile ?? resolveBulletProfile(spec);
  const len = Math.max(0.05, spec.bullet_length);
  const targetR = targetDiaIn / 2;
  const bearingEnd = Math.min(len - 0.01, p.boat_tail_length_in + (p.bearing_surface_length_in ?? len * 0.35));

  if (targetR >= spec.bullet_diameter / 2) return bearingEnd;
  if (targetR <= p.meplat_diameter_in / 2) return len;

  // Binary search along monotonically decreasing nose [bearingEnd, len]
  let lo = bearingEnd;
  let hi = len;
  for (let iter = 0; iter < 32; iter++) {
    const mid = (lo + hi) * 0.5;
    if (getBulletRadiusAt(spec, mid, p) > targetR) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) * 0.5;
}

/**
 * Returns effective seating depth derived from case_length + bullet_length - coal when valid,
 * falling back to spec.seating_depth if coal was not configured.
 */
export function effectiveSeatingDepth(spec: CartridgeSpec): number {
  if (spec.coal > 0 && spec.bullet_length > 0 && spec.case_length > 0) {
    const geometric = spec.case_length + spec.bullet_length - spec.coal;
    if (geometric >= 0 && geometric < spec.case_length - spec.web_thickness) {
      return geometric;
    }
  }
  return Math.max(0, Math.min(spec.seating_depth, Math.max(0, spec.case_length - spec.web_thickness)));
}

/**
 * Parametric aerodynamic form-factor and G1/G7 ballistic coefficient estimator
 * modeled on McCoy / Litz geometric relationships (nose fineness, ogive profile, meplat, boat tail).
 */
export function estimateBulletBC(spec: CartridgeSpec, profile?: BulletProfile): {
  sectional_density: number;
  form_factor_g1: number;
  form_factor_g7: number;
  g1_bc_est: number;
  g7_bc_est: number;
} {
  const d = Math.max(0.100, spec.bullet_diameter);
  const sd = spec.bullet_weight_grains / (7000 * d * d);
  const p = profile ?? resolveBulletProfile(spec);

  const len = Math.max(d, spec.bullet_length);
  const btLen = p.boat_tail_length_in;
  const bearingLen = p.bearing_surface_length_in ?? len * 0.35;
  const noseLen = Math.max(0.05, len - btLen - bearingLen);
  const noseCal = noseLen / d;
  const meplatRatio = p.meplat_diameter_in / d;

  // G7 reference projectile: L/d=4.23, nose ~2.18 cal, 10 cal tangent, 7.5° 0.6 cal BT, meplat ~0.18d -> i7 = 1.00
  let i7 = 0.92 + 0.34 / Math.max(0.6, noseCal);

  // Ogive drag adjustment (secant/hybrid lower supersonic wave drag than tangent/RN)
  if (p.ogive_type === 'secant') i7 *= 0.92;
  else if (p.ogive_type === 'hybrid') i7 *= 0.94;
  else if (p.ogive_type === 'spitzer') i7 *= 1.02;
  else if (p.ogive_type === 'round_nose') i7 *= 1.45;
  else if (p.ogive_type === 'flat_nose') i7 *= 1.65;

  // Meplat drag penalty (blunt meplats raise wave drag roughly linearly above 0.10 cal)
  i7 += Math.max(-0.08, (meplatRatio - 0.16) * 0.65);

  // Boat-tail base-drag reduction (optimal around 7-9 degrees and ~0.5-0.7 cal length)
  if (p.base_type === 'boat_tail' && btLen > 0.01) {
    const btAngleDeg = (Math.atan2((d - p.boat_tail_base_dia_in) / 2, btLen) * 180) / Math.PI;
    const btCal = btLen / d;
    const angleEfficiency = Math.max(0.2, 1.0 - Math.abs(btAngleDeg - 8.5) / 14);
    const btReduction = Math.min(0.16, btCal * 0.24 * angleEfficiency);
    i7 -= btReduction;
  } else {
    // Flat-base drag penalty relative to G7 boat-tail reference
    i7 += 0.18;
  }

  i7 = Math.min(2.6, Math.max(0.75, i7));
  const g7 = sd / i7;

  // Realistic G1/G7 conversion ratio depends on base & nose shape (~1.95 for VLD/BT, ~1.65 for flat-base/RN)
  const g1ToG7Ratio =
    p.ogive_type === 'round_nose' || p.ogive_type === 'flat_nose'
      ? 1.55
      : p.base_type === 'flat_base'
      ? 1.78
      : 1.96;

  const g1 = g7 * g1ToG7Ratio;
  const i1 = g1 > 0 ? sd / g1 : 1.0;

  return {
    sectional_density: Math.round(sd * 1000) / 1000,
    form_factor_g1: Math.round(i1 * 1000) / 1000,
    form_factor_g7: Math.round(i7 * 1000) / 1000,
    g1_bc_est: Math.round(g1 * 1000) / 1000,
    g7_bc_est: Math.round(g7 * 1000) / 1000,
  };
}
