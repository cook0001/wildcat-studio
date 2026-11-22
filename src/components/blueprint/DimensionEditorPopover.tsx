import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  CartridgeSpec,
  CARTRIDGE_PRESETS,
  DraftingStandard,
  ReamerSpec,
  VolumetricResult,
} from '../../types/cartridge';
import { calculateVolumetrics, isStraightWall } from '../../utils/volumetrics';
import { getActiveBulletPreset } from '../../utils/cartridgeHelpers';
import {
  CALIBER_PRESETS,
  BULLET_OPTIONS,
  BulletOption,
  getBulletsForCaliber,
} from '../../data/bullets';
import {
  RotateCcw,
  Crosshair,
  Check,
  X,
  Undo2,
  ShieldOff,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Droplet,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
} from 'lucide-react';

export interface EditingDimState {
  key: keyof CartridgeSpec;
  label: string;
  symbol: string;
  initialValInches: number;
  initialSnapshot: CartridgeSpec;
  displayVal: number;
  draftValue?: string;
  isAngle?: boolean;
  svgX: number;
  svgY: number;
  clientX?: number;
  clientY?: number;
  history: number[];
}

interface DimensionEditorPopoverProps {
  editingDim: EditingDimState;
  setEditingDim: React.Dispatch<React.SetStateAction<EditingDimState | null>>;
  cartridge: CartridgeSpec;
  activeStandard: DraftingStandard;
  isMetric: boolean;
  pan: { x: number; y: number };
  currentVol: VolumetricResult;
  reamer: ReamerSpec;
  onUpdateCartridge?: (updated: CartridgeSpec) => void;
  onClose: () => void;
}

const CALIBER_FILTER_TABS = [
  { label: 'All', cat: 'All' },
  { label: 'Varmint', cat: 'Sub-Caliber & Varmint' },
  { label: 'Match/Rifle', cat: 'Match & Service Rifle (6mm - .30 Cal)' },
  { label: 'Medium/Euro', cat: 'Medium Bore & European (8mm - 9.3mm)' },
  { label: 'African / DG', cat: 'African Express & Dangerous Game' },
  { label: 'Handgun', cat: 'Handgun, Pistol & PDW' },
  { label: 'ELR', cat: 'Anti-Materiel & Extreme Long Range (ELR)' },
];

const STANDARD_SHOULDER_ANGLES = [
  { label: '17.5°', val: 17.5 },
  { label: '20°', val: 20.0 },
  { label: '25°', val: 25.0 },
  { label: '30°', val: 30.0 },
  { label: '35°', val: 35.0 },
  { label: '40°', val: 40.0 },
];

function getDimToleranceInfo(
  key: keyof CartridgeSpec,
  nominalInches: number,
  isMetric: boolean,
  isAngle = false
) {
  let lowerTolInches = -0.0080;
  let upperTolInches = 0.0000;

  if (isAngle || key === 'shoulder_angle') {
    lowerTolInches = -0.5;
    upperTolInches = 0.5;
  } else if (key === 'base_diameter' || key === 'shoulder_start_diameter') {
    lowerTolInches = -0.0080;
    upperTolInches = 0.0000;
  } else if (
    key === 'rim_diameter' ||
    key === 'rim_thickness' ||
    key === 'extractor_diameter' ||
    key === 'extractor_width'
  ) {
    lowerTolInches = -0.0100;
    upperTolInches = 0.0000;
  } else if (key === 'neck_diameter_mouth' || key === 'neck_diameter_base') {
    lowerTolInches = -0.0060;
    upperTolInches = 0.0000;
  } else if (key === 'bullet_diameter') {
    lowerTolInches = -0.0030;
    upperTolInches = 0.0000;
  } else if (key === 'case_length' || key === 'coal') {
    lowerTolInches = -0.0200;
    upperTolInches = 0.0000;
  } else if (key === 'body_length') {
    lowerTolInches = -0.0150;
    upperTolInches = 0.0000;
  } else if (key === 'web_thickness') {
    lowerTolInches = -0.0050;
    upperTolInches = 0.0050;
  } else if (key === 'neck_wall_thickness' || key === 'base_wall_thickness') {
    lowerTolInches = -0.0015;
    upperTolInches = 0.0015;
  }

  const lowerTol = isAngle ? lowerTolInches : isMetric ? +(lowerTolInches * 25.4).toFixed(2) : lowerTolInches;
  const upperTol = isAngle ? upperTolInches : isMetric ? +(upperTolInches * 25.4).toFixed(2) : upperTolInches;
  const nominal = isAngle ? nominalInches : isMetric ? +(nominalInches * 25.4).toFixed(3) : +nominalInches.toFixed(4);

  const minVal = isAngle
    ? +(nominal + lowerTol).toFixed(1)
    : isMetric
    ? +(nominal + lowerTol).toFixed(3)
    : +(nominal + lowerTol).toFixed(4);
  const maxVal = isAngle
    ? +(nominal + upperTol).toFixed(1)
    : isMetric
    ? +(nominal + upperTol).toFixed(3)
    : +(nominal + upperTol).toFixed(4);

  const upperPrefix = upperTol >= 0 ? '+' : '';
  const tolText = isAngle
    ? `±${Math.abs(upperTol).toFixed(1)}°`
    : isMetric
    ? `${upperPrefix}${upperTol.toFixed(2)} / ${lowerTol.toFixed(2)} mm`
    : `${upperPrefix}${upperTol.toFixed(4)}" / ${lowerTol.toFixed(4)}"`;

  let sliderMin = isAngle
    ? Math.max(0, nominal - 20)
    : isMetric
    ? +(nominal * 0.70).toFixed(2)
    : +(nominal * 0.70).toFixed(4);
  let sliderMax = isAngle
    ? Math.min(55, nominal + 20)
    : isMetric
    ? +(nominal * 1.35).toFixed(2)
    : +(nominal * 1.35).toFixed(4);
  let sliderStep = isAngle ? 0.25 : isMetric ? 0.02 : 0.001;

  if (key === 'bullet_diameter') {
    sliderMin = isMetric ? 4.0 : 0.170;
    sliderMax = isMetric ? 13.5 : 0.520;
  } else if (key === 'shoulder_angle') {
    sliderMin = 0.0;
    sliderMax = 50.0;
    sliderStep = 0.5;
  }

  return {
    lowerTol,
    upperTol,
    tolText,
    nominal,
    minVal,
    maxVal,
    sliderMin,
    sliderMax,
    sliderStep,
  };
}

