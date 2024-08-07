# Runtime.land JavaScript SDK

This is JavaScript SDK for Runtime.land faas serverless platform. It's based on QuickJS with Rust binding [rquickjs](https://github.com/DelSkayn/rquickjs). It provides a WebAssembly module that can execute JavaScript code.

## APIs

| API | Description | Details |
| --- | --- | --- |
| `Request` | Request object | - |
| `Response` | Response object | - |
| `Headers` | Headers object | - |
| `fetch(request)` | Fetch a request and return a response | - |
| `URL`, `URLSearchParams` | URL object | - |
| `atob`, `btoa` | Base64 encode/decode | - |
| `TextEncoder`, `TextDecoder` | Text encode/decode | Only support utf-8 |
| `WebStreams` | WebStream object | Experimental |

## Build

Download wasi-sdk and set `WASI_SDK` to its path.

```bash
export WASI_SDK=path/to/wasi-sdk
make release
```

[wasi-sdk-22.0](https://github.com/WebAssembly/wasi-sdk/releases/tag/wasi-sdk-22) is tested.

It generates `js-engine.wasm` in top directory that used in [land-wasm-gen crate](https://github.com/fuxiaohei/runtime-land/tree/main/lib/wasm-gen/engine).
