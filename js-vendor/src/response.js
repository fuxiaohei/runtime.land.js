import Body from "./body";

class Response {
    #_headers;
    #_status;
    #_statusText;
    #_ok;
    #_body;
    #_type;

    constructor(body, options) {
        options = options || {}
        this.#_headers = new Headers(options.headers || {});
        this.#_type = options.type === undefined ? 'default' : options.type;
        this.#_status = options.status === undefined ? 200 : options.status
        if (this.#_status < 200 || this.#_status > 599 || this.#_status == 0) {
            throw new RangeError("Failed to construct 'Response': The status provided (0) is outside the range [200, 599].")
        }
        this.#_ok = this.#_status >= 200 && this.#_status < 300
        this.#_statusText = options.statusText === undefined ? '' : '' + options.statusText
        const contentType = this.#_headers.get('Content-Type') || "";
        if (options.body_handle) {
            this.#_body = new Body(null, options.body_handle, contentType);
            return;
        }
        this.#_body = new Body(body, null, contentType);
    }

    get [Symbol.toStringTag]() {
        return 'Response';
    }

    get headers() {
        return this.#_headers;
    }

    get status() {
        return this.#_status;
    }

    get statusText() {
        return this.#_statusText;
    }

    get bodyHandle() {
        return this.#_body.bodyHandle;
    }

    get body() {
        return this.#_body?.stream;
    }

    get bodyUsed() {
        return this.#_body?.bodyUsed;
    }

    get ok() {
        return this.#_ok;
    }

    get type() {
        return this.#_type;
    }

    async arrayBuffer() {
        return await this.#_body.arrayBuffer();
    }

    async text() {
        return await this.#_body.text();
    }

    async json() {
        return await this.#_body.json();
    }

    async blob() {
        return await this.#_body.blob();
    }

    async formData() {
        return await this.#_body.formData();
    }

    static redirect(url, status) {
        const redirectStatuses = [301, 302, 303, 307, 308]
        if (!redirectStatuses.includes(status)) {
            throw new RangeError("Failed to execute'redirect' on 'Response': Invalid status code")
        }
        return new Response(null, {
            status: status,
            headers: {
                "Location": url,
            },
        })
    }

    static error() {
        let response = new Response(null, { status: 200, type: "error" })
        response.#_status = 0;
        return response;
    }

}

// FIXME: invalid redefinition of parameter name with async json() function
/*
Response.json = function (data, options) {
    let data = JSON.stringify(data);
    let response = new Response(data, options || {});
    response.headers.set("Content-Type", "application/json");
    return response;
}*/

export default Response;