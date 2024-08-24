use anyhow::{anyhow, Result};
use entity::JsHttpObject;
use http::StatusCode;
use once_cell::sync::OnceCell;
use rquickjs::{
    function::Args,
    loader::{BuiltinLoader, BuiltinResolver},
    Context, FromJs, IntoJs, Module, Runtime, Undefined, Value,
};
use std::io::Read;

mod console;
mod entity;
mod hostcall;

static PKG_VERSION: &str = env!("CARGO_PKG_VERSION");

// JS_VENDOR is a global JS vendor code to run. It provides all library functions that wrapper the hostcalls.
static JS_VENDOR: &str = include_str!("../js-vendor/dist/lib.js");

// JS_CONTEXT is a global js context to run JS code.
static JS_CONTEXT: OnceCell<Context> = OnceCell::new();

#[export_name = "wizer.initialize"]
pub extern "C" fn init() {
    match init_js_context() {
        Ok(_) => {
            println!("success")
        }
        Err(err) => {
            println!("{:?}", err);
        }
    }
}

fn export_js_error(context: Context, err: rquickjs::Error) -> anyhow::Error {
    if err.is_exception() {
        let message = context
            .with(|ctx| {
                let exception = ctx.catch();
                let exception = exception.as_exception().unwrap();
                let message = format!(
                    "Exception: {}\n{}",
                    exception.message().unwrap_or_default(),
                    exception.stack().unwrap_or_default()
                );
                Ok::<String, rquickjs::Error>(message)
            })
            .unwrap();
        return anyhow!(message);
    }
    let message = format!("Error: {:?}", err);
    anyhow!(message)
}

fn init_js_context() -> Result<()> {
    let runtime = Runtime::new()?;
    let context = Context::full(&runtime)?;

    let mut user_script = String::new();
    std::io::stdin().read_to_string(&mut user_script)?;

    // 0. load user js code
    let resolver = BuiltinResolver::default().with_module("user.js");
    let loader = BuiltinLoader::default().with_module("user.js", user_script);
    runtime.set_loader(resolver, loader);

    // 1. load vendor js code
    let res = context.with(|ctx| {
        // add global modules
        let global = ctx.globals();
        let console = console::build(ctx.clone())?;
        global.set("console", console)?;
        let hostcall = hostcall::build(ctx.clone())?;
        global.set("hostcall", hostcall)?;

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

use land_sdk::http_main;
use land_sdk::{
    http::{error_response, Body, Error, Request, Response},
    ExecutionCtx,
};

#[http_main]
pub fn handle_request(req: Request, mut ctx: ExecutionCtx) -> Result<Response, Error> {
    let resp = match handle_js_request(req, ctx) {
        Ok(response) => response,
        Err(err) => {
            println!("handle_js_request error: {:?}", err);
            error_response(StatusCode::INTERNAL_SERVER_ERROR, err.to_string())
        }
    };
    Ok(resp)
}

fn handle_js_request(req: Request, mut ctx: ExecutionCtx) -> Result<Response, Error> {
    let context = JS_CONTEXT.get().unwrap();

    let response_result = context.with(|ctx| {
        // 0. getCallHandler
        let call_handler: Value = ctx.globals().get("callHandler")?;
        if !call_handler.is_function() {
            let err = ctx.throw(
                rquickjs::String::from_str(ctx.clone(), "fetch handler is not a function")?
                    .into_value(),
            );
            return Err(err);
        }
        let call_handler = call_handler.as_function().unwrap();

        // 1. build request object
        let http_object = JsHttpObject::from_request(req);
        let req_object = http_object.into_js(&ctx)?;
        let mut args = Args::new(ctx.clone(), 1);
        args.push_arg(req_object)?;
        let call_handler_result: rquickjs::Result<Value> = call_handler.call_arg(args);
        call_handler_result?;
        // println!("call_handler_result: {:?}", call_handler_result);
        Ok::<_, rquickjs::Error>(Undefined)
    });
    if let Err(err) = response_result {
        return Err(err.into());
    }

    // 3. waiting pending tasks, waiting promises
    let runtime = context.runtime();
    loop {
        // waiting pending promises
        if runtime.is_job_pending() {
            let _ = runtime.execute_pending_job();
        }

        // get response object from globalThis
        let res = context.with(|ctx| {
            let response_object: Value = ctx.globals().get("globalResponse")?;

            // 3.1 wait for response
            // if response is null, continue
            if response_object.is_null() {
                // println!("response is null");
                return Ok::<_, rquickjs::Error>(None);
            }
            let js_response = JsHttpObject::from_js(&ctx, response_object)?;
            let http_response = js_response.into_response();
            Ok::<_, rquickjs::Error>(Some(http_response))
        });
        if let Err(err) = res {
            return Err(err.into());
        }
        // if response is not null, return response
        if let Some(response) = res.unwrap() {
            // println!("response: {:?}", response);
            return Ok(response);
        }

        // if call ExecutionCtx run once
        if ctx.is_pending() {
            ctx.execute();
        }
    }
}
