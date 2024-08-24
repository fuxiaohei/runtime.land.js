import { v4 as uuidv4 } from 'uuid';

class Crypto {
    constructor() {
        throw new Error('Crypto is a built-in object, and cannot be instantiated manually.');
    }

    randomUUID() {
        return uuidv4();
    }

    /*
    from https://github.com/atypiape/polyfill-crypto-methods/blob/master/lib/shim.ts
    as npm package `olyfill-crypto-method`
    s*/

    getRandomValues(array) {
        if (!ArrayBuffer.isView(array)) {
            throw new TypeError(
                "Failed to execute 'getRandomValues' on 'Crypto': parameter 1 is not of type 'ArrayBufferView'."
            )
        }
        // if array is Float32Array or Float64Array or DataView, should throw exception
        if (array instanceof Float32Array ||
            array instanceof Float64Array ||
            array instanceof DataView) {
            throw new TypeError(
                "Failed to execute 'getRandomValues' on 'Crypto': The provided ArrayBufferView must be an integer array type."
            )
        }
        if (array.byteLength > 65536) {
            const message =
                "Failed to execute 'getRandomValues' on 'Crypto': The ArrayBufferView's byte length (" +
                array.byteLength +
                ") exceeds the number of bytes of entropy available via this API (65536)."
            throw new globalThis.DOMException(message)
        }
        const maxValue = Math.pow(256, array.BYTES_PER_ELEMENT)
        for (let i = 0; i < array.byteLength; ++i) {
            let value = Math.floor(maxValue * Math.random());
            if (array instanceof BigInt64Array || array instanceof BigUint64Array) {
                array[i] = BigInt(value)
            } else {
                array[i] = value;
            }
        }
        return array
    }
}

globalThis.crypto = Object.create(Crypto.prototype);
globalThis.Crypto = Crypto;