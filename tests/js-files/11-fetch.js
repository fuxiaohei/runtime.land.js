const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
};

const assertEquals = (actual, expected, message) => {
    assert(
        actual === expected,
        message || `Expected ${expected} but got ${actual}`
    );
};

const url = "http://127.0.0.1:9830/"
const backendWasm = "tests/js-files/11-fetch-backend.js.wasm"

async function handleRequest(request) {

    try {
        // Test fetch with following methods
        // GET, POST, PUT, DELETE, HEAD, OPTIONS, PATCH

        async function testOne(method) {
            const response = await fetch(url, {
                method: method,
                headers: {
                    "x-land-m": backendWasm,
                }
            });
            assertEquals(
                response.status,
                200,
                `Status code mismatch for ${method}, expected 200 but got ${response.status}`
            );

            const text = await response.text();
            assertEquals(
                text,
                `${method} request successful`,
                `Unexpected response body for ${method} request`,
            );
        }

        await testOne("GET");
        await testOne("DELETE");

        async function testTwo(method) {
            const response = await fetch(url, {
                method: method,
                headers: {
                    "x-land-m": backendWasm,
                },
                body: "aabbccdd",
            });
            assertEquals(
                response.status,
                200,
                `Status code mismatch for ${method}, expected 200 but got ${response.status}`
            );

            const text = await response.text();
            assertEquals(
                text,
                `${method} request successful with body: aabbccdd`,
                `Unexpected response body for ${method} request`,
            );
        }

        await testTwo("POST");
        await testTwo("PUT");
        await testTwo("PATCH");

        async function testThree() {
            const response = await fetch(url, {
                method: "OPTIONS",
                headers: {
                    "x-land-m": backendWasm,
                },
            });
            assertEquals(
                response.status,
                200,
                `Status code mismatch for OPTIONS, expected 200 but got ${response.status}`
            );

            const text = await response.text();
            assertEquals(
                text,
                `OPTIONS request successful`,
                `Unexpected response body for OPTIONS request`,
            );
            const headers = response.headers;
            assertEquals(
                headers.get("allow"),
                "GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS",
                `Unexpected allow header for OPTIONS request`
            );
        }
        await testThree();

        // Create a response with the Blob's text
        return new Response("All tests passed!", {
            headers: { "content-type": "text/plain" },
        });
    } catch (error) {
        // If there's an error, return the error message in the response
        return new Response(error.message + "\n" + error.stack, { status: 500 });
    }
}

export default {
    async fetch(request) {
        return handleRequest(request);
    }
}