use crate::PKG_VERSION;
use http::{HeaderName, HeaderValue};
use land_sdk::http::{Body, Request, Response};
use rquickjs::{ArrayBuffer, Ctx, FromJs, IntoJs, Object, Value};
use std::{collections::HashMap, str::FromStr};

#[derive(Debug, Default)]
pub struct JsHttpObject {
    pub id: u64,
    pub method: String,
    pub uri: String,
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body_handle: u32,
    pub body: Option<Vec<u8>>,
}

impl JsHttpObject {
    pub fn from_request(req: Request) -> Self {
        let mut headers = HashMap::new();
        req.headers().iter().for_each(|(key, value)| {
            headers.insert(
                key.as_str().to_string(),
                value.to_str().unwrap().to_string(),
            );
        });
        Self {
            id: 0,
            method: req.method().to_string(),
            uri: req.uri().to_string(),
            status: 0,
            headers,
            body_handle: req.body().body_handle(),
            body: None,
        }
    }

    pub fn into_request(self) -> Request {
        // convert js_request to sdk request
        let mut builder = http::Request::builder()
            .method(http::Method::from_str(self.method.as_str()).unwrap())
            .uri(self.uri.clone());
        if let Some(headers) = builder.headers_mut() {
            for (header_name, header_value) in self.headers.iter() {
                headers.insert(
                    HeaderName::from_bytes(header_name.as_bytes()).unwrap(),
                    HeaderValue::from_bytes(header_value.as_bytes()).unwrap(),
                );
            }
        }

        let http_request = if self.body_handle > 0 {
            builder.body(Body::from_handle(self.body_handle)).unwrap()
        } else if self.body.is_none() {
            builder.body(Body::empty()).unwrap()
        } else {
            builder
                .body(Body::from(self.body.unwrap().as_slice()))
                .unwrap()
        };
        http_request
    }

    pub fn from_response(response: Response) -> Self {
        let mut headers = HashMap::new();
        response.headers().iter().for_each(|(key, value)| {
            headers.insert(
                key.as_str().to_string(),
                value.to_str().unwrap().to_string(),
            );
        });
        JsHttpObject {
            status: response.status().into(),
            headers,
            body: None,
            body_handle: response.body().body_handle(),
            id: 0,
            method: "".to_string(),
            uri: "".to_string(),
        }
    }

    pub fn into_response(self) -> Response {
        let mut response_builder = http::Response::builder().status(self.status);
        if let Some(headers) = response_builder.headers_mut() {
            for (header_name, header_value) in self.headers.iter() {
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
                HeaderValue::from_bytes(format!("x-land-js-{}", PKG_VERSION).as_bytes()).unwrap(),
            );
        }
        // if body_handle is 0, try read body from js_response.body
        // it should be an arraybuffer
        if self.body_handle == 0 {
            let body = Body::from(self.body.unwrap());
            let response = response_builder.body(body).unwrap();
            return response;
        }

        // if body_handle is not 0, build Body from body_handle
        let body = Body::from_handle(self.body_handle);
        response_builder.body(body).unwrap()
    }
}

