import * as THREE from 'three';
import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import { CartridgeSpec, CARTRIDGE_PRESETS } from '../types/cartridge';
import { BulletOption, BULLET_OPTIONS } from '../data/bullets';
import {
  calculateVolumetricsFrontend,
  effectiveShoulderLength,
  generateReamerSpecFrontend,
  getInnerRadiusAt,
  getOuterRadiusAt,
  isStraightWall,
} from './volumetrics';

export const AUTO_UPDATE_STORAGE_KEY = 'wildcat_auto_check_updates';
export const CARTRIDGE_PRESET_COUNT = Object.keys(CARTRIDGE_PRESETS).length;

export function isAutoUpdateEnabled(): boolean {
  const current = localStorage.getItem(AUTO_UPDATE_STORAGE_KEY);
  if (current !== null) return current === 'true';
  const legacy = localStorage.getItem('wildcat_check_updates_startup');
  return legacy !== null ? legacy === 'true' : true;
}

export function setAutoUpdateEnabled(enabled: boolean): void {
  localStorage.setItem(AUTO_UPDATE_STORAGE_KEY, String(enabled));
  localStorage.removeItem('wildcat_check_updates_startup');
}

export async function getAppVersionLabel(): Promise<string> {
  const fallback = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.1.0';
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    try {
      return await getVersion();
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getActiveBulletPreset(cartridge: CartridgeSpec): BulletOption | undefined {
  return BULLET_OPTIONS.find(
    (b) =>
      Math.abs(b.caliber_inches - cartridge.bullet_diameter) < 0.003 &&
      b.weight_grains === cartridge.bullet_weight_grains
  );
}

export function applyBulletPresetToCartridge(cartridge: CartridgeSpec, selected: BulletOption): CartridgeSpec {
  const wallT = cartridge.neck_wall_thickness || 0.015;
  const newMouth = +(selected.caliber_inches + 2 * wallT).toFixed(4);
  const seatDepth = selected.recommended_seating_depth || cartridge.seating_depth || 0.300;
  const newCoal = +(cartridge.case_length + selected.length_inches - seatDepth).toFixed(4);
  return {
    ...cartridge,
    bullet_diameter: selected.caliber_inches,
    bullet_weight_grains: selected.weight_grains,
    bullet_length: selected.length_inches,
    seating_depth: seatDepth,
    coal: newCoal,
    neck_diameter_mouth: newMouth,
    neck_diameter_base: newMouth,
  };
}

export function buildClosedSvgContour(
  points: ReadonlyArray<readonly [number, number]>,
  formatCoord: (z: number, r: number) => string = (z, r) => `${z.toFixed(4)} ${r.toFixed(4)}`
): string {
  if (points.length === 0) return '';
  let d = `M ${formatCoord(points[0][0], -points[0][1])}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${formatCoord(points[i][0], -points[i][1])}`;
  }
  for (let i = points.length - 1; i >= 0; i--) {
    d += ` L ${formatCoord(points[i][0], points[i][1])}`;
  }
  return `${d} Z`;
}

export function buildCartridgeSilhouetteSvgPath(
  spec: CartridgeSpec,
  scaleX: number,
  scaleY: number,
  offsetX = 0,
  centerY = 0,
  steps = 80
): string {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const z = (i / steps) * spec.case_length;
    pts.push([z, getOuterRadiusAt(spec, z)]);
  }
  return buildClosedSvgContour(
    pts,
    (z, r) => `${(offsetX + z * scaleX).toFixed(2)} ${(centerY + r * scaleY).toFixed(2)}`
  );
}

export function exportQuickloadVolLineFrontend(spec: CartridgeSpec): string {
  const vol = calculateVolumetricsFrontend(spec);
  const boreArea = Math.PI * (spec.bullet_diameter / 2) ** 2 * 0.992;
  const pressure = spec.max_pressure_bar || 4150;
  const standardStr = spec.standard === 'CIP' ? 'PiezoCIP' : 'SAAMI';

  return `"${spec.name.replace(/"/g, '')}","${vol.overflow_capacity_grains_h2o.toFixed(1)}","${spec.case_length.toFixed(3)}","${spec.bullet_diameter.toFixed(3)}","${boreArea.toFixed(4)}","${spec.bullet_diameter.toFixed(3)}","${Math.round(pressure)}","${standardStr}","${spec.coal.toFixed(3)}","","","","","",""`;
}

