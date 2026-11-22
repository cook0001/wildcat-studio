import {
  CartridgeSpec,
  DimensionStandard,
  RimType,
  UnitSystem,
} from '../types/cartridge';
import { effectiveSeatingDepth, getBulletRadiusAt, resolveBulletProfile } from './bullet';
import { calculateVolumetrics, getInnerRadiusAt, getOuterRadiusAt } from './caseGeometry';
import { analyzeChamberCollision, getChamberRadiusAt, resolveChamberSpec } from './chamber';

const IN_TO_MM = 25.4;
const MM_TO_IN = 1 / 25.4;
const GRAINS_TO_G = 0.06479891;
const G_TO_GRAINS = 1 / GRAINS_TO_G;

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function splitCsvFields(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Exports a QuickLOAD / Gordon's Reloading Tool compatible `.vol` cartridge record
 * using true rifled cross-sectional bore area and SAAMI/C.I.P. groove diameter.
 */
export function exportQuickloadVol(spec: CartridgeSpec): string {
  const vol = calculateVolumetrics(spec);
  const chamber = resolveChamberSpec(spec);
  const pressure = spec.max_pressure_bar || 4150;
  const standardStr = spec.standard === 'CIP' ? 'PiezoCIP' : 'SAAMI';
  const safeName = spec.name.replace(/"/g, '');

  return `"${safeName}","${vol.overflow_capacity_grains_h2o.toFixed(1)}","${spec.case_length.toFixed(3)}","${spec.bullet_diameter.toFixed(3)}","${vol.rifled_bore_area_sq_in.toFixed(4)}","${chamber.groove_diameter.toFixed(3)}","${Math.round(pressure)}","${standardStr}","${spec.coal.toFixed(3)}","","","","","",""`;
}

/**
 * Exports a QuickLOAD / Gordon's Reloading Tool compatible `.bul` projectile line
 * with full boat-tail taper dimensions and G1/G7 ballistic coefficients.
 */
export function exportQuickloadBul(spec: CartridgeSpec): string {
  const vol = calculateVolumetrics(spec);
  const profile = resolveBulletProfile(spec);
  const label = `${spec.bullet_diameter.toFixed(3)} ${spec.bullet_weight_grains}gr ${profile.ogive_type.replace('_', ' ')} ${profile.base_type === 'boat_tail' ? 'BT' : 'FB'}`.replace(/"/g, '');

  return [
    `"${label}"`,
    `"${spec.bullet_weight_grains.toFixed(1)}"`,
    `"${spec.bullet_length.toFixed(3)}"`,
    `"${spec.bullet_diameter.toFixed(3)}"`,
    `"${profile.boat_tail_base_dia_in.toFixed(3)}"`,
    `"${spec.bullet_diameter.toFixed(3)}"`,
    `"${profile.boat_tail_length_in.toFixed(3)}"`,
    `"${vol.g1_bc_est.toFixed(3)}"`,
    `"${vol.g7_bc_est.toFixed(3)}"`,
    `"${profile.material}"`,
  ].join(',');
}

/**
 * Exports a Gordon's Reloading Tool `.grtload` XML file containing verified
 * caliber, case capacity, rifled bore cross-section, and parametric bullet fields.
 */
export function exportGrtLoadXml(spec: CartridgeSpec): string {
  const vol = calculateVolumetrics(spec);
  const chamber = resolveChamberSpec(spec);
  const profile = resolveBulletProfile(spec);
  const seatDepth = effectiveSeatingDepth(spec);

  const encName = escapeXmlAttr(encodeURIComponent(spec.name));
  const bulletTitle = `${spec.bullet_weight_grains}gr ${spec.bullet_diameter.toFixed(3)}in`;
  const encBullet = escapeXmlAttr(encodeURIComponent(bulletTitle));

  const lines = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>',
    '<GordonsReloadingTool version="2021.2030-NIGHTLY">',
    '  <InnerBallistikInput>',
    `    <title>${encName}</title>`,
    '    <caliber>',
    `      <input name="CaliberName" value="${encName}" unit="" type="string" descr="caliber name" />`,
    `      <input name="standard" value="${escapeXmlAttr(spec.standard)}" unit="" type="string" descr="dimension standard" />`,
    `      <input name="oal" value="${(spec.coal * IN_TO_MM).toFixed(2)}" unit="mm" type="decimal" descr="cartridge overall length (L6)" />`,
    `      <input name="caselen" value="${(spec.case_length * IN_TO_MM).toFixed(2)}" unit="mm" type="decimal" descr="case length (L3)" />`,
    `      <input name="casevol" value="${vol.overflow_capacity_cm3.toFixed(3)}" unit="cm3" type="decimal" descr="case overflow water volume" />`,
    `      <input name="casevol_gr" value="${vol.overflow_capacity_grains_h2o.toFixed(1)}" unit="gr" type="decimal" descr="case overflow capacity in grains H2O" />`,
    `      <input name="pMaxZul" value="${Math.round(spec.max_pressure_bar)}" unit="bar" type="decimal" descr="maximum allowable pressure" />`,
    `      <input name="A0" value="${vol.rifled_bore_area_mm2.toFixed(2)}" unit="mm2" type="decimal" descr="rifled bore cross-sectional area" />`,
    `      <input name="Dz" value="${(chamber.groove_diameter * IN_TO_MM).toFixed(3)}" unit="mm" type="decimal" descr="groove diameter" />`,
    `      <input name="Df" value="${(chamber.pilot_diameter * IN_TO_MM).toFixed(3)}" unit="mm" type="decimal" descr="bore land diameter" />`,
    `      <input name="P1" value="${(spec.base_diameter * IN_TO_MM).toFixed(3)}" unit="mm" type="decimal" descr="base diameter" />`,
    `      <input name="P2" value="${(spec.shoulder_start_diameter * IN_TO_MM).toFixed(3)}" unit="mm" type="decimal" descr="shoulder base diameter" />`,
    `      <input name="H1" value="${(spec.neck_diameter_base * IN_TO_MM).toFixed(3)}" unit="mm" type="decimal" descr="neck base diameter" />`,
    `      <input name="H2" value="${(spec.neck_diameter_mouth * IN_TO_MM).toFixed(3)}" unit="mm" type="decimal" descr="neck mouth diameter" />`,
    `      <input name="R1" value="${(spec.rim_diameter * IN_TO_MM).toFixed(3)}" unit="mm" type="decimal" descr="rim diameter" />`,
    `      <input name="R" value="${(spec.rim_thickness * IN_TO_MM).toFixed(3)}" unit="mm" type="decimal" descr="rim thickness" />`,
    `      <input name="L1" value="${(spec.body_length * IN_TO_MM).toFixed(3)}" unit="mm" type="decimal" descr="body length to shoulder" />`,
    `      <input name="alpha" value="${spec.shoulder_angle.toFixed(2)}" unit="deg" type="decimal" descr="shoulder half angle" />`,
    '    </caliber>',
    '    <projectile>',
    `      <input name="ProjectileName" value="${encBullet}" unit="" type="string" descr="projectile name" />`,
    `      <input name="mGes" value="${(spec.bullet_weight_grains * GRAINS_TO_G).toFixed(3)}" unit="g" type="decimal" descr="projectile mass" />`,
    `      <input name="lGes" value="${(spec.bullet_length * IN_TO_MM).toFixed(2)}" unit="mm" type="decimal" descr="projectile overall length" />`,
    `      <input name="caliber" value="${(spec.bullet_diameter * IN_TO_MM).toFixed(3)}" unit="mm" type="decimal" descr="projectile diameter" />`,
    `      <input name="seatdepth" value="${(seatDepth * IN_TO_MM).toFixed(2)}" unit="mm" type="decimal" descr="bullet seating depth" />`,
    `      <input name="btlen" value="${(profile.boat_tail_length_in * IN_TO_MM).toFixed(2)}" unit="mm" type="decimal" descr="boat tail length" />`,
    `      <input name="btdia" value="${(profile.boat_tail_base_dia_in * IN_TO_MM).toFixed(3)}" unit="mm" type="decimal" descr="boat tail base diameter" />`,
    `      <input name="bcG1" value="${vol.g1_bc_est.toFixed(3)}" unit="" type="decimal" descr="estimated G1 ballistic coefficient" />`,
    `      <input name="bcG7" value="${vol.g7_bc_est.toFixed(3)}" unit="" type="decimal" descr="estimated G7 ballistic coefficient" />`,
    '    </projectile>',
    '    <gun>',
    `      <input name="barrelLen" value="${(vol.barrel_length_in * IN_TO_MM).toFixed(1)}" unit="mm" type="decimal" descr="barrel length" />`,
    '    </gun>',
    '  </InnerBallistikInput>',
    '</GordonsReloadingTool>',
  ];

  return lines.join('\n');
}

/**
 * Parses a Gordon's Reloading Tool `.grtload` XML file into a CartridgeSpec.
 */
export function parseGrtLoadXml(rawXml: string): CartridgeSpec | null {
  if (!rawXml.includes('<GordonsReloadingTool') && !rawXml.includes('<InnerBallistikInput')) {
    return null;
  }

  const values = new Map<string, { value: string; unit: string }>();
  const tagRe = /<(?:input|var|svar)\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(rawXml)) !== null) {
    const tag = m[0];
    const nameMatch = /\bname\s*=\s*["']([^"']+)["']/i.exec(tag);
    const valMatch = /\bvalue\s*=\s*["']([^"']*)["']/i.exec(tag);
    const unitMatch = /\bunit\s*=\s*["']([^"']*)["']/i.exec(tag);
    if (nameMatch && valMatch) {
      values.set(nameMatch[1], { value: valMatch[1], unit: (unitMatch?.[1] ?? '').toLowerCase() });
    }
  }

  const getStr = (key: string): string | undefined => {
    const entry = values.get(key);
    if (!entry || !entry.value) return undefined;
    try {
      return decodeURIComponent(entry.value);
    } catch {
      return entry.value;
    }
  };

  const getLenIn = (key: string): number | undefined => {
    const entry = values.get(key);
    if (!entry) return undefined;
    const n = parseFloat(entry.value);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    return entry.unit === 'in' || entry.unit === 'inch' ? n : n * MM_TO_IN;
  };

  const getNum = (key: string): number | undefined => {
    const entry = values.get(key);
    if (!entry) return undefined;
    const n = parseFloat(entry.value);
    return Number.isFinite(n) ? n : undefined;
  };

  const titleMatch = /<title>([^<]+)<\/title>/i.exec(rawXml);
  let name = getStr('CaliberName');
  if (!name && titleMatch) {
    try {
      name = decodeURIComponent(titleMatch[1].trim());
    } catch {
      name = titleMatch[1].trim();
    }
  }
  const caseLen = getLenIn('caselen');
  const bulletDia = getLenIn('caliber') ?? getLenIn('Dz');
  if (!name && !caseLen && !bulletDia) return null;

  const cal = +(bulletDia ?? 0.308).toFixed(4);
  const l3 = +(caseLen ?? 2.015).toFixed(4);
  const coal = +(getLenIn('oal') ?? l3 + 0.785).toFixed(4);
  const bulletLen = +(getLenIn('lGes') ?? cal * 3.8).toFixed(4);
  const seatDepth = +(getLenIn('seatdepth') ?? Math.max(0.15, l3 + bulletLen - coal)).toFixed(4);

  const massEntry = values.get('mGes');
  let bulletWeightGr = 150;
  if (massEntry) {
    const mNum = parseFloat(massEntry.value);
    if (Number.isFinite(mNum) && mNum > 0) {
      bulletWeightGr = massEntry.unit === 'gr' || massEntry.unit === 'gn' ? mNum : mNum * G_TO_GRAINS;
    }
  }

  const pEntry = values.get('pMaxZul');
  let pMaxBar = 4150;
  if (pEntry) {
    const pNum = parseFloat(pEntry.value);
    if (Number.isFinite(pNum) && pNum > 0) {
      pMaxBar = pEntry.unit === 'psi' ? pNum / 14.5038 : pNum;
    }
  }

  const rimDia = +(getLenIn('R1') ?? Math.max(0.378, cal * 1.53)).toFixed(4);
  const rimThick = +(getLenIn('R') ?? 0.054).toFixed(4);
  const baseDia = +(getLenIn('P1') ?? rimDia * 0.99).toFixed(4);
  const shStartDia = +(getLenIn('P2') ?? baseDia * 0.96).toFixed(4);
  const neckBase = +(getLenIn('H1') ?? cal + 0.032).toFixed(4);
  const neckMouth = +(getLenIn('H2') ?? neckBase).toFixed(4);
  const bodyLen = +(getLenIn('L1') ?? l3 * 0.77).toFixed(4);
  const alpha = getNum('alpha') ?? 20.0;
  const shLen =
    alpha > 0.5 && shStartDia > neckBase
      ? +(((shStartDia - neckBase) / 2) / Math.tan((alpha * Math.PI) / 180)).toFixed(4)
      : 0;

  const btLen = getLenIn('btlen');
  const btDia = getLenIn('btdia');
  const boreDia = getLenIn('Df');
  const grooveDia = getLenIn('Dz');
  const barrelLen = getLenIn('barrelLen');
  const stdStr = (getStr('standard') || 'CIP').toUpperCase();
  const standard: DimensionStandard = stdStr.includes('SAAMI') ? 'SAAMI' : stdStr.includes('CIP') ? 'CIP' : 'Wildcat';

  return {
    id: `grt_${Date.now()}`,
    name: name || 'GRT Imported Cartridge',
    category: 'Custom Wildcats & User Designs',
    standard,
    units: 'metric',
    rim_type: 'rimless',
    rim_diameter: rimDia,
    rim_thickness: rimThick,
    extractor_diameter: +(Math.max(0.15, rimDia - 0.065)).toFixed(4),
    extractor_width: 0.039,
    extractor_angle: 45,
    base_diameter: baseDia,
    shoulder_start_diameter: shStartDia,
    body_length: bodyLen,
    shoulder_length: shLen,
    shoulder_angle: alpha,
    neck_diameter_base: neckBase,
    neck_diameter_mouth: neckMouth,
    case_length: l3,
    web_thickness: 0.180,
    base_wall_thickness: 0.032,
    neck_wall_thickness: +(Math.max(0.010, (neckMouth - cal) / 2)).toFixed(4),
    primer_pocket_dia: cal < 0.25 ? 0.175 : 0.210,
    primer_pocket_depth: 0.128,
    flash_hole_dia: 0.080,
    bullet_diameter: cal,
    bullet_length: bulletLen,
    bullet_weight_grains: Math.round(bulletWeightGr * 10) / 10,
    coal,
    seating_depth: seatDepth,
    max_pressure_bar: Math.round(pMaxBar),
    bore_diameter: boreDia ? +boreDia.toFixed(4) : undefined,
    groove_diameter: grooveDia ? +grooveDia.toFixed(4) : undefined,
    barrel_length_in: barrelLen ? +barrelLen.toFixed(2) : undefined,
    bullet_profile:
      btLen !== undefined || btDia !== undefined
        ? {
            base_type: btLen && btLen > 0.005 ? 'boat_tail' : 'flat_base',
            boat_tail_length_in: btLen ? +btLen.toFixed(4) : 0,
            boat_tail_base_dia_in: btDia ? +btDia.toFixed(4) : cal,
          }
        : undefined,
    notes: 'Imported from Gordon\'s Reloading Tool (.grtload)',
  };
}

