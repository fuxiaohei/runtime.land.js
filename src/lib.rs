use anyhow::{anyhow, Result};
use http::{HeaderName, HeaderValue, StatusCode};
use once_cell::sync::OnceCell;
use rquickjs::function::Args;
use rquickjs::loader::{BuiltinLoader, BuiltinResolver};
use rquickjs::{Module, Object};
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
        call_handler_result?;
        // println!("call_handler_result: {:?}", call_handler_result);
        Ok::<_, rquickjs::Error>(rquickjs::Undefined)
    });
    if let Err(err) = response_result {
        return Err(err.into());
    }

    // 3. waiting pending tasks, waiting promises
    let runtime = context.runtime();
    while runtime.is_job_pending() {
        // println!("waiting pending tasks");
        let _ = runtime.execute_pending_job();
        let res = context.with(|ctx| {
            let response_object: rquickjs::Value = ctx.globals().get("globalResponse")?;

            // 3.1 wait for response
            // if response is null, continue
            if response_object.is_null() {
                return Ok::<_, rquickjs::Error>(None);
            }

            // 3.2 get response
            if !response_object.is_object() {
                return Err(ctx.throw(
                    rquickjs::String::from_str(ctx.clone(), "globalResponse is not an object")?
                        .into_value(),
                ));
            }
            let response_object = response_object.as_object().unwrap();

            // 3.3 unwrap response_object to sdk response
            let status: rquickjs::Value = response_object.get("status").unwrap();
            let status = status.as_int().unwrap();
            // println!("status: {:?}", status);
            let mut response_builder = http::Response::builder().status(status as u16);

            let headers_object: rquickjs::Value = response_object.get("headers").unwrap();
            if !headers_object.is_object() {
                return Err(ctx.throw(
                    rquickjs::String::from_str(ctx.clone(), "headers is not an object")?
                        .into_value(),
                ));
            }
            let headers_object = headers_object.as_object().unwrap();
            let headers_iter = headers_object.clone().into_iter();
            if let Some(headers) = response_builder.headers_mut() {
                for item in headers_iter {
                    let (key, value) = item?;
                    let header_name = key.to_string()?;
                    let header_value = value.into_string().unwrap().to_string()?;
                    /*println!(
                        "header_name: {:?}, header_value: {:?}",
                        header_name, header_value
                    );*/
                    headers.insert(
                        HeaderName::from_bytes(header_name.as_bytes()).unwrap(),
                        HeaderValue::from_bytes(header_value.as_bytes()).unwrap(),
                    );
                }
                headers.insert(
                    HeaderName::from_static("x-powered-by"),
                    HeaderValue::from_bytes(format!("x-land-js-{}", PKG_VERSION).as_bytes())
                        .unwrap(),
                );
            }
            let body_handle: rquickjs::Value = response_object.get("body_handle").unwrap();
            let body_handle = body_handle.as_int().unwrap();
            // if body_handle is 0, try read body from response_object[body] property,
            // it should be an arraybuffer
            if body_handle == 0 {
                let body_buffer: rquickjs::Value = response_object.get("body").unwrap();
                let body_buffer = rquickjs::ArrayBuffer::from_value(body_buffer);
                if body_buffer.is_none() {
                    return Err(ctx.throw(
                        rquickjs::String::from_str(ctx.clone(), "body is not an arraybuffer?")?
                            .into_value(),
                    ));
                }
                let body_buffer = body_buffer.unwrap();
                let body_buffer = body_buffer.as_bytes().unwrap();
                let body = Body::from(body_buffer);
                let response = response_builder.body(body).unwrap();
                return Ok::<_, rquickjs::Error>(Some(response));
            }

            // if body_handle is not 0, build Body from body_handle
            let body = Body::from_handle(body_handle as u32);
            let response = response_builder.body(body).unwrap();
            Ok::<_, rquickjs::Error>(Some(response))
        });
        if let Err(err) = res {
            return Err(err.into());
        }
        // if response is not null, return response
        if let Some(response) = res.unwrap() {
            return Ok(response);
        }
    }
    Err(anyhow!("handle_js_request no response"))
}
