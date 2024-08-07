# Runtime.land JavaScript SDK

This is JavaScript SDK for Runtime.land faas platform. It's based on QuickJS with Rust binding [quickjs-wasm-rs](https://github.com/bytecodealliance/javy/tree/main/crates/quickjs-wasm-rs). It provides a WebAssembly module that can execute JavaScript code.

## APIs

| API | Description | Details |
| --- | --- | --- |
| `fetch(request)` | Fetch a request and return a response | - |
| `Request` | Request object | - |
| `Response` | Response object | - |
| `Headers` | Headers object | - |
| `URL`, `URLSearchParams` | URL object | - |
| `atob`, `btoa` | Base64 encode/decode | - |
| `TextEncoder`, `TextDecoder` | Text encode/decode | Only support utf-8 |
| `WebStreams` | WebStream object | Experimental |

## Build

Download wasi-sdk and set `QUICKJS_WASM_SYS_WASI_SDK_PATH` to its path.

```bash
export QUICKJS_WASM_SYS_WASI_SDK_PATH=path/to/wasi-sdk
make release
```

[wasi-sdk-20.0](https://github.com/WebAssembly/wasi-sdk/releases/tag/wasi-sdk-20) is tested.

It generates `js-engine.wasm` in top directory that used in [land-wasm-gen crate](https://github.com/fuxiaohei/runtime-land/tree/main/crates/wasm-gen/engine).
