.PHONY: js, js-prod

js:
	cd js-vendor && npm run build-dev

js-prod:
	cd js-vendor && npm run build

dev: js
	cargo build --target wasm32-wasi --release
	wasm-opt --strip-debug -o target/wasm32-wasi/release/runtime_land_js.opt.wasm target/wasm32-wasi/release/runtime_land_js.wasm
	cp target/wasm32-wasi/release/runtime_land_js.opt.wasm js-engine.wasm

release: js-prod
	cargo build --target wasm32-wasi --release
	wasm-opt --strip-debug -o target/wasm32-wasi/release/runtime_land_js.opt.wasm target/wasm32-wasi/release/runtime_land_js.wasm
	cp target/wasm32-wasi/release/runtime_land_js.opt.wasm js-engine.wasm