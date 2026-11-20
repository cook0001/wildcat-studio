use super::cartridge::{CartridgeSpec, SetbackResult};
use super::volumetrics::get_chamber_body_radius_at;

pub fn analyze_chamber_setback(old_spec: &CartridgeSpec, new_spec: &CartridgeSpec) -> SetbackResult {
    let mut can_clean = true;
    let mut interferences = Vec::new();
    let steps = 200;
    let z_max = old_spec.case_length.max(new_spec.case_length);
    let dz = z_max / (steps as f64);

    if new_spec.bullet_diameter < old_spec.bullet_diameter - 0.002 {
        can_clean = false;
        interferences.push(format!(
            "Bore mismatch: Old bullet {:.4}\" > New bullet {:.4}\" (requires barrel replacement)",
            old_spec.bullet_diameter, new_spec.bullet_diameter
        ));
    }

    for i in 0..=steps {
        let z = (i as f64) * dz;
        let r_old = get_chamber_body_radius_at(old_spec, z);
        let r_new = get_chamber_body_radius_at(new_spec, z);

        if r_new < r_old - 0.0002 {
            can_clean = false;
            let diff = (r_old - r_new) * 2.0;
            if interferences.len() < 5 {
                interferences.push(format!(
                    "Underage at z={:.3}\": Old dia={:.4}\", New dia={:.4}\" (diff -{:.4}\")",
                    z, r_old * 2.0, r_new * 2.0, diff
                ));
            }
        }
    }

    let mut required_setback = 0.0;
    if !can_clean && new_spec.bullet_diameter >= old_spec.bullet_diameter - 0.002 {
        for setback_test in 1..=150 {
            let offset = (setback_test as f64) * 0.010;
            let mut cleans_with_offset = true;

            for i in 0..=steps {
                let z_new = (i as f64) * dz;
                let z_old = z_new + offset;
                if z_old > old_spec.case_length {
                    break;
                }
                let r_old = get_chamber_body_radius_at(old_spec, z_old);
                let r_new = get_chamber_body_radius_at(new_spec, z_new);

                if r_new < r_old - 0.0002 {
                    cleans_with_offset = false;
                    break;
                }
            }

            if cleans_with_offset {
                required_setback = offset;
                break;
            }
        }
    }

    SetbackResult {
        can_rechamber_clean: can_clean,
        required_setback_inches: (required_setback * 1000.0).round() / 1000.0,
        required_setback_mm: ((required_setback * 25.4) * 100.0).round() / 100.0,
        interference_locations: interferences,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::geometry::cartridge::RimType;

    fn sample_308() -> CartridgeSpec {
        CartridgeSpec {
            id: "308_win".into(),
            name: ".308 Winchester".into(),
            category: None,
            standard: "SAAMI".into(),
            units: "imperial".into(),
            rim_type: RimType::Rimless,
            rim_diameter: 0.473,
            rim_thickness: 0.054,
            extractor_diameter: 0.410,
            extractor_width: 0.039,
            extractor_angle: 45.0,
            belt_diameter: None,
            belt_width: None,
            base_diameter: 0.470,
            shoulder_start_diameter: 0.454,
            body_length: 1.560,
            shoulder_length: 0.152,
            shoulder_angle: 20.0,
            neck_diameter_base: 0.344,
            neck_diameter_mouth: 0.343,
            case_length: 2.015,
            web_thickness: 0.180,
            base_wall_thickness: 0.032,
            neck_wall_thickness: 0.015,
            primer_pocket_dia: 0.210,
            primer_pocket_depth: 0.128,
            flash_hole_dia: 0.080,
            bullet_diameter: 0.308,
            bullet_length: 1.250,
            bullet_weight_grains: 168.0,
            coal: 2.800,
            seating_depth: 0.380,
            max_pressure_bar: Some(4150.0),
        }
    }

    #[test]
    fn test_identical_chamber_cleans_without_setback() {
        let s = sample_308();
        let res = analyze_chamber_setback(&s, &s);
        assert!(res.can_rechamber_clean);
        assert_eq!(res.required_setback_inches, 0.0);
    }

    #[test]
    fn test_30_06_to_308_requires_barrel_setback() {
        let old_30_06 = CartridgeSpec {
            id: "30_06".into(),
            name: ".30-06 Springfield".into(),
            body_length: 1.948,
            shoulder_start_diameter: 0.441,
            case_length: 2.494,
            coal: 3.340,
            ..sample_308()
        };
        let new_308 = sample_308();
        let res = analyze_chamber_setback(&old_30_06, &new_308);
        assert!(!res.can_rechamber_clean);
        assert!(res.required_setback_inches > 0.35 && res.required_setback_inches < 0.70,
            "Expected setback ~0.4-0.6 in, got {}", res.required_setback_inches);
    }
}
