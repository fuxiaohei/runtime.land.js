import { isPromise } from "./builtin/utils";

class ExecutionCtx {
    #_pendings = [];
    constructor() { }

    waitUntil(fn) {
        if (!isPromise(fn)) {
            throw new Error("arg must be a promise");
        }
        this.#_pendings.push(fn);
    }
}

export default ExecutionCtx;