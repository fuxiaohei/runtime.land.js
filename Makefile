.PHONY: js, js-prod

js:
	cd js-vendor && npx rspack build --mode=development

js-prod:
	cd js-vendor && npx rspack build --mode=production

release: js-prod
	cargo build --target wasm32-wasi --release
	wasm-opt --strip-debug -o target/wasm32-wasi/release/rt_land_js.opt.wasm target/wasm32-wasi/release/rt_land_js.wasm
	cp target/wasm32-wasi/release/rt_land_js.opt.wasm js-engine.wasm