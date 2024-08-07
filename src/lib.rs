use anyhow::Result;

static PKG_VERSION: &str = env!("CARGO_PKG_VERSION");

#[export_name = "wizer.initialize"]
pub extern "C" fn init() {
    // init_js_context().expect("init_js_context failed");
}

use land_sdk::http::{Body, Error, Request, Response};
use land_sdk::http_main;

#[http_main]
pub fn handle_request(req: Request) -> Result<Response, Error> {
    make_response()
}

fn make_response() -> Result<Response, Error> {
    let mut resp = Response::new(Body::from("Hello World!"));
    resp.headers_mut()
        .insert("X-runtime-land-js", PKG_VERSION.parse().unwrap());
    Ok(resp)
}
