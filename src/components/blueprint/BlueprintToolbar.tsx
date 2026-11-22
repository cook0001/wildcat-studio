import React, { useState, useEffect, useRef } from 'react';
import { DraftingStandard, ToleranceDisplayMode } from '../../types/cartridge';
import {
  Check,
  Layers,
  Eye,
  EyeOff,
  Grid,
  Shield,
  SplitSquareVertical,
  Compass,
  Box,
  Disc,
  Scale,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sliders,
  LucideIcon,
} from 'lucide-react';

export type DrawingMode = 'outline' | 'wireframe' | 'cutaway' | 'half_section' | 'chamber_fit';

const MODE_ITEMS: { id: DrawingMode; label: string; icon: LucideIcon; desc: string }[] = [
  { id: 'outline', label: 'Outline', icon: Box, desc: 'Exterior SAAMI/CIP Silhouette' },
  { id: 'wireframe', label: 'Wireframe', icon: Grid, desc: 'CAD Wireframe with Internal Lines' },
  { id: 'cutaway', label: 'Cutaway', icon: SplitSquareVertical, desc: 'Full Longitudinal Cross-Section' },
  { id: 'half_section', label: 'Half-Section', icon: Disc, desc: 'ISO Half-Section (Cutaway / Solid)' },
  { id: 'chamber_fit', label: 'Chamber Fit', icon: Shield, desc: 'Cartridge in Reamer Chamber' },
];

const TOL_ITEMS: { id: ToleranceDisplayMode; label: string; short: string; desc: string }[] = [
  { id: 'nominal', label: 'Nominal Spec', short: 'Nom', desc: 'Nominal Blueprint Dimension Spec' },
  { id: 'cartridge_max', label: 'Max Cartridge (MMC)', short: 'Max Cart', desc: 'Maximum Material Condition Boundary' },
  { id: 'chamber_min', label: 'Min Chamber (LMC)', short: 'Min Cham', desc: 'Minimum Material Condition Reamer' },
  { id: 'clearance', label: 'Clearance Fit Band', short: 'Clearance', desc: 'Chamber Min - Cartridge Max Delta' },
  { id: 'dual_envelope', label: 'Dual Envelope (MMC + LMC)', short: 'Dual Envelope', desc: 'Simultaneous Max Cartridge & Min Chamber Tolerance Lines' },
];

interface BlueprintToolbarProps {
  activeDrawingMode: DrawingMode;
  onSetDrawingMode: (mode: DrawingMode) => void;
  activeShowChamber: boolean;
  onToggleChamber: () => void;
  activeShowDimensions: boolean;
  onToggleDimensions: () => void;
  activeShowBullet: boolean;
  onToggleBullet: () => void;
  activeShowGrid: boolean;
  onToggleGrid: () => void;
  activeStandard: DraftingStandard;
  onSetStandard: (std: DraftingStandard) => void;
  activeTolerance: ToleranceDisplayMode;
  onSetTolerance: (mode: ToleranceDisplayMode) => void;
}

