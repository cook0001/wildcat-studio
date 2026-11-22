import { CartridgeSpec, VolumetricResult } from '../types/cartridge';
import { computeBulletDisplacementCuIn, effectiveSeatingDepth, estimateBulletBC, resolveBulletProfile } from './bullet';
import { resolveBoreAndGroove } from './standards';

export const CU_IN_TO_CM3 = 16.387064;
export const CM3_TO_GRAINS_H2O = 15.43235835; // Pure water density at 4°C (standard QuickLOAD/GRT convention)
export const CU_IN_TO_GRAINS_H2O = CU_IN_TO_CM3 * CM3_TO_GRAINS_H2O; // 252.891 gr/in³

// C26000 Cartridge Brass (70% Cu / 30% Zn): density 8.53 g/cm³
export const BRASS_DENSITY_G_CM3 = 8.53;
export const GRAINS_PER_GRAM = 15.43235835;
export const BRASS_GRAINS_PER_CU_IN = CU_IN_TO_CM3 * BRASS_DENSITY_G_CM3 * GRAINS_PER_GRAM; // ~2157.16 gr/in³

export function isStraightWall(spec: CartridgeSpec): boolean {
  return (
    spec.shoulder_angle <= 0.05 ||
    (spec.shoulder_length <= 0.002 && spec.shoulder_angle <= 0.05) ||
    spec.body_length >= spec.case_length - 0.005 ||
    Math.abs(spec.shoulder_start_diameter - spec.neck_diameter_mouth) < 0.001
  );
}

export function effectiveShoulderLength(spec: CartridgeSpec): number {
  const rShoulderStart = spec.shoulder_start_diameter / 2.0;
  const rNeckBase = (spec.neck_diameter_base || spec.neck_diameter_mouth) / 2.0;
  const deltaR = rShoulderStart - rNeckBase;
  if (spec.shoulder_angle > 0.5 && deltaR > 0.001) {
    const tanAngle = Math.tan((spec.shoulder_angle * Math.PI) / 180);
    if (tanAngle > 0.001) {
      return deltaR / tanAngle;
    }
  }
  return spec.shoulder_length;
}

function lerpTaper(z: number, z0: number, z1: number, r0: number, r1: number): number {
  const fraction = Math.min(1.0, Math.max(0.0, (z - z0) / Math.max(0.001, z1 - z0)));
  return r0 + (r1 - r0) * fraction;
}

/**
 * Evaluates piecewise tapered body/shoulder/neck radius with smooth quadratic fillet
 * blends at the body-to-shoulder (R1) and shoulder-to-neck (R2) junctions.
 */
function getTaperedBodyRadiusAt(spec: CartridgeSpec, z: number, startZ: number, applyFillets = true): number {
  const rBase = spec.base_diameter / 2.0;
  const rShoulderStart = spec.shoulder_start_diameter / 2.0;
  const rNeckBase = (spec.neck_diameter_base || spec.neck_diameter_mouth) / 2.0;
  const rNeckMouth = spec.neck_diameter_mouth / 2.0;
  const zShoulderStart = spec.body_length;
  const shLen = effectiveShoulderLength(spec);
  const zShoulderEnd = spec.body_length + shLen;
  const zMouth = spec.case_length;

  if (isStraightWall(spec)) {
    return z <= zMouth ? lerpTaper(z, startZ, zMouth, rBase, rNeckMouth) : rNeckMouth;
  }

  const rawRadius = (zp: number): number => {
    if (zp <= zShoulderStart) return lerpTaper(zp, startZ, zShoulderStart, rBase, rShoulderStart);
    if (zp <= zShoulderEnd) return lerpTaper(zp, zShoulderStart, zShoulderEnd, rShoulderStart, rNeckBase);
    if (zp <= zMouth) return lerpTaper(zp, zShoulderEnd, zMouth, rNeckBase, rNeckMouth);
    return rNeckMouth;
  };

  if (!applyFillets) return rawRadius(z);

  // Smooth C1 quadratic Bézier fillet blend at R1 (body/shoulder) and R2 (shoulder/neck).
  const bodySpan = Math.max(0.01, zShoulderStart - startZ);
  const neckSpan = Math.max(0.01, zMouth - zShoulderEnd);
  const r1 = spec.shoulder_body_fillet_r ?? 0.060;
  const r2 = spec.shoulder_neck_fillet_r ?? 0.040;
  const tanHalf = Math.tan(((spec.shoulder_angle * Math.PI) / 180) * 0.5);

  const d1 = r1 > 0 ? Math.min(r1 * tanHalf, bodySpan * 0.25, shLen * 0.35) : 0;
  if (d1 > 0.001 && z > zShoulderStart - d1 && z < zShoulderStart + d1) {
    const t = (z - (zShoulderStart - d1)) / (2 * d1);
    const p0 = rawRadius(zShoulderStart - d1);
    const p1 = rShoulderStart;
    const p2 = rawRadius(zShoulderStart + d1);
    const omt = 1 - t;
    return omt * omt * p0 + 2 * omt * t * p1 + t * t * p2;
  }

  const d2 = r2 > 0 ? Math.min(r2 * tanHalf, shLen * 0.35, neckSpan * 0.35) : 0;
  if (d2 > 0.001 && z > zShoulderEnd - d2 && z < zShoulderEnd + d2) {
    const t = (z - (zShoulderEnd - d2)) / (2 * d2);
    const p0 = rawRadius(zShoulderEnd - d2);
    const p1 = rNeckBase;
    const p2 = rawRadius(zShoulderEnd + d2);
    const omt = 1 - t;
    return omt * omt * p0 + 2 * omt * t * p1 + t * t * p2;
  }

  return rawRadius(z);
}

