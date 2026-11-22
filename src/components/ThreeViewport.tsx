import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CartridgeSpec } from '../types/cartridge';
import { getInnerRadiusAt } from '../utils/volumetrics';
import { Eye, Rotate3d, Download, ZoomIn, ZoomOut, Maximize2, X, Crosshair } from 'lucide-react';
import { BULLET_OPTIONS, getBulletsForCaliber } from '../data/bullets';
import { saveExportFile } from '../utils/fileExport';
import {
  applyBulletPresetToCartridge,
  buildCaseAndBulletGeometries,
  generateCartridgeStlBinary,
  getActiveBulletPreset,
} from '../utils/cartridgeHelpers';
import { useToast } from './common/Toast';

interface ThreeViewportProps {
  cartridge: CartridgeSpec;
  rotation?: number;
  onUpdateCartridge?: (cartridge: CartridgeSpec) => void;
  onSelectBullet?: () => void;
}

export const ThreeViewport: React.FC<ThreeViewportProps> = ({ 
  cartridge, 
  rotation = 0,
  onUpdateCartridge,
  onSelectBullet
}) => {
  const { showSuccess, showError } = useToast();
  const mountRef = useRef<HTMLDivElement>(null);
  const [isCutaway3D, setIsCutaway3D] = useState<boolean>(false);
  const [cutawaySlicePct, setCutawaySlicePct] = useState<number>(50); // 50% = 90 deg quarter pie slice, 100% = 180 deg half section
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [rotationSpeed, setRotationSpeed] = useState<number>(0.003);
  const rotationSpeedRef = useRef<number>(rotationSpeed);
  rotationSpeedRef.current = rotationSpeed;
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [isBulletHUDOpen, setIsBulletHUDOpen] = useState<boolean>(false);
  const [isHoveringBullet3D, setIsHoveringBullet3D] = useState<boolean>(false);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const caseMeshRef = useRef<THREE.Mesh | null>(null);
  const bulletMeshRef = useRef<THREE.Mesh | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const requestRenderRef = useRef<() => void>(() => {});
  const wireframeRef = useRef<boolean>(wireframe);
  wireframeRef.current = wireframe;

  const disposeGroupChildren = (group: THREE.Group | null) => {
    if (!group) return;
    const disposedMaterials = new Set<THREE.Material>();
    while (group.children.length > 0) {
      const child = group.children[0] as THREE.Mesh;
      group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const m of mats) {
          if (!disposedMaterials.has(m)) {
            disposedMaterials.add(m);
            m.dispose();
          }
        }
      }
    }
    caseMeshRef.current = null;
    bulletMeshRef.current = null;
  };

  const onSelectBulletRef = useRef(onSelectBullet);
  onSelectBulletRef.current = onSelectBullet;

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // Check WebGL availability
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      setWebglSupported(false);
      return;
    }

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0a0d13);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      100
    );
    camera.position.set(3.5, 2.5, 4.5);
    cameraRef.current = camera;

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;
      currentMount.appendChild(renderer.domElement);
    } catch {
      setWebglSupported(false);
      return;
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xfffaed, 2.2);
    dirLight1.position.set(5, 10, 7);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x00d2ff, 1.2);
    dirLight2.position.set(-5, -2, -5);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xffffff, 1.0, 10);
    pointLight.position.set(0, 3, 2);
    scene.add(pointLight);

    // Subtle reflective grid
    const grid = new THREE.GridHelper(10, 20, 0x26334a, 0x161f2e);
    grid.position.y = -1.2;
    scene.add(grid);

    // Main Group
    const group = new THREE.Group();
    groupRef.current = group;
    scene.add(group);

    let isMouseDown = false;
    let prevMousePos = { x: 0, y: 0 };
    let downPos = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let animId: number | null = null;
    let lastTime = performance.now();

    const renderFrame = () => {
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };

    const tick = (now: number) => {
      animId = null;
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      if (groupRef.current && !isMouseDown && rotationSpeedRef.current > 0) {
        groupRef.current.rotation.y += rotationSpeedRef.current * dt * 60;
      }

      renderFrame();

      if (rotationSpeedRef.current > 0) {
        animId = requestAnimationFrame(tick);
      }
    };

    const requestRender = () => {
      if (animId !== null) return;
      lastTime = performance.now();
      animId = requestAnimationFrame(tick);
    };
    requestRenderRef.current = requestRender;

    const handleMouseDown = (e: MouseEvent) => {
      isMouseDown = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
      downPos = { x: e.clientX, y: e.clientY };
    };

    const handleCanvasHover = (e: MouseEvent) => {
      if (isMouseDown || !bulletMeshRef.current || !cameraRef.current) return;
      const rect = dom.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, cameraRef.current);
      const hit = raycaster.intersectObject(bulletMeshRef.current).length > 0;
      dom.style.cursor = hit ? 'pointer' : 'default';
      setIsHoveringBullet3D(hit);
    };

    const handleCanvasLeave = () => {
      dom.style.cursor = 'default';
      setIsHoveringBullet3D(false);
    };

    const handleWindowDragMove = (e: MouseEvent) => {
      if (!isMouseDown || !group) return;
      const deltaX = e.clientX - prevMousePos.x;
      const deltaY = e.clientY - prevMousePos.y;
      group.rotation.y += deltaX * 0.008;
      group.rotation.x += deltaY * 0.008;
      prevMousePos = { x: e.clientX, y: e.clientY };
      requestRender();
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isMouseDown) return;
      isMouseDown = false;
      const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      if (dist < 6 && bulletMeshRef.current && cameraRef.current) {
        const rect = dom.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, cameraRef.current);
        if (raycaster.intersectObject(bulletMeshRef.current).length > 0) {
          setIsBulletHUDOpen(true);
          onSelectBulletRef.current?.();
        }
      }
      requestRender();
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.multiplyScalar(e.deltaY > 0 ? 1.08 : 0.92);
      camera.position.clampLength(1.0, 150.0);
      requestRender();
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', handleMouseDown);
    dom.addEventListener('mousemove', handleCanvasHover);
    dom.addEventListener('mouseleave', handleCanvasLeave);
    window.addEventListener('mousemove', handleWindowDragMove);
    window.addEventListener('mouseup', handleMouseUp);
    dom.addEventListener('wheel', handleWheel, { passive: false });

    requestRender();

    const handleResize = () => {
      if (!currentMount || !renderer || currentMount.clientWidth === 0 || currentMount.clientHeight === 0) return;
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
      requestRender();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animId !== null) cancelAnimationFrame(animId);
      requestRenderRef.current = () => {};
      dom.removeEventListener('mousedown', handleMouseDown);
      dom.removeEventListener('mousemove', handleCanvasHover);
      dom.removeEventListener('mouseleave', handleCanvasLeave);
      window.removeEventListener('mousemove', handleWindowDragMove);
      window.removeEventListener('mouseup', handleMouseUp);
      dom.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      disposeGroupChildren(groupRef.current);
      grid.geometry.dispose();
      if (Array.isArray(grid.material)) {
        grid.material.forEach((m) => m.dispose());
      } else {
        grid.material.dispose();
      }
      if (currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (rotationSpeed > 0) {
      requestRenderRef.current();
    }
  }, [rotationSpeed]);

  // Reframe camera when switching presets (not on parameter slider edits)
  useEffect(() => {
    const maxDim = Math.max(cartridge.coal, cartridge.rim_diameter * 2.5);
    if (cameraRef.current) {
      const dist = Math.max(4.5, maxDim * 1.35);
      cameraRef.current.position.set(dist * 0.7, dist * 0.45, dist * 0.75);
      requestRenderRef.current();
    }
  }, [cartridge.id]);

  // Update Geometry when Cartridge or View options change
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    disposeGroupChildren(group);

    const isLittleBoy = cartridge.id === 'little_boy_ordnance';
    const zOffset = -cartridge.coal / 2.0;
    const cutawayAngle = (Math.max(10, Math.min(100, cutawaySlicePct)) / 100) * Math.PI;
    const phiLength = isCutaway3D ? Math.PI * 2.0 - cutawayAngle : Math.PI * 2.0;

    if (isLittleBoy) {
      const rBody = cartridge.base_diameter / 2;
      const length = cartridge.case_length;
      const lbPoints: THREE.Vector2[] = [];

      lbPoints.push(new THREE.Vector2(0, zOffset));
      lbPoints.push(new THREE.Vector2(rBody, zOffset));
      lbPoints.push(new THREE.Vector2(rBody, zOffset + length * 0.85));

      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const z = zOffset + length * 0.85 + t * (length * 0.15);
        const r = rBody * Math.sqrt(Math.max(0, 1 - t * t * 0.9));
        lbPoints.push(new THREE.Vector2(r, z));
      }
      lbPoints.push(new THREE.Vector2(0, zOffset + length));

      const lbGeo = new THREE.LatheGeometry(lbPoints, 48, 0, phiLength);
      lbGeo.computeVertexNormals();

      const lbMat = new THREE.MeshStandardMaterial({
        color: 0x293327,
        roughness: 0.55,
        metalness: 0.35,
        wireframe: wireframeRef.current,
        side: THREE.DoubleSide,
      });

      const lbMesh = new THREE.Mesh(lbGeo, lbMat);
      lbMesh.rotation.z = Math.PI / 2;
      group.add(lbMesh);
      caseMeshRef.current = lbMesh;

      const boxFinMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.45, wireframe: wireframeRef.current });
      const finSpan = rBody * 2.4;
      const finLen = length * 0.2;

      const fin1 = new THREE.Mesh(new THREE.BoxGeometry(finLen, finSpan, 0.05), boxFinMat);
      fin1.position.x = zOffset + finLen * 0.5;
      group.add(fin1);

      const fin2 = new THREE.Mesh(new THREE.BoxGeometry(finLen, 0.05, finSpan), boxFinMat);
      fin2.position.x = zOffset + finLen * 0.5;
      group.add(fin2);

      const plateThick = 0.04;
      const boxW = finSpan * 0.85;

      const topPlate = new THREE.Mesh(new THREE.BoxGeometry(finLen * 0.85, plateThick, boxW), boxFinMat);
      topPlate.position.set(zOffset + finLen * 0.5, boxW / 2, 0);
      group.add(topPlate);

      const botPlate = new THREE.Mesh(new THREE.BoxGeometry(finLen * 0.85, plateThick, boxW), boxFinMat);
      botPlate.position.set(zOffset + finLen * 0.5, -boxW / 2, 0);
      group.add(botPlate);

      const leftPlate = new THREE.Mesh(new THREE.BoxGeometry(finLen * 0.85, boxW, plateThick), boxFinMat);
      leftPlate.position.set(zOffset + finLen * 0.5, 0, -boxW / 2);
      group.add(leftPlate);

      const rightPlate = new THREE.Mesh(new THREE.BoxGeometry(finLen * 0.85, boxW, plateThick), boxFinMat);
      rightPlate.position.set(zOffset + finLen * 0.5, 0, boxW / 2);
      group.add(rightPlate);

      const antennaMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.1, wireframe: wireframeRef.current });
      for (let i = 0; i < 4; i++) {
        const aAngle = (i * Math.PI) / 2 + Math.PI / 4;
        const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, length * 0.08, 12), antennaMat);
        antenna.position.set(
          zOffset + length + length * 0.02,
          Math.cos(aAngle) * (rBody * 0.55),
          Math.sin(aAngle) * (rBody * 0.55)
        );
        antenna.rotation.z = Math.PI / 2;
        group.add(antenna);
      }

      if (isCutaway3D) {
        const barrelGeo = new THREE.CylinderGeometry(rBody * 0.35, rBody * 0.35, length * 0.75, 24, 1, true);
        const barrelMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.25, wireframe: wireframeRef.current, side: THREE.DoubleSide });
        const barrelMesh = new THREE.Mesh(barrelGeo, barrelMat);
        barrelMesh.rotation.z = Math.PI / 2;
        barrelMesh.position.x = zOffset + length * 0.45;
        group.add(barrelMesh);

        const targetGeo = new THREE.CylinderGeometry(rBody * 0.3, rBody * 0.3, length * 0.12, 24);
        const targetMat = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x10b981,
          emissiveIntensity: 0.9,
          roughness: 0.3,
          wireframe: wireframeRef.current,
        });
        const targetMesh = new THREE.Mesh(targetGeo, targetMat);
        targetMesh.rotation.z = Math.PI / 2;
        targetMesh.position.x = zOffset + length * 0.76;
        group.add(targetMesh);

        const projGeo = new THREE.CylinderGeometry(rBody * 0.28, rBody * 0.28, length * 0.1, 24);
        const projMesh = new THREE.Mesh(projGeo, targetMat);
        projMesh.rotation.z = Math.PI / 2;
        projMesh.position.x = zOffset + length * 0.22;
        group.add(projMesh);
      }
    } else {
      const { caseGeo, bulletGeo } = buildCaseAndBulletGeometries(cartridge, phiLength);
      const zBulletBase = cartridge.coal - cartridge.bullet_length;
      const rBullet = cartridge.bullet_diameter / 2;
      const bSteps = 40;

      const brassMaterial = new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        roughness: 0.22,
        metalness: 0.92,
        wireframe: wireframeRef.current,
        side: THREE.DoubleSide,
      });

      const caseMesh = new THREE.Mesh(caseGeo, brassMaterial);
      caseMesh.rotation.z = Math.PI / 2;
      group.add(caseMesh);
      caseMeshRef.current = caseMesh;

      const copperMaterial = new THREE.MeshStandardMaterial({
        color: 0xb87333,
        roughness: 0.30,
        metalness: 0.88,
        wireframe: wireframeRef.current,
        side: THREE.DoubleSide,
      });

      const bulletMesh = new THREE.Mesh(bulletGeo, copperMaterial);
      bulletMesh.rotation.z = Math.PI / 2;
      group.add(bulletMesh);
      bulletMeshRef.current = bulletMesh;

      if (isCutaway3D) {
        if (cartridge.rim_type !== 'rimfire' && cartridge.primer_pocket_dia > 0 && cartridge.primer_pocket_depth > 0) {
          const primerPoints: THREE.Vector2[] = [];
          const rPrimer = Math.min(cartridge.primer_pocket_dia / 2, cartridge.base_diameter / 4);
          const pDepth = Math.min(cartridge.primer_pocket_depth, cartridge.web_thickness * 0.85);
          primerPoints.push(new THREE.Vector2(0, zOffset));
          primerPoints.push(new THREE.Vector2(rPrimer, zOffset));
          primerPoints.push(new THREE.Vector2(rPrimer, zOffset + pDepth));
          primerPoints.push(new THREE.Vector2(0, zOffset + pDepth));

          const primerGeo = new THREE.LatheGeometry(primerPoints, 32, 0, phiLength);
          primerGeo.computeVertexNormals();
          const primerMat = new THREE.MeshStandardMaterial({
            color: 0xd1d5db,
            roughness: 0.28,
            metalness: 0.82,
            wireframe: wireframeRef.current,
            side: THREE.DoubleSide,
          });
          const primerMesh = new THREE.Mesh(primerGeo, primerMat);
          primerMesh.rotation.z = Math.PI / 2;
          group.add(primerMesh);
        }

        const webZ = cartridge.web_thickness;
        const zPowderTop = Math.max(webZ + 0.02, zBulletBase);
        if (zPowderTop > webZ) {
          const powderPoints: THREE.Vector2[] = [];
          powderPoints.push(new THREE.Vector2(0, webZ + zOffset));
          const pSteps = 30;
          for (let i = 0; i <= pSteps; i++) {
            const z = webZ + (i / pSteps) * (zPowderTop - webZ);
            const r = Math.max(0, getInnerRadiusAt(cartridge, z) * 0.97);
            powderPoints.push(new THREE.Vector2(r, z + zOffset));
          }
          powderPoints.push(new THREE.Vector2(0, zPowderTop + zOffset));

          const powderGeo = new THREE.LatheGeometry(powderPoints, 36, 0, phiLength);
          powderGeo.computeVertexNormals();
          const powderMat = new THREE.MeshStandardMaterial({
            color: 0x1c232c,
            roughness: 0.94,
            metalness: 0.06,
            wireframe: wireframeRef.current,
            side: THREE.DoubleSide,
          });
          const powderMesh = new THREE.Mesh(powderGeo, powderMat);
          powderMesh.rotation.z = Math.PI / 2;
          group.add(powderMesh);
        }

        const leadPoints: THREE.Vector2[] = [];
        const jacketThickness = 0.016;
        const rLead = Math.max(0.01, rBullet - jacketThickness);
        const zLeadBase = zBulletBase + 0.012;
        leadPoints.push(new THREE.Vector2(0, zLeadBase + zOffset));
        leadPoints.push(new THREE.Vector2(rLead, zLeadBase + zOffset));
        leadPoints.push(new THREE.Vector2(rLead, cartridge.case_length + zOffset));
        for (let i = 1; i <= bSteps; i++) {
          const t = i / bSteps;
          const z = cartridge.case_length + t * (cartridge.coal - cartridge.case_length - 0.02);
          const r = rLead * Math.sqrt(Math.max(0, 1 - t * t * 0.95));
          leadPoints.push(new THREE.Vector2(Math.max(0, r), z + zOffset));
        }
        leadPoints.push(new THREE.Vector2(0, cartridge.coal - 0.02 + zOffset));

        const leadGeo = new THREE.LatheGeometry(leadPoints, 36, 0, phiLength);
        leadGeo.computeVertexNormals();
        const leadMat = new THREE.MeshStandardMaterial({
          color: 0x64748b,
          roughness: 0.65,
          metalness: 0.45,
          wireframe: wireframeRef.current,
          side: THREE.DoubleSide,
        });
        const leadMesh = new THREE.Mesh(leadGeo, leadMat);
        leadMesh.rotation.z = Math.PI / 2;
        group.add(leadMesh);
      }
    }
    requestRenderRef.current();
  }, [cartridge, isCutaway3D, cutawaySlicePct]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.material) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if ('wireframe' in m) {
          (m as THREE.MeshStandardMaterial).wireframe = wireframe;
        }
      }
    });
    requestRenderRef.current();
  }, [wireframe]);

  useEffect(() => {
    if (groupRef.current && rotation !== undefined) {
      groupRef.current.rotation.z = (rotation * Math.PI) / 180;
      requestRenderRef.current();
    }
  }, [rotation]);

  // Export 3D STL via native Tauri save dialog or browser download
  const handleExportSTL = async () => {
    const cutawayAngle = (Math.max(10, Math.min(100, cutawaySlicePct)) / 100) * Math.PI;
    const phiLength = isCutaway3D ? Math.PI * 2 - cutawayAngle : Math.PI * 2;
    const stlBytes = generateCartridgeStlBinary(cartridge, phiLength);
    const res = await saveExportFile({
      defaultFileName: `${cartridge.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_3d_print.stl`,
      filters: [{ name: 'STL 3D Mesh (Binary)', extensions: ['stl'] }],
      content: stlBytes,
      mimeType: 'model/stl',
      title: 'Export 3D Printable STL Mesh',
    });
    if (res.success && res.path) {
      showSuccess('3D STL Exported', `Saved to ${res.path}`);
    } else if (res.error) {
      showError('STL Export Failed', res.error);
    }
  };

  const handleZoomIn3D = () => {
    if (cameraRef.current) {
      cameraRef.current.position.multiplyScalar(0.82);
      cameraRef.current.position.clampLength(1.0, 150.0);
      requestRenderRef.current();
    }
  };

  const handleZoomOut3D = () => {
    if (cameraRef.current) {
      cameraRef.current.position.multiplyScalar(1.22);
      cameraRef.current.position.clampLength(1.0, 150.0);
      requestRenderRef.current();
    }
  };

  const handleResetFit3D = () => {
    if (cameraRef.current) {
      const maxDim = Math.max(cartridge.coal, cartridge.rim_diameter * 2.5);
      const dist = Math.max(4.5, maxDim * 1.35);
      cameraRef.current.position.set(dist * 0.7, dist * 0.45, dist * 0.75);
      if (groupRef.current) {
        groupRef.current.rotation.set(0, 0, 0);
      }
      requestRenderRef.current();
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0a0d13' }}>
      {/* 3D Viewport Controls */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(18, 23, 33, 0.85)',
        WebkitBackdropFilter: 'blur(8px)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        padding: '6px 10px'
      }}>
        <button
          onClick={() => setIsCutaway3D(!isCutaway3D)}
          style={{
            background: isCutaway3D ? 'var(--cad-cyan)' : 'var(--bg-tertiary)',
            color: isCutaway3D ? '#0a0d13' : 'var(--text-primary)',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Eye size={13} />
          {isCutaway3D ? '3D Cutaway Active' : 'Solid Shell'}
        </button>

        {isCutaway3D && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 4px', borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              Slice: {Math.round((cutawaySlicePct / 100) * 180)}°
            </span>
            <input
              type="range"
              min="20"
              max="100"
              step="5"
              value={cutawaySlicePct}
              onChange={(e) => setCutawaySlicePct(Number(e.target.value))}
              style={{
                width: '65px',
                height: '4px',
                accentColor: 'var(--cad-cyan)',
                cursor: 'pointer',
              }}
              title={`Cutaway slice angle: ${Math.round((cutawaySlicePct / 100) * 180)}°`}
            />
            <button
              onClick={() => setCutawaySlicePct(50)}
              style={{
                background: cutawaySlicePct === 50 ? 'rgba(0, 210, 255, 0.2)' : 'transparent',
                color: cutawaySlicePct === 50 ? 'var(--cad-cyan)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '3px',
                fontSize: '9px',
                padding: '2px 4px',
                cursor: 'pointer',
              }}
            >
              90°
            </button>
            <button
              onClick={() => setCutawaySlicePct(100)}
              style={{
                background: cutawaySlicePct === 100 ? 'rgba(0, 210, 255, 0.2)' : 'transparent',
                color: cutawaySlicePct === 100 ? 'var(--cad-cyan)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '3px',
                fontSize: '9px',
                padding: '2px 4px',
                cursor: 'pointer',
              }}
            >
              180°
            </button>
          </div>
        )}

        <button
          onClick={() => setWireframe(!wireframe)}
          style={{
            background: wireframe ? 'var(--cad-cyan)' : 'var(--bg-tertiary)',
            color: wireframe ? '#0a0d13' : 'var(--text-primary)',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {wireframe ? 'Mesh Grid' : 'Smooth Shading'}
        </button>

        <button
          onClick={() => setRotationSpeed((s) => (s > 0 ? 0 : 0.003))}
          style={{
            background: rotationSpeed > 0 ? 'rgba(0, 210, 255, 0.2)' : 'var(--bg-tertiary)',
            color: rotationSpeed > 0 ? 'var(--cad-cyan)' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Rotate3d size={13} />
          {rotationSpeed > 0 ? 'Auto-Spin' : 'Paused'}
        </button>

        <div style={{ width: '1px', height: '16px', background: 'var(--border-color)', margin: '0 2px' }} />

        {/* 3D Zoom & Fit Controls */}
        <button
          onClick={handleZoomIn3D}
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px' }}
          title="Zoom In 3D"
        >
          <ZoomIn size={15} />
        </button>
        <button
          onClick={handleZoomOut3D}
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px' }}
          title="Zoom Out 3D"
        >
          <ZoomOut size={15} />
        </button>
        <button
          onClick={handleResetFit3D}
          style={{ background: 'transparent', border: 'none', color: 'var(--cad-cyan)', cursor: 'pointer', padding: '2px' }}
          title="Fit & Center 3D View"
        >
          <Maximize2 size={15} />
        </button>
      </div>

      {/* 3D Print STL Export Banner */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 10
      }}>
        <button
          onClick={handleExportSTL}
          style={{
            background: 'linear-gradient(135deg, #f0883e, #b8581e)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(240, 136, 62, 0.3)'
          }}
        >
          <Download size={14} />
          Export STL (3D Print Dummy)
        </button>
      </div>

      {/* 3D Floating Projectile Hover Tooltip */}
      {isHoveringBullet3D && !isBulletHUDOpen && (
        <div style={{
          position: 'absolute',
          top: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(10, 13, 19, 0.92)',
          border: '1px solid var(--cad-copper)',
          borderRadius: '6px',
          padding: '5px 12px',
          color: '#fff',
          fontSize: '11px',
          fontWeight: 600,
          pointerEvents: 'none',
          boxShadow: '0 4px 18px rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          zIndex: 10
        }}>
          <Crosshair size={13} color="var(--cad-copper)" />
          <span>Projectile: <strong>{cartridge.bullet_diameter.toFixed(3)}"</strong> ({cartridge.bullet_weight_grains || 0}gr)</span>
          <span style={{ color: 'var(--cad-cyan)', fontSize: '10px' }}>— Click to inspect & select factory bullet model</span>
        </div>
      )}

      {/* In-Viewport 3D Projectile HUD Card */}
      {isBulletHUDOpen && (
        <div style={{
          position: 'absolute',
          top: '60px',
          left: '20px',
          width: '320px',
          background: 'rgba(10, 14, 23, 0.94)',
          border: '1px solid rgba(0, 210, 255, 0.4)',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7)',
          WebkitBackdropFilter: 'blur(8px)',
          backdropFilter: 'blur(8px)',
          padding: '12px',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--cad-copper)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Crosshair size={12} /> 3D PROJECTILE INSPECTOR
            </span>
            <button
              onClick={() => setIsBulletHUDOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{
            background: 'rgba(0, 210, 255, 0.08)',
            border: '1px solid rgba(0, 210, 255, 0.25)',
            borderRadius: '5px',
            padding: '6px 8px',
            fontSize: '9px',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>Caliber: <strong style={{ color: '#fff' }}>{cartridge.bullet_diameter.toFixed(3)}"</strong></span>
              <span>Weight: <strong style={{ color: '#fff' }}>{cartridge.bullet_weight_grains || 0} gr</strong></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Length: <strong style={{ color: '#fff' }}>{cartridge.bullet_length}"</strong></span>
              <span>Loaded COAL: <strong style={{ color: '#fbbf24' }}>{cartridge.coal.toFixed(3)}"</strong></span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--cad-cyan)', marginBottom: '4px' }}>
              FACTORY BULLET MODEL PRESET:
            </div>
            <select
              value={getActiveBulletPreset(cartridge)?.id || ''}
              onChange={(e) => {
                const selected = BULLET_OPTIONS.find(b => b.id === e.target.value);
                if (selected && onUpdateCartridge) {
                  onUpdateCartridge(applyBulletPresetToCartridge(cartridge, selected));
                }
              }}
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(0, 210, 255, 0.4)',
                color: '#fff',
                fontSize: '10px',
                padding: '5px 8px',
                borderRadius: '4px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="" disabled>Select bullet to update 3D model...</option>
              <optgroup label={`Bullets for ${cartridge.bullet_diameter.toFixed(3)}" Caliber`}>
                {getBulletsForCaliber(cartridge.bullet_diameter, 0.006).map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.weight_grains}gr, L: {b.length_inches}", BC: {b.g1_bc})
                  </option>
                ))}
              </optgroup>
              <optgroup label="All Other Calibers">
                {BULLET_OPTIONS.filter(b => Math.abs(b.caliber_inches - cartridge.bullet_diameter) > 0.006).map(b => (
                  <option key={b.id} value={b.id}>
                    .{b.caliber_inches.toString().split('.')[1]} - {b.name} ({b.weight_grains}gr)
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      )}

      {/* 3D Viewport or Fallback */}
      {!webglSupported ? (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(0, 210, 255, 0.1)',
            border: '1px solid var(--cad-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--cad-cyan)'
          }}>
            <Rotate3d size={32} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
            WebGL Acceleration Notice
          </h3>
          <p style={{ maxWidth: '500px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Your display or headless browser environment does not currently expose WebGL hardware acceleration.
            The 2D Vector Blueprint, Internal Cutaway, Chamber Reamer Blueprint, and Set-Back Analyzer are 100% functional.
          </p>
        </div>
      ) : (
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      )}
    </div>
  );
};
