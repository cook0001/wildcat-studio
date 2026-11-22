import {
  CartridgeSpec,
  CaseFormingResult,
  ChamberCollisionIssue,
  ChamberCollisionReport,
  HeadspaceGaugeSpec,
  ReamerSpec,
  SetbackResult,
} from '../types/cartridge';
import { getBulletRadiusAt, getOgiveDistanceFromBaseAtDia, resolveBulletProfile } from './bullet';
import { effectiveShoulderLength, getChamberBodyRadiusAt, isStraightWall } from './caseGeometry';
import { getCartridgeStandardRef, lookupCaliberBoreStandard, resolveBoreAndGroove } from './standards';

export function resolveChamberSpec(spec: CartridgeSpec): ReamerSpec {
  const ref = getCartridgeStandardRef(spec);
  const calStd = lookupCaliberBoreStandard(spec.bullet_diameter);
  const bore = resolveBoreAndGroove(spec);
  const ov = spec.chamber_overrides;

  const sameCaliberAsRef =
    ref?.groove_diameter !== undefined &&
    Math.abs(spec.bullet_diameter - ref.groove_diameter) <= 0.005;

  const baseClr = ov?.base_clearance ?? ref?.base_clearance ?? 0.0020;
  const shoulderClr = ov?.shoulder_clearance ?? ref?.shoulder_clearance ?? 0.0020;
  const neckClr = ov?.neck_clearance ?? ref?.neck_clearance ?? 0.0030;
  const lengthClr = ov?.length_clearance ?? ref?.length_clearance ?? 0.0150;
  const rimDiaClr = ov?.rim_dia_clearance ?? 0.0050;
  const rimDepthClr = ov?.rim_depth_clearance ?? 0.0030;
  const headspaceClr = ov?.headspace_clearance ?? ref?.headspace_clearance ?? 0.0040;

  const freeboreDia =
    ov?.freebore_diameter ??
    (sameCaliberAsRef && ref?.freebore_diameter !== undefined
      ? ref.freebore_diameter
      : spec.bullet_diameter + 0.0005);

  const freeboreLen =
    ov?.freebore_length ??
    spec.freebore_length ??
    (sameCaliberAsRef && ref?.freebore_length !== undefined
      ? ref.freebore_length
      : calStd.default_freebore_in);

  const leadeAngle =
    ov?.leade_angle_deg ??
    (sameCaliberAsRef && ref?.leade_angle_deg !== undefined
      ? ref.leade_angle_deg
      : calStd.default_leade_deg);

  return {
    chamber_rim_dia: Math.round((spec.rim_diameter + rimDiaClr) * 10000) / 10000,
    chamber_rim_depth: Math.round((spec.rim_thickness + rimDepthClr) * 10000) / 10000,
    chamber_base_dia: Math.round((spec.base_diameter + baseClr) * 10000) / 10000,
    chamber_shoulder_dia: Math.round((spec.shoulder_start_diameter + shoulderClr) * 10000) / 10000,
    chamber_neck_dia: Math.round((spec.neck_diameter_mouth + neckClr) * 10000) / 10000,
    chamber_length: Math.round((spec.case_length + lengthClr) * 10000) / 10000,
    freebore_dia: Math.round(freeboreDia * 10000) / 10000,
    freebore_length: Math.round(freeboreLen * 10000) / 10000,
    leade_angle_deg: Math.round(leadeAngle * 1000) / 1000,
    pilot_diameter: bore.bore_dia_in,
    groove_diameter: bore.groove_dia_in,
    headspace_clearance: Math.round(headspaceClr * 10000) / 10000,
    rifled_bore_area_sq_in: Math.round(bore.rifled_bore_area_sq_in * 10000) / 10000,
  };
}