impl<'js> FromJs<'js> for JsHttpObject {
    fn from_js(ctx: &Ctx<'js>, value: Value<'js>) -> rquickjs::Result<Self> {
        if !value.is_object() {
            return Err(ctx.throw(
                rquickjs::String::from_str(ctx.clone(), "JsHttpObject need from an object")?
                    .into_value(),
            ));
        }
        let response_object = value.as_object().unwrap();
        let status: Value = response_object.get("status").unwrap();
        let status = if status.is_int() {
            status.as_int().unwrap() as u16
        } else {
            0
        };

        let method_value: Value = response_object.get("method").unwrap();
        let method = if method_value.is_undefined() {
            "GET".to_string()
        } else {
            method_value.into_string().unwrap().to_string()?
        };

        let uri_value: Value = response_object.get("uri").unwrap();
        let uri = if uri_value.is_undefined() {
            "/".to_string()
        } else {
            uri_value.into_string().unwrap().to_string()?
        };

        let headers_object: Value = response_object.get("headers").unwrap();
        if !headers_object.is_object() {
            return Err(ctx.throw(
                rquickjs::String::from_str(ctx.clone(), "headers is not an object")?.into_value(),
            ));
        }
        let headers_object = headers_object.as_object().unwrap();
        let headers_iter = headers_object.clone().into_iter();
        let mut headers = HashMap::new();
        for item in headers_iter {
            let (key, value) = item?;
            let header_name = key.to_string()?;
            let header_value = value.into_string().unwrap().to_string()?;
            /*println!(
                "header_name: {:?}, header_value: {:?}",
                header_name, header_value
            );*/
            headers.insert(header_name, header_value);
        }
        /*
        headers.insert(
            HeaderName::from_static("x-powered-by"),
            HeaderValue::from_bytes(format!("x-land-js-{}", PKG_VERSION).as_bytes())
                .unwrap(),
        );*/

        let mut req = JsHttpObject {
            id: 0,
            method,
            uri,
            status,
            headers,
            body_handle: 0,
            body: None,
        };

        let body_handle: Value = response_object.get("body_handle").unwrap();
        let body_handle = body_handle.as_int().unwrap();
        if body_handle == 0 {
            let body_buffer: Value = response_object.get("body").unwrap();
            let body_buffer = ArrayBuffer::from_value(body_buffer);
            if body_buffer.is_none() {
                return Err(ctx.throw(
                    rquickjs::String::from_str(ctx.clone(), "body is not an arraybuffer?")?
                        .into_value(),
                ));
            }
            let body_buffer = body_buffer.unwrap();
            let body_buffer = body_buffer.as_bytes().unwrap().to_vec();
            if !body_buffer.is_empty() {
                req.body = Some(body_buffer);
            }
        } else {
            req.body_handle = body_handle as u32;
        }
        Ok(req)
    }
}

impl<'js> IntoJs<'js> for JsHttpObject {
    fn into_js(self, ctx: &Ctx<'js>) -> rquickjs::Result<Value<'js>> {
        let req_object = Object::new(ctx.clone())?;
        req_object.set("id", self.id)?;
        req_object.set("method", self.method)?;
        req_object.set("uri", self.uri)?;
        // req_object.set("status", self.status)?;
        let headers_object = Object::new(ctx.clone())?;
        for (key, value) in self.headers.iter() {
            headers_object.set(key, value)?;
        }
        req_object.set("headers", headers_object)?;
        req_object.set("body_handle", self.body_handle)?;
        if self.body_handle == 0 && self.body.is_some() {
            let body_buffer =
                ArrayBuffer::new(ctx.clone(), self.body.as_ref().unwrap().as_slice())?;
            req_object.set("body", body_buffer)?;
        }
        Ok(Value::from_object(req_object))
    }
}

#[derive(Debug, Default)]
pub struct JsFetchOptions {
    pub timeout: u32,
    pub redirect: String,
}

impl<'js> FromJs<'js> for JsFetchOptions {
    fn from_js(ctx: &Ctx<'js>, value: Value<'js>) -> rquickjs::Result<Self> {
        if !value.is_object() {
            return Err(ctx.throw(
                rquickjs::String::from_str(ctx.clone(), "JsFetchOptions need from an object")?
                    .into_value(),
            ));
        }
        let options_object = value.as_object().unwrap();
        let timeout_value: Value = options_object.get("timeout").unwrap();
        let timeout = if timeout_value.is_int() {
            timeout_value.as_int().unwrap() as u32
        } else {
            30 // default timeout is 30s
        };

        let redirect_value: Value = options_object.get("redirect").unwrap();
        let redirect = if redirect_value.is_undefined() {
            "follow".to_string()
        } else {
            redirect_value.into_string().unwrap().to_string()?
        };
        Ok(Self { timeout, redirect })
    }
}
