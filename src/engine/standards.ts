import { CartridgeSpec } from '../types/cartridge';

export interface CaliberBoreStandard {
  nominal_bullet_in: number;
  bore_dia_in: number;      // Land-to-land (SAAMI/CIP F)
  groove_dia_in: number;    // Groove-to-groove (SAAMI/CIP Z)
  num_grooves: number;
  groove_width_ratio: number;
  default_freebore_in: number;
  default_leade_deg: number;
}

export interface CartridgeStandardRef {
  datum_diameter?: number;
  bore_diameter?: number;
  groove_diameter?: number;
  num_grooves?: number;
  freebore_diameter?: number;
  freebore_length?: number;
  leade_angle_deg?: number;
  headspace_clearance?: number; // Axial headspace gap between nominal case & min chamber (in)
  nogo_offset?: number;         // NO-GO minus GO (in)
  field_offset?: number;        // FIELD minus GO (in)
  base_clearance?: number;
  shoulder_clearance?: number;
  neck_clearance?: number;
  length_clearance?: number;
}

// Published SAAMI/C.I.P. nominal bore (land) and groove diameters by bullet caliber.
export const CALIBER_BORE_TABLE: CaliberBoreStandard[] = [
  { nominal_bullet_in: 0.142, bore_dia_in: 0.1380, groove_dia_in: 0.1420, num_grooves: 6, groove_width_ratio: 0.50, default_freebore_in: 0.025, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.172, bore_dia_in: 0.1680, groove_dia_in: 0.1720, num_grooves: 6, groove_width_ratio: 0.50, default_freebore_in: 0.030, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.204, bore_dia_in: 0.1990, groove_dia_in: 0.2040, num_grooves: 6, groove_width_ratio: 0.50, default_freebore_in: 0.035, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.221, bore_dia_in: 0.2146, groove_dia_in: 0.2213, num_grooves: 4, groove_width_ratio: 0.50, default_freebore_in: 0.045, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.223, bore_dia_in: 0.2170, groove_dia_in: 0.2220, num_grooves: 6, groove_width_ratio: 0.50, default_freebore_in: 0.025, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.224, bore_dia_in: 0.2190, groove_dia_in: 0.2240, num_grooves: 6, groove_width_ratio: 0.50, default_freebore_in: 0.045, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.243, bore_dia_in: 0.2370, groove_dia_in: 0.2430, num_grooves: 6, groove_width_ratio: 0.50, default_freebore_in: 0.080, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.257, bore_dia_in: 0.2500, groove_dia_in: 0.2570, num_grooves: 6, groove_width_ratio: 0.50, default_freebore_in: 0.085, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.264, bore_dia_in: 0.2560, groove_dia_in: 0.2640, num_grooves: 6, groove_width_ratio: 0.50, default_freebore_in: 0.120, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.277, bore_dia_in: 0.2700, groove_dia_in: 0.2770, num_grooves: 6, groove_width_ratio: 0.50, default_freebore_in: 0.095, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.284, bore_dia_in: 0.2770, groove_dia_in: 0.2840, num_grooves: 6, groove_width_ratio: 0.50, default_freebore_in: 0.120, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.308, bore_dia_in: 0.3000, groove_dia_in: 0.3080, num_grooves: 4, groove_width_ratio: 0.50, default_freebore_in: 0.090, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.311, bore_dia_in: 0.3000, groove_dia_in: 0.3110, num_grooves: 4, groove_width_ratio: 0.50, default_freebore_in: 0.095, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.312, bore_dia_in: 0.3040, groove_dia_in: 0.3120, num_grooves: 6, groove_width_ratio: 0.50, default_freebore_in: 0.045, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.323, bore_dia_in: 0.3110, groove_dia_in: 0.3230, num_grooves: 4, groove_width_ratio: 0.50, default_freebore_in: 0.110, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.338, bore_dia_in: 0.3300, groove_dia_in: 0.3380, num_grooves: 6, groove_width_ratio: 0.50, default_freebore_in: 0.150, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.355, bore_dia_in: 0.3460, groove_dia_in: 0.3550, num_grooves: 6, groove_width_ratio: 0.50, default_freebore_in: 0.055, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.357, bore_dia_in: 0.3460, groove_dia_in: 0.3570, num_grooves: 6, groove_width_ratio: 0.50, default_freebore_in: 0.060, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.358, bore_dia_in: 0.3500, groove_dia_in: 0.3580, num_grooves: 6, groove_width_ratio: 0.50, default_freebore_in: 0.100, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.366, bore_dia_in: 0.3543, groove_dia_in: 0.3654, num_grooves: 4, groove_width_ratio: 0.50, default_freebore_in: 0.130, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.375, bore_dia_in: 0.3660, groove_dia_in: 0.3750, num_grooves: 6, groove_width_ratio: 0.50, default_freebore_in: 0.145, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.400, bore_dia_in: 0.3900, groove_dia_in: 0.4000, num_grooves: 6, groove_width_ratio: 0.50, default_freebore_in: 0.060, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.408, bore_dia_in: 0.4000, groove_dia_in: 0.4080, num_grooves: 8, groove_width_ratio: 0.50, default_freebore_in: 0.220, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.416, bore_dia_in: 0.4080, groove_dia_in: 0.4160, num_grooves: 6, groove_width_ratio: 0.50, default_freebore_in: 0.160, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.429, bore_dia_in: 0.4170, groove_dia_in: 0.4290, num_grooves: 6, groove_width_ratio: 0.50, default_freebore_in: 0.070, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.452, bore_dia_in: 0.4420, groove_dia_in: 0.4510, num_grooves: 6, groove_width_ratio: 0.50, default_freebore_in: 0.060, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.458, bore_dia_in: 0.4500, groove_dia_in: 0.4580, num_grooves: 6, groove_width_ratio: 0.50, default_freebore_in: 0.140, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.500, bore_dia_in: 0.4900, groove_dia_in: 0.5000, num_grooves: 5, groove_width_ratio: 0.50, default_freebore_in: 0.090, default_leade_deg: 1.5 },
  { nominal_bullet_in: 0.510, bore_dia_in: 0.5000, groove_dia_in: 0.5100, num_grooves: 8, groove_width_ratio: 0.50, default_freebore_in: 0.280, default_leade_deg: 1.5 },
];

