import { describe, it, expect } from 'vitest';
import { CARTRIDGE_PRESETS, CartridgeSpec } from '../../types/cartridge';
import {
  analyzeChamberCollision,
  analyzeSetback,
  calculateBrassCaseWeight,
  calculateCIPDeltaL,
  calculateDatumHeadspace,
  calculateHeadspaceGauges,
  calculateMillerStability,
  calculateVolumetrics,
  computeBulletDisplacementCuIn,
  computeRifledBoreArea,
  effectiveShoulderLength,
  exportGrtLoadXml,
  exportLoadBenchRecipe,
  exportQuickloadBul,
  exportQuickloadVol,
  exportRangeStudioBallistics,
  exportWildcatSpec,
  generateDxf,
  getInnerRadiusAt,
  isStraightWall,
  parseGrtLoadXml,
  parseWildcatSpec,
  resolveChamberSpec,
} from '../index';

describe('SAAMI / C.I.P. Benchmark Accuracy', () => {
  it('computes exact SAAMI headspace datum circles and lengths for benchmark rifle cartridges', () => {
    const r223 = calculateDatumHeadspace(CARTRIDGE_PRESETS['223_rem']);
    expect(r223.datum_diameter).toBeCloseTo(0.3300, 4);
    expect(r223.datum_length).toBeCloseTo(1.4636, 3);

    const r308 = calculateDatumHeadspace(CARTRIDGE_PRESETS['308_win']);
    expect(r308.datum_diameter).toBeCloseTo(0.4000, 4);
    expect(r308.datum_length).toBeCloseTo(1.6300, 3);

    const r65 = calculateDatumHeadspace(CARTRIDGE_PRESETS['65_creedmoor']);
    expect(r65.datum_diameter).toBeCloseTo(0.4000, 4);
    expect(r65.datum_length).toBeCloseTo(1.5542, 3);

    const r3006 = calculateDatumHeadspace(CARTRIDGE_PRESETS['30_06_springfield']);
    expect(r3006.datum_diameter).toBeCloseTo(0.3750, 4);
    expect(r3006.datum_length).toBeCloseTo(2.0487, 3);

    const g308 = calculateHeadspaceGauges(CARTRIDGE_PRESETS['308_win']);
    expect(g308.go_gauge_inches).toBeCloseTo(1.6300, 3);
    expect(g308.nogo_gauge_inches).toBeCloseTo(1.6340, 3);
    expect(g308.field_gauge_inches).toBeCloseTo(1.6400, 3);
  });

  it('computes true rifled bore cross-sectional area matching QuickLOAD / SAAMI tables', () => {
    // .308 Win: bore 0.300", groove 0.308" -> 0.0726 in^2 (QuickLOAD: 0.0725 in^2 / 46.8 mm^2)
    const area308 = computeRifledBoreArea(0.3000, 0.3080, 0.50);
    expect(area308).toBeCloseTo(0.0726, 4);

    // .223 Rem: bore 0.219", groove 0.224" -> 0.0385 in^2 (24.86 mm^2)
    const area223 = computeRifledBoreArea(0.2190, 0.2240, 0.50);
    expect(area223).toBeCloseTo(0.0385, 4);

    // 6.5 Creedmoor: bore 0.256", groove 0.264" -> 0.0531 in^2 (34.26 mm^2)
    const area65 = computeRifledBoreArea(0.2560, 0.2640, 0.50);
    expect(area65).toBeCloseTo(0.0531, 4);
  });

  it('computes realistic overflow capacity and C26000 brass weight for standard cartridges', () => {
    const v308 = calculateVolumetrics(CARTRIDGE_PRESETS['308_win']);
    expect(v308.overflow_capacity_grains_h2o).toBeGreaterThan(53);
    expect(v308.overflow_capacity_grains_h2o).toBeLessThan(58);
    expect(v308.brass_case_weight_grains).toBeGreaterThan(145);
    expect(v308.brass_case_weight_grains).toBeLessThan(195);
    expect(v308.usable_capacity_grains_h2o).toBeLessThan(v308.overflow_capacity_grains_h2o);

    const v65 = calculateVolumetrics(CARTRIDGE_PRESETS['65_creedmoor']);
    expect(v65.overflow_capacity_grains_h2o).toBeGreaterThan(50);
    expect(v65.overflow_capacity_grains_h2o).toBeLessThan(56);

    const v3006 = calculateVolumetrics(CARTRIDGE_PRESETS['30_06_springfield']);
    expect(v3006.overflow_capacity_grains_h2o).toBeGreaterThan(65);
    expect(v3006.overflow_capacity_grains_h2o).toBeLessThan(72);

    const v223 = calculateVolumetrics(CARTRIDGE_PRESETS['223_rem']);
    expect(v223.overflow_capacity_grains_h2o).toBeGreaterThan(28);
    expect(v223.overflow_capacity_grains_h2o).toBeLessThan(32);
  });

  it('does not bulge internal cavity radius outward under external belt on belted magnums', () => {
    const wm = CARTRIDGE_PRESETS['300_win_mag'];
    const zBelt = wm.web_thickness + 0.02; // Inside belted axial zone
    const zPastBelt = wm.rim_thickness + wm.extractor_width + (wm.belt_width || 0.220) + 0.05;
    const rInsideBelt = getInnerRadiusAt(wm, zBelt);
    const rPastBelt = getInnerRadiusAt(wm, zPastBelt);
    // Cavity radius should vary smoothly from base wall to body, never exceeding structural base radius minus wall.
    expect(rInsideBelt).toBeLessThan(wm.base_diameter / 2 - wm.neck_wall_thickness);
    expect(Math.abs(rInsideBelt - rPastBelt)).toBeLessThan(0.012);

    const brass = calculateBrassCaseWeight(wm);
    expect(brass.brass_case_weight_grains).toBeGreaterThan(200);
    expect(brass.brass_case_weight_grains).toBeLessThan(290);
  });

  it('computes accurate C.I.P. axial Delta L for 6.5 Creedmoor and .308 Win', () => {
    const cip65 = calculateCIPDeltaL(CARTRIDGE_PRESETS['65_creedmoor']);
    expect(cip65.isSafe).toBe(true);
    expect(cip65.deltaL_mm).toBeCloseTo(0.102, 2);

    const cip308 = calculateCIPDeltaL(CARTRIDGE_PRESETS['308_win']);
    expect(cip308.isSafe).toBe(true);
    expect(cip308.deltaL_mm).toBeCloseTo(0.102, 2);
  });
});

