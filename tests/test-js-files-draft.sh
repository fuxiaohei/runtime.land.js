#!/usr/bin/env bash

CLI=./target/release/test-runner

# iterate tests/js-files/*.js
for file in tests/js-files-draft/*.js; do
    echo "Building $file"
    $CLI build $file --js-engine js-engine.wasm
done