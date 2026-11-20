use super::cartridge::{CartridgeSpec, ReamerSpec};

pub fn generate_reamer_spec(spec: &CartridgeSpec) -> ReamerSpec {
    // Diametrical clearances standard to SAAMI min chamber
    let base_clearance = 0.0020;
    let shoulder_clearance = 0.0020;
    let neck_clearance = 0.0030;
    let rim_dia_clearance = 0.0050;
    let rim_depth_clearance = 0.0030;
    let mouth_length_clearance = 0.0150;

    let freebore_dia = spec.bullet_diameter + 0.0005;
    let freebore_len = (spec.bullet_diameter * 0.40).clamp(0.060, 0.200);

    // Approximate bore diameter (land-to-land) = bullet dia - 0.008"
    let pilot_dia = (spec.bullet_diameter - 0.0080).max(0.150);

    ReamerSpec {
        chamber_rim_dia: ((spec.rim_diameter + rim_dia_clearance) * 1000.0).round() / 1000.0,
        chamber_rim_depth: ((spec.rim_thickness + rim_depth_clearance) * 1000.0).round() / 1000.0,
        chamber_base_dia: ((spec.base_diameter + base_clearance) * 10000.0).round() / 10000.0,
        chamber_shoulder_dia: ((spec.shoulder_start_diameter + shoulder_clearance) * 10000.0).round() / 10000.0,
        chamber_neck_dia: ((spec.neck_diameter_mouth + neck_clearance) * 10000.0).round() / 10000.0,
        chamber_length: ((spec.case_length + mouth_length_clearance) * 1000.0).round() / 1000.0,
        freebore_dia: (freebore_dia * 10000.0).round() / 10000.0,
        freebore_length: (freebore_len * 1000.0).round() / 1000.0,
        leade_angle_deg: 1.5, // 1° 30'
        pilot_diameter: (pilot_dia * 10000.0).round() / 10000.0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::geometry::cartridge::RimType;

    #[test]
    fn test_reamer_rim_clearances() {
        let spec = CartridgeSpec {
            id: "test_rim".into(),
            name: "Test".into(),
            category: None,
            standard: "SAAMI".into(),
            units: "imperial".into(),
            rim_type: RimType::Rimmed,
            rim_diameter: 0.500,
            rim_thickness: 0.060,
            extractor_diameter: 0.500,
            extractor_width: 0.0,
            extractor_angle: 0.0,
            belt_diameter: None,
            belt_width: None,
            base_diameter: 0.420,
            shoulder_start_diameter: 0.400,
            body_length: 1.500,
            shoulder_length: 0.150,
            shoulder_angle: 20.0,
            neck_diameter_base: 0.340,
            neck_diameter_mouth: 0.338,
            case_length: 2.000,
            web_thickness: 0.180,
            base_wall_thickness: 0.030,
            neck_wall_thickness: 0.014,
            primer_pocket_dia: 0.210,
            primer_pocket_depth: 0.125,
            flash_hole_dia: 0.080,
            bullet_diameter: 0.308,
            bullet_length: 1.200,
            bullet_weight_grains: 150.0,
            coal: 2.750,
            seating_depth: 0.350,
            max_pressure_bar: Some(3800.0),
        };
        let reamer = generate_reamer_spec(&spec);
        assert!((reamer.chamber_rim_dia - 0.505).abs() < 1e-6);
        assert!((reamer.chamber_rim_depth - 0.063).abs() < 1e-6);
    }
}
