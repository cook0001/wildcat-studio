use crate::geometry::cartridge::CartridgeSpec;
use crate::geometry::reamer::generate_reamer_spec;
use crate::geometry::volumetrics::{
    effective_shoulder_length, get_inner_radius_at, get_outer_radius_at, is_straight_wall,
};

pub fn generate_dxf_string(spec: &CartridgeSpec) -> String {
    let mut out = String::new();

    // DXF Header
    out.push_str("0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\nENDSEC\n");

    // Tables & Layers (5 layers declared accurately)
    out.push_str("0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n5\n");
    out.push_str("0\nLAYER\n2\nOUTER_CASE\n70\n0\n62\n2\n6\nCONTINUOUS\n"); // Yellow
    out.push_str("0\nLAYER\n2\nINNER_WALL\n70\n0\n62\n3\n6\nCONTINUOUS\n"); // Green
    out.push_str("0\nLAYER\n2\nBULLET\n70\n0\n62\n1\n6\nCONTINUOUS\n");     // Red
    out.push_str("0\nLAYER\n2\nCENTERLINE\n70\n0\n62\n8\n6\nCONTINUOUS\n"); // Gray
    out.push_str("0\nLAYER\n2\nCHAMBER\n70\n0\n62\n4\n6\nCONTINUOUS\n");    // Cyan
    out.push_str("0\nENDTAB\n0\nENDSEC\n");

    // Entities
    out.push_str("0\nSECTION\n2\nENTITIES\n");

    // Centerline from z = -0.1 to z = COAL + 0.1
    let z_max = spec.coal + 0.1;
    write_line(&mut out, "CENTERLINE", -0.1, 0.0, z_max, 0.0);

    // Outer profile points (top and bottom symmetric)
    let steps = 120;
    let dz = spec.case_length / (steps as f64);

    let mut prev_z = 0.0;
    let mut prev_r = get_outer_radius_at(spec, 0.0);

    // Case Head vertical line at z=0
    write_line(&mut out, "OUTER_CASE", 0.0, -prev_r, 0.0, prev_r);

    for i in 1..=steps {
        let z = (i as f64) * dz;
        let r = get_outer_radius_at(spec, z);
        write_symmetric_line(&mut out, "OUTER_CASE", prev_z, prev_r, z, r);
        prev_z = z;
        prev_r = r;
    }

    // Case mouth vertical line
    let r_inner_mouth = (spec.neck_diameter_mouth / 2.0 - spec.neck_wall_thickness).max(0.0);
    write_symmetric_line(&mut out, "OUTER_CASE", spec.case_length, prev_r, spec.case_length, r_inner_mouth);

    // Inner cavity contour
    let z_web = spec.web_thickness;
    let mut prev_zi = z_web;
    let mut prev_ri = get_inner_radius_at(spec, z_web);
    write_line(&mut out, "INNER_WALL", z_web, -prev_ri, z_web, prev_ri);

    let inner_steps = 100;
    let dzi = (spec.case_length - z_web).max(0.001) / (inner_steps as f64);
    for i in 1..=inner_steps {
        let z = z_web + (i as f64) * dzi;
        let r = get_inner_radius_at(spec, z);
        write_symmetric_line(&mut out, "INNER_WALL", prev_zi, prev_ri, z, r);
        prev_zi = z;
        prev_ri = r;
    }

    // Reamer / Chamber symmetric contour (body, shoulder, neck, freebore, leade)
    let reamer = generate_reamer_spec(spec);
    let r_ch_base = reamer.chamber_base_dia / 2.0;
    let r_ch_sh = reamer.chamber_shoulder_dia / 2.0;
    let r_ch_neck = reamer.chamber_neck_dia / 2.0;
    let r_fb = reamer.freebore_dia / 2.0;
    let r_bore = reamer.pilot_diameter / 2.0;

    if is_straight_wall(spec) {
        write_symmetric_line(&mut out, "CHAMBER", 0.0, r_ch_base, reamer.chamber_length, r_ch_neck);
    } else {
        let z_sh_end = spec.body_length + effective_shoulder_length(spec);
        write_symmetric_line(&mut out, "CHAMBER", 0.0, r_ch_base, spec.body_length, r_ch_sh);
        write_symmetric_line(&mut out, "CHAMBER", spec.body_length, r_ch_sh, z_sh_end, r_ch_neck);
        write_symmetric_line(&mut out, "CHAMBER", z_sh_end, r_ch_neck, reamer.chamber_length, r_ch_neck);
    }
    let z_fb_end = reamer.chamber_length + reamer.freebore_length;
    let leade_len = (r_fb - r_bore).max(0.0) / reamer.leade_angle_deg.to_radians().tan().max(0.001);
    write_symmetric_line(&mut out, "CHAMBER", reamer.chamber_length, r_ch_neck, reamer.chamber_length, r_fb);
    write_symmetric_line(&mut out, "CHAMBER", reamer.chamber_length, r_fb, z_fb_end, r_fb);
    write_symmetric_line(&mut out, "CHAMBER", z_fb_end, r_fb, z_fb_end + leade_len, r_bore);

    // Bullet contour
    let z_bullet_tip = spec.coal;
    let r_bullet = spec.bullet_diameter / 2.0;
    let z_bullet_base = spec.coal - spec.bullet_length;
    write_line(&mut out, "BULLET", z_bullet_base, -r_bullet, z_bullet_base, r_bullet);
    write_symmetric_line(&mut out, "BULLET", z_bullet_base, r_bullet, spec.case_length, r_bullet);
    write_symmetric_line(&mut out, "BULLET", spec.case_length, r_bullet, z_bullet_tip, 0.0);

    out.push_str("0\nENDSEC\n0\nEOF\n");
    out
}

fn write_symmetric_line(out: &mut String, layer: &str, x1: f64, r1: f64, x2: f64, r2: f64) {
    write_line(out, layer, x1, r1, x2, r2);
    write_line(out, layer, x1, -r1, x2, -r2);
}

fn write_line(out: &mut String, layer: &str, x1: f64, y1: f64, x2: f64, y2: f64) {
    out.push_str("0\nLINE\n");
    out.push_str(&format!("8\n{}\n", layer));
    out.push_str(&format!("10\n{:.6}\n", x1));
    out.push_str(&format!("20\n{:.6}\n", y1));
    out.push_str("30\n0.0\n");
    out.push_str(&format!("11\n{:.6}\n", x2));
    out.push_str(&format!("21\n{:.6}\n", y2));
    out.push_str("31\n0.0\n");
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::geometry::cartridge::RimType;

    #[test]
    fn test_dxf_contains_valid_layers_and_entities() {
        let spec = CartridgeSpec {
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
        };
        let dxf = generate_dxf_string(&spec);
        assert!(dxf.contains("TABLE\n2\nLAYER\n70\n5\n"));
        assert!(dxf.contains("OUTER_CASE"));
        assert!(dxf.contains("CHAMBER"));
        assert!(dxf.ends_with("EOF\n"));
    }
}
