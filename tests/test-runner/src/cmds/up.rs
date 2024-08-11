use anyhow::Result;
use clap::Args;

/// Command Up
#[derive(Args, Debug)]
pub struct Up {
    #[clap(long = "listen", default_value("127.0.0.1:9830"))]
    pub address: Option<String>,
}

impl Up {
    pub async fn run(&self) -> Result<()> {
        println!("Up command: {:?}", self);

        // Start server
        let opts = land_wasm_server::Opts {
            addr: self.address.clone().unwrap().parse()?,
            dir: "./".to_string(),
            default_wasm: None,
            enable_wasmtime_aot: false,
            endpoint_name: Some("localhost".to_string()),
            enable_metrics: false,
            metrics_addr: None,
        };
        land_wasm_server::start(opts).await?;
        Ok(())
    }
}