export const BlueprintToolbar: React.FC<BlueprintToolbarProps> = ({
  activeDrawingMode,
  onSetDrawingMode,
  activeShowChamber,
  onToggleChamber,
  activeShowDimensions,
  onToggleDimensions,
  activeShowBullet,
  onToggleBullet,
  activeShowGrid,
  onToggleGrid,
  activeStandard,
  onSetStandard,
  activeTolerance,
  onSetTolerance,
}) => {
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('wildcat_cad_toolbar_collapsed') === 'true';
  });
  const [activeDropdown, setActiveDropdown] = useState<'mode' | 'layers' | 'tolerance' | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const toggleToolbarCollapse = () => {
    setIsToolbarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('wildcat_cad_toolbar_collapsed', String(next));
      if (next) setActiveDropdown(null);
      return next;
    });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (isToolbarCollapsed) {
    return (
      <div
        id="cad-mode-toolbar-collapsed"
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          zIndex: 20,
        }}
      >
        <button
          id="btn-expand-cad-toolbar"
          onClick={toggleToolbarCollapse}
          title="Expand CAD Drafting Tools & Layers"
          style={{
            background: 'rgba(15, 20, 31, 0.92)',
            WebkitBackdropFilter: 'blur(10px)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '5px 10px',
            color: 'var(--cad-cyan)',
            fontSize: '11px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--cad-cyan)';
            e.currentTarget.style.background = 'rgba(20, 30, 48, 0.95)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.background = 'rgba(15, 20, 31, 0.92)';
          }}
        >
          <Sliders size={13} />
          <span>CAD Tools</span>
          <ChevronRight size={13} color="var(--text-muted)" />
        </button>
      </div>
    );
  }

  const currentMode = MODE_ITEMS.find((m) => m.id === activeDrawingMode) || MODE_ITEMS[0];
  const ModeIcon = currentMode.icon;
  const activeCount = [activeShowChamber, activeShowDimensions, activeShowBullet, activeShowGrid].filter(Boolean).length;
  const currentTol = TOL_ITEMS.find((t) => t.id === activeTolerance) || TOL_ITEMS[0];
  const isNonNominal = activeTolerance !== 'nominal';

  return (
    <div
      ref={toolbarRef}
      id="cad-mode-toolbar"
      style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        background: 'rgba(15, 20, 31, 0.94)',
        WebkitBackdropFilter: 'blur(12px)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '4px 6px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)',
      }}
    >
      <button
        id="btn-collapse-cad-toolbar"
        onClick={toggleToolbarCollapse}
        title="Collapse CAD Toolbar to Save Canvas Space"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.12s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#fff';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-muted)';
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <ChevronLeft size={14} />
      </button>

      <div style={{ width: '1px', height: '16px', background: 'var(--border-color)', margin: '0 2px' }} />

      <div style={{ position: 'relative' }}>
        <button
          id="btn-mode-dropdown"
          onClick={() => setActiveDropdown(activeDropdown === 'mode' ? null : 'mode')}
          title="Select 2D Vector CAD Drafting Mode"
          style={{
            background: 'rgba(0, 210, 255, 0.12)',
            border: '1px solid rgba(0, 210, 255, 0.3)',
            borderRadius: '4px',
            color: 'var(--cad-cyan)',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            transition: 'all 0.12s',
          }}
        >
          <ModeIcon size={12} strokeWidth={2.4} />
          <span>{currentMode.label}</span>
          <ChevronDown
            size={11}
            style={{
              transform: activeDropdown === 'mode' ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s',
            }}
          />
        </button>

        {activeDropdown === 'mode' && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              background: 'rgba(15, 23, 42, 0.98)',
              WebkitBackdropFilter: 'blur(16px)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '4px',
              minWidth: '220px',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.8), 0 0 16px rgba(0, 210, 255, 0.15)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <div style={{ fontSize: '9.5px', fontWeight: 700, color: 'var(--text-muted)', padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              CAD Drafting Mode
            </div>
            {MODE_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeDrawingMode === item.id;
              return (
                <button
                  key={item.id}
                  id={`btn-mode-select-${item.id}`}
                  onClick={() => {
                    onSetDrawingMode(item.id);
                    setActiveDropdown(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    background: isActive ? 'rgba(0, 210, 255, 0.15)' : 'transparent',
                    border: 'none',
                    color: isActive ? 'var(--cad-cyan)' : 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon size={14} strokeWidth={isActive ? 2.5 : 2} color={isActive ? 'var(--cad-cyan)' : 'var(--text-secondary)'} />
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: isActive ? 700 : 500 }}>{item.label}</div>
                      <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>{item.desc}</div>
                    </div>
                  </div>
                  {isActive && <Check size={12} color="var(--cad-cyan)" strokeWidth={2.5} />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ width: '1px', height: '16px', background: 'var(--border-color)', margin: '0 2px' }} />

      <div style={{ position: 'relative' }}>
        <button
          id="btn-layers-dropdown"
          onClick={() => setActiveDropdown(activeDropdown === 'layers' ? null : 'layers')}
          title="Toggle Blueprint Layer Overlays"
          style={{
            background: activeCount > 0 ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            color: 'var(--text-primary)',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            transition: 'all 0.12s',
          }}
        >
          <Layers size={12} strokeWidth={2} color="var(--cad-cyan)" />
          <span>Layers</span>
          <span
            style={{
              fontSize: '9.5px',
              fontFamily: 'var(--font-mono)',
              background: 'rgba(0, 210, 255, 0.18)',
              color: 'var(--cad-cyan)',
              padding: '1px 4px',
              borderRadius: '3px',
              fontWeight: 700,
            }}
          >
            {activeCount}/4
          </span>
          <ChevronDown
            size={11}
            style={{
              transform: activeDropdown === 'layers' ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s',
            }}
          />
        </button>

        {activeDropdown === 'layers' && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              background: 'rgba(15, 23, 42, 0.98)',
              WebkitBackdropFilter: 'blur(16px)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '4px',
              minWidth: '210px',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.8), 0 0 16px rgba(0, 210, 255, 0.15)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <div style={{ fontSize: '9.5px', fontWeight: 700, color: 'var(--text-muted)', padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Visibility Layers
            </div>

            <button
              id="btn-toggle-chamber"
              onClick={onToggleChamber}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: '4px',
                background: activeShowChamber ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                border: 'none',
                color: activeShowChamber ? '#eab308' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: activeShowChamber ? 700 : 500,
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => {
                if (!activeShowChamber) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              }}
              onMouseLeave={(e) => {
                if (!activeShowChamber) e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={13} strokeWidth={2.2} color={activeShowChamber ? '#eab308' : 'var(--text-muted)'} />
                <span>Chamber Overlay</span>
              </div>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {activeShowChamber ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              id="btn-toggle-dimensions"
              onClick={onToggleDimensions}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: '4px',
                background: activeShowDimensions ? 'rgba(0, 210, 255, 0.15)' : 'transparent',
                border: 'none',
                color: activeShowDimensions ? 'var(--cad-cyan)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: activeShowDimensions ? 700 : 500,
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => {
                if (!activeShowDimensions) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              }}
              onMouseLeave={(e) => {
                if (!activeShowDimensions) e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass size={13} strokeWidth={2.2} color={activeShowDimensions ? 'var(--cad-cyan)' : 'var(--text-muted)'} />
                <span>Dimension Callouts</span>
              </div>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {activeShowDimensions ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              id="btn-toggle-bullet"
              onClick={onToggleBullet}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: '4px',
                background: activeShowBullet ? 'rgba(240, 136, 62, 0.15)' : 'transparent',
                border: 'none',
                color: activeShowBullet ? 'var(--cad-copper)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: activeShowBullet ? 700 : 500,
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => {
                if (!activeShowBullet) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              }}
              onMouseLeave={(e) => {
                if (!activeShowBullet) e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {activeShowBullet ? <Eye size={13} strokeWidth={2.2} color="var(--cad-copper)" /> : <EyeOff size={13} strokeWidth={2.2} color="var(--text-muted)" />}
                <span>Seated Bullet</span>
              </div>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {activeShowBullet ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              id="btn-toggle-grid"
              onClick={onToggleGrid}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: '4px',
                background: activeShowGrid ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                border: 'none',
                color: activeShowGrid ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: activeShowGrid ? 700 : 500,
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => {
                if (!activeShowGrid) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              }}
              onMouseLeave={(e) => {
                if (!activeShowGrid) e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Grid size={13} strokeWidth={2.2} color={activeShowGrid ? '#fff' : 'var(--text-muted)'} />
                <span>CAD Gridlines</span>
              </div>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {activeShowGrid ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        )}
      </div>

      <div style={{ width: '1px', height: '16px', background: 'var(--border-color)', margin: '0 2px' }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '4px',
          border: '1px solid var(--border-color)',
          padding: '1px',
        }}
      >
        <button
          id="btn-std-saami"
          onClick={() => onSetStandard('saami')}
          title="American SAAMI Standard (Datum Headspace Circle, Inches, ANSI Callouts)"
          style={{
            background: activeStandard === 'saami' ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
            border: 'none',
            borderRadius: '3px',
            color: activeStandard === 'saami' ? '#60a5fa' : 'var(--text-muted)',
            padding: '3px 6px',
            fontSize: '10px',
            fontWeight: activeStandard === 'saami' ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.1s',
          }}
        >
          SAAMI
        </button>
        <button
          id="btn-std-cip"
          onClick={() => onSetStandard('cip')}
          title="European C.I.P. Standard (L1-L6, P1-P2, H1-H2, Delta L Safety)"
          style={{
            background: activeStandard === 'cip' ? 'rgba(168, 85, 247, 0.3)' : 'transparent',
            border: 'none',
            borderRadius: '3px',
            color: activeStandard === 'cip' ? '#c084fc' : 'var(--text-muted)',
            padding: '3px 6px',
            fontSize: '10px',
            fontWeight: activeStandard === 'cip' ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.1s',
          }}
        >
          C.I.P.
        </button>
      </div>

      <div style={{ width: '1px', height: '16px', background: 'var(--border-color)', margin: '0 2px' }} />

      <div style={{ position: 'relative' }}>
        <button
          id="btn-tol-dropdown"
          onClick={() => setActiveDropdown(activeDropdown === 'tolerance' ? null : 'tolerance')}
          title="Select Blueprint Tolerance Condition (MMC / LMC / Clearance)"
          style={{
            background: isNonNominal ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
            border: `1px solid ${isNonNominal ? '#10b981' : 'var(--border-color)'}`,
            borderRadius: '4px',
            color: isNonNominal ? '#34d399' : 'var(--text-secondary)',
            padding: '4px 7px',
            fontSize: '11px',
            fontWeight: isNonNominal ? 700 : 500,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            transition: 'all 0.12s',
          }}
        >
          <Scale size={12} color={isNonNominal ? '#34d399' : 'var(--text-muted)'} />
          <span>{currentTol.short}</span>
          <ChevronDown
            size={11}
            style={{
              transform: activeDropdown === 'tolerance' ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s',
            }}
          />
        </button>

        {activeDropdown === 'tolerance' && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              background: 'rgba(15, 23, 42, 0.98)',
              WebkitBackdropFilter: 'blur(16px)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '4px',
              minWidth: '230px',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.8), 0 0 16px rgba(16, 185, 129, 0.15)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <div style={{ fontSize: '9.5px', fontWeight: 700, color: 'var(--text-muted)', padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Manufacturing Tolerance Matrix
            </div>
            {TOL_ITEMS.map((tol) => {
              const isActive = activeTolerance === tol.id;
              return (
                <button
                  key={tol.id}
                  id={`btn-tol-select-${tol.id}`}
                  onClick={() => {
                    onSetTolerance(tol.id);
                    setActiveDropdown(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    background: isActive ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
                    border: 'none',
                    color: isActive ? '#34d399' : 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: isActive ? 700 : 500 }}>{tol.label}</div>
                    <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>{tol.desc}</div>
                  </div>
                  {isActive && <Check size={12} color="#34d399" strokeWidth={2.5} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
