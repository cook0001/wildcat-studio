// Cartridge database types and taxonomy across 11 categories.

export type RimType = "rimless" | "rimmed" | "semi_rimmed" | "belted" | "rebated" | "rimfire";
export type DimensionStandard = "SAAMI" | "CIP" | "Wildcat";
export type UnitSystem = "imperial" | "metric";
export type BulletOgiveType = "tangent" | "secant" | "hybrid" | "round_nose" | "flat_nose" | "spitzer";
export type BulletMaterial = "lead_core" | "monolithic_copper" | "solid_brass" | "polymer_tip";

export interface BulletProfile {
  base_type: "flat_base" | "boat_tail";
  boat_tail_length_in: number;
  boat_tail_base_dia_in: number;
  ogive_type: BulletOgiveType;
  ogive_radius_calibers: number;
  meplat_diameter_in: number;
  bearing_surface_length_in?: number;
  material: BulletMaterial;
  plastic_tip_length_in: number;
}

export interface ChamberOverrides {
  bore_diameter?: number;
  groove_diameter?: number;
  num_grooves?: number;
  groove_width_ratio?: number;
  base_clearance?: number;
  shoulder_clearance?: number;
  neck_clearance?: number;
  length_clearance?: number;
  rim_dia_clearance?: number;
  rim_depth_clearance?: number;
  headspace_clearance?: number;
  freebore_diameter?: number;
  freebore_length?: number;
  leade_angle_deg?: number;
}

export interface CartridgeSpec {
  id: string;
  name: string;
  category: string;
  standard: DimensionStandard;
  units: UnitSystem;
  rim_type: RimType;
  rim_diameter: number;            // R1
  rim_thickness: number;           // t_rim (R)
  extractor_diameter: number;      // E1
  extractor_width: number;         // e
  extractor_angle: number;         // beta
  base_diameter: number;           // P1
  shoulder_start_diameter: number; // P2
  body_length: number;             // L1
  shoulder_length: number;         // L2 - L1
  shoulder_angle: number;          // alpha
  neck_diameter_base: number;      // H1
  neck_diameter_mouth: number;     // H2
  case_length: number;             // L3
  web_thickness: number;
  base_wall_thickness: number;
  neck_wall_thickness: number;
  primer_pocket_dia: number;
  primer_pocket_depth: number;
  flash_hole_dia: number;
  bullet_diameter: number;         // G1
  bullet_length: number;
  bullet_weight_grains: number;
  coal: number;                    // L6
  seating_depth: number;
  max_pressure_bar: number;
  belt_diameter?: number;          // Belted cases
  belt_width?: number;             // Belted cases
  shoulder_body_fillet_r?: number; // R1 body-to-shoulder fillet radius (in)
  shoulder_neck_fillet_r?: number; // R2 shoulder-to-neck fillet radius (in)
  datum_diameter?: number;         // SAAMI/CIP headspace datum circle diameter (in)
  bore_diameter?: number;          // Land-to-land bore diameter (in)
  groove_diameter?: number;        // Groove-to-groove diameter (in)
  freebore_length?: number;        // Chamber freebore length (in)
  barrel_length_in?: number;       // Barrel length for expansion ratio (default 24")
  bullet_profile?: Partial<BulletProfile>;
  chamber_overrides?: ChamberOverrides;
  designer?: string;               // Wildcat cartridge designer / author
  parent_case?: string;            // Parent donor case
  notes?: string;                  // Engineering notes / design rationale
}

export interface VolumetricResult {
  overflow_capacity_grains_h2o: number;
  overflow_capacity_cm3: number;
  bullet_displacement_grains_h2o: number;
  bullet_displacement_cm3: number;
  usable_capacity_grains_h2o: number;
  usable_capacity_cm3: number;
  brass_case_weight_grains: number;
  brass_case_weight_grams: number;
  rifled_bore_area_sq_in: number;
  rifled_bore_area_mm2: number;
  barrel_length_in: number;
  sectional_density: number;
  expansion_ratio_24in: number;
  form_factor_est: number;
  g1_bc_est: number;
  g7_bc_est: number;
}

export interface ReamerSpec {
  chamber_rim_dia: number;
  chamber_rim_depth: number;
  chamber_base_dia: number;
  chamber_shoulder_dia: number;
  chamber_neck_dia: number;
  chamber_length: number;
  freebore_dia: number;
  freebore_length: number;
  leade_angle_deg: number;
  pilot_diameter: number;
  groove_diameter: number;
  headspace_clearance: number;
  rifled_bore_area_sq_in: number;
}

export interface ChamberCollisionIssue {
  severity: "error" | "warning";
  zone: string;
  message: string;
}

export interface ChamberCollisionReport {
  has_interference: boolean;
  min_radial_clearance_in: number;
  min_clearance_z_in: number;
  neck_clearance_in: number;
  base_clearance_in: number;
  shoulder_clearance_in: number;
  mouth_clearance_in: number;
  jam_coal_in: number;
  jump_to_lands_in: number;
  cbto_in: number;
  issues: ChamberCollisionIssue[];
}

export interface SetbackResult {
  can_rechamber_clean: boolean;
  required_setback_inches: number;
  required_setback_mm: number;
  interference_locations: string[];
}

export type DraftingStandard = "saami" | "cip";
export type ToleranceDisplayMode = "nominal" | "cartridge_max" | "chamber_min" | "clearance" | "dual_envelope";

export interface HeadspaceGaugeSpec {
  type: 'bottleneck' | 'belted' | 'rimmed' | 'straight_wall';
  datum_diameter: number;
  datum_length_nominal: number;
  go_gauge_inches: number;
  nogo_gauge_inches: number;
  field_gauge_inches: number;
  tolerance_inches: number;
}

export interface StabilityOptions {
  temperatureF?: number;
  pressureInHg?: number;
  plasticTipLengthIn?: number;
  material?: BulletMaterial;
  tofSeconds?: number;
  twistDirection?: 'right' | 'left';
}

export interface StabilityResult {
  bullet_mass_grains: number;
  bullet_length_inches: number;
  twist_rate_inches: number;
  velocity_fps: number;
  sg_stp: number;
  sg: number;
  velocity_factor: number;
  atmospheric_factor: number;
  spin_rpm: number;
  spin_drift_inches: number;
  tof_seconds: number;
  status: 'unstable' | 'marginal' | 'stable' | 'over_stabilized';
  optimal_twist_inches: number;
  description: string;
}

export interface CaseFormingResult {
  parent_name: string;
  wildcat_name: string;
  neck_diameter_change: number;
  predicted_neck_wall: number;
  original_neck_wall: number;
  loaded_neck_dia: number;
  chamber_neck_dia: number;
  neck_clearance: number;
  requires_neck_turning: boolean;
  doughnut_risk: 'none' | 'moderate' | 'high';
  doughnut_reason: string;
  trim_length_required: number;
  recommended_steps: string[];
}

export const CARTRIDGE_CATEGORIES = [
  "Military Service & Battle Rifle",
  "Precision Match, PRS & Benchrest",
  "AR-15 & Small Frame Tactical",
  "Standard American & European Hunting",
  "Magnums & Extreme Long Range (ELR)",
  "Dangerous Game & African Express",
  "Modern Straight-Wall, Subsonic & Lever Action",
  "Handgun, Pistol & PDW / Subgun",
  "Classic Wildcats & Ackley Improved",
  "Rimfire Calibers",
  "Classified"
] as const;

// Re-export all cartridge presets from the categorized data layer
export { CARTRIDGE_PRESETS, DEFAULT_CARTRIDGE_ID } from '../data/cartridges';