export async function buildQuickloadVol(spec: CartridgeSpec): Promise<string> {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    try {
      return await invoke<string>('export_quickload_vol', { spec });
    } catch {
      // Fallback to frontend implementation
    }
  }
  return exportQuickloadVolLineFrontend(spec);
}

function dxfLine(layer: string, x1: number, y1: number, x2: number, y2: number): string {
  return `0\nLINE\n8\n${layer}\n10\n${x1.toFixed(6)}\n20\n${y1.toFixed(6)}\n30\n0.0\n11\n${x2.toFixed(6)}\n21\n${y2.toFixed(6)}\n31\n0.0\n`;
}

function dxfSymmetricLine(layer: string, x1: number, r1: number, x2: number, r2: number): string {
  return dxfLine(layer, x1, r1, x2, r2) + dxfLine(layer, x1, -r1, x2, -r2);
}

export function generateDxfFrontend(spec: CartridgeSpec): string {
  let out = '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\nENDSEC\n';
  out += '0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n5\n';
  out += '0\nLAYER\n2\nOUTER_CASE\n70\n0\n62\n2\n6\nCONTINUOUS\n';
  out += '0\nLAYER\n2\nINNER_WALL\n70\n0\n62\n3\n6\nCONTINUOUS\n';
  out += '0\nLAYER\n2\nBULLET\n70\n0\n62\n1\n6\nCONTINUOUS\n';
  out += '0\nLAYER\n2\nCENTERLINE\n70\n0\n62\n8\n6\nCONTINUOUS\n';
  out += '0\nLAYER\n2\nCHAMBER\n70\n0\n62\n4\n6\nCONTINUOUS\n';
  out += '0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n';

  out += dxfLine('CENTERLINE', -0.1, 0, spec.coal + 0.1, 0);

  const steps = 120;
  const dz = spec.case_length / steps;
  let prevZ = 0;
  let prevR = getOuterRadiusAt(spec, 0);
  out += dxfLine('OUTER_CASE', 0, -prevR, 0, prevR);

  for (let i = 1; i <= steps; i++) {
    const z = i * dz;
    const r = getOuterRadiusAt(spec, z);
    out += dxfSymmetricLine('OUTER_CASE', prevZ, prevR, z, r);
    prevZ = z;
    prevR = r;
  }

  const rInnerMouth = Math.max(0, spec.neck_diameter_mouth / 2 - spec.neck_wall_thickness);
  out += dxfSymmetricLine('OUTER_CASE', spec.case_length, prevR, spec.case_length, rInnerMouth);

  const zWeb = spec.web_thickness;
  let prevZi = zWeb;
  let prevRi = getInnerRadiusAt(spec, zWeb);
  out += dxfLine('INNER_WALL', zWeb, -prevRi, zWeb, prevRi);

  const innerSteps = 100;
  const dzi = Math.max(0.001, spec.case_length - zWeb) / innerSteps;
  for (let i = 1; i <= innerSteps; i++) {
    const z = zWeb + i * dzi;
    const r = getInnerRadiusAt(spec, z);
    out += dxfSymmetricLine('INNER_WALL', prevZi, prevRi, z, r);
    prevZi = z;
    prevRi = r;
  }

  const reamer = generateReamerSpecFrontend(spec);
  const rChBase = reamer.chamber_base_dia / 2;
  const rChSh = reamer.chamber_shoulder_dia / 2;
  const rChNeck = reamer.chamber_neck_dia / 2;
  const rFb = reamer.freebore_dia / 2;
  const rBore = reamer.pilot_diameter / 2;

  if (isStraightWall(spec)) {
    out += dxfSymmetricLine('CHAMBER', 0, rChBase, reamer.chamber_length, rChNeck);
  } else {
    const zShEnd = spec.body_length + effectiveShoulderLength(spec);
    out += dxfSymmetricLine('CHAMBER', 0, rChBase, spec.body_length, rChSh);
    out += dxfSymmetricLine('CHAMBER', spec.body_length, rChSh, zShEnd, rChNeck);
    out += dxfSymmetricLine('CHAMBER', zShEnd, rChNeck, reamer.chamber_length, rChNeck);
  }
  const zFbEnd = reamer.chamber_length + reamer.freebore_length;
  const leadeLen = Math.max(0, rFb - rBore) / Math.max(0.001, Math.tan((reamer.leade_angle_deg * Math.PI) / 180));
  out += dxfSymmetricLine('CHAMBER', reamer.chamber_length, rChNeck, reamer.chamber_length, rFb);
  out += dxfSymmetricLine('CHAMBER', reamer.chamber_length, rFb, zFbEnd, rFb);
  out += dxfSymmetricLine('CHAMBER', zFbEnd, rFb, zFbEnd + leadeLen, rBore);

  const rBullet = spec.bullet_diameter / 2;
  const zBulletBase = spec.coal - spec.bullet_length;
  out += dxfLine('BULLET', zBulletBase, -rBullet, zBulletBase, rBullet);
  out += dxfSymmetricLine('BULLET', zBulletBase, rBullet, spec.case_length, rBullet);
  out += dxfSymmetricLine('BULLET', spec.case_length, rBullet, spec.coal, 0);

  out += '0\nENDSEC\n0\nEOF\n';
  return out;
}

