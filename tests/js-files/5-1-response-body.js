const assert = (condition, message) => {
    if (!condition) {
        let msg =
            typeof message === "function" ? message() : message || "Assertion failed";
        throw new Error(msg);
    }
};
const assert_equals = (actual, expected, message) => {
    assert(
        actual === expected,
        () => `Expected ${expected} but got ${actual}: ${message}`
    );
};

const promise_test = async (f, desc) => {
    try {
        await f({
            unreached_func: (msg) => () => assert_unreached(msg),
        });
    } catch (e) {
        throw new Error(`Test ${desc} failed with ${e}`);
    }
};

const multipartBody =
    `--BOUNDARY\r\n` +
    `Content-Disposition: form-data; name="a"\r\n` +
    `\r\n` +
    `b\r\n` +
    `--BOUNDARY\r\n` +
    `Content-Disposition: form-data; name="c"; filename="d.txt"\r\n` +
    `Content-Type: text/plain\r\n` +
    `\r\n` +
    `e, f, g\r\n` +
    `h, i, j\r\n` +
    `--BOUNDARY--\r\n`;

async function handleRequest(request) {
    try {
        await promise_test(async () => {
            let response = new Response("1234");

            let body = await response.arrayBuffer();
            let td = new TextDecoder();
            assert(body instanceof ArrayBuffer);
            assert_equals(td.decode(body), "1234");
        }, "arrayBuffer");

        await promise_test(async () => {
            let response = new Response(JSON.stringify({ a: "b", c: "d" }));

            let body = await response.json();
            assert_equals(body.a, "b");
            assert_equals(body.c, "d");
        }, "json");

        await promise_test(async () => {
            let response = new Response("1234");

            let body = await response.blob();
            assert(body instanceof Blob);
            assert_equals(await body.text(), "1234");
        }, "blob");


        await promise_test(async () => {
            let response = new Response("a=b&c=d", {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            });

            let formData = await response.formData();
            assert_equals(formData.get('a'), 'b');
            assert_equals(formData.get('c'), 'd');
        }, "x-www-form-urlencoded body");

        await promise_test(async () => {
            let response = new Response(multipartBody, {
                headers: {
                    "Content-Type": "multipart/form-data; boundary=BOUNDARY"
                }
            });

            let formData = await response.formData();

            let a = formData.get('a');
            assert_equals(typeof (a), "string");
            assert_equals(a, 'b');

            let c = formData.get('c');
            assert(c instanceof File, 'c must be a File');
            assert_equals(c.name, 'd.txt');
            assert_equals(c.type, "text/plain");
            assert_equals(await c.text(), "e, f, g\r\nh, i, j");
        }, "multipart/form-data body");

        return new Response("All tests passed!", {
            headers: { "content-type": "text/plain" },
        });
    } catch (error) {
        return new Response(error.message + "\n" + error.stack, { status: 500 });
    }
}

export default {
    async fetch(request) {
        return handleRequest(request);
    }
}