export const DimensionEditorPopover: React.FC<DimensionEditorPopoverProps> = ({
  editingDim,
  setEditingDim,
  cartridge,
  activeStandard,
  isMetric,
  pan,
  currentVol,
  reamer,
  onUpdateCartridge,
  onClose,
}) => {
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingPopover, setIsDraggingPopover] = useState<boolean>(false);
  const popoverDragRef = useRef<{
    startMouseX: number;
    startMouseY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);

  const [lockCaseLengthOnBodyChange, setLockCaseLengthOnBodyChange] = useState<boolean>(true);
  const [preserveNeckWallOnBulletChange, setPreserveNeckWallOnBulletChange] = useState<boolean>(true);
  const [selectedCaliberCategoryFilter, setSelectedCaliberCategoryFilter] = useState<string>('All');
  const [bulletSearchQuery, setBulletSearchQuery] = useState<string>('');
  const [applyBulletSeatingDepth, setApplyBulletSeatingDepth] = useState<boolean>(true);
  const [appliedBulletId, setAppliedBulletId] = useState<string | null>(null);

  // Reset popover anchor when switching to a newly clicked dimension badge
  useEffect(() => {
    setPopoverPos(null);
  }, [editingDim.initialSnapshot]);

  const popoverWidth = editingDim.key === 'bullet_diameter' ? 420 : 350;
  const maxAvailableHeight = Math.max(300, window.innerHeight - 65);
  const popoverHeight = Math.min(editingDim.key === 'bullet_diameter' ? 560 : 480, maxAvailableHeight);

  const handlePopoverMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    const targetX = editingDim.clientX ?? (editingDim.svgX + pan.x);
    const targetY = editingDim.clientY ?? (editingDim.svgY + pan.y);
    const spawnY = targetY > window.innerHeight * 0.5 ? targetY - popoverHeight - 16 : targetY + 20;

    const defaultLeft = Math.max(16, Math.min(window.innerWidth - popoverWidth - 16, targetX - popoverWidth / 2));
    const defaultTop = Math.max(48, Math.min(window.innerHeight - popoverHeight - 12, spawnY));
    const currentX = popoverPos ? popoverPos.x : defaultLeft;
    const currentY = popoverPos ? popoverPos.y : defaultTop;

    popoverDragRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPosX: currentX,
      startPosY: currentY,
    };
    setIsDraggingPopover(true);
  };

  useEffect(() => {
    if (!isDraggingPopover) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!popoverDragRef.current) return;
      const deltaX = e.clientX - popoverDragRef.current.startMouseX;
      const deltaY = e.clientY - popoverDragRef.current.startMouseY;

      const maxH = Math.max(300, window.innerHeight - 65);
      const popH = Math.min(editingDim.key === 'bullet_diameter' ? 560 : 480, maxH);
      const newX = Math.max(12, Math.min(window.innerWidth - popoverWidth - 12, popoverDragRef.current.startPosX + deltaX));
      const newY = Math.max(45, Math.min(window.innerHeight - popH - 12, popoverDragRef.current.startPosY + deltaY));

      setPopoverPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDraggingPopover(false);
      popoverDragRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPopover, popoverWidth, editingDim.key]);

  const handleApplyDimChange = useCallback(
    (newDisplayVal: number, explicitHistory?: number[]) => {
      if (!onUpdateCartridge) return;
      const inches = editingDim.isAngle
        ? newDisplayVal
        : isMetric
        ? newDisplayVal / 25.4
        : newDisplayVal;

      const updated: CartridgeSpec = {
        ...cartridge,
        [editingDim.key]: inches,
      };

      if (editingDim.key === 'shoulder_angle') {
        if (inches > 0.5) {
          const neckBase = updated.neck_diameter_base || updated.neck_diameter_mouth;
          const dr = (updated.shoulder_start_diameter - neckBase) / 2.0;
          if (dr > 0.001) {
            const rad = (inches * Math.PI) / 180;
            updated.shoulder_length = +(dr / Math.tan(rad)).toFixed(4);
          }
        } else {
          updated.shoulder_length = 0.0;
        }
      } else if (editingDim.key === 'shoulder_length') {
        if (inches > 0.002) {
          const neckBase = updated.neck_diameter_base || updated.neck_diameter_mouth;
          const dr = (updated.shoulder_start_diameter - neckBase) / 2.0;
          if (dr > 0.001) {
            updated.shoulder_angle = +((Math.atan(dr / inches) * 180) / Math.PI).toFixed(1);
          }
        } else {
          updated.shoulder_angle = 0.0;
        }
      } else if (editingDim.key === 'shoulder_start_diameter' || editingDim.key === 'neck_diameter_base') {
        if (updated.shoulder_angle > 0.5) {
          const neckBase = updated.neck_diameter_base || updated.neck_diameter_mouth;
          const dr = (updated.shoulder_start_diameter - neckBase) / 2.0;
          if (dr > 0.001) {
            const rad = (updated.shoulder_angle * Math.PI) / 180;
            updated.shoulder_length = +(dr / Math.tan(rad)).toFixed(4);
          }
        }
      } else if (editingDim.key === 'body_length') {
        if (!lockCaseLengthOnBodyChange) {
          const delta = inches - (cartridge.body_length || inches);
          updated.case_length = Math.max(0.600, +(cartridge.case_length + delta).toFixed(4));
          updated.coal = Math.max(updated.case_length + 0.100, +(cartridge.coal + delta).toFixed(4));
        }
      } else if (editingDim.key === 'bullet_diameter') {
        if (preserveNeckWallOnBulletChange) {
          const wallT = cartridge.neck_wall_thickness || 0.015;
          const newMouth = +(inches + 2 * wallT).toFixed(4);
          updated.neck_diameter_mouth = newMouth;
          updated.neck_diameter_base = newMouth;
        }
      } else if (editingDim.key === 'case_length') {
        if (updated.coal < inches + 0.100) {
          updated.coal = +(inches + 0.350).toFixed(4);
        }
      }

      onUpdateCartridge(updated);
      setEditingDim((prev) => {
        if (!prev) return null;
        const history = explicitHistory ?? [...prev.history, newDisplayVal];
        return { ...prev, displayVal: newDisplayVal, draftValue: undefined, history };
      });
    },
    [
      cartridge,
      editingDim.isAngle,
      editingDim.key,
      isMetric,
      lockCaseLengthOnBodyChange,
      onUpdateCartridge,
      preserveNeckWallOnBulletChange,
      setEditingDim,
    ]
  );

  const handleUndoDimStep = useCallback(() => {
    if (editingDim.history.length <= 1) return;
    const newHistory = editingDim.history.slice(0, -1);
    const previousVal = newHistory[newHistory.length - 1];
    handleApplyDimChange(previousVal, newHistory);
  }, [editingDim.history, handleApplyDimChange]);

  const handleRevertAndClose = useCallback(() => {
    if (onUpdateCartridge) {
      onUpdateCartridge({ ...editingDim.initialSnapshot });
    }
    onClose();
  }, [editingDim.initialSnapshot, onClose, onUpdateCartridge]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndoDimStep();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleRevertAndClose();
      } else if (e.key === 'Enter' && (e.target as HTMLElement)?.tagName !== 'BUTTON') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRevertAndClose, handleUndoDimStep, onClose]);

  const handleApplyBulletPreset = (bullet: BulletOption) => {
    if (!onUpdateCartridge) return;
    const inches = bullet.caliber_inches;
    const seatDepth =
      applyBulletSeatingDepth && bullet.recommended_seating_depth
        ? bullet.recommended_seating_depth
        : cartridge.seating_depth || 0.300;
    const newCoal = +(cartridge.case_length + bullet.length_inches - seatDepth).toFixed(4);

    const updated: CartridgeSpec = {
      ...cartridge,
      bullet_diameter: inches,
      bullet_weight_grains: bullet.weight_grains,
      bullet_length: bullet.length_inches,
      seating_depth: seatDepth,
      coal: newCoal,
    };
    if (preserveNeckWallOnBulletChange) {
      const wallT = cartridge.neck_wall_thickness || 0.015;
      const newMouth = +(inches + 2 * wallT).toFixed(4);
      updated.neck_diameter_mouth = newMouth;
      updated.neck_diameter_base = newMouth;
    }
    onUpdateCartridge(updated);
    setAppliedBulletId(bullet.id);
    const displayVal = isMetric ? +(inches * 25.4).toFixed(3) : inches;
    setEditingDim((prev) =>
      prev ? { ...prev, displayVal, draftValue: undefined, history: [...prev.history, displayVal] } : null
    );
  };

  const handleInputWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.preventDefault();
    const mult = e.shiftKey ? 10 : e.altKey ? 0.5 : 1;
    const baseStep = editingDim.isAngle ? 0.5 : isMetric ? 0.05 : 0.001;
    const step = baseStep * mult;
    const dir = e.deltaY < 0 ? 1 : -1;
    const newVal = +(editingDim.displayVal + dir * step).toFixed(editingDim.isAngle ? 1 : isMetric ? 3 : 4);
    handleApplyDimChange(newVal);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onClose();
    } else if (e.key === 'Escape') {
      handleRevertAndClose();
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      handleUndoDimStep();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const mult = e.shiftKey ? 10 : e.altKey ? 0.5 : 1;
      const baseStep = editingDim.isAngle ? 0.5 : isMetric ? 0.05 : 0.001;
      const step = baseStep * mult;
      const dir = e.key === 'ArrowUp' ? 1 : -1;
      const newVal = +(editingDim.displayVal + dir * step).toFixed(editingDim.isAngle ? 1 : isMetric ? 3 : 4);
      handleApplyDimChange(newVal);
    }
  };

  const handleUndoToInitial = () => {
    const initialDisplay = editingDim.isAngle
      ? editingDim.initialValInches
      : isMetric
      ? +(editingDim.initialValInches * 25.4).toFixed(3)
      : +editingDim.initialValInches.toFixed(4);
    handleApplyDimChange(initialDisplay);
  };

  const handleResetToPreset = () => {
    const preset = CARTRIDGE_PRESETS[cartridge.id];
    if (!preset) return;
    const presetInches = preset[editingDim.key] as number;
    const presetDisplay = editingDim.isAngle
      ? presetInches
      : isMetric
      ? +(presetInches * 25.4).toFixed(3)
      : +presetInches.toFixed(4);
    handleApplyDimChange(presetDisplay);
  };

  const initialVol = useMemo(
    () => calculateVolumetrics(editingDim.initialSnapshot),
    [editingDim.initialSnapshot]
  );

  const tolInfo = useMemo(
    () => getDimToleranceInfo(editingDim.key, editingDim.initialValInches, isMetric, editingDim.isAngle),
    [editingDim.key, editingDim.initialValInches, isMetric, editingDim.isAngle]
  );

  const preset = CARTRIDGE_PRESETS[cartridge.id];
  const presetInches = preset ? (preset[editingDim.key] as number) : undefined;
  const presetDisplay =
    presetInches !== undefined
      ? editingDim.isAngle
        ? presetInches
        : isMetric
        ? +(presetInches * 25.4).toFixed(3)
        : +presetInches.toFixed(4)
      : undefined;

  const initialDisplay = editingDim.isAngle
    ? editingDim.initialValInches
    : isMetric
    ? +(editingDim.initialValInches * 25.4).toFixed(3)
    : +editingDim.initialValInches.toFixed(4);
  const isDifferentFromInitial = Math.abs(editingDim.displayVal - initialDisplay) > 0.0001;
  const isDifferentFromPreset =
    presetDisplay !== undefined && Math.abs(editingDim.displayVal - presetDisplay) > 0.0001;

  let chamberClearanceInches: number | null = null;
  let reamerChamberVal: number | null = null;
  let clearanceFeatureLabel = '';

  if (editingDim.key === 'base_diameter') {
    reamerChamberVal = reamer.chamber_base_dia;
    chamberClearanceInches = +(reamer.chamber_base_dia - cartridge.base_diameter).toFixed(4);
    clearanceFeatureLabel = 'P₁ Base Dia Clearance';
  } else if (editingDim.key === 'shoulder_start_diameter') {
    reamerChamberVal = reamer.chamber_shoulder_dia;
    chamberClearanceInches = +(reamer.chamber_shoulder_dia - cartridge.shoulder_start_diameter).toFixed(4);
    clearanceFeatureLabel = 'P₂ Shoulder Dia Clearance';
  } else if (editingDim.key === 'neck_diameter_mouth') {
    reamerChamberVal = reamer.chamber_neck_dia;
    chamberClearanceInches = +(reamer.chamber_neck_dia - cartridge.neck_diameter_mouth).toFixed(4);
    clearanceFeatureLabel = 'H₂ Neck Expansion Clearance';
  } else if (editingDim.key === 'case_length') {
    reamerChamberVal = reamer.chamber_length;
    chamberClearanceInches = +(reamer.chamber_length - cartridge.case_length).toFixed(4);
    clearanceFeatureLabel = 'L₃ Chamber Mouth Clearance';
  } else if (editingDim.key === 'rim_diameter') {
    reamerChamberVal = reamer.chamber_rim_dia;
    chamberClearanceInches = +(reamer.chamber_rim_dia - cartridge.rim_diameter).toFixed(4);
    clearanceFeatureLabel = 'R₁ Rim Recess Clearance';
  } else if (editingDim.key === 'rim_thickness') {
    reamerChamberVal = reamer.chamber_rim_depth;
    chamberClearanceInches = +(reamer.chamber_rim_depth - cartridge.rim_thickness).toFixed(4);
    clearanceFeatureLabel = 'R Rim Depth Headspace Gap';
  } else if (editingDim.key === 'bullet_diameter') {
    reamerChamberVal = reamer.freebore_dia;
    chamberClearanceInches = +(reamer.freebore_dia - cartridge.bullet_diameter).toFixed(4);
    clearanceFeatureLabel = 'Freebore Leade Diametral Clearance';
  }

  const deltaGrains = +(
    currentVol.overflow_capacity_grains_h2o - initialVol.overflow_capacity_grains_h2o
  ).toFixed(2);
  const deltaPercent =
    initialVol.overflow_capacity_grains_h2o > 0
      ? +((deltaGrains / initialVol.overflow_capacity_grains_h2o) * 100).toFixed(1)
      : 0;

  const targetX = editingDim.clientX ?? (editingDim.svgX + pan.x);
  const targetY = editingDim.clientY ?? (editingDim.svgY + pan.y);
  const spawnY = targetY > window.innerHeight * 0.5 ? targetY - popoverHeight - 16 : targetY + 20;
  const defaultLeft = Math.max(16, Math.min(window.innerWidth - popoverWidth - 16, targetX - popoverWidth / 2));
  const defaultTop = Math.max(48, Math.min(window.innerHeight - popoverHeight - 12, spawnY));

  return createPortal(
    <div
      id="draggable-dimension-popover"
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: popoverPos ? popoverPos.x : defaultLeft,
        top: popoverPos ? popoverPos.y : defaultTop,
        zIndex: 2500,
        background: 'rgba(13, 17, 26, 0.98)',
        WebkitBackdropFilter: 'blur(16px)',
        backdropFilter: 'blur(16px)',
        border: `1.5px solid ${isDraggingPopover ? '#fff' : 'var(--cad-cyan)'}`,
        borderRadius: '8px',
        padding: '10px 12px',
        boxShadow: isDraggingPopover
          ? '0 16px 48px rgba(0, 0, 0, 0.95), 0 0 28px rgba(0, 210, 255, 0.55)'
          : '0 10px 36px rgba(0, 0, 0, 0.85), 0 0 20px rgba(0, 210, 255, 0.3)',
        width: `${popoverWidth}px`,
        maxHeight: `${maxAvailableHeight}px`,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: isDraggingPopover ? 'none' : 'auto',
      }}
    >
      <div
        onMouseDown={handlePopoverMouseDown}
        title="Drag to move this dimension editor anywhere on screen"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: isDraggingPopover ? 'grabbing' : 'grab',
          paddingBottom: '6px',
          marginBottom: '6px',
          borderBottom: '1px solid rgba(0, 210, 255, 0.22)',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <GripVertical size={14} color="var(--cad-cyan)" style={{ opacity: 0.8, flexShrink: 0 }} />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--cad-cyan)',
              letterSpacing: '0.4px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            EDIT {editingDim.symbol}: {editingDim.label.toUpperCase()}
          </span>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: '3px',
              background: 'rgba(0, 210, 255, 0.12)',
              color: 'var(--cad-cyan)',
              border: '1px solid rgba(0, 210, 255, 0.3)',
              flexShrink: 0,
            }}
          >
            {activeStandard.toUpperCase()}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {popoverPos && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPopoverPos(null);
              }}
              title="Snap popover back near dimension line"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px 4px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '3px',
                fontSize: '10px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--cad-cyan)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <Crosshair size={12} />
            </button>
          )}
          <button
            id="btn-close-measurement-popover"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRevertAndClose();
            }}
            title="Close editor (Esc)"
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
            <X size={14} />
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '7px',
          paddingRight: '2px',
        }}
      >
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '5px',
            padding: '5px 7px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '9.5px' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>SPEC TOLERANCE:</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--cad-cyan)', fontWeight: 700 }}>
              {tolInfo.tolText}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
            <button
              id="btn-tol-min-lmc"
              type="button"
              onClick={() => handleApplyDimChange(tolInfo.minVal)}
              title={`Jump to Minimum Material Condition (LMC) [${tolInfo.minVal}${editingDim.isAngle ? '°' : isMetric ? 'mm' : '"'}]`}
              style={{
                background: Math.abs(editingDim.displayVal - tolInfo.minVal) < 0.0001 ? 'rgba(0, 210, 255, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${Math.abs(editingDim.displayVal - tolInfo.minVal) < 0.0001 ? 'var(--cad-cyan)' : 'rgba(255, 255, 255, 0.1)'}`,
                color: Math.abs(editingDim.displayVal - tolInfo.minVal) < 0.0001 ? '#fff' : 'var(--text-secondary)',
                borderRadius: '4px',
                padding: '3px 2px',
                fontSize: '9px',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              Min: {tolInfo.minVal}
            </button>
            <button
              id="btn-tol-nominal"
              type="button"
              onClick={() => handleApplyDimChange(tolInfo.nominal)}
              title={`Jump to Blueprint Nominal Reference Spec [${tolInfo.nominal}${editingDim.isAngle ? '°' : isMetric ? 'mm' : '"'}]`}
              style={{
                background: Math.abs(editingDim.displayVal - tolInfo.nominal) < 0.0001 ? 'rgba(0, 210, 255, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${Math.abs(editingDim.displayVal - tolInfo.nominal) < 0.0001 ? 'var(--cad-cyan)' : 'rgba(255, 255, 255, 0.1)'}`,
                color: Math.abs(editingDim.displayVal - tolInfo.nominal) < 0.0001 ? '#fff' : 'var(--text-secondary)',
                borderRadius: '4px',
                padding: '3px 2px',
                fontSize: '9px',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              Nom: {tolInfo.nominal}
            </button>
            <button
              id="btn-tol-max-mmc"
              type="button"
              onClick={() => handleApplyDimChange(tolInfo.maxVal)}
              title={`Jump to Maximum Material Condition (MMC) [${tolInfo.maxVal}${editingDim.isAngle ? '°' : isMetric ? 'mm' : '"'}]`}
              style={{
                background: Math.abs(editingDim.displayVal - tolInfo.maxVal) < 0.0001 ? 'rgba(0, 210, 255, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${Math.abs(editingDim.displayVal - tolInfo.maxVal) < 0.0001 ? 'var(--cad-cyan)' : 'rgba(255, 255, 255, 0.1)'}`,
                color: Math.abs(editingDim.displayVal - tolInfo.maxVal) < 0.0001 ? '#fff' : 'var(--text-secondary)',
                borderRadius: '4px',
                padding: '3px 2px',
                fontSize: '9px',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              Max: {tolInfo.maxVal}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => {
                  const step = editingDim.isAngle ? 0.5 : isMetric ? 0.05 : 0.001;
                  handleApplyDimChange(+(editingDim.displayVal + step).toFixed(editingDim.isAngle ? 1 : isMetric ? 3 : 4));
                }}
                title="Nudge Up (Arrow Up)"
                style={{
                  background: 'rgba(0, 210, 255, 0.1)',
                  border: '1px solid rgba(0, 210, 255, 0.3)',
                  color: 'var(--cad-cyan)',
                  borderRadius: '3px',
                  padding: '1px 4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronUp size={12} />
              </button>
              <button
                type="button"
                onClick={() => {
                  const step = editingDim.isAngle ? 0.5 : isMetric ? 0.05 : 0.001;
                  handleApplyDimChange(+(editingDim.displayVal - step).toFixed(editingDim.isAngle ? 1 : isMetric ? 3 : 4));
                }}
                title="Nudge Down (Arrow Down)"
                style={{
                  background: 'rgba(0, 210, 255, 0.1)',
                  border: '1px solid rgba(0, 210, 255, 0.3)',
                  color: 'var(--cad-cyan)',
                  borderRadius: '3px',
                  padding: '1px 4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronDown size={12} />
              </button>
            </div>

            <input
              id="input-edit-measurement"
              type="number"
              autoFocus
              step={editingDim.isAngle ? 0.5 : isMetric ? 0.05 : 0.001}
              value={editingDim.draftValue !== undefined ? editingDim.draftValue : editingDim.displayVal}
              onChange={(e) => {
                const raw = e.target.value;
                setEditingDim((prev) => (prev ? { ...prev, draftValue: raw } : null));
                const parsed = parseFloat(raw);
                if (Number.isFinite(parsed)) {
                  handleApplyDimChange(parsed);
                }
              }}
              onBlur={() => setEditingDim((prev) => (prev ? { ...prev, draftValue: undefined } : null))}
              onWheel={handleInputWheel}
              onKeyDown={handleInputKeyDown}
              title="Direct number input. Use mouse wheel or Up/Down arrows to nudge (Shift = x10 coarse, Alt = fine)"
              style={{
                flex: 1,
                minWidth: 0,
                background: '#070a10',
                border: '1.5px solid var(--cad-cyan)',
                borderRadius: '4px',
                color: '#00f0ff',
                fontFamily: 'var(--font-mono)',
                fontSize: '15px',
                fontWeight: 700,
                padding: '5px 8px',
                textAlign: 'right',
                outline: 'none',
                boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.8)',
              }}
            />
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', width: '24px', flexShrink: 0, fontWeight: 600 }}>
              {editingDim.isAngle ? 'deg' : isMetric ? 'mm' : 'in'}
            </span>

            <button
              id="btn-undo-measurement-step"
              type="button"
              onClick={handleUndoDimStep}
              disabled={editingDim.history.length <= 1}
              title="Undo last change to this measurement (⌘Z / Ctrl+Z)"
              style={{
                flexShrink: 0,
                whiteSpace: 'nowrap',
                background: editingDim.history.length > 1 ? 'rgba(0, 210, 255, 0.15)' : 'var(--bg-tertiary)',
                border: `1px solid ${editingDim.history.length > 1 ? 'var(--cad-cyan)' : 'var(--border-color)'}`,
                color: editingDim.history.length > 1 ? 'var(--cad-cyan)' : 'var(--text-muted)',
                borderRadius: '4px',
                padding: '5px 8px',
                cursor: editingDim.history.length > 1 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 600,
                opacity: editingDim.history.length > 1 ? 1 : 0.35,
                transition: 'all 0.15s',
              }}
            >
              <Undo2 size={12} />
              <span>Undo</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 2px' }}>
            <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: '38px', flexShrink: 0 }}>
              {tolInfo.sliderMin}
            </span>
            <input
              id="slider-edit-measurement"
              type="range"
              min={tolInfo.sliderMin}
              max={tolInfo.sliderMax}
              step={tolInfo.sliderStep}
              value={editingDim.displayVal}
              onChange={(e) => handleApplyDimChange(parseFloat(e.target.value) || 0)}
              title="Continuous range scrubber"
              style={{
                flex: 1,
                accentColor: 'var(--cad-cyan)',
                cursor: 'ew-resize',
                height: '5px',
              }}
            />
            <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: '38px', textAlign: 'right', flexShrink: 0 }}>
              {tolInfo.sliderMax}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ fontSize: '8.5px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.4px' }}>
            PRECISION MACHINING STEPPERS:
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '2px' }}>
            {editingDim.isAngle ? (
              <>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal - 1.0).toFixed(1))} style={stepperStyle}>-1.0°</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal - 0.5).toFixed(1))} style={stepperStyle}>-0.5°</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal - 0.2).toFixed(1))} style={stepperStyle}>-0.2°</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal - 0.1).toFixed(1))} style={stepperStyle}>-0.1°</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal + 0.1).toFixed(1))} style={stepperStyle}>+0.1°</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal + 0.2).toFixed(1))} style={stepperStyle}>+0.2°</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal + 0.5).toFixed(1))} style={stepperStyle}>+0.5°</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal + 1.0).toFixed(1))} style={stepperStyle}>+1.0°</button>
              </>
            ) : isMetric ? (
              <>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal - 0.10).toFixed(2))} style={stepperStyle}>-.10</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal - 0.05).toFixed(2))} style={stepperStyle}>-.05</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal - 0.02).toFixed(2))} style={stepperStyle}>-.02</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal - 0.01).toFixed(2))} style={stepperStyle}>-.01</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal + 0.01).toFixed(2))} style={stepperStyle}>+.01</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal + 0.02).toFixed(2))} style={stepperStyle}>+.02</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal + 0.05).toFixed(2))} style={stepperStyle}>+.05</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal + 0.10).toFixed(2))} style={stepperStyle}>+.10</button>
              </>
            ) : (
              <>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal - 0.005).toFixed(4))} style={stepperStyle}>-.005</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal - 0.002).toFixed(4))} style={stepperStyle}>-.002</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal - 0.001).toFixed(4))} style={stepperStyle}>-.001</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal - 0.0005).toFixed(4))} style={stepperStyle}>-.0005</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal + 0.0005).toFixed(4))} style={stepperStyle}>+.0005</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal + 0.001).toFixed(4))} style={stepperStyle}>+.001</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal + 0.002).toFixed(4))} style={stepperStyle}>+.002</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal + 0.005).toFixed(4))} style={stepperStyle}>+.005</button>
              </>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '2px' }}>
            {editingDim.isAngle ? (
              <>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal - 10.0).toFixed(1))} style={stepperStyle}>-10°</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal - 5.0).toFixed(1))} style={stepperStyle}>-5.0°</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal - 2.0).toFixed(1))} style={stepperStyle}>-2.0°</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal + 2.0).toFixed(1))} style={stepperStyle}>+2.0°</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal + 5.0).toFixed(1))} style={stepperStyle}>+5.0°</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal + 10.0).toFixed(1))} style={stepperStyle}>+10°</button>
              </>
            ) : isMetric ? (
              <>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal - 1.00).toFixed(2))} style={stepperStyle}>-1.00</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal - 0.50).toFixed(2))} style={stepperStyle}>-0.50</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal - 0.20).toFixed(2))} style={stepperStyle}>-0.20</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal + 0.20).toFixed(2))} style={stepperStyle}>+0.20</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal + 0.50).toFixed(2))} style={stepperStyle}>+0.50</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal + 1.00).toFixed(2))} style={stepperStyle}>+1.00</button>
              </>
            ) : (
              <>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal - 0.050).toFixed(4))} style={stepperStyle}>-.050</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal - 0.025).toFixed(4))} style={stepperStyle}>-.025</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal - 0.010).toFixed(4))} style={stepperStyle}>-.010</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal + 0.010).toFixed(4))} style={stepperStyle}>+.010</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal + 0.025).toFixed(4))} style={stepperStyle}>+.025</button>
                <button onClick={() => handleApplyDimChange(+(editingDim.displayVal + 0.050).toFixed(4))} style={stepperStyle}>+.050</button>
              </>
            )}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(0, 210, 255, 0.04)',
            border: '1px solid rgba(0, 210, 255, 0.18)',
            borderRadius: '5px',
            padding: '6px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Droplet size={11} color="var(--cad-cyan)" />
              <span style={{ fontSize: '9.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                POWDER CAPACITY:
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '9.5px', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: '#fff', fontWeight: 700 }}>
                {currentVol.overflow_capacity_grains_h2o.toFixed(1)} gr H₂O
              </span>
              <span
                style={{
                  color: Math.abs(deltaGrains) < 0.05 ? 'var(--text-muted)' : deltaGrains > 0 ? '#3fb950' : '#f85149',
                  fontWeight: 700,
                  fontSize: '9px',
                  padding: '1px 4px',
                  borderRadius: '3px',
                  background: Math.abs(deltaGrains) < 0.05 ? 'transparent' : deltaGrains > 0 ? 'rgba(63, 185, 80, 0.15)' : 'rgba(248, 81, 73, 0.15)',
                }}
              >
                Δ {deltaGrains >= 0 ? '+' : ''}{deltaGrains.toFixed(2)} gr ({deltaPercent >= 0 ? '+' : ''}{deltaPercent.toFixed(1)}%)
              </span>
            </div>
          </div>

          {chamberClearanceInches !== null && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '4px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {chamberClearanceInches < 0 ? (
                  <AlertTriangle size={11} color="#f85149" />
                ) : (
                  <CheckCircle2 size={11} color={chamberClearanceInches < 0.0015 ? '#d29922' : '#3fb950'} />
                )}
                <span style={{ fontSize: '9.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {clearanceFeatureLabel ? clearanceFeatureLabel.toUpperCase() : 'CHAMBER FIT'}:
                </span>
                {reamerChamberVal !== null && (
                  <span style={{ fontSize: '8.5px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    ({isMetric ? (reamerChamberVal * 25.4).toFixed(2) + 'mm' : reamerChamberVal.toFixed(4) + '"'})
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  padding: '1px 4px',
                  borderRadius: '3px',
                  background:
                    chamberClearanceInches < 0
                      ? 'rgba(248, 81, 73, 0.2)'
                      : chamberClearanceInches < 0.0015
                      ? 'rgba(210, 153, 34, 0.2)'
                      : 'rgba(63, 185, 80, 0.2)',
                  color:
                    chamberClearanceInches < 0
                      ? '#f85149'
                      : chamberClearanceInches < 0.0015
                      ? '#d29922'
                      : '#3fb950',
                  border: `1px solid ${
                    chamberClearanceInches < 0
                      ? 'rgba(248, 81, 73, 0.4)'
                      : chamberClearanceInches < 0.0015
                      ? 'rgba(210, 153, 34, 0.4)'
                      : 'rgba(63, 185, 80, 0.4)'
                  }`,
                }}
              >
                {chamberClearanceInches < 0
                  ? `INTERFERENCE (${isMetric ? (chamberClearanceInches * 25.4).toFixed(3) + 'mm' : chamberClearanceInches.toFixed(4) + '"'})`
                  : chamberClearanceInches < 0.0015
                  ? `TIGHT FIT (+${isMetric ? (chamberClearanceInches * 25.4).toFixed(3) + 'mm' : chamberClearanceInches.toFixed(4) + '"'})`
                  : `SAFE FIT (+${isMetric ? (chamberClearanceInches * 25.4).toFixed(3) + 'mm' : chamberClearanceInches.toFixed(4) + '"'})`}
              </span>
            </div>
          )}
        </div>

        {editingDim.key === 'body_length' && (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '5px',
              padding: '5px 7px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--cad-cyan)' }}>
                WILDCAT COUPLING:
              </span>
              <button
                type="button"
                onClick={() => setLockCaseLengthOnBodyChange((prev) => !prev)}
                style={{
                  background: lockCaseLengthOnBodyChange ? 'rgba(0, 210, 255, 0.15)' : 'rgba(240, 136, 62, 0.15)',
                  border: `1px solid ${lockCaseLengthOnBodyChange ? 'var(--cad-cyan)' : 'var(--cad-copper)'}`,
                  color: lockCaseLengthOnBodyChange ? 'var(--cad-cyan)' : 'var(--cad-copper)',
                  borderRadius: '3px',
                  padding: '2px 5px',
                  fontSize: '9px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {lockCaseLengthOnBodyChange ? <Lock size={10} /> : <Unlock size={10} />}
                <span>{lockCaseLengthOnBodyChange ? 'Lock Case Length (L₃)' : 'Extend L₃ with Body'}</span>
              </button>
            </div>
            <div style={{ fontSize: '8.5px', color: 'var(--text-muted)' }}>
              Resulting Neck Length: <strong style={{ color: '#fff' }}>{(cartridge.case_length - cartridge.body_length - cartridge.shoulder_length).toFixed(3)}"</strong>
              {lockCaseLengthOnBodyChange ? ' (shortens as shoulder moves forward)' : ' (neck length stays fixed)'}
            </div>
          </div>
        )}

        {editingDim.key === 'bullet_diameter' && (() => {
          const currentDia = isMetric ? editingDim.displayVal / 25.4 : editingDim.displayVal;
          const filteredCalibers =
            selectedCaliberCategoryFilter === 'All'
              ? CALIBER_PRESETS
              : CALIBER_PRESETS.filter((c) => c.category === selectedCaliberCategoryFilter);

          const q = bulletSearchQuery.trim().toLowerCase();
          const matchingBullets = q
            ? BULLET_OPTIONS.filter(
                (b) =>
                  b.name.toLowerCase().includes(q) ||
                  b.manufacturer.toLowerCase().includes(q) ||
                  b.category.toLowerCase().includes(q) ||
                  b.caliber_designation.toLowerCase().includes(q) ||
                  `${b.weight_grains}gr`.includes(q) ||
                  `${b.weight_grains}` === q
              )
            : getBulletsForCaliber(currentDia, 0.008);

          const activeBullet =
            (appliedBulletId && BULLET_OPTIONS.find((b) => b.id === appliedBulletId)) ||
            getActiveBulletPreset(cartridge);

          return (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                padding: '6px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '9.5px', fontWeight: 700, color: 'var(--cad-copper)', letterSpacing: '0.4px' }}>
                  STANDARD CALIBER PRESETS ({CALIBER_PRESETS.length})
                </span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '8.5px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={preserveNeckWallOnBulletChange}
                    onChange={(e) => setPreserveNeckWallOnBulletChange(e.target.checked)}
                    style={{ accentColor: 'var(--cad-copper)' }}
                  />
                  <span>Sync Neck (H₂)</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '3px', overflowX: 'auto', paddingBottom: '2px' }}>
                {CALIBER_FILTER_TABS.map((item) => {
                  const isCatActive = selectedCaliberCategoryFilter === item.cat;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setSelectedCaliberCategoryFilter(item.cat)}
                      style={{
                        background: isCatActive ? 'rgba(240, 136, 62, 0.3)' : 'rgba(255, 255, 255, 0.04)',
                        border: `1px solid ${isCatActive ? 'var(--cad-copper)' : 'rgba(255, 255, 255, 0.08)'}`,
                        color: isCatActive ? '#fff' : 'var(--text-secondary)',
                        borderRadius: '3px',
                        padding: '2px 5px',
                        fontSize: '8px',
                        fontWeight: isCatActive ? 700 : 500,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '3px',
                  maxHeight: '90px',
                  overflowY: 'auto',
                  paddingRight: '2px',
                }}
              >
                {filteredCalibers.map((cal) => {
                  const display = isMetric ? +(cal.inches * 25.4).toFixed(2) : cal.inches;
                  const isActive = Math.abs(editingDim.displayVal - display) < 0.003;
                  return (
                    <button
                      key={`${cal.category}-${cal.designation}-${cal.inches}`}
                      type="button"
                      title={`${cal.designation} (${cal.commonCartridges})`}
                      onClick={() => handleApplyDimChange(display)}
                      style={{
                        background: isActive ? 'rgba(240, 136, 62, 0.35)' : 'rgba(255, 255, 255, 0.04)',
                        border: `1px solid ${isActive ? 'var(--cad-copper)' : 'rgba(255, 255, 255, 0.1)'}`,
                        color: isActive ? '#fff' : 'var(--text-secondary)',
                        borderRadius: '3px',
                        padding: '3px 1px',
                        fontSize: '8px',
                        fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        lineHeight: 1.1,
                      }}
                    >
                      <span>{cal.inches.toFixed(3)}"</span>
                      <span style={{ fontSize: '7px', opacity: 0.75 }}>{cal.mm}mm</span>
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  marginTop: '4px',
                  paddingTop: '6px',
                  borderTop: '1px solid rgba(240, 136, 62, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--cad-cyan)' }}>
                      BULLET OPTIONS & MATCH PROJECTILES:
                    </span>
                    <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>
                      ({matchingBullets.length} available)
                    </span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={applyBulletSeatingDepth}
                      onChange={(e) => setApplyBulletSeatingDepth(e.target.checked)}
                      style={{ accentColor: 'var(--cad-cyan)' }}
                    />
                    <span>Set Seating Depth</span>
                  </label>
                </div>

                <input
                  type="text"
                  placeholder="Search all bullets (e.g. SMK, ELD-M, 175gr, Barnes, Lapua)..."
                  value={bulletSearchQuery}
                  onChange={(e) => setBulletSearchQuery(e.target.value)}
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '3px',
                    color: '#fff',
                    fontSize: '8.5px',
                    padding: '3px 6px',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />

                {activeBullet && (
                  <div
                    style={{
                      background: 'rgba(0, 210, 255, 0.12)',
                      border: '1px solid rgba(0, 210, 255, 0.45)',
                      borderRadius: '4px',
                      padding: '4px 6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      boxShadow: '0 0 10px rgba(0, 210, 255, 0.12)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '8.5px', fontWeight: 700, color: 'var(--cad-cyan)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Check size={10} /> LOADED: {activeBullet.name}
                      </span>
                      <span style={{ fontSize: '7.5px', color: '#fbbf24', fontWeight: 700 }}>
                        COAL: {cartridge.coal.toFixed(3)}"
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7.5px', color: 'var(--text-secondary)' }}>
                      <span>{activeBullet.weight_grains}gr (L: {activeBullet.length_inches}")</span>
                      <span>Seat: {cartridge.seating_depth}"</span>
                      <span>BC G1: {activeBullet.g1_bc}</span>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    maxHeight: '140px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    paddingRight: '2px',
                  }}
                >
                  {matchingBullets.length === 0 ? (
                    <div style={{ fontSize: '8.5px', color: 'var(--text-muted)', textAlign: 'center', padding: '6px' }}>
                      No factory bullet models found for {currentDia.toFixed(3)}". Search above to view all bullets.
                    </div>
                  ) : (
                    matchingBullets.map((bullet) => {
                      const isCurrentBullet =
                        Math.abs(cartridge.bullet_diameter - bullet.caliber_inches) < 0.003 &&
                        cartridge.bullet_weight_grains === bullet.weight_grains;

                      return (
                        <div
                          key={bullet.id}
                          onClick={() => handleApplyBulletPreset(bullet)}
                          style={{
                            background: isCurrentBullet ? 'rgba(0, 210, 255, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                            border: `1px solid ${isCurrentBullet ? 'var(--cad-cyan)' : 'rgba(255, 255, 255, 0.08)'}`,
                            borderRadius: '4px',
                            padding: '4px 6px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            transition: 'background 0.1s, border-color 0.1s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '9px', fontWeight: 700, color: isCurrentBullet ? '#fff' : 'var(--text-primary)' }}>
                              {bullet.name}
                            </span>
                            <span
                              style={{
                                fontSize: '7.5px',
                                padding: '1px 4px',
                                borderRadius: '3px',
                                background:
                                  bullet.category.includes('Match') || bullet.category.includes('ELD')
                                    ? 'rgba(0, 210, 255, 0.2)'
                                    : bullet.category.includes('Copper')
                                    ? 'rgba(240, 136, 62, 0.2)'
                                    : 'rgba(255, 255, 255, 0.08)',
                                color:
                                  bullet.category.includes('Match') || bullet.category.includes('ELD')
                                    ? 'var(--cad-cyan)'
                                    : bullet.category.includes('Copper')
                                    ? 'var(--cad-copper)'
                                    : 'var(--text-secondary)',
                              }}
                            >
                              {bullet.category.split(' ')[0]}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '8px', color: 'var(--text-secondary)' }}>
                            <span><strong style={{ color: '#fff' }}>{bullet.weight_grains}</strong> gr</span>
                            <span>L: <strong style={{ color: '#fff' }}>{bullet.length_inches.toFixed(3)}"</strong></span>
                            <span>G1 BC: <strong style={{ color: '#34d399' }}>{bullet.g1_bc.toFixed(3)}</strong></span>
                            <span>Seat: <strong>{bullet.recommended_seating_depth.toFixed(3)}"</strong></span>
                          </div>
                          {bullet.profile_notes && (
                            <div style={{ fontSize: '7.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              {bullet.profile_notes}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {editingDim.key === 'shoulder_angle' && (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '5px',
              padding: '5px 7px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--cad-brass)' }}>
              STANDARD SHOULDER ANGLES:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '3px' }}>
              {STANDARD_SHOULDER_ANGLES.map((ang) => {
                const isActive = Math.abs(editingDim.displayVal - ang.val) < 0.1;
                return (
                  <button
                    key={ang.label}
                    type="button"
                    onClick={() => handleApplyDimChange(ang.val)}
                    style={{
                      background: isActive ? 'rgba(218, 165, 32, 0.3)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${isActive ? 'var(--cad-brass)' : 'rgba(255, 255, 255, 0.1)'}`,
                      color: isActive ? '#fff' : 'var(--text-secondary)',
                      borderRadius: '3px',
                      padding: '3px 1px',
                      fontSize: '9px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {ang.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {(editingDim.key === 'shoulder_angle' ||
          editingDim.key === 'shoulder_start_diameter' ||
          editingDim.key === 'shoulder_length') && (
          <div
            style={{
              background: 'rgba(0, 210, 255, 0.05)',
              border: '1px solid rgba(0, 210, 255, 0.18)',
              borderRadius: '4px',
              padding: '5px 7px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--cad-cyan)', letterSpacing: '0.4px' }}>
              SHOULDER CONVERSION OPTIONS:
            </div>
            {!isStraightWall(cartridge) ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                <button
                  id="btn-popover-remove-shoulder-taper"
                  onClick={() => {
                    if (onUpdateCartridge) {
                      onUpdateCartridge({
                        ...cartridge,
                        body_length: cartridge.case_length,
                        shoulder_length: 0.0,
                        shoulder_angle: 0.0,
                        shoulder_start_diameter: cartridge.neck_diameter_mouth,
                        neck_diameter_base: cartridge.neck_diameter_mouth,
                      });
                    }
                    onClose();
                  }}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--cad-cyan)',
                    color: 'var(--cad-cyan)',
                    borderRadius: '4px',
                    padding: '3px',
                    fontSize: '9px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <ShieldOff size={11} />
                  <span>Taper to Mouth</span>
                </button>

                <button
                  id="btn-popover-remove-shoulder-cylinder"
                  onClick={() => {
                    if (onUpdateCartridge) {
                      const baseDia = cartridge.base_diameter;
                      const bulletDia = Math.max(
                        0.170,
                        Math.round((baseDia - 2 * cartridge.neck_wall_thickness) * 1000) / 1000
                      );
                      onUpdateCartridge({
                        ...cartridge,
                        body_length: cartridge.case_length,
                        shoulder_length: 0.0,
                        shoulder_angle: 0.0,
                        shoulder_start_diameter: baseDia,
                        neck_diameter_base: baseDia,
                        neck_diameter_mouth: baseDia,
                        bullet_diameter: bulletDia,
                      });
                    }
                    onClose();
                  }}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--cad-cyan)',
                    color: 'var(--cad-cyan)',
                    borderRadius: '4px',
                    padding: '3px',
                    fontSize: '9px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <ShieldOff size={11} />
                  <span>Full Cylinder (P₁)</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                <button
                  id="btn-popover-add-shoulder-20"
                  onClick={() => {
                    if (onUpdateCartridge) {
                      const l3 = cartridge.case_length;
                      const p1 = cartridge.base_diameter;
                      const h2 = cartridge.neck_diameter_mouth;
                      onUpdateCartridge({
                        ...cartridge,
                        body_length: Math.max(0.600, l3 - 0.380),
                        shoulder_length: 0.140,
                        shoulder_angle: 20.0,
                        shoulder_start_diameter: Math.max(p1 * 0.965, h2 + 0.020),
                        neck_diameter_base: h2,
                      });
                    }
                    onClose();
                  }}
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px', padding: '3px', fontSize: '9px', fontWeight: 600, cursor: 'pointer' }}
                >
                  +20° Standard
                </button>
                <button
                  id="btn-popover-add-shoulder-30"
                  onClick={() => {
                    if (onUpdateCartridge) {
                      const l3 = cartridge.case_length;
                      const p1 = cartridge.base_diameter;
                      const h2 = cartridge.neck_diameter_mouth;
                      onUpdateCartridge({
                        ...cartridge,
                        body_length: Math.max(0.600, l3 - 0.350),
                        shoulder_length: 0.100,
                        shoulder_angle: 30.0,
                        shoulder_start_diameter: Math.max(p1 * 0.980, h2 + 0.020),
                        neck_diameter_base: h2,
                      });
                    }
                    onClose();
                  }}
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px', padding: '3px', fontSize: '9px', fontWeight: 600, cursor: 'pointer' }}
                >
                  +30° Match
                </button>
                <button
                  id="btn-popover-add-shoulder-40"
                  onClick={() => {
                    if (onUpdateCartridge) {
                      const l3 = cartridge.case_length;
                      const p1 = cartridge.base_diameter;
                      const h2 = cartridge.neck_diameter_mouth;
                      onUpdateCartridge({
                        ...cartridge,
                        body_length: Math.max(0.600, l3 - 0.320),
                        shoulder_length: 0.075,
                        shoulder_angle: 40.0,
                        shoulder_start_diameter: Math.max(p1 * 0.980, h2 + 0.020),
                        neck_diameter_base: h2,
                      });
                    }
                    onClose();
                  }}
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px', padding: '3px', fontSize: '9px', fontWeight: 600, cursor: 'pointer' }}
                >
                  +40° Ackley
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          flexShrink: 0,
          paddingTop: '8px',
          marginTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
          }}
        >
          <button
            id="btn-undo-to-initial"
            onClick={handleUndoToInitial}
            disabled={!isDifferentFromInitial}
            title={`Revert to initial dimension: ${initialDisplay}${editingDim.isAngle ? '°' : isMetric ? 'mm' : '"'}`}
            style={{
              flex: 1,
              minWidth: 0,
              background: isDifferentFromInitial ? 'rgba(0, 210, 255, 0.1)' : 'transparent',
              border: `1px solid ${isDifferentFromInitial ? 'rgba(0, 210, 255, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
              color: isDifferentFromInitial ? 'var(--cad-cyan)' : 'var(--text-muted)',
              borderRadius: '4px',
              padding: '4px 6px',
              fontSize: '9.5px',
              fontWeight: 600,
              cursor: isDifferentFromInitial ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              opacity: isDifferentFromInitial ? 1 : 0.35,
              transition: 'all 0.15s',
              overflow: 'hidden',
            }}
          >
            <RotateCcw size={11} style={{ flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Revert ({initialDisplay}{editingDim.isAngle ? '°' : isMetric ? 'mm' : '"'})
            </span>
          </button>

          {presetDisplay !== undefined && (
            <button
              id="btn-reset-to-preset"
              onClick={handleResetToPreset}
              disabled={!isDifferentFromPreset}
              title={`Reset to factory SAAMI/CIP spec: ${presetDisplay}${editingDim.isAngle ? '°' : isMetric ? 'mm' : '"'}`}
              style={{
                flex: 1,
                minWidth: 0,
                background: isDifferentFromPreset ? 'rgba(240, 136, 62, 0.1)' : 'transparent',
                border: `1px solid ${isDifferentFromPreset ? 'rgba(240, 136, 62, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                color: isDifferentFromPreset ? 'var(--cad-copper)' : 'var(--text-muted)',
                borderRadius: '4px',
                padding: '4px 6px',
                fontSize: '9.5px',
                fontWeight: 600,
                cursor: isDifferentFromPreset ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                opacity: isDifferentFromPreset ? 1 : 0.35,
                transition: 'all 0.15s',
                overflow: 'hidden',
              }}
            >
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Spec ({presetDisplay}{editingDim.isAngle ? '°' : isMetric ? 'mm' : '"'})
              </span>
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            id="btn-cancel-measurement"
            onClick={handleRevertAndClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: '4px',
              padding: '4px 12px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            id="btn-done-measurement"
            onClick={onClose}
            style={{
              background: 'var(--cad-cyan)',
              border: 'none',
              color: '#0a0d13',
              borderRadius: '4px',
              padding: '4px 16px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Check size={13} />
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const stepperStyle: React.CSSProperties = {
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border-color)',
  borderRadius: '4px',
  color: 'var(--text-secondary)',
  fontSize: '10px',
  fontFamily: 'var(--font-mono)',
  padding: '4px 2px',
  cursor: 'pointer',
  textAlign: 'center',
};
