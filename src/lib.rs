use anyhow::{anyhow, Result};
use once_cell::sync::OnceCell;
use rquickjs::loader::{BuiltinLoader, BuiltinResolver};
use rquickjs::Module;
use std::io::Read;

static PKG_VERSION: &str = env!("CARGO_PKG_VERSION");

// JS_VENDOR is a global JS vendor code to run. It provides all library functions that wrapper the hostcalls.
static JS_VENDOR: &str = include_str!("../js-vendor/dist/lib.js");

// JS_CONTEXT is a global js context to run JS code.
static JS_CONTEXT: OnceCell<rquickjs::Context> = OnceCell::new();

#[export_name = "wizer.initialize"]
pub extern "C" fn init() {
    init_js_context().expect("init_js_context failed");
}

fn export_js_error(context: rquickjs::Context, err: rquickjs::Error) -> anyhow::Error {
    if err.is_exception() {
        let message = context
            .with(|ctx| {
                let exception = ctx.catch();
                let exception = exception.as_exception().unwrap();
                let message = format!("Exception: {:?}", exception.message().unwrap_or_default());
                Ok::<String, rquickjs::Error>(message)
            })
            .unwrap();
        return anyhow!(message);
    }
    let message = format!("Error: {:?}", err);
    anyhow!(message)
}

fn init_js_context() -> Result<()> {
    let runtime = rquickjs::Runtime::new()?;
    let context = rquickjs::Context::full(&runtime)?;

    let mut user_script = String::new();
    std::io::stdin().read_to_string(&mut user_script)?;

    // 0. load user js code
    let resolver = BuiltinResolver::default().with_module("user.js");
    let loader = BuiltinLoader::default().with_module("user.js", user_script);
    runtime.set_loader(resolver, loader);

    // 1. load vendor js code
    let res = context.with(|ctx| {
        ctx.eval(JS_VENDOR)?;
        // import user js module and export to globalThis
        Module::evaluate(
            ctx.clone(),
            "internal",
            "import fn from 'user.js'; globalThis.handler = fn;",
        )?
        .finish()?;
        Ok::<_, rquickjs::Error>(rquickjs::Undefined)
    });
    match res {
        Ok(_) => {}
        Err(e) => {
            return Err(export_js_error(context, e));
        }
    }

    // waiting pending tasks
    while runtime.is_job_pending() {
        let _ = runtime.execute_pending_job();
    }

    JS_CONTEXT
        .set(context)
        .map_err(|_| anyhow!("set JS_CONTEXT failed"))?;
    Ok(())
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
