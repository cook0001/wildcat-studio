import React from 'react';

interface LittleBoySvgProps {
  originX: number;
  centerY: number;
  rRim: number;
  scale: number;
  pxMouth: number;
  pxTip: number;
  caseLength: number;
  isCutaway: boolean;
}

export const LittleBoySvg: React.FC<LittleBoySvgProps> = React.memo(({
  originX,
  centerY,
  rRim,
  scale,
  pxMouth,
  pxTip,
  caseLength,
  isCutaway,
}) => (
  <g id="little-boy-cad-model">
    <g id="little-boy-box-fins">
      <rect
        x={originX}
        y={centerY - rRim * 1.4}
        width={1.8 * scale}
        height={rRim * 0.5}
        fill="#1f2937"
        stroke="#475569"
        strokeWidth="1.5"
      />
      <rect
        x={originX}
        y={centerY + rRim * 0.9}
        width={1.8 * scale}
        height={rRim * 0.5}
        fill="#1f2937"
        stroke="#475569"
        strokeWidth="1.5"
      />
      <rect
        x={originX + 0.2 * scale}
        y={centerY - rRim * 1.42}
        width={1.2 * scale}
        height={rRim * 2.84}
        fill="none"
        stroke="#64748b"
        strokeWidth="3.5"
        rx="2"
      />
      <line
        x1={originX + 0.8 * scale}
        y1={centerY - rRim * 1.42}
        x2={originX + 0.8 * scale}
        y2={centerY + rRim * 1.42}
        stroke="#94a3b8"
        strokeWidth="2"
      />
    </g>

    <rect
      x={originX + 1.5 * scale}
      y={centerY - rRim}
      width={(caseLength - 1.5) * scale}
      height={rRim * 2}
      fill="url(#littleBoyGradient)"
      stroke="#64748b"
      strokeWidth="2"
      rx="4"
    />

    <path
      d={`
        M ${pxMouth} ${centerY - rRim}
        Q ${pxTip} ${centerY - rRim * 0.85}, ${pxTip} ${centerY}
        Q ${pxTip} ${centerY + rRim * 0.85}, ${pxMouth} ${centerY + rRim}
        Z
      `}
      fill="url(#littleBoyGradient)"
      stroke="#94a3b8"
      strokeWidth="2"
    />

    <g id="little-boy-antenna-probes" stroke="#cbd5e1" strokeWidth="1.5">
      <line x1={pxTip - 0.1 * scale} y1={centerY - rRim * 0.5} x2={pxTip + 0.5 * scale} y2={centerY - rRim * 0.75} />
      <line x1={pxTip + 0.35 * scale} y1={centerY - rRim * 0.9} x2={pxTip + 0.35 * scale} y2={centerY - rRim * 0.6} />
      <line x1={pxTip - 0.1 * scale} y1={centerY + rRim * 0.5} x2={pxTip + 0.5 * scale} y2={centerY + rRim * 0.75} />
      <line x1={pxTip + 0.35 * scale} y1={centerY + rRim * 0.9} x2={pxTip + 0.35 * scale} y2={centerY + rRim * 0.6} />
    </g>

    <rect
      x={originX + (caseLength / 2) * scale - 0.2 * scale}
      y={centerY - rRim - 0.25 * scale}
      width={0.4 * scale}
      height={0.25 * scale}
      fill="#475569"
      stroke="#94a3b8"
      strokeWidth="1.5"
      rx="3"
    />
    <circle
      cx={originX + (caseLength / 2) * scale}
      cy={centerY - rRim - 0.12 * scale}
      r={0.06 * scale}
      fill="#0a0d13"
    />

    <text
      x={originX + 2.5 * scale}
      y={centerY - rRim * 0.35}
      fill="#e2e8f0"
      fontSize="12"
      fontFamily="var(--font-mono)"
      fontWeight="bold"
      letterSpacing="1.5"
    >
      ORDNANCE BOMB MK-I (L-11)
    </text>
    <text
      x={originX + 2.5 * scale}
      y={centerY + rRim * 0.45}
      fill="#94a3b8"
      fontSize="9"
      fontFamily="var(--font-mono)"
    >
      GUN-TYPE URANIUM-235 CRITICAL MASS
    </text>

    {isCutaway && (
      <g id="little-boy-gun-cutaway">
        <rect
          x={originX + 2.0 * scale}
          y={centerY - 0.35 * scale}
          width={(caseLength - 2.8) * scale}
          height={0.7 * scale}
          fill="#334155"
          stroke="#00d2ff"
          strokeWidth="1.5"
        />
        <rect
          x={originX + 2.0 * scale}
          y={centerY - 0.3 * scale}
          width={1.2 * scale}
          height={0.6 * scale}
          fill="url(#powderHatch)"
          stroke="#ea580c"
          strokeWidth="1"
        />
        <rect
          x={originX + 3.2 * scale}
          y={centerY - 0.28 * scale}
          width={0.9 * scale}
          height={0.56 * scale}
          fill="#10b981"
          stroke="#34d399"
          strokeWidth="1.5"
        />
        <rect
          x={originX + (caseLength - 1.8) * scale}
          y={centerY - 0.28 * scale}
          width={0.9 * scale}
          height={0.56 * scale}
          fill="#10b981"
          stroke="#34d399"
          strokeWidth="1.5"
        />
        <text
          x={originX + 2.6 * scale}
          y={centerY + 0.6 * scale}
          fill="#f59e0b"
          fontSize="8.5"
          fontFamily="var(--font-mono)"
          fontWeight="bold"
        >
          CORDITE CHARGE
        </text>
        <text
          x={originX + (caseLength - 2.2) * scale}
          y={centerY + 0.6 * scale}
          fill="#10b981"
          fontSize="8.5"
          fontFamily="var(--font-mono)"
          fontWeight="bold"
        >
          U-235 TARGET
        </text>
      </g>
    )}
  </g>
));