export async function buildDxfDrawing(spec: CartridgeSpec): Promise<string> {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    try {
      return await invoke<string>('export_dxf', { spec });
    } catch {
      // Fallback to frontend DXF builder
    }
  }
  return generateDxfFrontend(spec);
}

export function buildCaseAndBulletGeometries(
  cartridge: CartridgeSpec,
  phiLength: number = Math.PI * 2
): { caseGeo: THREE.LatheGeometry; bulletGeo: THREE.LatheGeometry } {
  const zOffset = -cartridge.coal / 2;
  const casePts: THREE.Vector2[] = [];
  const tRim = cartridge.rim_thickness;
  const rRim = cartridge.rim_diameter / 2;
  const pPocketDepth = cartridge.primer_pocket_depth || 0.125;
  const pPocketR = (cartridge.primer_pocket_dia || 0.21) / 2;
  const flashR = (cartridge.flash_hole_dia || 0.08) / 2;

  casePts.push(new THREE.Vector2(0, pPocketDepth + zOffset));
  casePts.push(new THREE.Vector2(pPocketR, pPocketDepth + zOffset));
  casePts.push(new THREE.Vector2(pPocketR, zOffset));
  casePts.push(new THREE.Vector2(rRim - 0.008, zOffset));
  casePts.push(new THREE.Vector2(rRim, 0.006 + zOffset));
  casePts.push(new THREE.Vector2(rRim, tRim + zOffset));

  const bodySteps = 90;
  for (let i = 0; i <= bodySteps; i++) {
    const z = tRim + (i / bodySteps) * Math.max(0.01, cartridge.case_length - tRim);
    casePts.push(new THREE.Vector2(getOuterRadiusAt(cartridge, z), z + zOffset));
  }

  const innerMouthR = Math.max(0.01, cartridge.neck_diameter_mouth / 2 - cartridge.neck_wall_thickness);
  casePts.push(new THREE.Vector2(innerMouthR, cartridge.case_length + zOffset));

  const cavitySteps = 60;
  for (let i = cavitySteps; i >= 0; i--) {
    const z = cartridge.web_thickness + (i / cavitySteps) * Math.max(0.01, cartridge.case_length - cartridge.web_thickness);
    casePts.push(new THREE.Vector2(getInnerRadiusAt(cartridge, z), z + zOffset));
  }
  casePts.push(new THREE.Vector2(flashR, cartridge.web_thickness + zOffset));
  casePts.push(new THREE.Vector2(flashR, pPocketDepth + zOffset));
  casePts.push(new THREE.Vector2(0, pPocketDepth + zOffset));

  const caseGeo = new THREE.LatheGeometry(casePts, 64, 0, phiLength);
  caseGeo.computeVertexNormals();

  const bDia = cartridge.bullet_diameter;
  const rBullet = bDia / 2;
  const zBulletBase = cartridge.coal - cartridge.bullet_length;
  const boatTailLen = bDia * 0.45;
  const ogiveLen = Math.max(0.1, cartridge.bullet_length * 0.5);
  const zOgiveStart = cartridge.coal - ogiveLen;
  const bulletPts: THREE.Vector2[] = [
    new THREE.Vector2(0, zBulletBase + zOffset),
    new THREE.Vector2(rBullet * 0.85, zBulletBase + zOffset),
    new THREE.Vector2(rBullet, zBulletBase + boatTailLen + zOffset),
    new THREE.Vector2(rBullet, zOgiveStart + zOffset),
  ];

  const ogiveSteps = 32;
  for (let i = 1; i <= ogiveSteps; i++) {
    const t = i / ogiveSteps;
    const z = zOgiveStart + t * ogiveLen;
    const radiusFactor = Math.pow(Math.max(0, 1 - t * t), 0.72);
    const r = Math.max(0.004, rBullet * radiusFactor);
    bulletPts.push(new THREE.Vector2(r, z + zOffset));
  }
  bulletPts.push(new THREE.Vector2(0, cartridge.coal + zOffset));

  const bulletGeo = new THREE.LatheGeometry(bulletPts, 48, 0, phiLength);
  bulletGeo.computeVertexNormals();

  return { caseGeo, bulletGeo };
}

