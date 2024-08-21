.PHONY: js, js-prod

js:
	cd js-vendor && npm run build-dev

js-prod:
	cd js-vendor && npm run build

js-test:
	cd js-vendor && npm run test

dev: js
	cargo build --target wasm32-wasi --release
	wasm-opt -O3 -o target/wasm32-wasi/release/runtime_land_js.opt.wasm target/wasm32-wasi/release/runtime_land_js.wasm
	cp target/wasm32-wasi/release/runtime_land_js.opt.wasm js-engine.wasm

release: js-prod
	cargo build --target wasm32-wasi --release
	wasm-opt -O3 -o target/wasm32-wasi/release/runtime_land_js.opt.wasm target/wasm32-wasi/release/runtime_land_js.wasm
	cp target/wasm32-wasi/release/runtime_land_js.opt.wasm js-engine.wasm

wizer: dev
	cat example.js | wizer js-engine.wasm -o js-example.wasm --allow-wasi --inherit-stdio=true --inherit-env=true --wasm-bulk-memory=true