export function getOuterRadiusAt(spec: CartridgeSpec, z: number): number {
  const rRim = spec.rim_diameter / 2.0;
  const tRim = spec.rim_thickness;
  const wExt = spec.extractor_width;
  const rExt = spec.extractor_diameter / 2.0;
  const zBodyStart = tRim + wExt;
  const hasExtractorGroove = spec.rim_type !== 'rimmed' && spec.rim_type !== 'rimfire';

  if (z <= tRim) {
    return rRim;
  }
  if (hasExtractorGroove && z <= zBodyStart) {
    return rExt;
  }
  if (spec.rim_type === 'belted' && spec.belt_diameter && z <= zBodyStart + (spec.belt_width || 0.220)) {
    return spec.belt_diameter / 2.0;
  }

  return getTaperedBodyRadiusAt(spec, z, hasExtractorGroove ? zBodyStart : tRim, true);
}

/**
 * Chamber/reamer contact radius of the brass body (omits extractor groove depression).
 */
export function getChamberBodyRadiusAt(spec: CartridgeSpec, z: number): number {
  if (z > spec.case_length) {
    return spec.bullet_diameter / 2.0;
  }
  const tRim = spec.rim_thickness;
  if ((spec.rim_type === 'rimmed' || spec.rim_type === 'rimfire' || spec.rim_type === 'semi_rimmed') && z <= tRim) {
    return spec.rim_diameter / 2.0;
  }
  if (spec.rim_type === 'belted' && spec.belt_diameter && z <= tRim + spec.extractor_width + (spec.belt_width || 0.220)) {
    return spec.belt_diameter / 2.0;
  }
  const startZ = (spec.rim_type === 'rimmed' || spec.rim_type === 'rimfire') ? tRim : tRim + spec.extractor_width;
  return getTaperedBodyRadiusAt(spec, Math.max(z, startZ), startZ, true);
}

/**
 * Internal powder cavity radius at axial coordinate z.
 * Uses the structural body contour (excluding external belt reinforcement) so belted
 * magnums do not artificially bulge inward or outward inside the case wall.
 */
export function getInnerRadiusAt(spec: CartridgeSpec, z: number): number {
  const zMouth = spec.case_length;
  const web = spec.web_thickness;

  if (z < web || z > zMouth) {
    return 0.0;
  }

  const hasExtractorGroove = spec.rim_type !== 'rimmed' && spec.rim_type !== 'rimfire';
  const bodyStartZ = hasExtractorGroove ? spec.rim_thickness + spec.extractor_width : spec.rim_thickness;
  const rStructural = getTaperedBodyRadiusAt(spec, Math.max(z, bodyStartZ), bodyStartZ, true);

  const frac = Math.min(1.0, Math.max(0.0, (z - web) / Math.max(0.001, zMouth - web)));
  const wallT =
    spec.base_wall_thickness +
    (spec.neck_wall_thickness - spec.base_wall_thickness) * Math.pow(frac, 0.8);

  return Math.max(0.0, rStructural - wallT);
}

function integrateSolidVolumeCuIn(
  zStart: number,
  zEnd: number,
  radiusAt: (z: number) => number,
  steps = 1000
): number {
  if (zEnd <= zStart) return 0;
  const dz = (zEnd - zStart) / steps;
  let sumArea = 0;
  for (let i = 0; i <= steps; i++) {
    const z = zStart + i * dz;
    const r = radiusAt(z);
    const area = Math.PI * r * r;
    const weight = i === 0 || i === steps ? 1 : i % 2 === 1 ? 4 : 2;
    sumArea += weight * area;
  }
  return (dz / 3.0) * sumArea;
}

/**
 * Computes empty C26000 cartridge brass case mass (grains & grams) from the exact
 * solid of revolution (outer case volume minus internal cavity, primer pocket, and flash hole).
 */