export function generateCartridgeStlBinary(
  cartridge: CartridgeSpec,
  phiLength: number = Math.PI * 2
): Uint8Array {
  const { caseGeo, bulletGeo } = buildCaseAndBulletGeometries(cartridge, phiLength);
  const geometries = [caseGeo, bulletGeo];
  const rotMatrix = new THREE.Matrix4().makeRotationZ(Math.PI / 2);

  try {
    let totalTriangles = 0;
    for (const geo of geometries) {
      geo.applyMatrix4(rotMatrix);
      totalTriangles += geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
    }

    const buffer = new ArrayBuffer(84 + totalTriangles * 50);
    const view = new DataView(buffer);
    const header = 'Wildcat Studio Binary STL (inches)';
    for (let i = 0; i < header.length && i < 80; i++) {
      view.setUint8(i, header.charCodeAt(i));
    }
    view.setUint32(80, totalTriangles, true);

    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();
    const vC = new THREE.Vector3();
    const cb = new THREE.Vector3();
    const ab = new THREE.Vector3();

    let offset = 84;
    const writeVertex = (v: THREE.Vector3) => {
      view.setFloat32(offset, v.x, true);
      view.setFloat32(offset + 4, v.y, true);
      view.setFloat32(offset + 8, v.z, true);
      offset += 12;
    };

    for (const geo of geometries) {
      const pos = geo.attributes.position;
      const idx = geo.index;
      const count = idx ? idx.count : pos.count;

      for (let i = 0; i < count; i += 3) {
        const i0 = idx ? idx.getX(i) : i;
        const i1 = idx ? idx.getX(i + 1) : i + 1;
        const i2 = idx ? idx.getX(i + 2) : i + 2;

        vA.fromBufferAttribute(pos, i0);
        vB.fromBufferAttribute(pos, i1);
        vC.fromBufferAttribute(pos, i2);

        cb.subVectors(vC, vB);
        ab.subVectors(vA, vB);
        cb.cross(ab).normalize();

        writeVertex(cb);
        writeVertex(vA);
        writeVertex(vB);
        writeVertex(vC);
        view.setUint16(offset, 0, true);
        offset += 2;
      }
    }

    return new Uint8Array(buffer);
  } finally {
    for (const geo of geometries) geo.dispose();
  }
}