/**
 * Generates universal cartridge interchange text (.qdf / .dat format).
 */
export function exportUniversalQDF(spec: CartridgeSpec): string {
  const vol = calculateVolumetrics(spec);
  const chamber = resolveChamberSpec(spec);
  const profile = resolveBulletProfile(spec);
  const seatDepth = effectiveSeatingDepth(spec);

  const lines = [
    '; Wildcat Studio Universal Cartridge Data Exchange',
    `; Generated: ${new Date().toISOString()}`,
    '[Cartridge]',
    `Name="${spec.name}"`,
    `ID="${spec.id}"`,
    `Standard="${spec.standard}"`,
    `RimType="${spec.rim_type}"`,
    `CaseLength_in=${spec.case_length.toFixed(4)}`,
    `COAL_in=${spec.coal.toFixed(4)}`,
    `SeatingDepth_in=${seatDepth.toFixed(4)}`,
    `BulletDia_in=${spec.bullet_diameter.toFixed(4)}`,
    `BulletLength_in=${spec.bullet_length.toFixed(4)}`,
    `BulletWeight_gr=${spec.bullet_weight_grains}`,
    `BulletBaseType="${profile.base_type}"`,
    `BoatTailLength_in=${profile.boat_tail_length_in.toFixed(4)}`,
    `BoatTailBaseDia_in=${profile.boat_tail_base_dia_in.toFixed(4)}`,
    `OgiveType="${profile.ogive_type}"`,
    `RimDia_in=${spec.rim_diameter.toFixed(4)}`,
    `RimThickness_in=${spec.rim_thickness.toFixed(4)}`,
    `BaseDia_in=${spec.base_diameter.toFixed(4)}`,
    `ShoulderDia_in=${spec.shoulder_start_diameter.toFixed(4)}`,
    `ShoulderAngle_deg=${spec.shoulder_angle.toFixed(2)}`,
    `NeckDia_in=${spec.neck_diameter_mouth.toFixed(4)}`,
    `NeckWall_in=${spec.neck_wall_thickness.toFixed(4)}`,
    `WebThickness_in=${spec.web_thickness.toFixed(4)}`,
    `BoreDia_in=${chamber.pilot_diameter.toFixed(4)}`,
    `GrooveDia_in=${chamber.groove_diameter.toFixed(4)}`,
    `RifledBoreArea_in2=${vol.rifled_bore_area_sq_in.toFixed(4)}`,
    `FreeboreLength_in=${chamber.freebore_length.toFixed(4)}`,
    `OverflowCapacity_grH2O=${vol.overflow_capacity_grains_h2o}`,
    `OverflowCapacity_cm3=${vol.overflow_capacity_cm3}`,
    `UsableCapacity_grH2O=${vol.usable_capacity_grains_h2o}`,
    `BrassCaseWeight_gr=${vol.brass_case_weight_grains}`,
    `EstBC_G1=${vol.g1_bc_est.toFixed(3)}`,
    `EstBC_G7=${vol.g7_bc_est.toFixed(3)}`,
    `MaxPressure_bar=${spec.max_pressure_bar}`,
    `MaxPressure_psi=${Math.round(spec.max_pressure_bar * 14.5038)}`,
    '[End]',
  ];
  return lines.join('\n');
}

