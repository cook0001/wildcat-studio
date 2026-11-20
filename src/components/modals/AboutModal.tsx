import React, { useEffect, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { openExternalLink } from '../../utils/openExternal';
import { CARTRIDGE_PRESET_COUNT, getAppVersionLabel } from '../../utils/cartridgeHelpers';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLicense?: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, onOpenLicense }) => {
  const [version, setVersion] = useState<string>(typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.1.0');

  useEffect(() => {
    if (isOpen) {
      getAppVersionLabel().then(setVersion).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        WebkitBackdropFilter: 'blur(8px)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0d131f',
          border: '1px solid rgba(0, 210, 255, 0.3)',
          borderRadius: '8px',
          padding: '24px',
          width: '460px',
          maxWidth: '90vw',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 210, 255, 0.15)',
          position: 'relative'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
          title="Close dialog"
        >
          <X size={18} />
        </button>

        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
          Wildcat Studio
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--cad-cyan)', fontFamily: 'var(--font-mono)', marginBottom: '16px' }}>
          Version {version} (Cleanroom CAD Suite)
        </p>

        <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
          <p style={{ marginBottom: '10px' }}>
            Desktop cartridge design, chamber reamer modeling, and internal cutaway telemetry suite.
          </p>
          <ul style={{ paddingLeft: '18px', listStyleType: 'disc', marginBottom: '14px' }}>
            <li>{CARTRIDGE_PRESET_COUNT} SAAMI, CIP, and Custom Wildcat Presets</li>
            <li>QuickLOAD (<kbd>.vol</kbd>) and Universal QDF interchange</li>
            <li>Direct LoadBench (<kbd>.loadbench</kbd>) and RangeStudio Ballistics (<kbd>.rsb</kbd>) export</li>
            <li>AutoCAD vector (<kbd>.dxf</kbd>) geometry export</li>
            <li>Three.js solid modeler with 3D printable (<kbd>.stl</kbd>) mesh output</li>
            <li>Composite Simpson numerical volumetric engine</li>
          </ul>

          <div style={{
            background: 'rgba(0, 210, 255, 0.04)',
            border: '1px solid rgba(0, 210, 255, 0.2)',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '14px',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--cad-cyan)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ExternalLink size={13} /> ArmoryVault Firearms Ecosystem
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <a
                href="https://armstrader.store"
                target="_blank"
                rel="noreferrer"
                onClick={(e) => { e.preventDefault(); openExternalLink('https://armstrader.store'); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '11.5px',
                  textDecoration: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                }}
              >
                <span><strong>ArmsTrader</strong> — Firearm utilities, bill of sale & tools</span>
                <ExternalLink size={12} color="var(--cad-cyan)" />
              </a>

              <a
                href="https://armstrader.store/loadbench"
                target="_blank"
                rel="noreferrer"
                onClick={(e) => { e.preventDefault(); openExternalLink('https://armstrader.store/loadbench'); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '11.5px',
                  textDecoration: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                }}
              >
                <span><strong>LoadBench</strong> — Internal ballistics & reloading suite</span>
                <ExternalLink size={12} color="#3fb950" />
              </a>

              <a
                href="https://armstrader.store/rangestudio"
                target="_blank"
                rel="noreferrer"
                onClick={(e) => { e.preventDefault(); openExternalLink('https://armstrader.store/rangestudio'); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '11.5px',
                  textDecoration: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                }}
              >
                <span><strong>RangeStudio</strong> — Optical target telemetry & exterior ballistics</span>
                <ExternalLink size={12} color="#38bdf8" />
              </a>

              <a
                href="https://armstrader.store/armoryvault"
                target="_blank"
                rel="noreferrer"
                onClick={(e) => { e.preventDefault(); openExternalLink('https://armstrader.store/armoryvault'); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '11.5px',
                  textDecoration: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                }}
              >
                <span><strong>ArmoryVault</strong> — At-home firearms, ammo & accessories tracker</span>
                <ExternalLink size={12} color="var(--cad-cyan)" />
              </a>

              <a
                href="https://armstrader.store/companion"
                target="_blank"
                rel="noreferrer"
                onClick={(e) => { e.preventDefault(); openExternalLink('https://armstrader.store/companion'); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '11.5px',
                  textDecoration: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                }}
              >
                <span><strong>ArmoryVault Companion</strong> — Mobile companion app</span>
                <ExternalLink size={12} color="var(--cad-cyan)" />
              </a>
            </div>
          </div>

          <div style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(0, 210, 255, 0.2)',
            borderRadius: '6px',
            padding: '10px 12px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div>
              <strong style={{ color: '#fff' }}>MIT Open-Source License:</strong> Cleanroom implementation. All dimensional formulas derived from public domain SAAMI/CIP technical drawings and Don Miller ballistic equations.
            </div>
            {onOpenLicense && (
              <button
                onClick={onOpenLicense}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--cad-cyan)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  textAlign: 'left'
                }}
              >
                <span>View Full License Agreement & Legal Disclaimers →</span>
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: 'var(--cad-cyan)',
              color: '#0a0d14',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 16px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
