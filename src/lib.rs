use anyhow::{anyhow, Result};
use http::StatusCode;
use once_cell::sync::OnceCell;
use rquickjs::function::Args;
use rquickjs::loader::{BuiltinLoader, BuiltinResolver};
use rquickjs::{Module, Object};
use std::collections::HashMap;
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

use land_sdk::http::{error_response, Body, Error, Request, Response};
use land_sdk::http_main;

#[http_main]
pub fn handle_request(req: Request) -> Result<Response, Error> {
    let resp = match handle_js_request(req) {
        Ok(response) => response,
        Err(err) => {
            println!("handle_js_request error: {:?}", err);
            error_response(StatusCode::INTERNAL_SERVER_ERROR, err.to_string())
        }
    };
    Ok(resp)
}

fn handle_js_request(req: Request) -> Result<Response, Error> {
    let context = JS_CONTEXT.get().unwrap();
    // convert http request to js request
    let mut headers = HashMap::new();
    req.headers().iter().for_each(|(key, value)| {
        headers.insert(
            key.as_str().to_string(),
            value.to_str().unwrap().to_string(),
        );
    });

    let response_result = context.with(|ctx| {
        // 0. getCallHandler
        let call_handler: rquickjs::Value = ctx.globals().get("callHandler")?;
        if !call_handler.is_function() {
            let err = ctx.throw(
                rquickjs::String::from_str(ctx.clone(), "fetch handler is not a function")?
                    .into_value(),
            );
            return Err(err);
        }
        let call_handler = call_handler.as_function().unwrap();

        // 1. build request object
        let headers_object = Object::new(ctx.clone())?;
        req.headers().iter().for_each(|(key, value)| {
            headers_object
                .set(
                    key.as_str().to_string(),
                    value.to_str().unwrap().to_string(),
                )
                .unwrap();
        });
        let req_object = Object::new(ctx.clone())?;
        req_object.set("id", 1)?;
        req_object.set("method", req.method().to_string())?;
        req_object.set("uri", req.uri().clone().to_string())?;
        req_object.set("headers", headers_object)?;
        req_object.set("body", req.body().body_handle())?;
        let mut args = Args::new(ctx.clone(), 1);
        args.push_arg(req_object)?;
        let call_handler_result: rquickjs::Result<rquickjs::Value> = call_handler.call_arg(args);
        if call_handler_result.is_err() {
            return Err(call_handler_result.unwrap_err());
        }
        Ok::<_, rquickjs::Error>(rquickjs::Undefined)
    });
    if response_result.is_err() {
        return Err(response_result.unwrap_err().into());
    }

    let mut resp = Response::new(Body::from("Hello World!"));
    resp.headers_mut()
        .insert("X-runtime-land-js", PKG_VERSION.parse().unwrap());
    Ok(resp)
}