/**
 * Generates the official Wildcat Studio Cartridge Specification (.wildcat / .wcs).
 */
export function exportWildcatSpec(spec: CartridgeSpec): string {
  const vol = calculateVolumetrics(spec);
  const reamer = resolveChamberSpec(spec);
  const collision = analyzeChamberCollision(spec, reamer);
  const profile = resolveBulletProfile(spec);
  const seatDepth = effectiveSeatingDepth(spec);
  const designer =
    spec.designer ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('wildcat_designer_name') : '') ||
    'Unknown Designer';

  const payload = {
    $schema: 'https://armstrader.store/schemas/wildcat-cartridge-v1.json',
    format: 'wildcat_cartridge_specification',
    version: '1.1.0',
    metadata: {
      id: spec.id,
      name: spec.name,
      designer,
      parent_case: spec.parent_case || null,
      category: spec.category,
      standard: spec.standard,
      units: spec.units,
      created_at: new Date().toISOString(),
      notes: spec.notes || '',
    },
    dimensions: {
      rim_type: spec.rim_type,
      rim_diameter_in: spec.rim_diameter,
      rim_thickness_in: spec.rim_thickness,
      extractor_groove_diameter_in: spec.extractor_diameter,
      extractor_groove_width_in: spec.extractor_width,
      extractor_angle_deg: spec.extractor_angle,
      base_diameter_p1_in: spec.base_diameter,
      shoulder_diameter_p2_in: spec.shoulder_start_diameter,
      body_length_l1_in: spec.body_length,
      shoulder_length_in: spec.shoulder_length,
      shoulder_angle_deg: spec.shoulder_angle,
      shoulder_body_fillet_r_in: spec.shoulder_body_fillet_r ?? 0.060,
      shoulder_neck_fillet_r_in: spec.shoulder_neck_fillet_r ?? 0.040,
      neck_diameter_base_h1_in: spec.neck_diameter_base,
      neck_diameter_mouth_h2_in: spec.neck_diameter_mouth,
      case_length_l3_in: spec.case_length,
      coal_l6_in: spec.coal,
      bullet_diameter_g1_in: spec.bullet_diameter,
      bullet_length_in: spec.bullet_length,
      bullet_weight_grains: spec.bullet_weight_grains,
      seating_depth_in: Math.round(seatDepth * 10000) / 10000,
      web_thickness_in: spec.web_thickness,
      base_wall_thickness_in: spec.base_wall_thickness,
      neck_wall_thickness_in: spec.neck_wall_thickness,
      primer_pocket_diameter_in: spec.primer_pocket_dia,
      primer_pocket_depth_in: spec.primer_pocket_depth,
      flash_hole_diameter_in: spec.flash_hole_dia,
      belt_diameter_in: spec.belt_diameter ?? null,
      belt_width_in: spec.belt_width ?? null,
      datum_diameter_in: spec.datum_diameter ?? null,
      bore_diameter_in: reamer.pilot_diameter,
      groove_diameter_in: reamer.groove_diameter,
      barrel_length_in: vol.barrel_length_in,
    },
    bullet_profile: profile,
    chamber_overrides: spec.chamber_overrides ?? null,
    volumetrics: {
      case_capacity_grains_h2o: vol.overflow_capacity_grains_h2o,
      case_capacity_cm3: vol.overflow_capacity_cm3,
      bullet_displacement_grains_h2o: vol.bullet_displacement_grains_h2o,
      usable_capacity_grains_h2o: vol.usable_capacity_grains_h2o,
      usable_capacity_cm3: vol.usable_capacity_cm3,
      brass_case_weight_grains: vol.brass_case_weight_grains,
      brass_case_weight_grams: vol.brass_case_weight_grams,
      rifled_bore_area_sq_in: vol.rifled_bore_area_sq_in,
      expansion_ratio_24in: vol.expansion_ratio_24in,
      sectional_density: vol.sectional_density,
      g1_bc_est: vol.g1_bc_est,
      g7_bc_est: vol.g7_bc_est,
    },
    safety_limits: {
      max_pressure_bar: spec.max_pressure_bar,
      max_pressure_psi: Math.round(spec.max_pressure_bar * 14.5038),
      proof_pressure_bar: Math.round(spec.max_pressure_bar * 1.25),
      proof_pressure_psi: Math.round(spec.max_pressure_bar * 1.25 * 14.5038),
    },
    tooling_and_chamber: {
      reamer_body_diameter_in: reamer.chamber_base_dia,
      reamer_shoulder_diameter_in: reamer.chamber_shoulder_dia,
      reamer_neck_diameter_in: reamer.chamber_neck_dia,
      reamer_length_in: reamer.chamber_length,
      reamer_freebore_diameter_in: reamer.freebore_dia,
      reamer_freebore_length_in: reamer.freebore_length,
      reamer_leade_angle_deg: reamer.leade_angle_deg,
      reamer_pilot_diameter_in: reamer.pilot_diameter,
      neck_diametral_clearance_in: collision.neck_clearance_in,
      body_diametral_clearance_in: collision.base_clearance_in,
      jam_coal_in: collision.jam_coal_in,
      jump_to_lands_in: collision.jump_to_lands_in,
      cbto_in: collision.cbto_in,
    },
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Universal Cartridge Specification Parser supporting:
 * - Wildcat Studio specifications (.wildcat / .wcs / JSON)
 * - Flat CartridgeSpec JSON
 * - LoadBench recipes (.loadbench / .ldb)
 * - Gordon's Reloading Tool (.grtload XML)
 * - QuickLOAD volumetric lines (.vol)
 */
export function parseWildcatSpec(raw: string): CartridgeSpec | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();

  // 1. GRT XML (.grtload)
  if (trimmed.startsWith('<?xml') || trimmed.includes('<GordonsReloadingTool') || trimmed.includes('<InnerBallistikInput')) {
    return parseGrtLoadXml(trimmed);
  }

  // 2. JSON formats
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const data = JSON.parse(trimmed);

      if (data.format === 'wildcat_cartridge_specification' || (data.metadata && data.dimensions)) {
        const meta = data.metadata || {};
        const dims = data.dimensions || {};
        const safety = data.safety_limits || {};

        return {
          id: meta.id || `wildcat_${Date.now()}`,
          name: meta.name || 'Imported Wildcat',
          category: meta.category || 'Custom Wildcats & User Designs',
          standard: (meta.standard as DimensionStandard) || 'Wildcat',
          units: (meta.units as UnitSystem) || 'imperial',
          rim_type: (dims.rim_type as RimType) || 'rimless',
          rim_diameter: dims.rim_diameter_in ?? dims.rim_diameter ?? 0.473,
          rim_thickness: dims.rim_thickness_in ?? dims.rim_thickness ?? 0.054,
          extractor_diameter: dims.extractor_groove_diameter_in ?? dims.extractor_diameter ?? 0.410,
          extractor_width: dims.extractor_groove_width_in ?? dims.extractor_width ?? 0.039,
          extractor_angle: dims.extractor_angle_deg ?? dims.extractor_angle ?? 35,
          base_diameter: dims.base_diameter_p1_in ?? dims.base_diameter ?? 0.470,
          shoulder_start_diameter: dims.shoulder_diameter_p2_in ?? dims.shoulder_start_diameter ?? 0.454,
          body_length: dims.body_length_l1_in ?? dims.body_length ?? 1.560,
          shoulder_length: dims.shoulder_length_in ?? dims.shoulder_length ?? 0.150,
          shoulder_angle: dims.shoulder_angle_deg ?? dims.shoulder_angle ?? 20,
          shoulder_body_fillet_r: dims.shoulder_body_fillet_r_in ?? undefined,
          shoulder_neck_fillet_r: dims.shoulder_neck_fillet_r_in ?? undefined,
          neck_diameter_base: dims.neck_diameter_base_h1_in ?? dims.neck_diameter_base ?? 0.344,
          neck_diameter_mouth: dims.neck_diameter_mouth_h2_in ?? dims.neck_diameter_mouth ?? 0.344,
          case_length: dims.case_length_l3_in ?? dims.case_length ?? 2.015,
          coal: dims.coal_l6_in ?? dims.coal ?? 2.800,
          bullet_diameter: dims.bullet_diameter_g1_in ?? dims.bullet_diameter ?? 0.308,
          bullet_length: dims.bullet_length_in ?? dims.bullet_length ?? 1.250,
          bullet_weight_grains: dims.bullet_weight_grains ?? 168,
          seating_depth: dims.seating_depth_in ?? dims.seating_depth ?? 0.465,
          web_thickness: dims.web_thickness_in ?? dims.web_thickness ?? 0.180,
          base_wall_thickness: dims.base_wall_thickness_in ?? dims.base_wall_thickness ?? 0.032,
          neck_wall_thickness: dims.neck_wall_thickness_in ?? dims.neck_wall_thickness ?? 0.015,
          primer_pocket_dia: dims.primer_pocket_diameter_in ?? dims.primer_pocket_dia ?? 0.210,
          primer_pocket_depth: dims.primer_pocket_depth_in ?? dims.primer_pocket_depth ?? 0.128,
          flash_hole_dia: dims.flash_hole_diameter_in ?? dims.flash_hole_dia ?? 0.080,
          belt_diameter: dims.belt_diameter_in ?? dims.belt_diameter ?? undefined,
          belt_width: dims.belt_width_in ?? dims.belt_width ?? undefined,
          datum_diameter: dims.datum_diameter_in ?? undefined,
          bore_diameter: dims.bore_diameter_in ?? undefined,
          groove_diameter: dims.groove_diameter_in ?? undefined,
          barrel_length_in: dims.barrel_length_in ?? undefined,
          bullet_profile: data.bullet_profile || undefined,
          chamber_overrides: data.chamber_overrides || undefined,
          max_pressure_bar: dims.max_pressure_bar ?? safety.max_pressure_bar ?? 4150,
          designer: meta.designer,
          parent_case: meta.parent_case,
          notes: meta.notes,
        };
      }

      if (typeof data.name === 'string' && (typeof data.case_length === 'number' || typeof data.bullet_diameter === 'number')) {
        return {
          id: data.id || `custom_${Date.now()}`,
          name: data.name,
          category: data.category || 'Custom Wildcats & User Designs',
          standard: data.standard || 'Wildcat',
          units: data.units || 'imperial',
          rim_type: data.rim_type || 'rimless',
          rim_diameter: data.rim_diameter ?? 0.473,
          rim_thickness: data.rim_thickness ?? 0.054,
          extractor_diameter: data.extractor_diameter ?? 0.410,
          extractor_width: data.extractor_width ?? 0.039,
          extractor_angle: data.extractor_angle ?? 35,
          base_diameter: data.base_diameter ?? 0.470,
          shoulder_start_diameter: data.shoulder_start_diameter ?? 0.454,
          body_length: data.body_length ?? 1.560,
          shoulder_length: data.shoulder_length ?? 0.150,
          shoulder_angle: data.shoulder_angle ?? 20,
          neck_diameter_base: data.neck_diameter_base ?? 0.344,
          neck_diameter_mouth: data.neck_diameter_mouth ?? 0.344,
          case_length: data.case_length ?? 2.000,
          coal: data.coal ?? (data.case_length ? data.case_length + 0.6 : 2.800),
          bullet_diameter: data.bullet_diameter ?? 0.308,
          bullet_length: data.bullet_length ?? (data.bullet_diameter ? data.bullet_diameter * 3.4 : 1.25),
          bullet_weight_grains: data.bullet_weight_grains ?? 150,
          seating_depth: data.seating_depth ?? 0.400,
          web_thickness: data.web_thickness ?? 0.180,
          base_wall_thickness: data.base_wall_thickness ?? 0.032,
          neck_wall_thickness: data.neck_wall_thickness ?? 0.015,
          primer_pocket_dia: data.primer_pocket_dia ?? 0.210,
          primer_pocket_depth: data.primer_pocket_depth ?? 0.128,
          flash_hole_dia: data.flash_hole_dia ?? 0.080,
          belt_diameter: data.belt_diameter,
          belt_width: data.belt_width,
          bullet_profile: data.bullet_profile,
          chamber_overrides: data.chamber_overrides,
          max_pressure_bar: data.max_pressure_bar ?? 4150,
          designer: data.designer,
          parent_case: data.parent_case,
          notes: data.notes,
        };
      }

      if (data.cartridge && typeof data.cartridge === 'object') {
        const c = data.cartridge;
        const proj = data.projectile || {};
        if (typeof c.name === 'string' && typeof c.case_length_in === 'number') {
          const cal = proj.caliber_in ?? 0.308;
          const l3 = c.case_length_in;
          const coal = c.coal_in ?? l3 + 0.7;
          const bLen = proj.length_in ?? cal * 3.8;
          return parseWildcatSpec(
            JSON.stringify({
              name: c.name,
              case_length: l3,
              coal,
              bullet_diameter: cal,
              bullet_length: bLen,
              bullet_weight_grains: proj.weight_grains ?? 150,
              seating_depth: Math.max(0.15, l3 + bLen - coal),
            })
          );
        }
        return parseWildcatSpec(JSON.stringify(c));
      }
    } catch {
      // Fall through to text parsers
    }
  }

  // 3. QuickLOAD .vol comma-delimited line
  const firstDataLine = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !l.startsWith(';') && !l.startsWith('#'));

  if (!firstDataLine) return null;
  const tokens = splitCsvFields(firstDataLine);
  if (tokens.length >= 7 && !isNaN(parseFloat(tokens[2])) && !isNaN(parseFloat(tokens[3]))) {
    const caseLen = parseFloat(tokens[2]);
    const cal = parseFloat(tokens[3]);
    const coalVal = parseFloat(tokens[8]);
    const press = parseInt(tokens[6], 10);
    const stdToken = (tokens[7] || '').toUpperCase();
    const standard: DimensionStandard = stdToken.includes('CIP') ? 'CIP' : stdToken.includes('SAAMI') ? 'SAAMI' : 'Wildcat';
    const bulletLen = Math.round(cal * 3.8 * 1000) / 1000;
    const coal = isNaN(coalVal) || coalVal <= 0 ? +(caseLen + 0.785).toFixed(3) : coalVal;
    const seatDepth = Math.max(0.15, +(caseLen + bulletLen - coal).toFixed(4));

    return {
      id: `vol_${Date.now()}`,
      name: tokens[0] || 'Imported .vol Cartridge',
      category: 'Custom Wildcats & User Designs',
      standard,
      units: 'imperial',
      rim_type: 'rimless',
      rim_diameter: Math.round(cal * 1.53 * 1000) / 1000,
      rim_thickness: 0.054,
      extractor_diameter: Math.round(cal * 1.33 * 1000) / 1000,
      extractor_width: 0.039,
      extractor_angle: 45,
      base_diameter: Math.round(cal * 1.52 * 1000) / 1000,
      shoulder_start_diameter: Math.round(cal * 1.47 * 1000) / 1000,
      body_length: Math.round(caseLen * 0.77 * 1000) / 1000,
      shoulder_length: Math.round(caseLen * 0.08 * 1000) / 1000,
      shoulder_angle: 20,
      neck_diameter_base: Math.round((cal + 0.034) * 1000) / 1000,
      neck_diameter_mouth: Math.round((cal + 0.034) * 1000) / 1000,
      case_length: caseLen,
      coal,
      bullet_diameter: cal,
      bullet_length: bulletLen,
      bullet_weight_grains: Math.round(Math.pow(cal, 3) * 5500 * 10) / 10,
      seating_depth: seatDepth,
      web_thickness: 0.180,
      base_wall_thickness: 0.032,
      neck_wall_thickness: 0.015,
      primer_pocket_dia: cal < 0.25 ? 0.175 : 0.210,
      primer_pocket_depth: 0.128,
      flash_hole_dia: 0.080,
      max_pressure_bar: isNaN(press) || press <= 0 ? 4150 : press,
      notes: `Imported from QuickLOAD .vol format: ${tokens[0]}`,
    };
  }

  return null;
}