export function getChamberRadiusAt(spec: CartridgeSpec, z: number, precomputed?: ReamerSpec): number {
  const reamer = precomputed ?? resolveChamberSpec(spec);
  const tRimCh = reamer.chamber_rim_depth;
  const rRimCh = reamer.chamber_rim_dia / 2;
  const rBaseCh = reamer.chamber_base_dia / 2;
  const rShCh = reamer.chamber_shoulder_dia / 2;
  const rNeckCh = reamer.chamber_neck_dia / 2;
  const rFbCh = reamer.freebore_dia / 2;
  const rBore = reamer.pilot_diameter / 2;

  const zShStart = spec.body_length + reamer.headspace_clearance;
  const zShEnd = zShStart + effectiveShoulderLength(spec);
  const zNeckEnd = reamer.chamber_length;
  const zFbEnd = zNeckEnd + reamer.freebore_length;

  if ((spec.rim_type === 'rimmed' || spec.rim_type === 'rimfire' || spec.rim_type === 'semi_rimmed') && z <= tRimCh) {
    return rRimCh;
  }

  if (spec.rim_type === 'belted' && spec.belt_diameter) {
    const beltEnd = spec.rim_thickness + spec.extractor_width + (spec.belt_width || 0.220) + 0.004;
    if (z <= beltEnd) {
      return (spec.belt_diameter + 0.002) / 2;
    }
  }

  const bodyStartZ =
    spec.rim_type === 'rimmed' || spec.rim_type === 'rimfire'
      ? tRimCh
      : spec.rim_thickness + spec.extractor_width;

  if (isStraightWall(spec)) {
    if (z <= zNeckEnd) {
      const frac = (z - bodyStartZ) / Math.max(0.001, zNeckEnd - bodyStartZ);
      return rBaseCh + (rNeckCh - rBaseCh) * Math.min(1.0, Math.max(0, frac));
    }
  } else {
    if (z <= zShStart) {
      const frac = (z - bodyStartZ) / Math.max(0.001, zShStart - bodyStartZ);
      return rBaseCh + (rShCh - rBaseCh) * Math.min(1.0, Math.max(0, frac));
    }
    if (z <= zShEnd) {
      const frac = (z - zShStart) / Math.max(0.001, zShEnd - zShStart);
      return rShCh + (rNeckCh - rShCh) * Math.min(1.0, Math.max(0, frac));
    }
    if (z <= zNeckEnd) {
      return rNeckCh;
    }
  }

  if (z <= zFbEnd) {
    return rFbCh;
  }

  const tanLeade = Math.max(0.005, Math.tan((reamer.leade_angle_deg * Math.PI) / 180));
  const zLeadeLen = Math.max(0.001, (rFbCh - rBore) / tanLeade);
  if (z <= zFbEnd + zLeadeLen) {
    const frac = (z - zFbEnd) / zLeadeLen;
    return rFbCh - (rFbCh - rBore) * frac;
  }

  return rBore;
}

/**
 * Resolves exact SAAMI/C.I.P. headspace datum circle diameter and axial datum length.
 */
export function calculateDatumHeadspace(spec: CartridgeSpec): { datum_diameter: number; datum_length: number } {
  if (isStraightWall(spec)) {
    return {
      datum_diameter: spec.neck_diameter_mouth,
      datum_length: spec.case_length,
    };
  }

  const ref = getCartridgeStandardRef(spec);
  const shStart = spec.shoulder_start_diameter;
  const shEnd = spec.neck_diameter_base || spec.neck_diameter_mouth;

  let datumDia = spec.datum_diameter ?? ref?.datum_diameter;
  if (datumDia === undefined) {
    // Caliber-group SAAMI standard datum diameters
    if (shStart <= 0.365) datumDia = 0.3300;
    else if (shStart <= 0.425) datumDia = 0.3500;
    else if (shStart <= 0.450) datumDia = 0.3750;
    else if (shStart <= 0.485) datumDia = 0.4000;
    else if (shStart <= 0.540) datumDia = 0.4200;
    else if (shStart <= 0.620) datumDia = 0.4750;
    else datumDia = 0.6500;
  }

  // Clamp onto the shoulder cone only if wildcat geometry moved the shoulder outside datumDia.
  if (datumDia >= shStart - 0.002 || datumDia <= shEnd + 0.002) {
    datumDia = shEnd + (shStart - shEnd) * 0.5;
  }

  const frac = (shStart - datumDia) / Math.max(0.001, shStart - shEnd);
  const datumLen = spec.body_length + effectiveShoulderLength(spec) * Math.min(1.0, Math.max(0.0, frac));

  return {
    datum_diameter: Math.round(datumDia * 10000) / 10000,
    datum_length: Math.round(datumLen * 10000) / 10000,
  };
}

/**
 * Calculates precision GO, NO-GO, and FIELD headspace gauge lengths using verified
 * per-cartridge SAAMI/C.I.P. offsets when available.
 */