// Verified SAAMI / C.I.P. cartridge-specific datum, bore, freebore, and headspace references.
export const CARTRIDGE_STANDARDS: Record<string, CartridgeStandardRef> = {
  // Military & Battle Rifle
  '223_rem': { datum_diameter: 0.3300, bore_diameter: 0.2190, groove_diameter: 0.2240, freebore_diameter: 0.2245, freebore_length: 0.025, leade_angle_deg: 3.167, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '308_win': { datum_diameter: 0.4000, bore_diameter: 0.3000, groove_diameter: 0.3080, freebore_diameter: 0.3085, freebore_length: 0.090, leade_angle_deg: 1.75, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '30_06_springfield': { datum_diameter: 0.3750, bore_diameter: 0.3000, groove_diameter: 0.3080, freebore_diameter: 0.3085, freebore_length: 0.170, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '277_sig_fury': { datum_diameter: 0.4000, bore_diameter: 0.2700, groove_diameter: 0.2775, freebore_diameter: 0.2785, freebore_length: 0.088, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '762x39_russian': { datum_diameter: 0.3750, bore_diameter: 0.3000, groove_diameter: 0.3110, freebore_diameter: 0.3120, freebore_length: 0.130, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '545x39_soviet': { datum_diameter: 0.3300, bore_diameter: 0.2146, groove_diameter: 0.2213, freebore_diameter: 0.2225, freebore_length: 0.080, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0080 },
  '762x54r_russian': { bore_diameter: 0.3000, groove_diameter: 0.3118, freebore_diameter: 0.3130, freebore_length: 0.140, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0080 },
  '303_british': { bore_diameter: 0.3030, groove_diameter: 0.3115, freebore_diameter: 0.3130, freebore_length: 0.150, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0080 },
  '8x57_is_mauser': { datum_diameter: 0.4000, bore_diameter: 0.3110, groove_diameter: 0.3230, freebore_diameter: 0.3245, freebore_length: 0.180, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '65x55_swedish': { datum_diameter: 0.3750, bore_diameter: 0.2560, groove_diameter: 0.2640, freebore_diameter: 0.2650, freebore_length: 0.240, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '7x57_mauser': { datum_diameter: 0.3750, bore_diameter: 0.2750, groove_diameter: 0.2845, freebore_diameter: 0.2855, freebore_length: 0.220, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '68_spc': { datum_diameter: 0.3500, bore_diameter: 0.2700, groove_diameter: 0.2770, freebore_diameter: 0.2775, freebore_length: 0.100, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },

  // Precision Match / PRS / Benchrest
  '65_creedmoor': { datum_diameter: 0.4000, bore_diameter: 0.2560, groove_diameter: 0.2640, freebore_diameter: 0.2645, freebore_length: 0.199, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '6_creedmoor': { datum_diameter: 0.4000, bore_diameter: 0.2370, groove_diameter: 0.2430, freebore_diameter: 0.2435, freebore_length: 0.183, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '25_creedmoor': { datum_diameter: 0.4000, bore_diameter: 0.2500, groove_diameter: 0.2570, freebore_diameter: 0.2575, freebore_length: 0.160, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '22_creedmoor': { datum_diameter: 0.4000, bore_diameter: 0.2190, groove_diameter: 0.2240, freebore_diameter: 0.2245, freebore_length: 0.120, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '6mm_gt': { datum_diameter: 0.4000, bore_diameter: 0.2370, groove_diameter: 0.2430, freebore_diameter: 0.2435, freebore_length: 0.120, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0080 },
  '6mm_dasher': { datum_diameter: 0.4000, bore_diameter: 0.2370, groove_diameter: 0.2430, freebore_diameter: 0.2435, freebore_length: 0.104, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0080 },
  '6mm_br_norma': { datum_diameter: 0.4000, bore_diameter: 0.2370, groove_diameter: 0.2430, freebore_diameter: 0.2435, freebore_length: 0.104, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0080 },
  '6mm_bra': { datum_diameter: 0.4000, bore_diameter: 0.2370, groove_diameter: 0.2430, freebore_diameter: 0.2435, freebore_length: 0.104, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0080 },
  '65x47_lapua': { datum_diameter: 0.4000, bore_diameter: 0.2560, groove_diameter: 0.2640, freebore_diameter: 0.2645, freebore_length: 0.123, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0080 },
  '6mm_ppc': { datum_diameter: 0.3750, bore_diameter: 0.2370, groove_diameter: 0.2430, freebore_diameter: 0.2435, freebore_length: 0.055, leade_angle_deg: 1.5, headspace_clearance: 0.0030, nogo_offset: 0.0040, field_offset: 0.0070 },
  '6mm_xc': { datum_diameter: 0.4000, bore_diameter: 0.2370, groove_diameter: 0.2430, freebore_diameter: 0.2435, freebore_length: 0.145, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0080 },
  '65_284_norma': { datum_diameter: 0.4200, bore_diameter: 0.2560, groove_diameter: 0.2640, freebore_diameter: 0.2645, freebore_length: 0.188, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '284_win': { datum_diameter: 0.4200, bore_diameter: 0.2770, groove_diameter: 0.2840, freebore_diameter: 0.2845, freebore_length: 0.188, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },

  // AR-15 & Small Frame Tactical
  '6mm_arc': { datum_diameter: 0.3500, bore_diameter: 0.2370, groove_diameter: 0.2430, freebore_diameter: 0.2435, freebore_length: 0.070, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0080 },
  '22_arc': { datum_diameter: 0.3500, bore_diameter: 0.2190, groove_diameter: 0.2240, freebore_diameter: 0.2245, freebore_length: 0.068, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0080 },
  '65_grendel': { datum_diameter: 0.3500, bore_diameter: 0.2560, groove_diameter: 0.2640, freebore_diameter: 0.2645, freebore_length: 0.060, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0080 },
  '300_blackout': { datum_diameter: 0.3300, bore_diameter: 0.3000, groove_diameter: 0.3080, freebore_diameter: 0.3090, freebore_length: 0.055, leade_angle_deg: 2.0, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '224_valkyrie': { datum_diameter: 0.3500, bore_diameter: 0.2190, groove_diameter: 0.2240, freebore_diameter: 0.2245, freebore_length: 0.088, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0080 },
  '204_ruger': { datum_diameter: 0.3300, bore_diameter: 0.1990, groove_diameter: 0.2040, freebore_diameter: 0.2045, freebore_length: 0.035, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '17_remington': { datum_diameter: 0.3300, bore_diameter: 0.1680, groove_diameter: 0.1720, freebore_diameter: 0.1725, freebore_length: 0.025, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },

  // Hunting & Classic Rifle
  '243_win': { datum_diameter: 0.4000, bore_diameter: 0.2370, groove_diameter: 0.2430, freebore_diameter: 0.2435, freebore_length: 0.068, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '260_rem': { datum_diameter: 0.4000, bore_diameter: 0.2560, groove_diameter: 0.2640, freebore_diameter: 0.2645, freebore_length: 0.088, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '7mm_08_rem': { datum_diameter: 0.4000, bore_diameter: 0.2770, groove_diameter: 0.2840, freebore_diameter: 0.2845, freebore_length: 0.080, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '25_06_rem': { datum_diameter: 0.3750, bore_diameter: 0.2500, groove_diameter: 0.2570, freebore_diameter: 0.2575, freebore_length: 0.110, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '270_win': { datum_diameter: 0.3750, bore_diameter: 0.2700, groove_diameter: 0.2770, freebore_diameter: 0.2775, freebore_length: 0.145, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '280_rem': { datum_diameter: 0.3750, bore_diameter: 0.2770, groove_diameter: 0.2840, freebore_diameter: 0.2845, freebore_length: 0.155, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '280_ackley': { datum_diameter: 0.3750, bore_diameter: 0.2770, groove_diameter: 0.2840, freebore_diameter: 0.2845, freebore_length: 0.155, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '22_250_rem': { datum_diameter: 0.3750, bore_diameter: 0.2190, groove_diameter: 0.2240, freebore_diameter: 0.2245, freebore_length: 0.045, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '222_rem': { datum_diameter: 0.3300, bore_diameter: 0.2190, groove_diameter: 0.2240, freebore_diameter: 0.2245, freebore_length: 0.025, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '35_whelen': { datum_diameter: 0.4000, bore_diameter: 0.3500, groove_diameter: 0.3580, freebore_diameter: 0.3585, freebore_length: 0.130, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '93x62_mauser': { datum_diameter: 0.4200, bore_diameter: 0.3543, groove_diameter: 0.3654, freebore_diameter: 0.3665, freebore_length: 0.210, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0080 },

  // Magnums & ELR
  '65_prc': { datum_diameter: 0.4200, bore_diameter: 0.2560, groove_diameter: 0.2640, freebore_diameter: 0.2645, freebore_length: 0.188, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '7mm_prc': { datum_diameter: 0.4200, bore_diameter: 0.2770, groove_diameter: 0.2840, freebore_diameter: 0.2845, freebore_length: 0.215, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '300_prc': { datum_diameter: 0.4200, bore_diameter: 0.3000, groove_diameter: 0.3080, freebore_diameter: 0.3085, freebore_length: 0.220, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '300_win_mag': { datum_diameter: 0.4200, bore_diameter: 0.3000, groove_diameter: 0.3080, freebore_diameter: 0.3085, freebore_length: 0.220, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0070 },
  '7mm_rem_mag': { datum_diameter: 0.4000, bore_diameter: 0.2770, groove_diameter: 0.2840, freebore_diameter: 0.2845, freebore_length: 0.195, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0070 },
  '338_win_mag': { datum_diameter: 0.4200, bore_diameter: 0.3300, groove_diameter: 0.3380, freebore_diameter: 0.3385, freebore_length: 0.200, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0070 },
  '300_wsm': { datum_diameter: 0.4200, bore_diameter: 0.3000, groove_diameter: 0.3080, freebore_diameter: 0.3085, freebore_length: 0.190, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '68_western': { datum_diameter: 0.4200, bore_diameter: 0.2700, groove_diameter: 0.2770, freebore_diameter: 0.2775, freebore_length: 0.190, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '300_norma_mag': { datum_diameter: 0.4600, bore_diameter: 0.3000, groove_diameter: 0.3080, freebore_diameter: 0.3085, freebore_length: 0.240, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '338_norma_mag': { datum_diameter: 0.4600, bore_diameter: 0.3300, groove_diameter: 0.3380, freebore_diameter: 0.3385, freebore_length: 0.250, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '338_lapua_mag': { datum_diameter: 0.4750, bore_diameter: 0.3300, groove_diameter: 0.3380, freebore_diameter: 0.3385, freebore_length: 0.250, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0100 },
  '375_hh_mag': { datum_diameter: 0.4200, bore_diameter: 0.3660, groove_diameter: 0.3750, freebore_diameter: 0.3755, freebore_length: 0.250, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0070 },
  '50_bmg': { datum_diameter: 0.6500, bore_diameter: 0.5000, groove_diameter: 0.5100, freebore_diameter: 0.5110, freebore_length: 0.350, leade_angle_deg: 1.5, headspace_clearance: 0.0060, nogo_offset: 0.0060, field_offset: 0.0120 },

  // Straight-Wall, Lever, Handgun & Rimfire
  '30_30_win': { bore_diameter: 0.3000, groove_diameter: 0.3080, freebore_diameter: 0.3090, freebore_length: 0.120, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0070 },
  '45_70_gov': { bore_diameter: 0.4500, groove_diameter: 0.4580, freebore_diameter: 0.4590, freebore_length: 0.150, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0070 },
  '350_legend': { bore_diameter: 0.3460, groove_diameter: 0.3550, freebore_diameter: 0.3560, freebore_length: 0.090, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0080 },
  '450_bushmaster': { bore_diameter: 0.4420, groove_diameter: 0.4520, freebore_diameter: 0.4530, freebore_length: 0.080, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0080 },
  '86_blackout': { datum_diameter: 0.4000, bore_diameter: 0.3300, groove_diameter: 0.3380, freebore_diameter: 0.3385, freebore_length: 0.100, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0080 },
  '9mm_parabellum': { bore_diameter: 0.3460, groove_diameter: 0.3550, freebore_diameter: 0.3560, freebore_length: 0.055, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0080 },
  '45_acp': { bore_diameter: 0.4420, groove_diameter: 0.4510, freebore_diameter: 0.4520, freebore_length: 0.050, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0080 },
  '10mm_auto': { bore_diameter: 0.3900, groove_diameter: 0.4000, freebore_diameter: 0.4010, freebore_length: 0.060, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0080 },
  '40_sw': { bore_diameter: 0.3900, groove_diameter: 0.4000, freebore_diameter: 0.4010, freebore_length: 0.055, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0080 },
  '357_magnum': { bore_diameter: 0.3460, groove_diameter: 0.3570, freebore_diameter: 0.3580, freebore_length: 0.060, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0070 },
  '44_magnum': { bore_diameter: 0.4170, groove_diameter: 0.4290, freebore_diameter: 0.4300, freebore_length: 0.065, leade_angle_deg: 1.5, headspace_clearance: 0.0040, nogo_offset: 0.0040, field_offset: 0.0070 },
  '22_lr': { bore_diameter: 0.2170, groove_diameter: 0.2220, freebore_diameter: 0.2240, freebore_length: 0.025, leade_angle_deg: 1.5, headspace_clearance: 0.0030, nogo_offset: 0.0040, field_offset: 0.0070 },
  '22_wmr': { bore_diameter: 0.2190, groove_diameter: 0.2240, freebore_diameter: 0.2250, freebore_length: 0.030, leade_angle_deg: 1.5, headspace_clearance: 0.0030, nogo_offset: 0.0040, field_offset: 0.0070 },
  '17_hmr': { bore_diameter: 0.1680, groove_diameter: 0.1720, freebore_diameter: 0.1730, freebore_length: 0.025, leade_angle_deg: 1.5, headspace_clearance: 0.0030, nogo_offset: 0.0040, field_offset: 0.0070 },
};

export function lookupCaliberBoreStandard(bulletDiaIn: number): CaliberBoreStandard {
  let closest = CALIBER_BORE_TABLE[0];
  let bestDiff = Math.abs(closest.nominal_bullet_in - bulletDiaIn);
  for (let i = 1; i < CALIBER_BORE_TABLE.length; i++) {
    const diff = Math.abs(CALIBER_BORE_TABLE[i].nominal_bullet_in - bulletDiaIn);
    if (diff < bestDiff) {
      bestDiff = diff;
      closest = CALIBER_BORE_TABLE[i];
    }
  }
  // If bullet diameter is far outside table (e.g., cannon/custom big bore), scale land depth proportionally.
  if (bestDiff > 0.015) {
    const landDepth = Math.min(0.010, Math.max(0.003, bulletDiaIn * 0.013));
    return {
      nominal_bullet_in: bulletDiaIn,
      bore_dia_in: +(bulletDiaIn - 2 * landDepth).toFixed(4),
      groove_dia_in: +bulletDiaIn.toFixed(4),
      num_grooves: 6,
      groove_width_ratio: 0.50,
      default_freebore_in: Math.min(0.350, Math.max(0.030, +(bulletDiaIn * 0.30).toFixed(3))),
      default_leade_deg: 1.5,
    };
  }
  return closest;
}

export function getCartridgeStandardRef(spec: CartridgeSpec): CartridgeStandardRef | undefined {
  return CARTRIDGE_STANDARDS[spec.id];
}

export function resolveBoreAndGroove(spec: CartridgeSpec): {
  bore_dia_in: number;
  groove_dia_in: number;
  num_grooves: number;
  groove_width_ratio: number;
  rifled_bore_area_sq_in: number;
} {
  const ref = getCartridgeStandardRef(spec);
  const calStd = lookupCaliberBoreStandard(spec.bullet_diameter);
  const ov = spec.chamber_overrides;

  // Use cartridge-specific bore/groove only if the user hasn't necked the bullet to a different caliber.
  const sameCaliberAsRef =
    ref?.groove_diameter !== undefined &&
    Math.abs(spec.bullet_diameter - ref.groove_diameter) <= 0.005;

  const groove =
    ov?.groove_diameter ??
    spec.groove_diameter ??
    (sameCaliberAsRef ? ref!.groove_diameter! : calStd.groove_dia_in);

  const bore =
    ov?.bore_diameter ??
    spec.bore_diameter ??
    (sameCaliberAsRef && ref?.bore_diameter !== undefined ? ref.bore_diameter : calStd.bore_dia_in);

  const safeBore = Math.min(bore, groove - 0.002);
  const numGrooves = ov?.num_grooves ?? ref?.num_grooves ?? calStd.num_grooves;
  const grooveWidthRatio = Math.min(0.8, Math.max(0.2, ov?.groove_width_ratio ?? calStd.groove_width_ratio));

  const areaSqIn = computeRifledBoreArea(safeBore, groove, grooveWidthRatio);
  return {
    bore_dia_in: Math.round(safeBore * 10000) / 10000,
    groove_dia_in: Math.round(groove * 10000) / 10000,
    num_grooves: numGrooves,
    groove_width_ratio: grooveWidthRatio,
    rifled_bore_area_sq_in: areaSqIn,
  };
}

/**
 * Computes true rifled cross-sectional bore area (in^2) from land-to-land bore diameter
 * and groove-to-groove diameter assuming conventional radial lands & grooves.
 */
export function computeRifledBoreArea(
  boreDiaIn: number,
  grooveDiaIn: number,
  grooveWidthRatio = 0.50
): number {
  const rBore = Math.max(0.02, boreDiaIn / 2);
  const rGroove = Math.max(rBore, grooveDiaIn / 2);
  return Math.PI * (grooveWidthRatio * rGroove * rGroove + (1 - grooveWidthRatio) * rBore * rBore);
}