/**
 * Generates a LoadBench Cartridge & Chamber Handoff Recipe (.loadbench / .ldb).
 * Exports pure verified CAD geometry, volumetrics, brass mass, bore area, and limits
 * without fabricated muzzle velocity or pressure-curve numbers.
 */
export function exportLoadBenchRecipe(spec: CartridgeSpec): string {
  const vol = calculateVolumetrics(spec);
  const reamer = resolveChamberSpec(spec);
  const collision = analyzeChamberCollision(spec, reamer);
  const profile = resolveBulletProfile(spec);
  const seatDepth = effectiveSeatingDepth(spec);
  const designer =
    spec.designer ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('wildcat_designer_name') : '') ||
    'Unknown Reloader';

  const payload = {
    $schema: 'https://armstrader.store/schemas/loadbench-recipe-v1.json',
    format: 'loadbench_recipe',
    version: '1.1.0',
    metadata: {
      id: `lb_${spec.id}`,
      name: `${spec.name} Cartridge Geometry`,
      created_at: new Date().toISOString(),
      author: designer,
      target_firearm: 'Custom Chamber',
      notes: spec.notes || 'Exported from Wildcat Studio CAD.',
    },
    cartridge: {
      name: spec.name,
      standard: spec.standard,
      rim_type: spec.rim_type,
      case_capacity_grains_h2o: vol.overflow_capacity_grains_h2o,
      case_capacity_cm3: vol.overflow_capacity_cm3,
      usable_capacity_grains_h2o: vol.usable_capacity_grains_h2o,
      brass_case_weight_grains: vol.brass_case_weight_grains,
      coal_in: spec.coal,
      case_length_in: spec.case_length,
      seating_depth_in: Math.round(seatDepth * 10000) / 10000,
      max_pressure_bar: spec.max_pressure_bar,
      max_pressure_psi: Math.round(spec.max_pressure_bar * 14.5038),
      brass_manufacturer: spec.parent_case ? `${spec.parent_case} Formed Brass` : 'Custom Brass',
    },
    projectile: {
      name: `${spec.bullet_weight_grains}gr ${spec.bullet_diameter.toFixed(3)}"`,
      weight_grains: spec.bullet_weight_grains,
      caliber_in: spec.bullet_diameter,
      length_in: spec.bullet_length,
      base_type: profile.base_type,
      boat_tail_length_in: profile.boat_tail_length_in,
      boat_tail_base_dia_in: profile.boat_tail_base_dia_in,
      ogive_type: profile.ogive_type,
      ogive_radius_calibers: profile.ogive_radius_calibers,
      meplat_diameter_in: profile.meplat_diameter_in,
      bearing_surface_in: profile.bearing_surface_length_in,
      material: profile.material,
      bc_g1: vol.g1_bc_est,
      bc_g7: vol.g7_bc_est,
      cbto_in: collision.cbto_in,
      jam_coal_in: collision.jam_coal_in,
      jump_to_lands_in: collision.jump_to_lands_in,
    },
    primer: {
      pocket_size: spec.rim_type === 'rimfire' ? 'Rimfire' : spec.primer_pocket_dia > 0.20 ? 'Large Rifle' : 'Small Rifle',
      pocket_diameter_in: spec.primer_pocket_dia,
    },
    barrel: {
      length_in: vol.barrel_length_in,
      bore_diameter_in: reamer.pilot_diameter,
      groove_diameter_in: reamer.groove_diameter,
      rifled_bore_area_sq_in: vol.rifled_bore_area_sq_in,
      freebore_length_in: reamer.freebore_length,
      leade_angle_deg: reamer.leade_angle_deg,
    },
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Generates a RangeStudio Ballistics Profile (.rsb) with verified projectile geometry,
 * sectional density, G1/G7 BC estimates, and barrel parameters (leaving trajectory
 * integration to RangeStudio's atmospheric solver).
 */
export function exportRangeStudioBallistics(spec: CartridgeSpec): string {
  const vol = calculateVolumetrics(spec);
  const reamer = resolveChamberSpec(spec);
  const profile = resolveBulletProfile(spec);
  const designer =
    spec.designer ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('wildcat_designer_name') : '') ||
    'Custom Ballistician';

  const payload = {
    $schema: 'https://armstrader.store/schemas/rangestudio-ballistics-v1.json',
    format: 'rangestudio_ballistics_profile',
    version: '1.1.0',
    metadata: {
      id: `rsb_${spec.id}`,
      name: `${spec.name} Projectile & Cartridge Profile`,
      author: designer,
      cartridge_id: spec.id,
      cartridge_name: spec.name,
      standard: spec.standard,
      created_at: new Date().toISOString(),
      notes: spec.notes || 'Exported from Wildcat Studio CAD.',
    },
    firearm: {
      barrel_length_in: vol.barrel_length_in,
      bore_diameter_in: reamer.pilot_diameter,
      groove_diameter_in: reamer.groove_diameter,
      rifled_bore_area_sq_in: vol.rifled_bore_area_sq_in,
    },
    projectile: {
      name: `${spec.bullet_weight_grains}gr ${spec.bullet_diameter.toFixed(3)}"`,
      caliber_in: spec.bullet_diameter,
      weight_grains: spec.bullet_weight_grains,
      length_in: spec.bullet_length,
      sectional_density: vol.sectional_density,
      base_type: profile.base_type,
      boat_tail_length_in: profile.boat_tail_length_in,
      boat_tail_base_dia_in: profile.boat_tail_base_dia_in,
      ogive_type: profile.ogive_type,
      meplat_diameter_in: profile.meplat_diameter_in,
      material: profile.material,
      bc_g1: vol.g1_bc_est,
      bc_g7: vol.g7_bc_est,
      drag_model: profile.base_type === 'boat_tail' ? 'G7' : 'G1',
    },
    cartridge_volumetrics: {
      case_capacity_grains_h2o: vol.overflow_capacity_grains_h2o,
      usable_capacity_grains_h2o: vol.usable_capacity_grains_h2o,
      brass_case_weight_grains: vol.brass_case_weight_grains,
      max_pressure_psi: Math.round(spec.max_pressure_bar * 14.5038),
      expansion_ratio: vol.expansion_ratio_24in,
    },
  };

  return JSON.stringify(payload, null, 2);
}

function dxfLine(layer: string, x1: number, y1: number, x2: number, y2: number): string {
  return `0\nLINE\n8\n${layer}\n10\n${x1.toFixed(6)}\n20\n${y1.toFixed(6)}\n30\n0.0\n11\n${x2.toFixed(6)}\n21\n${y2.toFixed(6)}\n31\n0.0\n`;
}

function dxfSymmetricLine(layer: string, x1: number, r1: number, x2: number, r2: number): string {
  return dxfLine(layer, x1, r1, x2, r2) + dxfLine(layer, x1, -r1, x2, -r2);
}

/**
 * Generates an AutoCAD R12 (AC1009) DXF engineering drawing using exact engine contours
 * (including shoulder fillets, belted-case inner wall fix, chamber overrides, and parametric bullet).
 */
export function generateDxf(spec: CartridgeSpec): string {
  const reamer = resolveChamberSpec(spec);
  const bulletProfile = resolveBulletProfile(spec);

  let out = '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\nENDSEC\n';
  out += '0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n5\n';
  out += '0\nLAYER\n2\nOUTER_CASE\n70\n0\n62\n2\n6\nCONTINUOUS\n';
  out += '0\nLAYER\n2\nINNER_WALL\n70\n0\n62\n3\n6\nCONTINUOUS\n';
  out += '0\nLAYER\n2\nBULLET\n70\n0\n62\n1\n6\nCONTINUOUS\n';
  out += '0\nLAYER\n2\nCENTERLINE\n70\n0\n62\n8\n6\nCONTINUOUS\n';
  out += '0\nLAYER\n2\nCHAMBER\n70\n0\n62\n4\n6\nCONTINUOUS\n';
  out += '0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n';

  out += dxfLine('CENTERLINE', -0.2, 0.0, spec.coal + 0.3, 0.0);

  // Outer case profile
  const steps = 120;
  const dz = spec.case_length / steps;
  let prevZ = 0.0;
  let prevR = getOuterRadiusAt(spec, 0.0);
  out += dxfLine('OUTER_CASE', 0.0, -prevR, 0.0, prevR);

  for (let i = 1; i <= steps; i++) {
    const z = i * dz;
    const r = getOuterRadiusAt(spec, z);
    out += dxfSymmetricLine('OUTER_CASE', prevZ, prevR, z, r);
    prevZ = z;
    prevR = r;
  }

  const rMouthInner = Math.max(0.005, spec.neck_diameter_mouth / 2.0 - spec.neck_wall_thickness);
  out += dxfSymmetricLine('OUTER_CASE', spec.case_length, prevR, spec.case_length, rMouthInner);

  // Inner cavity profile
  const innerSteps = 100;
  const innerLen = Math.max(0.01, spec.case_length - spec.web_thickness);
  let pInZ = spec.web_thickness;
  let pInR = getInnerRadiusAt(spec, pInZ);
  out += dxfLine('INNER_WALL', pInZ, -pInR, pInZ, pInR);
  for (let i = 1; i <= innerSteps; i++) {
    const z = spec.web_thickness + (i / innerSteps) * innerLen;
    const r = getInnerRadiusAt(spec, z);
    out += dxfSymmetricLine('INNER_WALL', pInZ, pInR, z, r);
    pInZ = z;
    pInR = r;
  }

  // Parametric bullet profile (boat tail + bearing surface + ogive)
  const zBulletBase = spec.coal - spec.bullet_length;
  const bulletSteps = 80;
  let pBulZ = zBulletBase;
  let pBulR = getBulletRadiusAt(spec, 0, bulletProfile);
  out += dxfLine('BULLET', pBulZ, -pBulR, pBulZ, pBulR);
  for (let i = 1; i <= bulletSteps; i++) {
    const x = (i / bulletSteps) * spec.bullet_length;
    const z = zBulletBase + x;
    const r = getBulletRadiusAt(spec, x, bulletProfile);
    out += dxfSymmetricLine('BULLET', pBulZ, pBulR, z, r);
    pBulZ = z;
    pBulR = r;
  }
  out += dxfLine('BULLET', spec.coal, -pBulR, spec.coal, pBulR);

  // Chamber reamer profile
  const chMaxZ = reamer.chamber_length + reamer.freebore_length + 0.15;
  const chSteps = 100;
  let pChZ = 0;
  let pChR = getChamberRadiusAt(spec, 0, reamer);
  for (let i = 1; i <= chSteps; i++) {
    const z = (i / chSteps) * chMaxZ;
    const r = getChamberRadiusAt(spec, z, reamer);
    out += dxfSymmetricLine('CHAMBER', pChZ, pChR, z, r);
    pChZ = z;
    pChR = r;
  }

  out += '0\nENDSEC\n0\nEOF\n';
  return out;
}
