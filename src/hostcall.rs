use crate::entity::{JsFetchOptions, JsHttpObject};
use anyhow::Context;
use land_sdk::http::{Body, RedirectPolicy};
use rquickjs::{prelude::Rest, ArrayBuffer, Ctx, FromJs, Function, IntoJs, Object, Value};

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

    hostcall.set("read_body", read_body_callback)?;
    hostcall.set("fetch_request", fetch_request_callback)?;
    hostcall.set("read_env", read_env)?;
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