export function calculateBrassCaseWeight(spec: CartridgeSpec, innerVolCuIn?: number): {
  brass_case_weight_grains: number;
  brass_case_weight_grams: number;
} {
  const outerVolCuIn = integrateSolidVolumeCuIn(0, spec.case_length, (z) => getOuterRadiusAt(spec, z), 600);
  const cavityVolCuIn =
    innerVolCuIn ?? integrateSolidVolumeCuIn(spec.web_thickness, spec.case_length, (z) => getInnerRadiusAt(spec, z), 600);

  let primerCavityCuIn = 0;
  if (spec.rim_type !== 'rimfire' && spec.primer_pocket_dia > 0 && spec.primer_pocket_depth > 0) {
    const rPrimer = spec.primer_pocket_dia / 2;
    const pDepth = Math.min(spec.primer_pocket_depth, spec.web_thickness);
    primerCavityCuIn += Math.PI * rPrimer * rPrimer * pDepth;

    if (spec.flash_hole_dia > 0 && spec.web_thickness > pDepth) {
      const rFlash = spec.flash_hole_dia / 2;
      primerCavityCuIn += Math.PI * rFlash * rFlash * (spec.web_thickness - pDepth);
    }
  }

  const brassVolCuIn = Math.max(0, outerVolCuIn - cavityVolCuIn - primerCavityCuIn);
  const grains = brassVolCuIn * BRASS_GRAINS_PER_CU_IN;
  const grams = grains / GRAINS_PER_GRAM;

  return {
    brass_case_weight_grains: Math.round(grains * 10) / 10,
    brass_case_weight_grams: Math.round(grams * 100) / 100,
  };
}

export function calculateVolumetrics(spec: CartridgeSpec): VolumetricResult {
  const zStart = spec.web_thickness;
  const zEnd = spec.case_length;
  const barrelLen = spec.barrel_length_in ?? 24.0;
  const bore = resolveBoreAndGroove(spec);

  if (zEnd <= zStart) {
    return {
      overflow_capacity_grains_h2o: 0,
      overflow_capacity_cm3: 0,
      bullet_displacement_grains_h2o: 0,
      bullet_displacement_cm3: 0,
      usable_capacity_grains_h2o: 0,
      usable_capacity_cm3: 0,
      brass_case_weight_grains: 0,
      brass_case_weight_grams: 0,
      rifled_bore_area_sq_in: Math.round(bore.rifled_bore_area_sq_in * 10000) / 10000,
      rifled_bore_area_mm2: Math.round(bore.rifled_bore_area_sq_in * 645.16 * 100) / 100,
      barrel_length_in: barrelLen,
      sectional_density: 0,
      expansion_ratio_24in: 0,
      form_factor_est: 1.0,
      g1_bc_est: 0,
      g7_bc_est: 0,
    };
  }

  const volCuIn = integrateSolidVolumeCuIn(zStart, zEnd, (z) => getInnerRadiusAt(spec, z), 1000);
  const overflowGrains = volCuIn * CU_IN_TO_GRAINS_H2O;
  const overflowCm3 = volCuIn * CU_IN_TO_CM3;

  const bulletProfile = resolveBulletProfile(spec);
  const seatDepth = effectiveSeatingDepth(spec);
  const bulletShankVolCuIn = computeBulletDisplacementCuIn(spec, seatDepth, bulletProfile);
  const bulletDispGrains = bulletShankVolCuIn * CU_IN_TO_GRAINS_H2O;
  const bulletDispCm3 = bulletShankVolCuIn * CU_IN_TO_CM3;

  const usableVolCuIn = Math.max(0, volCuIn - bulletShankVolCuIn);
  const usableGrains = Math.max(0, overflowGrains - bulletDispGrains);
  const usableCm3 = Math.max(0, overflowCm3 - bulletDispCm3);

  const brassWeight = calculateBrassCaseWeight(spec, volCuIn);

  // Expansion ratio using true rifled bore cross-sectional area and bullet travel length.
  const bulletBaseZ = Math.max(zStart, spec.case_length - seatDepth);
  const bulletTravelIn = Math.max(1.0, barrelLen - bulletBaseZ);
  const boreVolCuIn = bore.rifled_bore_area_sq_in * bulletTravelIn;
  const expansionRatio = usableVolCuIn > 0 ? (usableVolCuIn + boreVolCuIn) / usableVolCuIn : 0;

  const bc = estimateBulletBC(spec, bulletProfile);

  return {
    overflow_capacity_grains_h2o: Math.round(overflowGrains * 10) / 10,
    overflow_capacity_cm3: Math.round(overflowCm3 * 100) / 100,
    bullet_displacement_grains_h2o: Math.round(bulletDispGrains * 10) / 10,
    bullet_displacement_cm3: Math.round(bulletDispCm3 * 100) / 100,
    usable_capacity_grains_h2o: Math.round(usableGrains * 10) / 10,
    usable_capacity_cm3: Math.round(usableCm3 * 100) / 100,
    brass_case_weight_grains: brassWeight.brass_case_weight_grains,
    brass_case_weight_grams: brassWeight.brass_case_weight_grams,
    rifled_bore_area_sq_in: Math.round(bore.rifled_bore_area_sq_in * 10000) / 10000,
    rifled_bore_area_mm2: Math.round(bore.rifled_bore_area_sq_in * 645.16 * 100) / 100,
    barrel_length_in: barrelLen,
    sectional_density: bc.sectional_density,
    expansion_ratio_24in: Math.round(expansionRatio * 10) / 10,
    form_factor_est: bc.form_factor_g1,
    g1_bc_est: bc.g1_bc_est,
    g7_bc_est: bc.g7_bc_est,
  };
}
