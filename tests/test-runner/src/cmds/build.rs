use anyhow::Result;
use clap::Args;
use color_print::cprintln;

/// Command Build
#[derive(Args, Debug)]
pub struct Build {
    pub input: String,
    #[clap(short = 'o', long = "output")]
    pub output: Option<String>,
    #[clap(short = 'j', long = "js-engine")]
    pub js_engine: Option<String>,
}

impl Build {
    pub async fn run(&self) -> Result<()> {
        println!("Build command: {:?}", self);

        let input = self.input.clone();
        let dist_wasm_path = if let Some(output) = self.output.as_ref() {
            output.clone()
        } else {
            format!("{}.wasm", input)
        };
        cprintln!("Input: {}\nOutput: {}", input, dist_wasm_path);
        build_js_internal(&input, &dist_wasm_path, self.js_engine.clone())?;
        cprintln!("<green>Build '{}' success</green>", input);
        Ok(())
    }
}

fn build_js_internal(src: &str, dist_wasm_path: &str, js_engine: Option<String>) -> Result<()> {
    let dist_wasm_dir = std::path::Path::new(&dist_wasm_path).parent().unwrap();
    std::fs::create_dir_all(dist_wasm_dir)?;
    land_wasm_gen::componentize_js(src, dist_wasm_path, js_engine)?;
    Ok(())
}
