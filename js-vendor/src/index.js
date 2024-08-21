import "./builtin/text-encoding/lib";
import "./builtin/base64";
import "./builtin/console";

import "web-streams-polyfill/polyfill";
// Blob and File need WebStreams to work
import { Blob, File } from "blob-polyfill";
globalThis.Blob = Blob;
globalThis.File = File;
// FormData needs Blob and File to work
import "./builtin/formdata/lib";
import "./builtin/url/lib";

// import "./timer";

import { Headers } from "headers-polyfill";
globalThis.Headers = Headers;

import { Router } from "itty-router";
globalThis.Router = Router;

import Request from "./request";
globalThis.Request = Request;

import Response from "./response";
globalThis.Response = Response;

import fetch from "./fetch";
globalThis.fetch = fetch;

import { isPromise } from "./builtin/utils";
import ExecutionCtx from "./ctx";
import Env from "./env";

function responseWithPromise(promise) {
    promise.then(async response => {
        const headers = {};
        for (const entry of response.headers.entries()) {
            headers[entry[0]] = entry[1];
        }
        let output = {
            status: response.status,
            headers,
            body_handle: 0,
        }
        // if response has bodyHandle, pass it to output
        // else, read arrayBuffer and pass it to output
        if (response.bodyHandle) {
            output.body_handle = response.bodyHandle;
        } else {
            output.body = await response.arrayBuffer();
        }
        // console.log("responseWithPromise called");
        globalThis.globalResponse = output;
    }).catch(error => {
        let errorBytes = new TextEncoder().encode(error.toString() + "\n" + error.stack);
        globalThis.globalResponse = {
            status: 500,
            headers: {},
            body_handle: 0,
            body: errorBytes.buffer,
        };
    })
}

function callHandler(input) {
    if (!globalThis.handler || typeof globalThis.handler.fetch !== "function") {
        throw new Error("No handler function defined");
    }
    const request = new Request(input.uri, {
        method: input.method,
        headers: input.headers || {},
        body_handle: input.body_handle,
    })

    const execCtx = new ExecutionCtx();
    globalThis.execCtx = execCtx;

    let result = globalThis.handler.fetch(request, new Env(), execCtx);
    // if result is promise, set then and reject
    if (isPromise(result)) {
        // console.log("response result is promise");
        responseWithPromise(result);
    } else {
        throw new Error("Handler function must return a promise");
    }
}

globalThis.callHandler = callHandler;
globalThis.globalResponse = null;