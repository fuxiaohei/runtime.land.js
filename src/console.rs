use rquickjs::{prelude::MutFn, Ctx, Function, Object};

use crate::hostcall::{get_args_as_str, to_js_error};

/// build console object that used export to globalThis
pub fn build(ctx: Ctx) -> rquickjs::Result<Object> {
    let console = Object::new(ctx.clone())?;
    let console_info_callback = Function::new(
        ctx.clone(),
        MutFn::new(move |cx, args| {
            let statement = get_args_as_str(&args).map_err(|e| to_js_error(cx, e))?;
            println!("{}", statement);
            Ok::<_, rquickjs::Error>(())
        }),
    )?;
    console.set("log", console_info_callback.clone())?;
    console.set("debug", console_info_callback.clone())?;
    console.set("info", console_info_callback)?;
    console.set(
        "error",
        Function::new(
            ctx.clone(),
            MutFn::new(move |cx, args| {
                let statement = get_args_as_str(&args).map_err(|e| to_js_error(cx, e))?;
                eprintln!("{}", statement);
                Ok::<_, rquickjs::Error>(())
            }),
        ),
    )?;
    Ok(console)
}
