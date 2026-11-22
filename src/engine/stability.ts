import { CartridgeSpec, StabilityOptions, StabilityResult } from '../types/cartridge';
import { resolveBulletProfile } from './bullet';

/**
 * Courtney-Miller Modified Gyroscopic Stability Formula (Sg) & Bryan Litz Spin Drift.
 *
 * Sg0 = (30 * m) / (t^2 * d^3 * l_total * (1 + l_metal^2))
 *   where l_metal = (L_total - L_plastic_tip) / d (reduces to standard Miller when tip = 0)
 * Velocity factor (Don Miller 2005): fv = (v / 2800)^(1/3)
 * Atmospheric factor (ICAO STP = 59 F, 29.92 inHg): ftp = ((T_F + 460) / 519) * (29.92 / P_inHg)
 * Bryan Litz spin drift (inches): SD = 1.25 * (Sg + 1.2) * TOF^1.83
 */
export function calculateMillerStability(
  spec: CartridgeSpec,
  twistInches: number,
  velocityFps = 2800,
  options: StabilityOptions = {}
): StabilityResult {
  const m = Math.max(1, spec.bullet_weight_grains || 150);
  const d = Math.max(0.100, spec.bullet_diameter);
  const totalLen = spec.bullet_length > 0 ? spec.bullet_length : d * 3.2;
  const profile = resolveBulletProfile(spec);

  const material = options.material ?? profile.material;
  const plasticTipLen =
    options.plasticTipLengthIn !== undefined
      ? Math.max(0, Math.min(totalLen * 0.30, options.plasticTipLengthIn))
      : material === 'polymer_tip'
      ? profile.plastic_tip_length_in
      : 0;

  const lTotal = totalLen / d;
  const lMetal = Math.max(0.5, (totalLen - plasticTipLen) / d);
  const t = Math.max(1, twistInches) / d;

  const denom = t * t * Math.pow(d, 3) * lTotal * (1 + lMetal * lMetal);
  const sgBase = denom > 0 ? (30 * m) / denom : 1.0;

  const velFactor = Math.cbrt(Math.max(400, velocityFps) / 2800.0);

  const tempF = options.temperatureF ?? 59.0;
  const pressureInHg = Math.max(15.0, options.pressureInHg ?? 29.92);
  const atmFactor = ((tempF + 460.0) / 519.0) * (29.92 / pressureInHg);

  const sgStp = sgBase * velFactor;
  const sgCorrected = sgStp * atmFactor;
  const sgRounded = Math.round(sgCorrected * 100) / 100;

  let status: 'unstable' | 'marginal' | 'stable' | 'over_stabilized';
  let description: string;

  if (sgRounded < 1.0) {
    status = 'unstable';
    description = 'Unstable (bullet will yaw or keyhole in flight)';
  } else if (sgRounded < 1.5) {
    status = 'marginal';
    description = 'Marginal stability (safe to shoot, but BC degradation occurs below Sg 1.5)';
  } else if (sgRounded <= 2.5) {
    status = 'stable';
    description = 'Fully stable (full BC retention across temperature and altitude swings)';
  } else {
    status = 'over_stabilized';
    description = 'High stability (increased spin drift and jacket RPM stress at high velocities)';
  }

  // Optimal twist for target Sg = 1.50 under active conditions
  const targetSg = 1.5;
  const optDenom = targetSg * Math.pow(d, 3) * lTotal * (1 + lMetal * lMetal);
  const optT2 = optDenom > 0 ? (30 * m * velFactor * atmFactor) / optDenom : 0;
  const optTwist = optT2 > 0 ? Math.sqrt(optT2) * d : 10.0;

  const spinRpm = Math.round((velocityFps * 720) / Math.max(1, twistInches));
  const tofSeconds = Math.max(0, options.tofSeconds ?? 1.0);
  const sign = options.twistDirection === 'left' ? -1 : 1;
  const spinDrift = tofSeconds > 0 ? sign * 1.25 * (sgCorrected + 1.2) * Math.pow(tofSeconds, 1.83) : 0;

  return {
    bullet_mass_grains: m,
    bullet_length_inches: Math.round(totalLen * 1000) / 1000,
    twist_rate_inches: twistInches,
    velocity_fps: velocityFps,
    sg_stp: Math.round(sgStp * 100) / 100,
    sg: sgRounded,
    velocity_factor: Math.round(velFactor * 1000) / 1000,
    atmospheric_factor: Math.round(atmFactor * 1000) / 1000,
    spin_rpm: spinRpm,
    spin_drift_inches: Math.round(spinDrift * 100) / 100,
    tof_seconds: Math.round(tofSeconds * 1000) / 1000,
    status,
    optimal_twist_inches: Math.round(optTwist * 10) / 10,
    description,
  };
}
