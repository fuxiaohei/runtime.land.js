#!/usr/bin/env bash

set -euo pipefail

echo "Installing WASI-SDK"
curl --fail --location --silent https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-24/wasi-sdk-24.0-x86_64-linux.tar.gz --output wasi-sdk-24.0-linux.tar.gz
tar -xzf wasi-sdk-24.0-linux.tar.gz
export WASI_SDK=$(pwd)/wasi-sdk-24.0

echo "Installing wizer"
curl --fail --location --silent https://github.com/bytecodealliance/wizer/releases/download/v6.0.0/wizer-v6.0.0-x86_64-linux.tar.xz --output wizer-v6.0.0.tar.xz
tar -xvf "wizer-v6.0.0.tar.xz"
export PATH=$(pwd)/wizer-v6.0.0-x86_64-linux:$PATH
mkdir -p ./target/release
cp -R wizer-v6.0.0-x86_64-linux ./target/release/wizer
echo "Copy wizer to target/release"