export function calculateHeadspaceGauges(spec: CartridgeSpec): HeadspaceGaugeSpec {
  const ref = getCartridgeStandardRef(spec);
  const nogoOff = ref?.nogo_offset ?? 0.0040;
  const fieldOff = ref?.field_offset ?? (spec.rim_type === 'rimmed' || spec.rim_type === 'rimfire' || spec.rim_type === 'belted' ? 0.0070 : 0.0100);

  if (spec.rim_type === 'rimmed' || spec.rim_type === 'rimfire') {
    const nominal = spec.rim_thickness;
    return {
      type: 'rimmed',
      datum_diameter: spec.rim_diameter,
      datum_length_nominal: nominal,
      go_gauge_inches: Math.round(nominal * 10000) / 10000,
      nogo_gauge_inches: Math.round((nominal + nogoOff) * 10000) / 10000,
      field_gauge_inches: Math.round((nominal + fieldOff) * 10000) / 10000,
      tolerance_inches: 0.0002,
    };
  }

  if (spec.rim_type === 'belted') {
    const beltW = spec.belt_width || 0.220;
    return {
      type: 'belted',
      datum_diameter: spec.belt_diameter || spec.base_diameter,
      datum_length_nominal: beltW,
      go_gauge_inches: Math.round(beltW * 10000) / 10000,
      nogo_gauge_inches: Math.round((beltW + nogoOff) * 10000) / 10000,
      field_gauge_inches: Math.round((beltW + fieldOff) * 10000) / 10000,
      tolerance_inches: 0.0002,
    };
  }

  if (isStraightWall(spec)) {
    const nominal = spec.case_length;
    return {
      type: 'straight_wall',
      datum_diameter: spec.neck_diameter_mouth,
      datum_length_nominal: nominal,
      go_gauge_inches: Math.round(nominal * 10000) / 10000,
      nogo_gauge_inches: Math.round((nominal + nogoOff) * 10000) / 10000,
      field_gauge_inches: Math.round((nominal + Math.max(fieldOff, 0.0080)) * 10000) / 10000,
      tolerance_inches: 0.0003,
    };
  }

  const { datum_diameter, datum_length } = calculateDatumHeadspace(spec);
  return {
    type: 'bottleneck',
    datum_diameter,
    datum_length_nominal: datum_length,
    go_gauge_inches: Math.round(datum_length * 10000) / 10000,
    nogo_gauge_inches: Math.round((datum_length + nogoOff) * 10000) / 10000,
    field_gauge_inches: Math.round((datum_length + fieldOff) * 10000) / 10000,
    tolerance_inches: 0.0002,
  };
}

/**
 * Computes true C.I.P. axial headspace delta (ΔL = chamber datum - max cartridge datum).
 */
export function calculateCIPDeltaL(spec: CartridgeSpec): {
  deltaL_mm: number;
  deltaL_in: number;
  isSafe: boolean;
  note: string;
} {
  const chamber = resolveChamberSpec(spec);
  let deltaLIn: number;

  if (spec.rim_type === 'rimmed' || spec.rim_type === 'rimfire') {
    deltaLIn = chamber.chamber_rim_depth - spec.rim_thickness;
  } else if (spec.rim_type === 'belted' || isStraightWall(spec)) {
    deltaLIn = chamber.headspace_clearance;
  } else {
    // Bottleneck headspace is axial distance between chamber shoulder datum and cartridge shoulder datum.
    deltaLIn = chamber.headspace_clearance;
  }

  const safeDeltaIn = Math.max(0, deltaLIn);
  const deltaLMm = safeDeltaIn * 25.4;
  const isSafe = deltaLMm >= 0.05 && deltaLMm <= 0.25;

  let note = 'Complies with C.I.P. Safety Rule (0.05 mm <= ΔL <= 0.25 mm)';
  if (deltaLMm < 0.05) {
    note = 'Below minimum C.I.P. headspace margin (ΔL < 0.05 mm — hard bolt closure risk)';
  } else if (deltaLMm > 0.25) {
    note = 'Excessive headspace clearance (ΔL > 0.25 mm — case stretch / head separation risk)';
  }

  return {
    deltaL_mm: Math.round(deltaLMm * 1000) / 1000,
    deltaL_in: Math.round(safeDeltaIn * 10000) / 10000,
    isSafe,
    note,
  };
}

/**
 * Performs a 200-station QuickDESIGN-style cartridge-to-chamber collision check
 * plus exact bullet-ogive-to-rifling-lands Jam COAL and Jump-to-Lands calculation.
 */
