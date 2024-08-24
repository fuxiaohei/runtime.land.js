use crate::{
    entity::{JsFetchOptions, JsHttpObject},
    JS_CONTEXT,
};
use anyhow::Context;
use land_sdk::{
    http::{Body, RedirectPolicy},
    ExecutionCtx,
};
use rquickjs::{
    function::Args, prelude::Rest, ArrayBuffer, Ctx, FromJs, Function, IntoJs, Object, Undefined,
    Value,
};

fn resolve_timer(handle: u32) {
    let context = JS_CONTEXT.get().unwrap();
    let _ = context.with(|ctx| {
        // get globalThis.resolveTimer function
        let call: Value = ctx.globals().get("resolveTimeout")?;
        let call_handler = call
            .as_function()
            .expect("get globalThis.resolveTimeout failed");
        let mut args = Args::new(ctx.clone(), 1);
        args.push_arg(Value::new_int(ctx.clone(), handle as i32))?;
        call_handler.call_arg(args)?;
        // println!("resolve_timer: {:?}", handle);
        Ok::<_, rquickjs::Error>(Undefined)
    });

    // make sure timeout wrapper promise is done
    // just do once. Other promise will be resolved in handle_js_request() with main loop
    let runtime = context.runtime();
    if runtime.is_job_pending() {
        let _ = runtime.execute_pending_job();
    }
}

/// build hostcall object that used export to globalThis
pub fn build<'js>(ctx: Ctx<'js>) -> rquickjs::Result<Object> {
    let hostcall = Object::new(ctx.clone())?;

    // read_body reads body chunk from host, return as ReadableStream {value: ArrayBuffer, done: boolean}
    let read_body_callback = Function::new(
        ctx.clone(),
        |cx: Ctx<'js>, args: Rest<Value<'js>>| -> Result<Value<'js>, rquickjs::Error> {
            if args.len() < 1 {
                let err = rquickjs::Error::MissingArgs {
                    expected: 1,
                    given: args.len(),
                };
                return Err(err);
            }
            let value = args.first().unwrap();
            let body_handle = value.as_int().unwrap() as u32;
            if body_handle == 0 {
                return Err(cx.throw(
                    rquickjs::String::from_str(cx.clone(), "body_handle is 0")?.into_value(),
                ));
            }
            let body = Body::from_handle(body_handle);
            let (value, ok) = body.read(0).map_err(|err| to_js_error(cx.clone(), err))?;
            let chunk_object = Object::new(cx.clone())?;
            chunk_object.set("done", Value::new_bool(cx.clone(), ok))?;
            chunk_object.set("value", ArrayBuffer::new(cx.clone(), value)?)?;
            Ok::<_, rquickjs::Error>(Value::from_object(chunk_object))
        },
    )?;

    let fetch_request_callback = Function::new(
        ctx.clone(),
        |cx: Ctx<'js>, mut args: Rest<Value<'js>>| -> Result<Value<'js>, rquickjs::Error> {
            if args.len() < 2 {
                let err = rquickjs::Error::MissingArgs {
                    expected: 2,
                    given: args.len(),
                };
                return Err(err);
            }
            let options_value = args.pop().unwrap();
            let req_value = args.pop().unwrap();
            let js_request = JsHttpObject::from_js(&cx, req_value)?;
            let js_request_options = JsFetchOptions::from_js(&cx, options_value)?;
            /*println!(
                "---fetch begin,js_request: {:?}, js_request_options: {:?}",
                js_request, js_request_options
            );*/
            let http_request = js_request.into_request();
            let http_request_options = land_sdk::http::RequestOptions {
                timeout: js_request_options.timeout,
                redirect: match js_request_options.redirect.as_str() {
                    "follow" => RedirectPolicy::Follow,
                    "error" => RedirectPolicy::Error,
                    "manual" => RedirectPolicy::Manual,
                    _ => land_sdk::http::RedirectPolicy::Follow,
                },
            };

            let response = land_sdk::http::fetch(http_request, http_request_options)
                .map_err(|e| to_js_error(cx.clone(), e.into()))?;
            let js_response = JsHttpObject::from_response(response);
            // println!("------fetch_response_js_value: {:?}", js_response);
            let js_response_value = js_response.into_js(&cx)?;
            Ok::<_, rquickjs::Error>(js_response_value)
        },
    )?;

    let read_env = Function::new(
        ctx.clone(),
        |cx: Ctx<'js>, args: Rest<Value<'js>>| -> Result<Value<'js>, rquickjs::Error> {
            if args.len() < 1 {
                let err = rquickjs::Error::MissingArgs {
                    expected: 1,
                    given: args.len(),
                };
                return Err(err);
            }
            let env_key =
                arg_to_string(args.first().unwrap()).map_err(|e| to_js_error(cx.clone(), e))?;
            let env_value = std::env::var_os(env_key);
            if env_value.is_none() {
                return Ok(Value::new_null(cx.clone()));
            }
            let env_value = env_value.unwrap();
            let env_value = env_value.to_str().unwrap();
            let env_value_js = rquickjs::String::from_str(cx.clone(), env_value)?;
            Ok::<_, rquickjs::Error>(Value::from_string(env_value_js))
        },
    )?;

    let sleep = Function::new(
        ctx.clone(),
        |cx: Ctx<'js>, args: Rest<Value<'js>>| -> Result<Value<'js>, rquickjs::Error> {
            if args.len() < 1 {
                let err = rquickjs::Error::MissingArgs {
                    expected: 1,
                    given: args.len(),
                };
                return Err(err);
            }
            let arg = args.first().unwrap();
            if !arg.is_int() {
                return Err(cx.throw(
                    rquickjs::String::from_str(cx.clone(), "sleep time must be int")?.into_value(),
                ));
            }
            let ms = arg.as_int().unwrap() as u32;
            let ctx = ExecutionCtx::get();
            let handle = ctx.sleep(ms);
            ctx.sleep_callback(handle, move || {
                resolve_timer(handle);
            });
            Ok::<_, rquickjs::Error>(Value::new_int(cx.clone(), handle as i32))
        },
    )?;

    hostcall.set("read_body", read_body_callback)?;
    hostcall.set("fetch_request", fetch_request_callback)?;
    hostcall.set("read_env", read_env)?;
    hostcall.set("sleep", sleep)?;
    Ok(hostcall)
}

pub fn arg_to_string(arg: &Value) -> anyhow::Result<String> {
    if let Some(str) = arg.as_string() {
        return Ok(str.to_string()?);
    }
    if let Some(str) = arg.clone().into_string() {
        return Ok(str.to_string()?);
    }
    Err(anyhow::anyhow!("Failed to convert arg to string"))
}

pub fn get_args_as_str(args: &Rest<Value>) -> anyhow::Result<String> {
    args.iter()
        .map(|arg| arg_to_string(arg))
        .collect::<Result<Vec<String>, _>>()
        .map(|vec| vec.join(" "))
        .context("Failed to convert args to string")
}

pub fn to_js_error(cx: Ctx, e: anyhow::Error) -> rquickjs::Error {
    match e.downcast::<rquickjs::Error>() {
        Ok(e) => e,
        Err(e) => cx.throw(Value::from_exception(
            rquickjs::Exception::from_message(cx.clone(), &e.to_string())
                .expect("Creating an exception should succeed"),
        )),
    }
}
