globalThis.TextDecoderStream = class {
    #handle;

    #transform = new TransformStream({
        transform: (chunk, controller) => {
            const value = this.#handle.decode(chunk, { stream: true });

            if (value) {
                controller.enqueue(value);
            }
        },
        flush: controller => {
            const value = this.#handle.decode();
            if (value) {
                controller.enqueue(value);
            }

            controller.terminate();
        }
    });

    constructor(encoding = "utf-8", options = {}) {
        this.#handle = new TextDecoder(encoding, options);
    }

    get encoding() {
        return this.#handle.encoding;
    }

    get fatal() {
        return this.#handle.fatal;
    }

    get ignoreBOM() {
        return this.#handle.ignoreBOM;
    }

    get readable() {
        return this.#transform.readable;
    }

    get writable() {
        return this.#transform.writable;
    }

    get [Symbol.toStringTag]() {
        return "TextDecoderStream";
    }
}