export function analyzeChamberCollision(spec: CartridgeSpec, precomputed?: ReamerSpec): ChamberCollisionReport {
  const reamer = precomputed ?? resolveChamberSpec(spec);
  const bulletProfile = resolveBulletProfile(spec);
  const issues: ChamberCollisionIssue[] = [];

  const neckClearance = reamer.chamber_neck_dia - spec.neck_diameter_mouth;
  const baseClearance = reamer.chamber_base_dia - spec.base_diameter;
  const shoulderClearance = reamer.chamber_shoulder_dia - spec.shoulder_start_diameter;
  const mouthClearance = reamer.chamber_length - spec.case_length;

  // Sweep radial clearance along the case body (from past extractor groove to case mouth)
  const startZ =
    spec.rim_type === 'rimmed' || spec.rim_type === 'rimfire'
      ? spec.rim_thickness + 0.005
      : spec.rim_thickness + spec.extractor_width + 0.005;
  const steps = 200;
  let minRadialClr = Infinity;
  let minClrZ = startZ;

  for (let i = 0; i <= steps; i++) {
    const z = startZ + (i / steps) * Math.max(0.01, spec.case_length - startZ);
    const rCase = getChamberBodyRadiusAt(spec, z);
    const rChamber = getChamberRadiusAt(spec, z, reamer);
    const clr = rChamber - rCase;
    if (clr < minRadialClr) {
      minRadialClr = clr;
      minClrZ = z;
    }
  }

  if (baseClearance < 0) {
    issues.push({ severity: 'error', zone: 'Base (P₁)', message: `Case base exceeds chamber by ${Math.abs(baseClearance).toFixed(4)}"` });
  } else if (baseClearance < 0.001) {
    issues.push({ severity: 'warning', zone: 'Base (P₁)', message: `Tight base clearance (${baseClearance.toFixed(4)}") may cause sticky extraction` });
  }

  if (!isStraightWall(spec)) {
    if (shoulderClearance < 0) {
      issues.push({ severity: 'error', zone: 'Shoulder (P₂)', message: `Case shoulder exceeds chamber by ${Math.abs(shoulderClearance).toFixed(4)}"` });
    } else if (shoulderClearance < 0.001) {
      issues.push({ severity: 'warning', zone: 'Shoulder (P₂)', message: `Tight shoulder clearance (${shoulderClearance.toFixed(4)}")` });
    }
  }

  if (neckClearance < 0) {
    issues.push({ severity: 'error', zone: 'Neck (H₂)', message: `Case neck exceeds chamber neck by ${Math.abs(neckClearance).toFixed(4)}" (dangerous pinch)` });
  } else if (neckClearance < 0.002) {
    issues.push({ severity: 'warning', zone: 'Neck (H₂)', message: `Tight-neck fit (${neckClearance.toFixed(4)}" clearance) — neck turning required` });
  }

  if (mouthClearance < 0) {
    issues.push({ severity: 'error', zone: 'Mouth (L₃)', message: `Case length exceeds chamber length by ${Math.abs(mouthClearance).toFixed(4)}" (crimp pinch)` });
  } else if (mouthClearance < 0.005) {
    issues.push({ severity: 'warning', zone: 'Mouth (L₃)', message: `Minimal case mouth clearance (${mouthClearance.toFixed(4)}") — trim cases closely` });
  }

  // Exact Jam COAL: find the maximum bullet base z where r_bullet(x) <= r_chamber(zBase + x) across throat/leade.
  const zFbStart = reamer.chamber_length;
  const zFbEnd = zFbStart + reamer.freebore_length;
  const rFb = reamer.freebore_dia / 2;
  const rBore = reamer.pilot_diameter / 2;
  const tanLeade = Math.max(0.005, Math.tan((reamer.leade_angle_deg * Math.PI) / 180));
  const zLeadeLen = Math.max(0.001, (rFb - rBore) / tanLeade);

  // Sample bullet profile from bearing surface start to tip; find earliest axial contact with freebore/leade/bore.
  const bulletSamples = 160;
  let minJamBaseZ = Infinity;
  for (let i = 0; i <= bulletSamples; i++) {
    const x = (i / bulletSamples) * spec.bullet_length;
    const rBul = getBulletRadiusAt(spec, x, bulletProfile);
    if (rBul <= rBore + 0.00005) continue;

    // Axial chamber z where chamber throat narrows to radius rBul
    let zContact: number;
    if (rBul >= rFb) {
      zContact = zFbStart; // Contacts freebore wall immediately if bullet > freebore dia
    } else {
      const frac = (rFb - rBul) / Math.max(0.0001, rFb - rBore);
      zContact = zFbEnd + frac * zLeadeLen;
    }

    const baseZAtContact = zContact - x;
    if (baseZAtContact < minJamBaseZ) {
      minJamBaseZ = baseZAtContact;
    }
  }

  const jamCoal = Number.isFinite(minJamBaseZ)
    ? minJamBaseZ + spec.bullet_length
    : zFbEnd + spec.bullet_length * 0.5;
  const jumpToLands = jamCoal - spec.coal;

  const xOgiveAtBore = getOgiveDistanceFromBaseAtDia(spec, reamer.pilot_diameter, bulletProfile);
  const cbto = spec.coal - spec.bullet_length + xOgiveAtBore;

  if (spec.bullet_diameter > reamer.freebore_dia) {
    issues.push({
      severity: 'error',
      zone: 'Freebore',
      message: `Bullet diameter (${spec.bullet_diameter.toFixed(4)}") exceeds freebore (${reamer.freebore_dia.toFixed(4)}")`,
    });
  }

  if (jumpToLands < -0.001) {
    issues.push({
      severity: 'warning',
      zone: 'Rifling Lands',
      message: `Bullet jammed ${Math.abs(jumpToLands).toFixed(3)}" into lands (Jam COAL: ${jamCoal.toFixed(3)}")`,
    });
  } else if (jumpToLands > 0.250) {
    issues.push({
      severity: 'warning',
      zone: 'Rifling Lands',
      message: `Long jump to lands (${jumpToLands.toFixed(3)}") — consider shorter freebore or longer COAL`,
    });
  }

  const hasInterference =
    minRadialClr < -0.0001 || issues.some((it) => it.severity === 'error');

  return {
    has_interference: hasInterference,
    min_radial_clearance_in: Math.round(minRadialClr * 10000) / 10000,
    min_clearance_z_in: Math.round(minClrZ * 1000) / 1000,
    neck_clearance_in: Math.round(neckClearance * 10000) / 10000,
    base_clearance_in: Math.round(baseClearance * 10000) / 10000,
    shoulder_clearance_in: Math.round(shoulderClearance * 10000) / 10000,
    mouth_clearance_in: Math.round(mouthClearance * 10000) / 10000,
    jam_coal_in: Math.round(jamCoal * 1000) / 1000,
    jump_to_lands_in: Math.round(jumpToLands * 1000) / 1000,
    cbto_in: Math.round(cbto * 1000) / 1000,
    issues,
  };
}

