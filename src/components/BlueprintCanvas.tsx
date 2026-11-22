import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  CartridgeSpec,
  DraftingStandard,
  ToleranceDisplayMode,
  VolumetricResult,
} from '../types/cartridge';
import {
  getOuterRadiusAt,
  getInnerRadiusAt,
  getChamberRadiusAt,
  getBulletRadiusAt,
  isStraightWall,
  calculateVolumetrics,
  calculateReamerSpecs,
  calculateDatumHeadspace,
  calculateCIPDeltaL,
  analyzeChamberCollision,
  effectiveShoulderLength,
} from '../utils/volumetrics';
import { buildClosedSvgContour } from '../utils/cartridgeHelpers';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crosshair,
  X,
  Edit3,
  Maximize2,
  GripVertical,
  RotateCw,
  Layers,
  Shield,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { BlueprintToolbar, DrawingMode } from './blueprint/BlueprintToolbar';
import { LittleBoySvg } from './blueprint/LittleBoySvg';
import { DimensionEditorPopover, EditingDimState } from './blueprint/DimensionEditorPopover';

export type { DrawingMode };

interface BlueprintCanvasProps {
  cartridge: CartridgeSpec;
  volumetrics?: VolumetricResult;
  mode?: 'blueprint' | 'cutaway';
  drawingMode?: DrawingMode;
  onDrawingModeChange?: (mode: DrawingMode) => void;
  draftingStandard?: DraftingStandard;
  onDraftingStandardChange?: (standard: DraftingStandard) => void;
  toleranceMode?: ToleranceDisplayMode;
  onToleranceModeChange?: (mode: ToleranceDisplayMode) => void;
  showChamber?: boolean;
  onToggleChamber?: () => void;
  showDimensions?: boolean;
  onToggleDimensions?: () => void;
  showBullet?: boolean;
  onToggleBullet?: () => void;
  showGrid?: boolean;
  onToggleGrid?: () => void;
  isMetric: boolean;
  isOneToOne: boolean;
  ppi: number;
  onPpiChange: (newPpi: number) => void;
  onUpdateCartridge?: (updated: CartridgeSpec) => void;
  rotation?: number;
  onRotationChange?: (newRotation: number) => void;
  ghostCartridge?: CartridgeSpec | null;
  ghostAlign?: 'head' | 'mouth' | 'shoulder';
  onCloseGhost?: () => void;
  onChangeGhostAlign?: (align: 'head' | 'mouth' | 'shoulder') => void;
  onOpenCompare?: () => void;
  onOpenCalibration?: () => void;
}

