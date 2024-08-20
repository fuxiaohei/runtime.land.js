// This is free and unencumbered software released into the public domain.
// See LICENSE.md for more information.

var encoding = require("./encoding.js");

globalThis.TextEncoder = encoding.TextEncoder;
globalThis.TextDecoder = encoding.TextDecoder;

require("./encodeInto.js");

require("./text-encoder-stream.js");