describe('Parametric Bullet Displacement & Stability Physics', () => {
  it('displaces strictly less water for a boat-tail bullet than an equal-length flat-base bullet', () => {
    const baseSpec = CARTRIDGE_PRESETS['308_win'];
    const flatBase: CartridgeSpec = {
      ...baseSpec,
      bullet_profile: { base_type: 'flat_base', boat_tail_length_in: 0, boat_tail_base_dia_in: baseSpec.bullet_diameter },
    };
    const boatTail: CartridgeSpec = {
      ...baseSpec,
      bullet_profile: { base_type: 'boat_tail', boat_tail_length_in: 0.200, boat_tail_base_dia_in: 0.252 },
    };
    const vFlat = computeBulletDisplacementCuIn(flatBase, 0.380);
    const vBt = computeBulletDisplacementCuIn(boatTail, 0.380);
    expect(vBt).toBeLessThan(vFlat);
    expect(vBt / vFlat).toBeGreaterThan(0.80);
    expect(vBt / vFlat).toBeLessThan(0.96);
  });

  it('uses Don Miller cube-root velocity scaling, atmospheric STP, Courtney-Miller plastic-tip correction, and Bryan Litz spin drift', () => {
    const spec = CARTRIDGE_PRESETS['308_win'];

    // Verify exact cube-root velocity scaling at subsonic 1050 fps vs 2800 fps
    const stp2800 = calculateMillerStability(spec, 10, 2800, { plasticTipLengthIn: 0 });
    const sub1050 = calculateMillerStability(spec, 10, 1050, { plasticTipLengthIn: 0 });
    expect(sub1050.velocity_factor).toBeCloseTo(Math.cbrt(1050 / 2800), 3);
    expect(sub1050.sg / stp2800.sg).toBeCloseTo(Math.cbrt(1050 / 2800), 2);

    // Cold dense air lowers Sg; warm thin air increases Sg
    const cold = calculateMillerStability(spec, 10, 2800, { temperatureF: 0, pressureInHg: 30.5, plasticTipLengthIn: 0 });
    const hotHigh = calculateMillerStability(spec, 10, 2800, { temperatureF: 95, pressureInHg: 24.5, plasticTipLengthIn: 0 });
    expect(cold.sg).toBeLessThan(stp2800.sg);
    expect(hotHigh.sg).toBeGreaterThan(stp2800.sg);

    // Courtney-Miller plastic-tip correction raises Sg vs treating full length as solid metal
    const allMetal = calculateMillerStability(CARTRIDGE_PRESETS['65_creedmoor'], 8, 2700, {
      material: 'lead_core',
      plasticTipLengthIn: 0,
    });
    const tipped = calculateMillerStability(CARTRIDGE_PRESETS['65_creedmoor'], 8, 2700, {
      material: 'polymer_tip',
      plasticTipLengthIn: 0.16,
    });
    expect(tipped.sg).toBeGreaterThan(allMetal.sg);

    // Bryan Litz spin drift formula: 1.25 * (Sg + 1.2) * TOF^1.83
    const driftRes = calculateMillerStability(spec, 10, 2700, { tofSeconds: 1.75, plasticTipLengthIn: 0 });
    const expectedDrift = 1.25 * (driftRes.sg + 1.2) * Math.pow(1.75, 1.83);
    expect(driftRes.spin_drift_inches).toBeCloseTo(expectedDrift, 0);
  });
});