export const BlueprintCanvas: React.FC<BlueprintCanvasProps> = ({
  cartridge,
  volumetrics: propVolumetrics,
  mode = 'blueprint',
  drawingMode: propDrawingMode,
  onDrawingModeChange,
  draftingStandard: propDraftingStandard,
  onDraftingStandardChange,
  toleranceMode: propToleranceMode,
  onToleranceModeChange,
  showChamber: propShowChamber,
  onToggleChamber,
  showDimensions: propShowDimensions,
  onToggleDimensions,
  showBullet: propShowBullet,
  onToggleBullet,
  showGrid: propShowGrid,
  onToggleGrid,
  isMetric,
  isOneToOne,
  ppi,
  onPpiChange,
  onUpdateCartridge,
  rotation: propRotation,
  onRotationChange,
  ghostCartridge = null,
  ghostAlign = 'head',
  onCloseGhost,
  onChangeGhostAlign,
  onOpenCompare,
  onOpenCalibration,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [internalRotation, setInternalRotation] = useState<number>(0);
  const rotation = propRotation !== undefined ? propRotation : internalRotation;

  const handleRotateClockwise = useCallback(() => {
    const nextRot = (rotation + 90) % 360;
    if (onRotationChange) {
      onRotationChange(nextRot);
    } else {
      setInternalRotation(nextRot);
    }
  }, [rotation, onRotationChange]);

  const [internalDrawingMode, setInternalDrawingMode] = useState<DrawingMode>(
    mode === 'cutaway' ? 'cutaway' : 'outline'
  );
  const [internalShowChamber, setInternalShowChamber] = useState<boolean>(false);
  const [internalShowDimensions, setInternalShowDimensions] = useState<boolean>(true);
  const [internalShowBullet, setInternalShowBullet] = useState<boolean>(true);
  const [internalShowGrid, setInternalShowGrid] = useState<boolean>(true);

  useEffect(() => {
    if (propDrawingMode !== undefined) return;
    setInternalDrawingMode((prev) => {
      if (mode === 'cutaway') return 'cutaway';
      if (mode === 'blueprint' && prev === 'cutaway') return 'outline';
      return prev;
    });
  }, [mode, propDrawingMode]);

  const activeDrawingMode = propDrawingMode !== undefined ? propDrawingMode : internalDrawingMode;
  const activeShowChamber = propShowChamber !== undefined ? propShowChamber : internalShowChamber;
  const activeShowDimensions = propShowDimensions !== undefined ? propShowDimensions : internalShowDimensions;
  const activeShowBullet = propShowBullet !== undefined ? propShowBullet : internalShowBullet;
  const activeShowGrid = propShowGrid !== undefined ? propShowGrid : internalShowGrid;

  const [internalStandard, setInternalStandard] = useState<DraftingStandard>('saami');
  const [internalTolerance, setInternalTolerance] = useState<ToleranceDisplayMode>('nominal');

  const activeStandard = propDraftingStandard !== undefined ? propDraftingStandard : internalStandard;
  const activeTolerance = propToleranceMode !== undefined ? propToleranceMode : internalTolerance;

  const handleSetStandard = (std: DraftingStandard) => {
    if (onDraftingStandardChange) {
      onDraftingStandardChange(std);
    } else {
      setInternalStandard(std);
    }
  };

  const handleSetTolerance = (nextTol: ToleranceDisplayMode) => {
    if (onToleranceModeChange) {
      onToleranceModeChange(nextTol);
    } else {
      setInternalTolerance(nextTol);
    }
  };

  const [isHelperDismissed, setIsHelperDismissed] = useState<boolean>(() => {
    return localStorage.getItem('wildcat_helper_dismissed') === 'true';
  });

  const activeVol = useMemo(
    () => propVolumetrics ?? calculateVolumetrics(cartridge),
    [propVolumetrics, cartridge]
  );
  const ghostVol = useMemo(
    () => (ghostCartridge ? calculateVolumetrics(ghostCartridge) : null),
    [ghostCartridge]
  );
  const reamer = useMemo(() => calculateReamerSpecs(cartridge), [cartridge]);
  const datumHeadspace = useMemo(() => calculateDatumHeadspace(cartridge), [cartridge]);
  const cipDeltaL = useMemo(() => calculateCIPDeltaL(cartridge), [cartridge]);
  const collision = useMemo(
    () => analyzeChamberCollision(cartridge, reamer),
    [cartridge, reamer]
  );

  const getReamerClearanceForKey = (key: keyof CartridgeSpec, type: 'diameter' | 'length'): number => {
    switch (key) {
      case 'rim_diameter': return reamer.chamber_rim_dia - cartridge.rim_diameter;
      case 'rim_thickness': return reamer.chamber_rim_depth - cartridge.rim_thickness;
      case 'base_diameter': return reamer.chamber_base_dia - cartridge.base_diameter;
      case 'shoulder_start_diameter': return reamer.chamber_shoulder_dia - cartridge.shoulder_start_diameter;
      case 'neck_diameter_base':
      case 'neck_diameter_mouth': return reamer.chamber_neck_dia - cartridge.neck_diameter_mouth;
      case 'bullet_diameter': return reamer.freebore_dia - cartridge.bullet_diameter;
      case 'case_length': return reamer.chamber_length - cartridge.case_length;
      default: return type === 'diameter' ? 0.0020 : reamer.headspace_clearance;
    }
  };

  const getBadgeText = (
    key: keyof CartridgeSpec,
    nominalVal: number,
    cipSymbol: string,
    saamiSymbol: string,
    type: 'diameter' | 'length' | 'angle'
  ): string => {
    const sym = activeStandard === 'cip' ? cipSymbol : saamiSymbol;
    if (type === 'angle') {
      return `${sym}: ${nominalVal.toFixed(1)}°${activeTolerance === 'dual_envelope' ? ' (MMC/LMC)' : ''}`;
    }
    if (activeTolerance === 'nominal') {
      return `${sym}: ${fmt(nominalVal)}`;
    }
    if (activeTolerance === 'cartridge_max') {
      return `${sym} (MMC): ${fmt(nominalVal)}`;
    }
    const add = getReamerClearanceForKey(key, type);
    if (activeTolerance === 'chamber_min') {
      return `${sym} (LMC): ${fmt(nominalVal + add)}`;
    }
    if (activeTolerance === 'dual_envelope') {
      return `${sym}: ${fmt(nominalVal)} / Cham ${fmt(nominalVal + add)} [Δ +${fmt(add, 4)}]`;
    }
    return `${sym} (Δ): +${fmt(add, 4)}`;
  };

  const handleSetDrawingMode = (newMode: DrawingMode) => {
    if (onDrawingModeChange) {
      onDrawingModeChange(newMode);
    } else {
      setInternalDrawingMode(newMode);
    }
  };

  const handleToggleChamber = () => {
    if (onToggleChamber) {
      onToggleChamber();
    } else {
      setInternalShowChamber((prev) => !prev);
    }
  };

  const handleToggleDimensions = () => {
    if (onToggleDimensions) {
      onToggleDimensions();
    } else {
      setInternalShowDimensions((prev) => !prev);
    }
  };

  const handleToggleBullet = () => {
    if (onToggleBullet) {
      onToggleBullet();
    } else {
      setInternalShowBullet((prev) => !prev);
    }
  };

  const handleToggleGrid = () => {
    if (onToggleGrid) {
      onToggleGrid();
    } else {
      setInternalShowGrid((prev) => !prev);
    }
  };

  const [editingDim, setEditingDim] = useState<EditingDimState | null>(null);
  const [hoveredDim, setHoveredDim] = useState<string | null>(null);
  const [isHoveringBullet, setIsHoveringBullet] = useState<boolean>(false);

  const closePopover = useCallback(() => {
    setEditingDim(null);
  }, []);

  // Floating Chamber Fit & Telemetry HUD State
  const [chamberHudPos, setChamberHudPos] = useState<{ x: number; y: number } | null>(null);
  const [isChamberHudCollapsed, setIsChamberHudCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('wildcat_chamber_hud_collapsed') === 'true';
  });
  const [isChamberHudDismissed, setIsChamberHudDismissed] = useState<boolean>(false);
  const [isDraggingChamberHud, setIsDraggingChamberHud] = useState<boolean>(false);
  const chamberHudDragRef = useRef<{ startMouseX: number; startMouseY: number; startPosX: number; startPosY: number } | null>(null);

  const handleChamberHudMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    const rect = (e.currentTarget as HTMLElement).closest('#chamber-fit-hud')?.getBoundingClientRect();
    const currentX = chamberHudPos ? chamberHudPos.x : (rect ? rect.left : window.innerWidth / 2 - 200);
    const currentY = chamberHudPos ? chamberHudPos.y : (rect ? rect.top : window.innerHeight - 120);

    chamberHudDragRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPosX: currentX,
      startPosY: currentY,
    };
    setIsDraggingChamberHud(true);
  };

  useEffect(() => {
    if (!isDraggingChamberHud) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!chamberHudDragRef.current) return;
      const deltaX = e.clientX - chamberHudDragRef.current.startMouseX;
      const deltaY = e.clientY - chamberHudDragRef.current.startMouseY;

      const newX = Math.max(8, Math.min(window.innerWidth - 300, chamberHudDragRef.current.startPosX + deltaX));
      const newY = Math.max(8, Math.min(window.innerHeight - 60, chamberHudDragRef.current.startPosY + deltaY));

      setChamberHudPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDraggingChamberHud(false);
      chamberHudDragRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingChamberHud]);

  // Un-dismiss Chamber Fit HUD whenever user explicitly switches to chamber_fit mode
  useEffect(() => {
    if (activeDrawingMode === 'chamber_fit') {
      setIsChamberHudDismissed(false);
    }
  }, [activeDrawingMode]);

  // Coordinate scaling & anchors
  const originX = 140; // Base z=0 position on canvas
  const centerY = 280; // Centerline position on canvas
  const scale = isOneToOne ? ppi * zoom : 260 * zoom;

  const fmt = (valInches: number, precision = 3): string => {
    if (isMetric) {
      return (valInches * 25.4).toFixed(precision === 4 ? 3 : 2) + 'mm';
    }
    return valInches.toFixed(precision) + '"';
  };

  // Fit Cartridge to Viewport Extents (Auto-Frame)
  const handleFitToView = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth <= 0 || clientHeight <= 0) return;

    // Available space accounting for UI paddings and overlays
    const availWidth = Math.max(200, clientWidth - 140);
    const availHeight = Math.max(200, clientHeight - 160);

    const totalLenInches = Math.max(cartridge.coal, cartridge.case_length + 0.6, ghostCartridge ? ghostCartridge.coal : 0, 0.8);
    const isSpecialOrdnance = cartridge.id === 'little_boy_ordnance';
    const maxDiaInches = Math.max(
      cartridge.rim_diameter * (isSpecialOrdnance ? 1.6 : 1.0),
      cartridge.base_diameter * (isSpecialOrdnance ? 1.6 : 1.0),
      cartridge.shoulder_start_diameter,
      cartridge.neck_diameter_mouth,
      cartridge.bullet_diameter,
      ghostCartridge ? ghostCartridge.rim_diameter : 0,
      0.3
    );

    // Full bounding box in pixels at zoom = 1.0 (260px/inch)
    const fullPixelWidth = totalLenInches * 260 + 120; // with left/right leader lines
    const fullPixelHeight = maxDiaInches * 260 + 180; // with top/bottom dimension labels

    // Account for vertical rotation (90° / 270°)
    const isVertical = rotation === 90 || rotation === 270;
    const effectiveWidth = isVertical ? fullPixelHeight : fullPixelWidth;
    const effectiveHeight = isVertical ? fullPixelWidth : fullPixelHeight;

    const zoomX = availWidth / effectiveWidth;
    const zoomY = availHeight / effectiveHeight;
    const optimalZoom = Math.min(zoomX, zoomY);

    // Clamp zoom between 0.02 (2%) and 1.6 (160%)
    const targetZoom = Math.max(0.02, Math.min(optimalZoom, 1.6));

    // Center the cartridge horizontally and vertically in viewport
    const scaledLen = totalLenInches * 260 * targetZoom;
    const modelCenterX = originX + scaledLen / 2;
    const targetPanX = clientWidth / 2 - modelCenterX;
    const targetPanY = clientHeight / 2 - centerY;

    setZoom(targetZoom);
    setPan({ x: targetPanX, y: targetPanY });
  }, [cartridge, ghostCartridge, rotation, originX, centerY]);

  const fitToViewRef = useRef(handleFitToView);
  fitToViewRef.current = handleFitToView;

  // Automatically fit cartridge only when switching preset/scale/orientation (not during slider/popover edits)
  useEffect(() => {
    if (!isOneToOne) {
      fitToViewRef.current();
    }
  }, [cartridge.id, isOneToOne, rotation]);

  // Window resize, global 'F' (fit to screen) and 'R' (rotate 90°) listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;
      if (e.key === 'f' || e.key === 'F') {
        handleFitToView();
      }
      if (e.key === 'r' || e.key === 'R') {
        if (!e.metaKey && !e.ctrlKey) {
          handleRotateClockwise();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFitToView, handleRotateClockwise]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Smooth pointer-centered wheel zooming down to 2% (0.02) up to 800% (8.0)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    const oldZoom = zoom;
    const newZoom = Math.min(8.0, Math.max(0.02, oldZoom * factor));

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const zoomRatio = newZoom / oldZoom;
      const newPanX = mouseX - originX - (mouseX - pan.x - originX) * zoomRatio;
      const newPanY = mouseY - centerY - (mouseY - pan.y - centerY) * zoomRatio;
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    } else {
      setZoom(newZoom);
    }
  };

  const handleZoomIn = () => {
    if (!containerRef.current) {
      setZoom((z) => Math.min(8.0, z * 1.25));
      return;
    }
    const { clientWidth, clientHeight } = containerRef.current;
    const centerScreenX = clientWidth / 2;
    const centerScreenY = clientHeight / 2;
    const oldZoom = zoom;
    const newZoom = Math.min(8.0, oldZoom * 1.25);
    const zoomRatio = newZoom / oldZoom;
    const newPanX = centerScreenX - originX - (centerScreenX - pan.x - originX) * zoomRatio;
    const newPanY = centerScreenY - centerY - (centerScreenY - pan.y - centerY) * zoomRatio;
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleZoomOut = () => {
    if (!containerRef.current) {
      setZoom((z) => Math.max(0.02, z / 1.25));
      return;
    }
    const { clientWidth, clientHeight } = containerRef.current;
    const centerScreenX = clientWidth / 2;
    const centerScreenY = clientHeight / 2;
    const oldZoom = zoom;
    const newZoom = Math.max(0.02, oldZoom / 1.25);
    const zoomRatio = newZoom / oldZoom;
    const newPanX = centerScreenX - originX - (centerScreenX - pan.x - originX) * zoomRatio;
    const newPanY = centerScreenY - centerY - (centerScreenY - pan.y - centerY) * zoomRatio;
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const { rRim, outerBottomPath, outerClosedPath, outerCutawayClosedPath } = useMemo(() => {
    const steps = 100;
    const dz = cartridge.case_length / steps;
    const outerPts: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const z = i * dz;
      outerPts.push([originX + z * scale, getOuterRadiusAt(cartridge, z) * scale]);
    }
    const rimRadius = getOuterRadiusAt(cartridge, 0) * scale;
    const topPath =
      `M ${originX} ${centerY} L ${originX} ${centerY - rimRadius}` +
      outerPts.map(([px, r]) => ` L ${px} ${centerY - r}`).join('');
    const bottomPath =
      `M ${originX} ${centerY} L ${originX} ${centerY + rimRadius}` +
      outerPts.map(([px, r]) => ` L ${px} ${centerY + r}`).join('');
    const closedPath = buildClosedSvgContour(
      outerPts,
      (px, signedR) => `${px} ${centerY + signedR}`
    );
    const cutawayClosedPath =
      topPath +
      ` L ${originX + cartridge.case_length * scale} ${centerY - (cartridge.neck_diameter_mouth / 2 - cartridge.neck_wall_thickness) * scale}` +
      ` L ${originX + cartridge.case_length * scale} ${centerY + (cartridge.neck_diameter_mouth / 2 - cartridge.neck_wall_thickness) * scale}` +
      [...outerPts].reverse().map(([px, r]) => ` L ${px} ${centerY + r}`).join('') +
      ` L ${originX} ${centerY + rimRadius} Z`;

    return {
      rRim: rimRadius,
      outerBottomPath: bottomPath,
      outerClosedPath: closedPath,
      outerCutawayClosedPath: cutawayClosedPath,
    };
  }, [cartridge, originX, centerY, scale]);

  const zMouth = originX + cartridge.case_length * scale;

  const needsInnerPaths =
    activeDrawingMode === 'cutaway' ||
    activeDrawingMode === 'half_section' ||
    activeDrawingMode === 'wireframe';

  const { innerTopPath, innerBottomPath, innerClosedPath, innerHalfSectionPath, rWeb } = useMemo(() => {
    if (!needsInnerPaths) {
      return {
        innerTopPath: '',
        innerBottomPath: '',
        innerClosedPath: '',
        innerHalfSectionPath: '',
        rWeb: 0,
      };
    }
    const steps = 100;
    const innerPts: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const z = cartridge.web_thickness + (i / steps) * (cartridge.case_length - cartridge.web_thickness);
      innerPts.push([originX + z * scale, getInnerRadiusAt(cartridge, z) * scale]);
    }
    const zWeb = originX + cartridge.web_thickness * scale;
    const webRadius = getInnerRadiusAt(cartridge, cartridge.web_thickness) * scale;
    const topSegs = innerPts.map(([px, r]) => ` L ${px} ${centerY - r}`).join('');
    const topPath = `M ${zWeb} ${centerY - webRadius}` + topSegs;
    const bottomPath = `M ${zWeb} ${centerY + webRadius}` + innerPts.map(([px, r]) => ` L ${px} ${centerY + r}`).join('');
    const closedPath = buildClosedSvgContour(
      innerPts,
      (px, signedR) => `${px} ${centerY + signedR}`
    );
    const halfSectionPath = `M ${zWeb} ${centerY} L ${zWeb} ${centerY - webRadius}${topSegs} L ${zMouth} ${centerY} Z`;

    return {
      innerTopPath: topPath,
      innerBottomPath: bottomPath,
      innerClosedPath: closedPath,
      innerHalfSectionPath: halfSectionPath,
      rWeb: webRadius,
    };
  }, [needsInnerPaths, cartridge, originX, centerY, scale, zMouth]);

  const zChamberEnd = originX + (reamer.chamber_length + reamer.freebore_length + 0.12) * scale;
  const zChamberMouth = originX + reamer.chamber_length * scale;
  const zChamberFreeboreEnd = originX + (reamer.chamber_length + reamer.freebore_length) * scale;

  const needsChamber =
    activeShowChamber || activeDrawingMode === 'chamber_fit' || activeTolerance === 'dual_envelope';

  const { chamberTopPath, chamberBottomPath, chamberTopHatchPath, chamberBottomHatchPath } = useMemo(() => {
    if (!needsChamber) {
      return {
        chamberTopPath: '',
        chamberBottomPath: '',
        chamberTopHatchPath: '',
        chamberBottomHatchPath: '',
      };
    }
    const chSteps = 80;
    const chMaxZ = reamer.chamber_length + reamer.freebore_length + 0.12;
    const chDz = chMaxZ / chSteps;
    const topPts: string[] = [];
    const botPts: string[] = [];
    for (let i = 0; i <= chSteps; i++) {
      const z = i * chDz;
      const r = getChamberRadiusAt(cartridge, z) * scale;
      const px = originX + z * scale;
      topPts.push(`L ${px} ${centerY - r}`);
      botPts.push(`L ${px} ${centerY + r}`);
    }
    const topPath = `M ${originX} ${centerY - (reamer.chamber_rim_dia / 2) * scale} ${topPts.join(' ')}`;
    const bottomPath = `M ${originX} ${centerY + (reamer.chamber_rim_dia / 2) * scale} ${botPts.join(' ')}`;

    const topHatch =
      `M ${originX - 20} ${centerY - (reamer.chamber_rim_dia / 2 + 0.4) * scale}` +
      ` L ${zChamberEnd + 40} ${centerY - (reamer.chamber_rim_dia / 2 + 0.4) * scale}` +
      ` L ${zChamberEnd + 40} ${centerY - (reamer.pilot_diameter / 2) * scale}` +
      ` L ${zChamberEnd} ${centerY - (reamer.pilot_diameter / 2) * scale}` +
      ` ${[...topPts].reverse().join(' ')}` +
      ` L ${originX - 20} ${centerY - (reamer.chamber_rim_dia / 2) * scale} Z`;

    const botHatch =
      `M ${originX - 20} ${centerY + (reamer.chamber_rim_dia / 2 + 0.4) * scale}` +
      ` L ${zChamberEnd + 40} ${centerY + (reamer.chamber_rim_dia / 2 + 0.4) * scale}` +
      ` L ${zChamberEnd + 40} ${centerY + (reamer.pilot_diameter / 2) * scale}` +
      ` L ${zChamberEnd} ${centerY + (reamer.pilot_diameter / 2) * scale}` +
      ` ${[...botPts].reverse().join(' ')}` +
      ` L ${originX - 20} ${centerY + (reamer.chamber_rim_dia / 2) * scale} Z`;

    return {
      chamberTopPath: topPath,
      chamberBottomPath: bottomPath,
      chamberTopHatchPath: topHatch,
      chamberBottomHatchPath: botHatch,
    };
  }, [needsChamber, cartridge, reamer, originX, centerY, scale, zChamberEnd]);

  const zBulletTip = originX + cartridge.coal * scale;
  const rBullet = (cartridge.bullet_diameter / 2) * scale;

  const {
    bulletClosedPath,
    bulletTopHalfPath,
    bulletBottomHalfPath,
    bulletWireSeatedPath,
    bulletWireExposedPath,
  } = useMemo(() => {
    const bulletLen = Math.max(0.05, cartridge.bullet_length);
    const zBaseIn = cartridge.coal - bulletLen;
    const steps = 60;
    const pts: [number, number][] = [];
    const seatedPts: [number, number][] = [];
    const exposedPts: [number, number][] = [];

    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * bulletLen;
      const zIn = zBaseIn + x;
      const px = originX + zIn * scale;
      const r = getBulletRadiusAt(cartridge, x) * scale;
      pts.push([px, r]);
      if (zIn <= cartridge.case_length + 1e-5) {
        seatedPts.push([px, r]);
      }
      if (zIn >= cartridge.case_length - 1e-5) {
        exposedPts.push([px, r]);
      }
    }

    const closedPath = buildClosedSvgContour(
      pts,
      (px, signedR) => `${px} ${centerY + signedR}`
    );

    const topSegs = pts.map(([px, r]) => `L ${px} ${centerY - r}`).join(' ');
    const topHalfPath = `M ${pts[0][0]} ${centerY} ${topSegs} L ${pts[pts.length - 1][0]} ${centerY} Z`;

    const botRevSegs = [...pts].reverse().map(([px, r]) => `L ${px} ${centerY + r}`).join(' ');
    const bottomHalfPath = `M ${pts[0][0]} ${centerY} L ${pts[pts.length - 1][0]} ${centerY} ${botRevSegs} Z`;

    let wireSeated = '';
    if (seatedPts.length >= 2) {
      const sTop = `M ${seatedPts[0][0]} ${centerY - seatedPts[0][1]} ` + seatedPts.slice(1).map(([px, r]) => `L ${px} ${centerY - r}`).join(' ');
      const sBot = `M ${seatedPts[0][0]} ${centerY + seatedPts[0][1]} ` + seatedPts.slice(1).map(([px, r]) => `L ${px} ${centerY + r}`).join(' ');
      const sBase = `M ${seatedPts[0][0]} ${centerY - seatedPts[0][1]} L ${seatedPts[0][0]} ${centerY + seatedPts[0][1]}`;
      wireSeated = `${sTop} ${sBot} ${sBase}`;
    }

    let wireExposed = '';
    if (exposedPts.length >= 2) {
      const eTop = `M ${exposedPts[0][0]} ${centerY - exposedPts[0][1]} ` + exposedPts.slice(1).map(([px, r]) => `L ${px} ${centerY - r}`).join(' ');
      const eBot = `M ${exposedPts[0][0]} ${centerY + exposedPts[0][1]} ` + exposedPts.slice(1).map(([px, r]) => `L ${px} ${centerY + r}`).join(' ');
      wireExposed = `${eTop} ${eBot}`;
    }

    return {
      bulletClosedPath: closedPath,
      bulletTopHalfPath: topHalfPath,
      bulletBottomHalfPath: bottomHalfPath,
      bulletWireSeatedPath: wireSeated,
      bulletWireExposedPath: wireExposed,
    };
  }, [cartridge, originX, centerY, scale]);

  const effectiveShoulderLen = effectiveShoulderLength(cartridge);
  const pxRim = originX + cartridge.rim_thickness * scale;
  const pxExt = originX + (cartridge.rim_thickness + cartridge.extractor_width) * scale;
  const pxShoulderStart = originX + cartridge.body_length * scale;
  const pxShoulderEnd = originX + (cartridge.body_length + effectiveShoulderLen) * scale;
  const pxMouth = zMouth;
  const pxTip = zBulletTip;

  const rotCenterX = originX + (pxTip - originX) / 2;

  const handleDimensionClick = (
    e: React.MouseEvent,
    key: keyof CartridgeSpec,
    label: string,
    symbol: string,
    svgX: number,
    svgY: number,
    isAngle = false
  ) => {
    e.stopPropagation();
    const currentInches = cartridge[key] as number;
    const initialDisplay = isAngle
      ? currentInches
      : isMetric
      ? +(currentInches * 25.4).toFixed(3)
      : +currentInches.toFixed(4);

    const rad = (rotation * Math.PI) / 180;
    const dx = svgX - rotCenterX;
    const dy = svgY - centerY;
    const rotX = rotCenterX + dx * Math.cos(rad) - dy * Math.sin(rad);
    const rotY = centerY + dx * Math.sin(rad) + dy * Math.cos(rad);

    setEditingDim({
      key,
      label,
      symbol,
      initialValInches: currentInches,
      initialSnapshot: { ...cartridge },
      displayVal: initialDisplay,
      isAngle,
      svgX: rotX,
      svgY: rotY,
      clientX: e.clientX,
      clientY: e.clientY,
      history: [initialDisplay],
    });
  };

  const { ghostClosedPath, ghostBulletPath } = useMemo(() => {
    if (!ghostCartridge) {
      return { ghostClosedPath: '', ghostBulletPath: '' };
    }
    let ghostZHead = originX;
    if (ghostAlign === 'mouth') {
      ghostZHead = originX + (cartridge.case_length - ghostCartridge.case_length) * scale;
    } else if (ghostAlign === 'shoulder') {
      ghostZHead = originX + (cartridge.body_length - ghostCartridge.body_length) * scale;
    }

    const gSteps = 100;
    const gDz = ghostCartridge.case_length / gSteps;
    const ghostPts: [number, number][] = [];
    for (let i = 0; i <= gSteps; i++) {
      const z = i * gDz;
      ghostPts.push([ghostZHead + z * scale, getOuterRadiusAt(ghostCartridge, z) * scale]);
    }
    const closedPath = buildClosedSvgContour(
      ghostPts,
      (px, signedR) => `${px} ${centerY + signedR}`
    );

    const ghostZMouth = ghostZHead + ghostCartridge.case_length * scale;
    const ghostZTip = ghostZHead + ghostCartridge.coal * scale;
    const gRBullet = (ghostCartridge.bullet_diameter / 2) * scale;
    const bulletPath = `M ${ghostZMouth} ${centerY - gRBullet} L ${ghostZTip} ${centerY} L ${ghostZMouth} ${centerY + gRBullet} Z`;

    return { ghostClosedPath: closedPath, ghostBulletPath: bulletPath };
  }, [ghostCartridge, ghostAlign, cartridge.case_length, cartridge.body_length, originX, centerY, scale]);

  const hasCenterfirePrimer = cartridge.rim_type !== 'rimfire';

  // Helper to render interactive clickable dimension badge on canvas
  const renderDimensionBadge = (
    svgX: number,
    svgY: number,
    text: string,
    key: keyof CartridgeSpec,
    label: string,
    symbol: string,
    color: string = 'var(--cad-cyan)',
    isAngle = false,
    textAnchor: 'start' | 'middle' | 'end' = 'middle'
  ) => {
    const isHovered = hoveredDim === key;
    const isEditing = editingDim?.key === key;

    const pillWidth = Math.max(68, text.length * 8 + 16);
    const pillX = textAnchor === 'middle' ? svgX - pillWidth / 2 : textAnchor === 'end' ? svgX - pillWidth : svgX;

    return (
      <g
        onClick={(e) => handleDimensionClick(e, key, label, symbol, svgX, svgY, isAngle)}
        onMouseEnter={() => setHoveredDim(key)}
        onMouseLeave={() => setHoveredDim(null)}
        style={{ cursor: 'pointer', pointerEvents: 'all' }}
      >
        <rect
          x={pillX}
          y={svgY - 11}
          width={pillWidth}
          height={20}
          rx={4}
          ry={4}
          fill={isEditing ? 'rgba(0, 210, 255, 0.3)' : isHovered ? 'rgba(22, 31, 48, 0.96)' : 'rgba(9, 13, 20, 0.85)'}
          stroke={isEditing ? 'var(--cad-cyan)' : isHovered ? color : 'rgba(38, 51, 74, 0.7)'}
          strokeWidth={isHovered || isEditing ? 1.5 : 1}
          style={{
            filter: isHovered ? 'drop-shadow(0 0 6px rgba(0, 210, 255, 0.6))' : undefined,
            transition: 'all 0.15s ease',
          }}
        />
        <text
          x={textAnchor === 'middle' ? svgX : textAnchor === 'end' ? svgX - pillWidth / 2 : svgX + pillWidth / 2}
          y={svgY + 3}
          fill={isHovered || isEditing ? '#fff' : color}
          fontSize="11"
          fontWeight={isHovered || isEditing ? 700 : 600}
          fontFamily="var(--font-mono)"
          textAnchor="middle"
        >
          {text}
        </text>
      </g>
    );
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onDoubleClick={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'svg') {
          handleFitToView();
        }
      }}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#090d14',
        backgroundImage: `
          linear-gradient(rgba(38, 51, 74, 0.25) 1px, transparent 1px),
          linear-gradient(90deg, rgba(38, 51, 74, 0.25) 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <BlueprintToolbar
        activeDrawingMode={activeDrawingMode}
        onSetDrawingMode={handleSetDrawingMode}
        activeShowChamber={activeShowChamber}
        onToggleChamber={handleToggleChamber}
        activeShowDimensions={activeShowDimensions}
        onToggleDimensions={handleToggleDimensions}
        activeShowBullet={activeShowBullet}
        onToggleBullet={handleToggleBullet}
        activeShowGrid={activeShowGrid}
        onToggleGrid={handleToggleGrid}
        activeStandard={activeStandard}
        onSetStandard={handleSetStandard}
        activeTolerance={activeTolerance}
        onSetTolerance={handleSetTolerance}
      />

      {/* CAD Canvas Navigation & Rotate Overlay (Bottom-Right) */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(18, 23, 33, 0.90)',
        WebkitBackdropFilter: 'blur(8px)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        padding: '4px 8px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
      }}>
        <button
          onClick={handleZoomIn}
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={handleZoomOut}
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
          title="Zoom Out (Down to 2%)"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={handleFitToView}
          style={{ background: 'transparent', border: 'none', color: 'var(--cad-cyan)', cursor: 'pointer' }}
          title="Fit to Screen (Auto-Frame Extents - 'F' Key / Double-Click)"
        >
          <Maximize2 size={15} />
        </button>
        <button
          onClick={handleResetView}
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
          title="Reset Zoom to 100%"
        >
          <RotateCcw size={15} />
        </button>
        <span
          onClick={handleFitToView}
          style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--cad-cyan)',
            marginLeft: '6px',
            cursor: 'pointer',
            userSelect: 'none'
          }}
          title="Click to Fit to Screen"
        >
          {(zoom * 100).toFixed(0)}%
        </span>

        {/* Rotate Button */}
        <div style={{ width: '1px', height: '14px', background: 'var(--border-color)', margin: '0 2px' }} />
        <button
          id="btn-rotate-cartridge"
          onClick={handleRotateClockwise}
          style={{
            background: rotation !== 0 ? 'rgba(0, 210, 255, 0.15)' : 'transparent',
            border: `1px solid ${rotation !== 0 ? 'var(--cad-cyan)' : 'transparent'}`,
            borderRadius: '4px',
            color: rotation !== 0 ? 'var(--cad-cyan)' : '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            padding: '2px 5px',
            fontSize: '10.5px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600
          }}
          title="Rotate Cartridge 90° Clockwise (R)"
        >
          <RotateCw size={13} />
          <span>{rotation}°</span>
        </button>

        {/* Ghost Compare Button */}
        {onOpenCompare && (
          <button
            id="btn-open-compare"
            onClick={onOpenCompare}
            style={{
              background: ghostCartridge ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
              border: `1px solid ${ghostCartridge ? '#f97316' : 'transparent'}`,
              borderRadius: '4px',
              color: ghostCartridge ? '#f97316' : '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px',
              fontSize: '10.5px',
              fontWeight: 600
            }}
            title={ghostCartridge ? `Comparing with ${ghostCartridge.name}. Click to change.` : "Compare with another cartridge..."}
          >
            <Layers size={13} />
            <span>{ghostCartridge ? 'Comparing' : 'Compare'}</span>
          </button>
        )}
      </div>

      {/* Floating Chamber Clearance & Fit Telemetry HUD */}
      {(activeDrawingMode === 'chamber_fit' || activeShowChamber) && (() => {
        const dNeck = collision.neck_clearance_in;
        const dBase = collision.base_clearance_in;
        const jumpIn = collision.jump_to_lands_in;
        const headspaceClearance = reamer.headspace_clearance;
        const hasErrors = collision.has_interference;
        const hasWarnings = !hasErrors && collision.issues.length > 0;
        const hudBorderColor = hasErrors ? '#f85149' : hasWarnings ? '#f59e0b' : '#eab308';
        const statusColor = hasErrors ? '#f87171' : hasWarnings ? '#fbbf24' : '#4ade80';
        const statusLabel = hasErrors ? 'INTERFERENCE' : hasWarnings ? 'WARN' : 'FIT OK';
        const issueTooltip = collision.issues.length > 0
          ? collision.issues.map((i) => `[${i.severity.toUpperCase()} - ${i.zone}] ${i.message}`).join('\n')
          : 'No radial or throat interference detected across 200 stations.';
        const fmtSigned = (v: number, prec = 4) => `${v >= 0 ? '+' : '-'}${fmt(Math.abs(v), prec)}`;

        if (isChamberHudDismissed) {
          return (
            <button
              id="btn-restore-chamber-hud"
              onClick={() => setIsChamberHudDismissed(false)}
              title="Show Chamber Fit & Clearance Telemetry"
              style={{
                position: 'absolute',
                bottom: '68px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 22,
                background: 'rgba(15, 20, 31, 0.92)',
                WebkitBackdropFilter: 'blur(8px)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${hudBorderColor}`,
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                color: hudBorderColor,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                transition: 'all 0.12s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(234, 179, 8, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(15, 20, 31, 0.92)';
              }}
            >
              <Shield size={12} color={hudBorderColor} />
              <span>Chamber Fit ({statusLabel})</span>
            </button>
          );
        }

        return (
          <div
            id="chamber-fit-hud"
            style={{
              position: 'absolute',
              left: chamberHudPos ? `${chamberHudPos.x}px` : '50%',
              top: chamberHudPos ? `${chamberHudPos.y}px` : 'auto',
              bottom: chamberHudPos ? 'auto' : '68px',
              transform: chamberHudPos ? 'none' : 'translateX(-50%)',
              zIndex: 24,
              background: 'rgba(15, 20, 31, 0.96)',
              WebkitBackdropFilter: 'blur(14px)',
              backdropFilter: 'blur(14px)',
              border: `1.5px solid ${hudBorderColor}`,
              borderRadius: '8px',
              padding: isChamberHudCollapsed ? '4px 10px' : '6px 14px',
              boxShadow: hasErrors
                ? '0 8px 30px rgba(0, 0, 0, 0.75), 0 0 18px rgba(248, 81, 73, 0.35)'
                : '0 8px 30px rgba(0, 0, 0, 0.7), 0 0 16px rgba(234, 179, 8, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '11px',
              color: '#fff',
              userSelect: 'none',
              maxWidth: '92vw',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: isChamberHudCollapsed ? '8px' : '11px' }}>
              {/* Drag Handle */}
              <div
                onMouseDown={handleChamberHudMouseDown}
                onDoubleClick={() => setChamberHudPos(null)}
                title="Drag to reposition Chamber Fit HUD (Double-click to reset position)"
                style={{
                  cursor: isDraggingChamberHud ? 'grabbing' : 'grab',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px 0',
                }}
              >
                <GripVertical size={13} />
              </div>

              {/* Title & Collision Status Pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title={issueTooltip}>
                {hasErrors || hasWarnings ? (
                  <AlertTriangle size={14} color={statusColor} />
                ) : (
                  <CheckCircle2 size={14} color={statusColor} />
                )}
                <span style={{ fontWeight: 700, color: '#eab308' }}>Chamber</span>
                <span style={{
                  fontSize: '9.5px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  color: statusColor,
                  background: hasErrors ? 'rgba(248, 81, 73, 0.18)' : hasWarnings ? 'rgba(245, 158, 11, 0.18)' : 'rgba(74, 222, 128, 0.15)',
                  border: `1px solid ${statusColor}55`,
                }}>
                  {statusLabel}
                </span>
              </div>

              <div style={{ width: '1px', height: '14px', background: 'rgba(234, 179, 8, 0.3)' }} />

              {/* Telemetry Numbers */}
              {isChamberHudCollapsed ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '10.5px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>ΔNeck:</span>
                  <span style={{ color: dNeck >= 0.002 ? '#4ade80' : dNeck >= 0 ? '#fbbf24' : '#f87171', fontWeight: 700 }}>{fmtSigned(dNeck, 4)}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Jump:</span>
                  <span style={{ color: jumpIn >= 0 ? '#38bdf8' : '#f87171', fontWeight: 700 }}>
                    {jumpIn >= 0 ? fmtSigned(jumpIn, 3) : `JAM ${fmtSigned(jumpIn, 3)}`}
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>ΔNeck: </span>
                    <span style={{ color: dNeck >= 0.002 ? '#4ade80' : dNeck >= 0 ? '#fbbf24' : '#f87171', fontWeight: 700 }}>
                      {fmtSigned(dNeck, 4)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>ΔBase: </span>
                    <span style={{ color: dBase >= 0.001 ? '#4ade80' : dBase >= 0 ? '#fbbf24' : '#f87171', fontWeight: 700 }}>
                      {fmtSigned(dBase, 4)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>HS: </span>
                    <span style={{ color: '#4ade80', fontWeight: 700 }}>
                      +{fmt(headspaceClearance, 4)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Jump: </span>
                    <span style={{ color: jumpIn >= 0.015 ? '#38bdf8' : jumpIn >= 0 ? '#fbbf24' : '#f87171', fontWeight: 700 }}>
                      {jumpIn >= 0 ? fmtSigned(jumpIn, 3) : `JAM ${fmtSigned(jumpIn, 3)}`}
                    </span>
                  </div>
                  <div title={`Cartridge Base to Ogive (CBTO): ${fmt(collision.cbto_in, 3)}`}>
                    <span style={{ color: 'var(--text-muted)' }}>Jam COAL: </span>
                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                      {fmt(collision.jam_coal_in, 3)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>CBTO: </span>
                    <span style={{ color: '#cbd5e1', fontWeight: 600 }}>
                      {fmt(collision.cbto_in, 3)}
                    </span>
                  </div>
                </div>
              )}

              <div style={{ width: '1px', height: '14px', background: 'rgba(234, 179, 8, 0.3)' }} />

              {/* Collapse/Expand Toggle */}
              <button
                onClick={() => {
                  setIsChamberHudCollapsed((prev) => {
                    const next = !prev;
                    localStorage.setItem('wildcat_chamber_hud_collapsed', String(next));
                    return next;
                  });
                }}
                title={isChamberHudCollapsed ? "Expand Telemetry" : "Collapse Telemetry"}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '3px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                {isChamberHudCollapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {/* Reset to Default Position */}
              {chamberHudPos && (
                <button
                  type="button"
                  onClick={() => setChamberHudPos(null)}
                  title="Reset HUD to default position"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '3px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#eab308')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <Crosshair size={12} />
                </button>
              )}

              {/* Dismiss Button */}
              <button
                onClick={() => setIsChamberHudDismissed(true)}
                title="Close Chamber Fit HUD"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '3px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <X size={13} />
              </button>
            </div>

            {!isChamberHudCollapsed && collision.issues.length > 0 && (
              <div
                title={issueTooltip}
                style={{
                  borderTop: `1px solid ${statusColor}33`,
                  paddingTop: '3px',
                  fontSize: '10px',
                  color: statusColor,
                  fontFamily: 'var(--font-mono)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{collision.issues[0].message}</span>
                {collision.issues.length > 1 && (
                  <span style={{ color: 'var(--text-muted)' }}>
                    (+{collision.issues.length - 1} more)
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Floating Ghost Comparison Delta HUD */}
      {ghostCartridge && ghostVol && (() => {
        const capDiff = activeVol.overflow_capacity_grains_h2o - ghostVol.overflow_capacity_grains_h2o;
        const lenDiff = cartridge.case_length - ghostCartridge.case_length;
        const coalDiff = cartridge.coal - ghostCartridge.coal;
        const isChamberActive = (activeDrawingMode === 'chamber_fit' || activeShowChamber) && !isChamberHudDismissed && !chamberHudPos;

        return (
          <div
            id="ghost-comparison-hud"
            style={{
              position: 'absolute',
              bottom: isChamberActive ? '116px' : '68px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 25,
              background: 'rgba(15, 20, 31, 0.96)',
              WebkitBackdropFilter: 'blur(12px)',
              backdropFilter: 'blur(12px)',
              border: '1.5px solid #f97316',
              borderRadius: '8px',
              padding: '6px 14px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7), 0 0 16px rgba(249, 115, 22, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              fontSize: '11px',
              color: '#fff'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={15} color="#f97316" />
              <div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700 }}>
                  COMPARING TO
                </div>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#f97316' }}>
                  {ghostCartridge.name}
                </div>
              </div>
            </div>

            {/* Alignment Selector */}
            {onChangeGhostAlign && (
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary)', borderRadius: '4px', padding: '2px', border: '1px solid var(--border-color)' }}>
                {(['head', 'shoulder', 'mouth'] as const).map((alignMode) => (
                  <button
                    key={alignMode}
                    onClick={() => onChangeGhostAlign(alignMode)}
                    style={{
                      background: ghostAlign === alignMode ? '#f97316' : 'transparent',
                      color: ghostAlign === alignMode ? '#000' : 'var(--text-secondary)',
                      border: 'none',
                      borderRadius: '3px',
                      padding: '2px 7px',
                      fontSize: '10px',
                      fontWeight: ghostAlign === alignMode ? 700 : 500,
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {alignMode === 'head' ? 'Bolt (z=0)' : alignMode}
                  </button>
                ))}
              </div>
            )}

            {/* Telemetry Dials */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-mono)', fontSize: '10.5px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Δ Cap: </span>
                <span style={{ color: capDiff >= 0 ? '#4ade80' : '#f87171', fontWeight: 700 }}>
                  {capDiff >= 0 ? `+${capDiff.toFixed(1)}` : capDiff.toFixed(1)} gr
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Δ L₃: </span>
                <span style={{ color: lenDiff >= 0 ? '#4ade80' : '#f87171', fontWeight: 700 }}>
                  {lenDiff >= 0 ? `+${lenDiff.toFixed(3)}` : lenDiff.toFixed(3)}"
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Δ COAL: </span>
                <span style={{ color: coalDiff >= 0 ? '#4ade80' : '#f87171', fontWeight: 700 }}>
                  {coalDiff >= 0 ? `+${coalDiff.toFixed(3)}` : coalDiff.toFixed(3)}"
                </span>
              </div>
            </div>

            {/* Dismiss */}
            {onCloseGhost && (
              <button
                id="btn-close-ghost-comparison"
                onClick={onCloseGhost}
                title="Dismiss Ghost Comparison"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <X size={15} />
              </button>
            )}
          </div>
        );
      })()}

      {/* Interactive Helper Banner (Dismissible) */}
      {!isHelperDismissed && (
        <div
          id="canvas-helper-banner"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 10,
            background: 'rgba(18, 23, 33, 0.88)',
            WebkitBackdropFilter: 'blur(8px)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '5px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
        >
          <Edit3 size={12} color="var(--cad-cyan)" />
          <span>Click any <strong style={{ color: 'var(--cad-cyan)' }}>measurement badge</strong> to edit</span>
          <button
            onClick={() => {
              setIsHelperDismissed(true);
              localStorage.setItem('wildcat_helper_dismissed', 'true');
            }}
            title="Dismiss tip"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '1px 3px',
              marginLeft: '4px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '3px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* 1:1 Scale Physical Engineering Ruler & Calibration Overlay */}
      {isOneToOne && (
        <>
          {/* Calibrated Physical Scale Bar Overlay along bottom */}
          <div
            style={{
              position: 'absolute',
              bottom: '90px',
              left: '16px',
              zIndex: 9,
              pointerEvents: 'none',
              background: 'rgba(10, 14, 22, 0.88)',
              WebkitBackdropFilter: 'blur(8px)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(0, 240, 255, 0.35)',
              borderRadius: '6px',
              padding: '8px 12px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
              userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '10.5px', color: 'var(--cad-cyan)', fontWeight: 700, letterSpacing: '0.05em' }}>
                PHYSICAL 1:1 CALIBRATED RULER ({ppi.toFixed(1)} PPI)
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Hold physical cartridge or caliper against screen</span>
            </div>
            <div style={{ position: 'relative', height: '28px', width: `${Math.min(4.0 * ppi, window.innerWidth - 60)}px` }}>
              {/* Inches ruler markings */}
              {Array.from({ length: 4 * 16 + 1 }).map((_, idx) => {
                const x = (idx / 16) * ppi;
                const isInch = idx % 16 === 0;
                const isHalf = idx % 8 === 0 && !isInch;
                const isQuarter = idx % 4 === 0 && !isInch && !isHalf;
                const height = isInch ? 18 : isHalf ? 13 : isQuarter ? 8 : 5;
                const inchNum = idx / 16;
                return (
                  <div
                    key={idx}
                    style={{
                      position: 'absolute',
                      left: `${x}px`,
                      top: 0,
                      width: isInch ? '1.5px' : '1px',
                      height: `${height}px`,
                      background: isInch ? 'var(--cad-cyan)' : 'rgba(0, 240, 255, 0.55)',
                    }}
                  >
                    {isInch && inchNum > 0 && (
                      <span style={{ position: 'absolute', top: '19px', left: '-4px', fontSize: '9.5px', fontFamily: 'monospace', color: '#fff', fontWeight: 700 }}>
                        {inchNum}"
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Floating 1:1 Scale Control Pill */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            zIndex: 10,
            background: 'rgba(18, 23, 33, 0.94)',
            WebkitBackdropFilter: 'blur(8px)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--cad-cyan)',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '12px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '6px' }}>
              <div style={{ color: 'var(--cad-cyan)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Crosshair size={14} /> 1:1 True-Scale Mode
              </div>
              {onOpenCalibration && (
                <button
                  onClick={onOpenCalibration}
                  style={{
                    background: 'rgba(0, 240, 255, 0.15)',
                    border: '1px solid rgba(0, 240, 255, 0.4)',
                    color: 'var(--cad-cyan)',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Calibrate Display...
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: `${ppi}px`, height: '5px', background: 'var(--cad-cyan)', borderRadius: '3px' }} />
              <input
                type="range"
                min="70"
                max="240"
                value={ppi}
                onChange={(e) => onPpiChange(Number(e.target.value))}
                style={{ width: '100px', cursor: 'pointer', accentColor: 'var(--cad-cyan)' }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#fff' }}>{ppi.toFixed(1)} PPI</span>
            </div>
          </div>
        </>
      )}

      {editingDim && (
        <DimensionEditorPopover
          editingDim={editingDim}
          setEditingDim={setEditingDim}
          cartridge={cartridge}
          activeStandard={activeStandard}
          isMetric={isMetric}
          pan={pan}
          currentVol={activeVol}
          reamer={reamer}
          onUpdateCartridge={onUpdateCartridge}
          onClose={closePopover}
        />
      )}

      {/* SVG Canvas */}
      <svg
        style={{
          width: '100%',
          height: '100%',
          transform: `translate(${pan.x}px, ${pan.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.05s ease-out',
        }}
      >
        <defs>
          {/* Arrow Marker */}
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="var(--cad-cyan)" />
          </marker>

          {/* Brass Cutaway Gradient */}
          <linearGradient id="brassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e5be59" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#d4af37" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#997a15" stopOpacity="0.8" />
          </linearGradient>

          {/* Copper Bullet Gradient */}
          <linearGradient id="copperGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f0883e" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#b8581e" stopOpacity="0.9" />
          </linearGradient>

          {/* Powder Hatching Pattern */}
          <pattern id="powderHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(229, 190, 89, 0.25)" strokeWidth="1.5" />
          </pattern>

          {/* Chamber Steel Hatching Pattern */}
          <pattern id="chamberHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(234, 179, 8, 0.25)" strokeWidth="1.2" />
          </pattern>

          {/* CAD Background Grid Pattern */}
          <pattern id="cadGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(38, 51, 74, 0.35)" strokeWidth="0.8" />
            <path d="M 20 0 L 20 40 M 0 20 L 40 20" fill="none" stroke="rgba(38, 51, 74, 0.15)" strokeWidth="0.5" strokeDasharray="2,2" />
          </pattern>

          {/* Little Boy Gunmetal Military Gradient */}
          <linearGradient id="littleBoyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3f4a3c" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#293327" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#1a2219" stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* CAD Coordinate Grid Layer (Static Drafting Table Canvas) */}
        {activeShowGrid && (
          <rect
            x={-5000}
            y={-5000}
            width={10000}
            height={10000}
            fill="url(#cadGrid)"
            pointerEvents="none"
          />
        )}

        {/* Rotatable Assembly Container */}
        <g
          id="cartridge-rotatable-assembly"
          transform={`rotate(${rotation} ${rotCenterX} ${centerY})`}
        >
          {/* Ghost Cartridge Silhouette Overlay */}
          {ghostCartridge && (
            <g id="ghost-cartridge-overlay">
              <path
                d={ghostClosedPath}
                fill="rgba(249, 115, 22, 0.08)"
                stroke="#f97316"
                strokeWidth="1.8"
                strokeDasharray="6,3"
              />
              <path
                d={ghostBulletPath}
                fill="rgba(251, 146, 60, 0.16)"
                stroke="#fb923c"
                strokeWidth="1.8"
                strokeDasharray="4,2"
              />
            </g>
          )}

        {/* Centerline (Dashed) */}
        <line
          x1={originX - 40}
          y1={centerY}
          x2={pxTip + 60}
          y2={centerY}
          stroke="#485466"
          strokeWidth="1.2"
          strokeDasharray="14,4,3,4"
        />

        {cartridge.id === 'little_boy_ordnance' ? (
          <LittleBoySvg
            originX={originX}
            centerY={centerY}
            rRim={rRim}
            scale={scale}
            pxMouth={pxMouth}
            pxTip={pxTip}
            caseLength={cartridge.case_length}
            isCutaway={activeDrawingMode === 'cutaway'}
          />
        ) : (
          <>
            {needsChamber && (
              <g id="chamber-fit-layer">
                {activeDrawingMode === 'chamber_fit' && (
                  <>
                    <path d={chamberTopHatchPath} fill="url(#chamberHatch)" opacity="0.85" />
                    <path d={chamberBottomHatchPath} fill="url(#chamberHatch)" opacity="0.85" />
                  </>
                )}

                {/* Chamber Reamer Profile Outline (Top & Bottom) */}
                <path
                  d={chamberTopPath}
                  fill="none"
                  stroke={activeTolerance === 'dual_envelope' ? 'var(--cad-cyan, #00f0ff)' : '#eab308'}
                  strokeWidth={activeDrawingMode === 'chamber_fit' ? '2' : activeTolerance === 'dual_envelope' ? '2.2' : '1.8'}
                  strokeDasharray={activeDrawingMode === 'chamber_fit' ? 'none' : activeTolerance === 'dual_envelope' ? '5,3' : '6,3'}
                />
                <path
                  d={chamberBottomPath}
                  fill="none"
                  stroke={activeTolerance === 'dual_envelope' ? 'var(--cad-cyan, #00f0ff)' : '#eab308'}
                  strokeWidth={activeDrawingMode === 'chamber_fit' ? '2' : activeTolerance === 'dual_envelope' ? '2.2' : '1.8'}
                  strokeDasharray={activeDrawingMode === 'chamber_fit' ? 'none' : activeTolerance === 'dual_envelope' ? '5,3' : '6,3'}
                />

                {/* Bore & Throat Stopping Milestone Lines */}
                <line
                  x1={zChamberEnd}
                  y1={centerY - (reamer.pilot_diameter / 2) * scale}
                  x2={zChamberEnd}
                  y2={centerY + (reamer.pilot_diameter / 2) * scale}
                  stroke="#eab308"
                  strokeWidth="1.8"
                />
                <line
                  x1={zChamberMouth}
                  y1={centerY - (reamer.chamber_neck_dia / 2) * scale - 12}
                  x2={zChamberMouth}
                  y2={centerY + (reamer.chamber_neck_dia / 2) * scale + 12}
                  stroke="#eab308"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                  opacity="0.75"
                />
                <line
                  x1={zChamberFreeboreEnd}
                  y1={centerY - (reamer.freebore_dia / 2) * scale - 8}
                  x2={zChamberFreeboreEnd}
                  y2={centerY + (reamer.freebore_dia / 2) * scale + 8}
                  stroke="#eab308"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                  opacity="0.65"
                />
              </g>
            )}

            {/* Interactive Bullet Drawing */}
            {activeShowBullet && (
              <g
                id="interactive-cad-bullet"
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDimensionClick(
                    e,
                    'bullet_diameter',
                    'Bullet Projectile & Factory Bullet Models',
                    'G₁',
                    pxTip + 35,
                    centerY
                  );
                }}
                onMouseEnter={() => setIsHoveringBullet(true)}
                onMouseLeave={() => setIsHoveringBullet(false)}
                opacity={activeDrawingMode === 'cutaway' || activeDrawingMode === 'half_section' ? 0.98 : 0.88}
                filter={isHoveringBullet ? 'drop-shadow(0 0 8px rgba(240, 136, 62, 0.9))' : undefined}
              >
                <title>{`Interactive Bullet: ${cartridge.bullet_diameter.toFixed(3)}" (${cartridge.bullet_weight_grains || 0}gr) • COAL: ${cartridge.coal.toFixed(3)}" — Click to select factory bullet models or configure caliber`}</title>
                {activeDrawingMode === 'wireframe' ? (
                  <>
                    {/* Seated shank hidden inside neck */}
                    {bulletWireSeatedPath && (
                      <path
                        d={bulletWireSeatedPath}
                        fill="none"
                        stroke="var(--cad-copper)"
                        strokeWidth="1.4"
                        strokeDasharray="4,2"
                      />
                    )}
                    {/* Exposed ogive / nose */}
                    {bulletWireExposedPath && (
                      <path
                        d={bulletWireExposedPath}
                        fill="none"
                        stroke="var(--cad-copper)"
                        strokeWidth="1.6"
                      />
                    )}
                  </>
                ) : activeDrawingMode === 'half_section' ? (
                  <>
                    {/* Top half bullet: cutaway solid copper */}
                    <path
                      d={bulletTopHalfPath}
                      fill="url(#copperGradient)"
                      stroke="var(--cad-copper)"
                      strokeWidth="1.6"
                    />
                    {/* Bottom half bullet: exterior copper */}
                    <path
                      d={bulletBottomHalfPath}
                      fill="rgba(240, 136, 62, 0.25)"
                      stroke="var(--cad-copper)"
                      strokeWidth="1.6"
                    />
                  </>
                ) : (
                  /* Standard outline / cutaway / chamber_fit bullet */
                  <path
                    d={bulletClosedPath}
                    fill={activeDrawingMode === 'cutaway' ? 'url(#copperGradient)' : 'rgba(240, 136, 62, 0.2)'}
                    stroke="var(--cad-copper)"
                    strokeWidth="1.6"
                  />
                )}
              </g>
            )}

            {/* Floating hover badge when hovering bullet projectile on CAD model */}
            {activeShowBullet && isHoveringBullet && (
              <g pointerEvents="none">
                <rect
                  x={(pxMouth + pxTip) / 2 - 85}
                  y={centerY - rBullet - 26}
                  width={170}
                  height={18}
                  rx={3}
                  fill="rgba(10, 13, 19, 0.95)"
                  stroke="var(--cad-copper)"
                  strokeWidth="0.9"
                />
                <text
                  x={(pxMouth + pxTip) / 2}
                  y={centerY - rBullet - 14}
                  fill="#fff"
                  fontSize="8.5"
                  fontWeight="700"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  Projectile: {cartridge.bullet_diameter.toFixed(3)}" ({cartridge.bullet_weight_grains || 0}gr) • Click
                </text>
              </g>
            )}

            {/* 1. Cutaway Mode: Full Longitudinal Cross-Section */}
            {activeDrawingMode === 'cutaway' && (
              <>
                <path d={innerClosedPath} fill="url(#powderHatch)" />

                <rect
                  x={originX}
                  y={centerY - rRim}
                  width={cartridge.web_thickness * scale}
                  height={rRim * 2}
                  fill="url(#brassGradient)"
                  opacity="0.3"
                />

                {hasCenterfirePrimer && cartridge.primer_pocket_dia > 0 && cartridge.primer_pocket_depth > 0 && (
                  <rect
                    x={originX}
                    y={centerY - (cartridge.primer_pocket_dia / 2) * scale}
                    width={cartridge.primer_pocket_depth * scale}
                    height={cartridge.primer_pocket_dia * scale}
                    fill="#090d14"
                    stroke="var(--cad-cyan)"
                    strokeWidth="1"
                  />
                )}

                {hasCenterfirePrimer && cartridge.flash_hole_dia > 0 && (
                  <rect
                    x={originX + cartridge.primer_pocket_depth * scale}
                    y={centerY - (cartridge.flash_hole_dia / 2) * scale}
                    width={Math.max(0, cartridge.web_thickness - cartridge.primer_pocket_depth) * scale}
                    height={cartridge.flash_hole_dia * scale}
                    fill="#090d14"
                    stroke="var(--cad-cyan)"
                    strokeWidth="1"
                  />
                )}

                <path
                  d={outerCutawayClosedPath}
                  fill="none"
                  stroke="var(--cad-cyan)"
                  strokeWidth="1.8"
                />

                <path d={innerTopPath} fill="none" stroke="#e5be59" strokeWidth="1.4" strokeDasharray="5,2" />
                <path d={innerBottomPath} fill="none" stroke="#e5be59" strokeWidth="1.4" strokeDasharray="5,2" />
              </>
            )}

            {/* 2. Half-Section Mode: Top Half Cutaway / Bottom Half Solid Exterior */}
            {activeDrawingMode === 'half_section' && (
              <>
                <path d={innerHalfSectionPath} fill="url(#powderHatch)" />

                <rect
                  x={originX}
                  y={centerY - rRim}
                  width={cartridge.web_thickness * scale}
                  height={rRim}
                  fill="url(#brassGradient)"
                  opacity="0.35"
                />

                {hasCenterfirePrimer && cartridge.primer_pocket_dia > 0 && cartridge.primer_pocket_depth > 0 && (
                  <rect
                    x={originX}
                    y={centerY - (cartridge.primer_pocket_dia / 2) * scale}
                    width={cartridge.primer_pocket_depth * scale}
                    height={(cartridge.primer_pocket_dia / 2) * scale}
                    fill="#090d14"
                    stroke="var(--cad-cyan)"
                    strokeWidth="1"
                  />
                )}

                {hasCenterfirePrimer && cartridge.flash_hole_dia > 0 && (
                  <rect
                    x={originX + cartridge.primer_pocket_depth * scale}
                    y={centerY - (cartridge.flash_hole_dia / 2) * scale}
                    width={Math.max(0, cartridge.web_thickness - cartridge.primer_pocket_depth) * scale}
                    height={(cartridge.flash_hole_dia / 2) * scale}
                    fill="#090d14"
                    stroke="var(--cad-cyan)"
                    strokeWidth="1"
                  />
                )}

                <path d={innerTopPath} fill="none" stroke="#e5be59" strokeWidth="1.4" strokeDasharray="5,2" />

                <path
                  d={`${outerBottomPath} L ${pxMouth} ${centerY} Z`}
                  fill="rgba(0, 210, 255, 0.05)"
                  stroke="none"
                />

                <path
                  d={outerClosedPath}
                  fill="none"
                  stroke="var(--cad-cyan)"
                  strokeWidth="1.8"
                />
              </>
            )}

            {/* 3. Wireframe Mode: CAD Lines with Hidden Contours */}
            {activeDrawingMode === 'wireframe' && (
              <>
                <path
                  d={outerClosedPath}
                  fill="none"
                  stroke="var(--cad-cyan)"
                  strokeWidth="1.6"
                />

                <path d={innerTopPath} fill="none" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="4,3" opacity="0.85" />
                <path d={innerBottomPath} fill="none" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="4,3" opacity="0.85" />

                <line
                  x1={originX + cartridge.web_thickness * scale}
                  y1={centerY - rWeb}
                  x2={originX + cartridge.web_thickness * scale}
                  y2={centerY + rWeb}
                  stroke="#38bdf8"
                  strokeWidth="1.2"
                  strokeDasharray="4,3"
                  opacity="0.85"
                />

                {hasCenterfirePrimer && cartridge.primer_pocket_dia > 0 && cartridge.primer_pocket_depth > 0 && (
                  <rect
                    x={originX}
                    y={centerY - (cartridge.primer_pocket_dia / 2) * scale}
                    width={cartridge.primer_pocket_depth * scale}
                    height={cartridge.primer_pocket_dia * scale}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1"
                    strokeDasharray="3,2"
                  />
                )}

                {/* Extended Shoulder Construction Lines */}
                {!isStraightWall(cartridge) && (
                  <g opacity="0.4">
                    <line
                      x1={pxShoulderStart - 20}
                      y1={centerY - (cartridge.shoulder_start_diameter / 2) * scale + 5}
                      x2={pxShoulderEnd + 40}
                      y2={centerY - (cartridge.neck_diameter_base / 2) * scale - 10}
                      stroke="var(--cad-brass)"
                      strokeWidth="0.8"
                      strokeDasharray="2,2"
                    />
                    <line
                      x1={pxShoulderStart - 20}
                      y1={centerY + (cartridge.shoulder_start_diameter / 2) * scale - 5}
                      x2={pxShoulderEnd + 40}
                      y2={centerY + (cartridge.neck_diameter_base / 2) * scale + 10}
                      stroke="var(--cad-brass)"
                      strokeWidth="0.8"
                      strokeDasharray="2,2"
                    />
                  </g>
                )}
              </>
            )}

            {/* 4. OUTLINE & CHAMBER_FIT MODES: Crisp Exterior Silhouette */}
            {(activeDrawingMode === 'outline' || activeDrawingMode === 'chamber_fit') && (
              <path
                d={outerClosedPath}
                fill={activeDrawingMode === 'chamber_fit' ? 'rgba(0, 210, 255, 0.08)' : 'rgba(0, 210, 255, 0.04)'}
                stroke="var(--cad-cyan)"
                strokeWidth="1.8"
              />
            )}
          </>
        )}

        {activeShowDimensions && (
            <g id="dimension-callouts-group">
              {/* SAAMI Datum Headspace Line & Circle Overlay */}
              {activeStandard === 'saami' && !isStraightWall(cartridge) && datumHeadspace.datum_length > 0 && (
                <g id="saami-datum-headspace-callout">
                  {/* Horizontal Datum Intersection Lines */}
                  <line
                    x1={originX}
                    y1={centerY - (datumHeadspace.datum_diameter / 2) * scale}
                    x2={originX + datumHeadspace.datum_length * scale}
                    y2={centerY - (datumHeadspace.datum_diameter / 2) * scale}
                    stroke="#3b82f6"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                    opacity="0.85"
                  />
                  <line
                    x1={originX}
                    y1={centerY + (datumHeadspace.datum_diameter / 2) * scale}
                    x2={originX + datumHeadspace.datum_length * scale}
                    y2={centerY + (datumHeadspace.datum_diameter / 2) * scale}
                    stroke="#3b82f6"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                    opacity="0.85"
                  />
                  {/* Vertical Datum Plane Line */}
                  <line
                    x1={originX + datumHeadspace.datum_length * scale}
                    y1={centerY - (datumHeadspace.datum_diameter / 2) * scale - 14}
                    x2={originX + datumHeadspace.datum_length * scale}
                    y2={centerY + (datumHeadspace.datum_diameter / 2) * scale + 14}
                    stroke="#3b82f6"
                    strokeWidth="1.2"
                    strokeDasharray="4,2"
                  />
                  {/* Datum Intersection Points */}
                  <circle
                    cx={originX + datumHeadspace.datum_length * scale}
                    cy={centerY - (datumHeadspace.datum_diameter / 2) * scale}
                    r="3.5"
                    fill="#3b82f6"
                    stroke="#fff"
                    strokeWidth="1"
                  />
                  <circle
                    cx={originX + datumHeadspace.datum_length * scale}
                    cy={centerY + (datumHeadspace.datum_diameter / 2) * scale}
                    r="3.5"
                    fill="#3b82f6"
                    stroke="#fff"
                    strokeWidth="1"
                  />
                  {/* Leader line and Datum Headspace badge */}
                  <line
                    x1={originX}
                    y1={centerY - (datumHeadspace.datum_diameter / 2) * scale - 28}
                    x2={originX + datumHeadspace.datum_length * scale}
                    y2={centerY - (datumHeadspace.datum_diameter / 2) * scale - 28}
                    stroke="#3b82f6"
                    strokeWidth="1.2"
                    markerStart="url(#arrow)"
                    markerEnd="url(#arrow)"
                  />
                  <line
                    x1={originX}
                    y1={centerY - (datumHeadspace.datum_diameter / 2) * scale - 8}
                    x2={originX}
                    y2={centerY - (datumHeadspace.datum_diameter / 2) * scale - 32}
                    stroke="#485466"
                    strokeWidth="0.8"
                  />
                  <line
                    x1={originX + datumHeadspace.datum_length * scale}
                    y1={centerY - (datumHeadspace.datum_diameter / 2) * scale - 8}
                    x2={originX + datumHeadspace.datum_length * scale}
                    y2={centerY - (datumHeadspace.datum_diameter / 2) * scale - 32}
                    stroke="#485466"
                    strokeWidth="0.8"
                  />
                  {renderDimensionBadge(
                    originX + (datumHeadspace.datum_length * scale) / 2,
                    centerY - (datumHeadspace.datum_diameter / 2) * scale - 28,
                    `Datum Ø${fmt(datumHeadspace.datum_diameter)} @ ${fmt(datumHeadspace.datum_length)}`,
                    'case_length',
                    'SAAMI Datum Headspace',
                    'L_datum',
                    '#60a5fa',
                    false,
                    'middle'
                  )}
                </g>
              )}

              {/* C.I.P. Delta L Safety Margin Callout */}
              {activeStandard === 'cip' && (
                <g id="cip-delta-l-badge" transform={`translate(${originX + 15}, ${centerY + rRim + 95})`}>
                  <rect
                    x="0"
                    y="0"
                    width="230"
                    height="24"
                    rx="4"
                    fill="rgba(168, 85, 247, 0.15)"
                    stroke={cipDeltaL.isSafe ? '#a855f7' : '#ef4444'}
                    strokeWidth="1"
                  />
                  <circle
                    cx="14"
                    cy="12"
                    r="4"
                    fill={cipDeltaL.isSafe ? '#10b981' : '#ef4444'}
                  />
                  <text
                    x="26"
                    y="16"
                    fill="#e2e8f0"
                    fontSize="11"
                    fontWeight="600"
                    fontFamily="var(--font-mono)"
                  >
                    C.I.P. ΔL: {cipDeltaL.deltaL_mm.toFixed(3)} mm ({cipDeltaL.isSafe ? 'PASS' : 'WARN'})
                  </text>
                </g>
              )}

              {/* 1. Rim Diameter (R1) */}
              <g>
                <line x1={originX - 25} y1={centerY - rRim} x2={originX} y2={centerY - rRim} stroke="#485466" strokeWidth="0.8" />
                <line x1={originX - 25} y1={centerY + rRim} x2={originX} y2={centerY + rRim} stroke="#485466" strokeWidth="0.8" />
                <line x1={originX - 20} y1={centerY - rRim} x2={originX - 20} y2={centerY + rRim} stroke="var(--cad-cyan)" strokeWidth="1.2" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                {renderDimensionBadge(
                  originX - 60,
                  centerY,
                  getBadgeText('rim_diameter', cartridge.rim_diameter, 'R₁', 'R₁', 'diameter'),
                  'rim_diameter',
                  'Rim Diameter',
                  'R₁',
                  'var(--cad-cyan)',
                  false,
                  'middle'
                )}
              </g>

              {/* 2. Rim Thickness (R) Callout */}
              <g>
                <line x1={originX} y1={centerY + rRim + 10} x2={originX} y2={centerY + rRim + 25} stroke="#485466" strokeWidth="0.8" />
                <line x1={pxRim} y1={centerY + rRim + 10} x2={pxRim} y2={centerY + rRim + 25} stroke="#485466" strokeWidth="0.8" />
                <line x1={originX} y1={centerY + rRim + 20} x2={pxRim} y2={centerY + rRim + 20} stroke="var(--cad-cyan)" strokeWidth="1" />
                {renderDimensionBadge(
                  (originX + pxRim) / 2,
                  centerY + rRim + 18,
                  getBadgeText('rim_thickness', cartridge.rim_thickness, 'R', 'R', 'length'),
                  'rim_thickness',
                  'Rim Thickness',
                  'R',
                  'var(--cad-cyan)',
                  false,
                  'middle'
                )}
              </g>

              {/* 3. Base Diameter (P1) Callout */}
              <g>
                <line x1={pxExt} y1={centerY - (cartridge.base_diameter / 2) * scale} x2={pxExt} y2={centerY - rRim - 15} stroke="#485466" strokeWidth="0.8" />
                <line x1={pxExt} y1={centerY + (cartridge.base_diameter / 2) * scale} x2={pxExt} y2={centerY + rRim + 25} stroke="#485466" strokeWidth="0.8" />
                {renderDimensionBadge(
                  pxExt,
                  centerY - rRim - 25,
                  getBadgeText('base_diameter', cartridge.base_diameter, 'P₁', 'P₁', 'diameter'),
                  'base_diameter',
                  'Base Diameter',
                  'P₁',
                  'var(--cad-cyan)',
                  false,
                  'middle'
                )}
              </g>

              {/* 4. Shoulder Start Diameter (P2) Callout */}
              {!isStraightWall(cartridge) && (
                <g>
                  <line x1={pxShoulderStart} y1={centerY - (cartridge.shoulder_start_diameter / 2) * scale} x2={pxShoulderStart} y2={centerY - rRim - 15} stroke="#485466" strokeWidth="0.8" />
                  {renderDimensionBadge(
                    pxShoulderStart,
                    centerY - rRim - 25,
                    getBadgeText('shoulder_start_diameter', cartridge.shoulder_start_diameter, 'P₂', 'P₂', 'diameter'),
                    'shoulder_start_diameter',
                    'Shoulder Base Diameter',
                    'P₂',
                    'var(--cad-cyan)',
                    false,
                    'middle'
                  )}
                </g>
              )}

              {/* 5. Neck Mouth Diameter (H2) Callout */}
              <g>
                <line x1={pxMouth} y1={centerY - (cartridge.neck_diameter_mouth / 2) * scale} x2={pxMouth} y2={centerY - rRim - 15} stroke="#485466" strokeWidth="0.8" />
                {renderDimensionBadge(
                  pxMouth,
                  centerY - rRim - 25,
                  getBadgeText('neck_diameter_mouth', cartridge.neck_diameter_mouth, 'H₂', 'H₂', 'diameter'),
                  'neck_diameter_mouth',
                  'Neck Mouth Diameter',
                  'H₂',
                  'var(--cad-cyan)',
                  false,
                  'middle'
                )}
              </g>

              {/* 6. Bullet Diameter (G1) Callout */}
              {activeShowBullet && (
                <g>
                  <line x1={pxTip - 15} y1={centerY - rBullet} x2={pxTip + 15} y2={centerY - rBullet} stroke="#485466" strokeWidth="0.8" />
                  <line x1={pxTip - 15} y1={centerY + rBullet} x2={pxTip + 15} y2={centerY + rBullet} stroke="#485466" strokeWidth="0.8" />
                  <line x1={pxTip + 10} y1={centerY - rBullet} x2={pxTip + 10} y2={centerY + rBullet} stroke="var(--cad-copper)" strokeWidth="1" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                  {renderDimensionBadge(
                    pxTip + 48,
                    centerY,
                    getBadgeText('bullet_diameter', cartridge.bullet_diameter, 'G₁', 'G₁', 'diameter'),
                    'bullet_diameter',
                    'Bullet Diameter',
                    'G₁',
                    'var(--cad-copper)',
                    false,
                    'middle'
                  )}
                </g>
              )}

              {/* Body Length (L1) Callout - Primary Shoulder Datum */}
              {!isStraightWall(cartridge) && (
                <g>
                  <line x1={originX} y1={centerY + rRim + 28} x2={originX} y2={centerY + rRim + 50} stroke="#485466" strokeWidth="0.8" />
                  <line x1={pxShoulderStart} y1={centerY + rRim + 28} x2={pxShoulderStart} y2={centerY + rRim + 50} stroke="#485466" strokeWidth="0.8" />
                  <line x1={originX} y1={centerY + rRim + 40} x2={pxShoulderStart} y2={centerY + rRim + 40} stroke="var(--cad-cyan)" strokeWidth="1.1" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                  {renderDimensionBadge(
                    (originX + pxShoulderStart) / 2,
                    centerY + rRim + 40,
                    getBadgeText('body_length', cartridge.body_length, 'L₁', 'L₁', 'length'),
                    'body_length',
                    'Body Length',
                    'L₁',
                    'var(--cad-cyan)',
                    false,
                    'middle'
                  )}
                </g>
              )}

              {/* 7. Case Length (L3) Callout */}
              <g>
                <line x1={originX} y1={centerY + rRim + 52} x2={originX} y2={centerY + rRim + 75} stroke="#485466" strokeWidth="0.8" />
                <line x1={pxMouth} y1={centerY + rRim + 52} x2={pxMouth} y2={centerY + rRim + 75} stroke="#485466" strokeWidth="0.8" />
                <line x1={originX} y1={centerY + rRim + 65} x2={pxMouth} y2={centerY + rRim + 65} stroke="var(--cad-cyan)" strokeWidth="1.2" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                {renderDimensionBadge(
                  (originX + pxMouth) / 2,
                  centerY + rRim + 65,
                  getBadgeText('case_length', cartridge.case_length, 'L₃', 'L₃', 'length'),
                  'case_length',
                  'Case Length',
                  'L₃',
                  'var(--cad-cyan)',
                  false,
                  'middle'
                )}
              </g>

              {/* 8. Overall Length (L6 / COAL) Callout */}
              {activeShowBullet && (
                <g>
                  <line x1={originX} y1={centerY + rRim + 76} x2={originX} y2={centerY + rRim + 100} stroke="#485466" strokeWidth="0.8" />
                  <line x1={pxTip} y1={centerY + rRim + 76} x2={pxTip} y2={centerY + rRim + 100} stroke="#485466" strokeWidth="0.8" />
                  <line x1={originX} y1={centerY + rRim + 90} x2={pxTip} y2={centerY + rRim + 90} stroke="var(--cad-cyan)" strokeWidth="1.2" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                  {renderDimensionBadge(
                    (originX + pxTip) / 2,
                    centerY + rRim + 90,
                    getBadgeText('coal', cartridge.coal, 'L₆', 'COAL', 'length'),
                    'coal',
                    'Cartridge Overall Length',
                    'COAL',
                    'var(--cad-cyan)',
                    false,
                    'middle'
                  )}
                </g>
              )}

              {/* 9. Shoulder Angle (α) Callout - Elevated to Tier 2 with leader to avoid P₂ badge overlap */}
              {!isStraightWall(cartridge) && (() => {
                const neckBase = cartridge.neck_diameter_base || cartridge.neck_diameter_mouth;
                const shoulderMidY = centerY - ((cartridge.shoulder_start_diameter + neckBase) / 4) * scale;
                const shoulderMidX = (pxShoulderStart + pxShoulderEnd) / 2;
                const alphaX = Math.max(pxShoulderStart + 36, shoulderMidX);
                const alphaY = centerY - rRim - 56;

                return (
                  <g id="shoulder-angle-callout">
                    {/* CAD Leader Line & Shoulder Reference Dot */}
                    <line
                      x1={shoulderMidX}
                      y1={shoulderMidY}
                      x2={alphaX}
                      y2={alphaY + 11}
                      stroke="var(--cad-brass)"
                      strokeWidth="0.8"
                      strokeDasharray="3,2"
                      opacity="0.85"
                    />
                    <circle
                      cx={shoulderMidX}
                      cy={shoulderMidY}
                      r="2.5"
                      fill="var(--cad-brass)"
                    />
                    {renderDimensionBadge(
                      alphaX,
                      alphaY,
                      getBadgeText('shoulder_angle', cartridge.shoulder_angle, 'α', 'α', 'angle'),
                      'shoulder_angle',
                      'Shoulder Angle',
                      'α',
                      'var(--cad-brass)',
                      true,
                      'middle'
                    )}
                  </g>
                );
              })()}

            {/* 10. Cutaway & Half-Section Specific Dimensions */}
            {(activeDrawingMode === 'cutaway' || activeDrawingMode === 'half_section') && (
              <g id="cutaway-internal-dimensions">
                {/* Web Thickness */}
                {renderDimensionBadge(
                  originX + (cartridge.web_thickness * scale) / 2,
                  centerY - rRim - 10,
                  `Web: ${fmt(cartridge.web_thickness)}`,
                  'web_thickness',
                  'Web Head Thickness',
                  'Web',
                  '#e5be59',
                  false,
                  'middle'
                )}
                {/* Base Wall */}
                {renderDimensionBadge(
                  pxExt + 20,
                  centerY + 18,
                  `Wall: ${fmt(cartridge.base_wall_thickness, 3)}`,
                  'base_wall_thickness',
                  'Base Wall Thickness',
                  'Wall',
                  '#e5be59',
                  false,
                  'middle'
                )}
              </g>
            )}
          </g>
        )}
        </g>
      </svg>
    </div>
  );
};
