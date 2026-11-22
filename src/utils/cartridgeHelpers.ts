import * as THREE from 'three';
import { getVersion } from '@tauri-apps/api/app';
import { CartridgeSpec, CARTRIDGE_PRESETS } from '../types/cartridge';
import { BulletOption, BULLET_OPTIONS } from '../data/bullets';
import {
  exportQuickloadVol,
  generateDxf,
  getBulletRadiusAt,
  getInnerRadiusAt,
  getOuterRadiusAt,
  resolveBulletProfile,
} from '../engine';

const AUTO_UPDATE_STORAGE_KEY = 'wildcat_auto_check_updates';
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

export function buildQuickloadVol(spec: CartridgeSpec): string {
  return exportQuickloadVol(spec);
}

export function buildDxfDrawing(spec: CartridgeSpec): string {
  return generateDxf(spec);
}

export function buildCaseAndBulletGeometries(
  cartridge: CartridgeSpec,
  phiLength: number = Math.PI * 2
): { caseGeo: THREE.LatheGeometry; bulletGeo: THREE.LatheGeometry } {
  const zOffset = -cartridge.coal / 2;
  const casePts: THREE.Vector2[] = [];
  const tRim = cartridge.rim_thickness;
  const rRim = cartridge.rim_diameter / 2;
  const hasPrimerPocket =
    cartridge.rim_type !== 'rimfire' &&
    cartridge.primer_pocket_dia > 0 &&
    cartridge.primer_pocket_depth > 0;
  const pPocketDepth = hasPrimerPocket ? Math.min(cartridge.primer_pocket_depth, cartridge.web_thickness * 0.9) : 0;
  const pPocketR = hasPrimerPocket ? cartridge.primer_pocket_dia / 2 : 0;
  const flashR = hasPrimerPocket && cartridge.flash_hole_dia > 0 ? cartridge.flash_hole_dia / 2 : 0;

  if (hasPrimerPocket) {
    casePts.push(new THREE.Vector2(0, pPocketDepth + zOffset));
    casePts.push(new THREE.Vector2(pPocketR, pPocketDepth + zOffset));
    casePts.push(new THREE.Vector2(pPocketR, zOffset));
  } else {
    casePts.push(new THREE.Vector2(0, zOffset));
  }
  casePts.push(new THREE.Vector2(Math.max(0.01, rRim - 0.008), zOffset));
  casePts.push(new THREE.Vector2(rRim, Math.min(0.006, tRim * 0.5) + zOffset));
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
  if (hasPrimerPocket && flashR > 0) {
    casePts.push(new THREE.Vector2(flashR, cartridge.web_thickness + zOffset));
    casePts.push(new THREE.Vector2(flashR, pPocketDepth + zOffset));
    casePts.push(new THREE.Vector2(0, pPocketDepth + zOffset));
  } else {
    casePts.push(new THREE.Vector2(0, cartridge.web_thickness + zOffset));
  }

  const caseGeo = new THREE.LatheGeometry(casePts, 64, 0, phiLength);
  caseGeo.computeVertexNormals();

  // Parametric bullet profile (exact boat-tail frustum, bearing surface, ogive, and meplat)
  const bulletProfile = resolveBulletProfile(cartridge);
  const zBulletBase = cartridge.coal - cartridge.bullet_length;
  const bulletPts: THREE.Vector2[] = [new THREE.Vector2(0, zBulletBase + zOffset)];
  const bulletSteps = 56;
  for (let i = 0; i <= bulletSteps; i++) {
    const x = (i / bulletSteps) * cartridge.bullet_length;
    const r = Math.max(0.002, getBulletRadiusAt(cartridge, x, bulletProfile));
    bulletPts.push(new THREE.Vector2(r, zBulletBase + x + zOffset));
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