describe('Hybrid Chamber Collision, Lands Jump & Setback Analysis', () => {
  it('validates clean fit and positive lands jump on standard .308 Win and detects tight-neck / jam interference', () => {
    const win308 = CARTRIDGE_PRESETS['308_win'];
    const clean = analyzeChamberCollision(win308);
    expect(clean.has_interference).toBe(false);
    expect(clean.neck_clearance_in).toBeCloseTo(0.003, 4);
    expect(clean.jam_coal_in).toBeGreaterThan(2.5);
    expect(clean.cbto_in).toBeGreaterThan(win308.case_length);

    // Negative neck clearance override must trigger interference error
    const pinched = analyzeChamberCollision({
      ...win308,
      chamber_overrides: { neck_clearance: -0.002 },
    });
    expect(pinched.has_interference).toBe(true);
    expect(pinched.issues.some((i) => i.severity === 'error' && i.zone.includes('Neck'))).toBe(true);

    // Overly long COAL jammed into lands must report negative jump
    const jammed = analyzeChamberCollision({
      ...win308,
      coal: clean.jam_coal_in + 0.030,
    });
    expect(jammed.jump_to_lands_in).toBeLessThan(0);
    expect(jammed.issues.some((i) => i.zone === 'Rifling Lands')).toBe(true);
  });

  it('computes barrel setback from .30-06 to .308 Win cleanly', () => {
    const res = analyzeSetback(CARTRIDGE_PRESETS['30_06_springfield'], CARTRIDGE_PRESETS['308_win']);
    expect(res.can_rechamber_clean).toBe(false);
    expect(res.required_setback_inches).toBeGreaterThan(0.35);
    expect(res.required_setback_inches).toBeLessThan(0.70);
  });
});