/**
 * Evaluates whether an existing chamber can be cleanly rechambered to a new cartridge,
 * and computes minimum barrel setback (0.005" resolution) when required.
 */
export function analyzeSetback(oldSpec: CartridgeSpec, newSpec: CartridgeSpec): SetbackResult {
  const oldChamber = resolveChamberSpec(oldSpec);
  const newChamber = resolveChamberSpec(newSpec);
  let canClean = true;
  const interferences: string[] = [];
  const steps = 200;
  const zMax = Math.max(oldChamber.chamber_length + oldChamber.freebore_length, newChamber.chamber_length + newChamber.freebore_length);
  const dz = zMax / steps;
  const boreCompatible = newChamber.groove_diameter >= oldChamber.groove_diameter - 0.002;

  if (!boreCompatible) {
    canClean = false;
    interferences.push(
      `Bore mismatch: Existing groove ${oldChamber.groove_diameter.toFixed(4)}" > New ${newChamber.groove_diameter.toFixed(4)}" (barrel replacement required)`
    );
  }

  for (let i = 0; i <= steps; i++) {
    const z = i * dz;
    const rOld = getChamberRadiusAt(oldSpec, z, oldChamber);
    const rNew = getChamberRadiusAt(newSpec, z, newChamber);

    if (rNew < rOld - 0.0002) {
      canClean = false;
      const diff = (rOld - rNew) * 2.0;
      if (interferences.length < 5) {
        interferences.push(
          `Underage at z=${z.toFixed(3)}": Existing chamber=${(rOld * 2).toFixed(4)}", New chamber=${(rNew * 2).toFixed(4)}" (-${diff.toFixed(4)}")`
        );
      }
    }
  }

  let requiredSetback = 0;
  if (!canClean && boreCompatible) {
    const oldEnd = oldChamber.chamber_length + oldChamber.freebore_length;
    for (let test = 1; test <= 400; test++) {
      const offset = test * 0.005;
      let cleanWithOffset = true;

      for (let i = 0; i <= steps; i++) {
        const zNew = i * dz;
        const zOld = zNew + offset;
        if (zOld > oldEnd) break;
        const rOld = getChamberRadiusAt(oldSpec, zOld, oldChamber);
        const rNew = getChamberRadiusAt(newSpec, zNew, newChamber);

        if (rNew < rOld - 0.0002) {
          cleanWithOffset = false;
          break;
        }
      }

      if (cleanWithOffset) {
        requiredSetback = offset;
        break;
      }
    }
  }

  return {
    can_rechamber_clean: canClean,
    required_setback_inches: Math.round(requiredSetback * 1000) / 1000,
    required_setback_mm: Math.round(requiredSetback * 25.4 * 100) / 100,
    interference_locations: interferences,
  };
}