describe('Interchange Formats (QuickLOAD, GRT, Wildcat, LoadBench, RangeStudio, DXF)', () => {
  it('exports QuickLOAD .vol with true rifled bore area and round-trips cleanly', () => {
    const win308 = CARTRIDGE_PRESETS['308_win'];
    const volLine = exportQuickloadVol(win308);
    expect(volLine).toContain('"0.0726"');
    expect(volLine).toContain('"0.308"');
    const parsed = parseWildcatSpec(volLine);
    expect(parsed).not.toBeNull();
    expect(parsed!.name).toBe(win308.name);
    expect(parsed!.case_length).toBeCloseTo(win308.case_length, 3);
  });

  it('exports QuickLOAD/GRT .bul with boat-tail geometry', () => {
    const bulLine = exportQuickloadBul(CARTRIDGE_PRESETS['65_creedmoor']);
    const cols = bulLine.split(',');
    expect(cols.length).toBeGreaterThanOrEqual(9);
    expect(bulLine).toContain('"0.264"');
  });

  it('exports and round-trip parses Gordon\'s Reloading Tool .grtload XML', () => {
    const cm65 = CARTRIDGE_PRESETS['65_creedmoor'];
    const xml = exportGrtLoadXml(cm65);
    expect(xml).toContain('<GordonsReloadingTool');
    expect(xml).toContain('<InnerBallistikInput>');
    expect(xml).toContain('name="casevol"');
    expect(xml).toContain('name="A0"');

    const parsed = parseGrtLoadXml(xml);
    expect(parsed).not.toBeNull();
    expect(parsed!.name).toBe(cm65.name);
    expect(parsed!.case_length).toBeCloseTo(cm65.case_length, 2);
    expect(parsed!.coal).toBeCloseTo(cm65.coal, 2);
    expect(parsed!.bullet_diameter).toBeCloseTo(cm65.bullet_diameter, 3);
    expect(parsed!.bullet_weight_grains).toBeCloseTo(cm65.bullet_weight_grains, 0);
  });

  it('preserves chamber overrides and bullet profiles in .wildcat JSON round-trip', () => {
    const custom: CartridgeSpec = {
      ...CARTRIDGE_PRESETS['65_creedmoor'],
      chamber_overrides: { neck_clearance: 0.002, freebore_length: 0.165 },
      bullet_profile: { base_type: 'boat_tail', boat_tail_length_in: 0.185, ogive_type: 'hybrid' },
    };
    const json = exportWildcatSpec(custom);
    const parsed = parseWildcatSpec(json);
    expect(parsed).not.toBeNull();
    expect(parsed!.chamber_overrides?.freebore_length).toBe(0.165);
    expect(parsed!.bullet_profile?.ogive_type).toBe('hybrid');
  });

  it('exports pure verified geometry in .loadbench and .rsb without fabricated muzzle velocities or trajectories', () => {
    const lb = JSON.parse(exportLoadBenchRecipe(CARTRIDGE_PRESETS['308_win']));
    expect(lb.simulated).toBeUndefined();
    expect(lb.barrel.rifled_bore_area_sq_in).toBeCloseTo(0.0726, 4);
    expect(lb.cartridge.brass_case_weight_grains).toBeGreaterThan(145);

    const rsb = JSON.parse(exportRangeStudioBallistics(CARTRIDGE_PRESETS['308_win']));
    expect(rsb.trajectory).toBeUndefined();
    expect(rsb.projectile.bc_g1).toBeGreaterThan(0.3);
    expect(rsb.projectile.bc_g7).toBeGreaterThan(0.15);
  });

  it('generates valid AutoCAD R12 DXF with all 5 layers', () => {
    const dxf = generateDxf(CARTRIDGE_PRESETS['308_win']);
    expect(dxf).toContain('AC1009');
    expect(dxf).toContain('OUTER_CASE');
    expect(dxf).toContain('INNER_WALL');
    expect(dxf).toContain('CHAMBER');
    expect(dxf).toContain('BULLET');
    expect(dxf.trim().endsWith('EOF')).toBe(true);
  });
});

describe('All 395 Real Built-in Presets Geometric Invariant Sweep', () => {
  it('validates shoulder geometry, seating depth sync, rimfire tags, positive volumes, and finite outputs across all presets', () => {
    const realPresets = Object.values(CARTRIDGE_PRESETS).filter((c) => c.id !== 'little_boy_ordnance');
    expect(realPresets.length).toBe(395);

    for (const c of realPresets) {
      if (c.category.toLowerCase().includes('rimfire')) {
        expect(c.rim_type, `${c.id} should be rimfire`).toBe('rimfire');
        expect(c.primer_pocket_dia, `${c.id} rimfire primer pocket`).toBe(0);
      }

      if (!isStraightWall(c)) {
        const effSh = effectiveShoulderLength(c);
        expect(Math.abs(effSh - c.shoulder_length), `${c.id} shoulder length mismatch`).toBeLessThan(0.002);
        expect(c.body_length + effSh, `${c.id} shoulder exceeds case_length`).toBeLessThan(c.case_length);
      }

      expect(
        Math.abs(c.case_length + c.bullet_length - c.seating_depth - c.coal),
        `${c.id} COAL/seating_depth invariant`
      ).toBeLessThan(0.005);

      const vol = calculateVolumetrics(c);
      expect(Number.isFinite(vol.overflow_capacity_grains_h2o), `${c.id} finite overflow`).toBe(true);
      expect(vol.overflow_capacity_grains_h2o, `${c.id} positive overflow`).toBeGreaterThan(0);
      expect(vol.brass_case_weight_grains, `${c.id} positive brass weight`).toBeGreaterThan(0);
      expect(vol.rifled_bore_area_sq_in, `${c.id} positive bore area`).toBeGreaterThan(0);

      const chamber = resolveChamberSpec(c);
      expect(chamber.pilot_diameter).toBeLessThan(chamber.groove_diameter);

      const collision = analyzeChamberCollision(c, chamber);
      expect(Number.isFinite(collision.jam_coal_in), `${c.id} finite jam COAL`).toBe(true);

      const stab = calculateMillerStability(c, 10, 2600);
      expect(Number.isFinite(stab.sg) && stab.sg > 0, `${c.id} finite Sg`).toBe(true);
    }
  });
});