/**
 * Analyzes case neck brass flow, wall thickening, and doughnut formation risk during wildcatting.
 */
export function analyzeCaseForming(parent: CartridgeSpec, wildcat: CartridgeSpec): CaseFormingResult {
  const neckDiaChange = wildcat.neck_diameter_mouth - parent.neck_diameter_mouth;
  const ratio = Math.max(0.4, parent.neck_diameter_mouth / Math.max(0.1, wildcat.neck_diameter_mouth));
  const predictedWall = parent.neck_wall_thickness * Math.sqrt(ratio);
  const loadedNeckDia = wildcat.bullet_diameter + predictedWall * 2;
  const chamber = resolveChamberSpec(wildcat);
  const chamberNeckDia = chamber.chamber_neck_dia;
  const neckClearance = chamberNeckDia - loadedNeckDia;
  const requiresTurning = neckClearance < 0.0025;

  let doughnutRisk: 'none' | 'moderate' | 'high' = 'none';
  let doughnutReason = 'Clean neck transition. Parent shoulder remains behind the neck junction.';

  if (wildcat.body_length < parent.body_length - 0.025) {
    doughnutRisk = 'high';
    doughnutReason =
      'Parent shoulder brass pushed into the new neck column. Internal doughnut likely at neck-shoulder junction. Inside neck reaming required.';
  } else if (wildcat.body_length < parent.body_length - 0.008) {
    doughnutRisk = 'moderate';
    doughnutReason = 'Minor shoulder material displaced into neck base. Monitor bullet shank seating.';
  }

  const trimReq = Math.max(0, parent.case_length - wildcat.case_length);
  const steps: string[] = [];
  if (neckDiaChange < -0.040) {
    steps.push(`Use intermediate forming die (step down by ${(Math.abs(neckDiaChange) / 2).toFixed(3)}") to prevent neck collapse.`);
  }
  if (neckDiaChange > 0.030) {
    steps.push('Use tapered expander mandrel with dry lubricant to expand neck without shoulder buckling.');
  }
  if (requiresTurning) {
    const targetWall = Math.max(0.008, (chamberNeckDia - wildcat.bullet_diameter - 0.003) / 2);
    steps.push(`Outside neck turning required from ${predictedWall.toFixed(4)}" down to ${targetWall.toFixed(4)}".`);
  }
  if (doughnutRisk === 'high') {
    steps.push('Inside neck ream after fire-forming to remove internal doughnut.');
  }
  if (trimReq > 0.010) {
    steps.push(`Rough trim before first firing, then final trim to ${wildcat.case_length.toFixed(3)}" after full-length resizing.`);
  }
  if (steps.length === 0) {
    steps.push('Standard full-length sizing die will form case in a single pass.');
  }

  return {
    parent_name: parent.name,
    wildcat_name: wildcat.name,
    neck_diameter_change: Math.round(neckDiaChange * 10000) / 10000,
    predicted_neck_wall: Math.round(predictedWall * 10000) / 10000,
    original_neck_wall: parent.neck_wall_thickness,
    loaded_neck_dia: Math.round(loadedNeckDia * 10000) / 10000,
    chamber_neck_dia: Math.round(chamberNeckDia * 10000) / 10000,
    neck_clearance: Math.round(neckClearance * 10000) / 10000,
    requires_neck_turning: requiresTurning,
    doughnut_risk: doughnutRisk,
    doughnut_reason: doughnutReason,
    trim_length_required: Math.round(trimReq * 1000) / 1000,
    recommended_steps: steps,
  };
}
