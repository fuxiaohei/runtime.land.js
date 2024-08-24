
const assert_array_equals = (array1, array2, message) => {
    if (array1.length != array2.length || array1.length === undefined) {
        throw new Error(`Expected ${array1} to be equal to ${array2}: ${message}`);
    }

    for (let i in array1) {
        if (array1[i] != array2[i]) {
            throw new Error(
                `Expected ${array1} to be equal to ${array2}: ${message}`
            );
        }
    }

    // Make sure array2 has no keys that array1 doesn't
    for (let i in array2) {
        if (array1[i] != array2[i]) {
            throw new Error(
                `Expected ${array1} to be equal to ${array2}: ${message}`
            );
        }
    }
};

const readableStreamToArray = async (stream) => {
    let reader = stream.getReader();
    let result = [];
    while (true) {
        let chunk = await reader.read();
        if (chunk.done) {
            break;
        }
        result.push(chunk.value);
    }
    return result;
};

async function handleRequest(request) {
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
    try {
        try {
            // Create a readable stream
            const readableStream = new ReadableStream({
                start(controller) {
                    controller.enqueue("Hello, ");
                    controller.enqueue("Runtime.land!");
                    controller.close();
                },
            });

            // Read from the stream
            const reader = readableStream.getReader();
            let result = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                result += value;
            }

            assertEquals(
                result,
                "Hello, Runtime.land!",
                `Unexpected result from readable stream. Expected 'Hello, Runtime.land!' but got ${result}`
            );
        } catch (error) {
            assert(false, `ReadableStream test failed: ${error}`);
        }

        try {
            let accumulatedData = "";
            const writableStream = new WritableStream({
                write(chunk) {
                    accumulatedData += chunk;
                },
                close() {
                    accumulatedData += "!";
                },
            });

            const writer = writableStream.getWriter();
            writer.write("Hello,");
            writer.write(" ");
            writer.write("Runtime.land");
            await writer.close();

            assertEquals(
                accumulatedData,
                "Hello, Runtime.land!",
                `Unexpected result from writable stream. Expected 'Hello, Runtime.land!' but got ${accumulatedData}`
            );
        } catch (error) {
            assert(false, `WritableStream test failed: ${error}`);
        }

        // Testing the ReadableStream Backpressure
        try {
            let endQueue = false;
            const readableStream = new ReadableStream({
                start(controller) {
                    controller.enqueue("A");
                    controller.enqueue("B");
                    controller.enqueue("C");
                    // Simulate a delay for the next enqueue
                    setTimeout(() => { controller.enqueue("D"); endQueue = true; }, 500);
                },
                pull(controller) {
                    if (endQueue) {
                        controller.close();
                    }
                },
            });

            const reader = readableStream.getReader();
            let result = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                result += value;
            }

            assertEquals(
                result,
                "ABCD",
                `Backpressure test failed. Expected 'ABCD' but got ${result}`
            );
        } catch (error) {
            assert(false, `ReadableStream backpressure test failed: ${error}`);
        }

        // Testing the ReadableStream cancellation
        try {
            const readableStream = new ReadableStream({
                start(controller) {
                    controller.enqueue("X");
                    controller.enqueue("Y");
                },
                cancel(reason) {
                    assertEquals(
                        reason,
                        "Stream canceled",
                        `Stream cancellation reason mismatch. Expected 'Stream canceled' but got ${reason}`
                    );
                },
            });

            const reader = readableStream.getReader();
            await reader.cancel("Stream canceled");

            const result = await reader.read();
            const resultString = JSON.stringify(result);
            assertEquals(
                resultString,
                JSON.stringify({ done: true }),
                `Stream cancellation test failed. Expected { done: true } but got ${resultString}`
            );
        } catch (error) {
            assert(false, `ReadableStream cancellation test failed: ${error}`);
        }

        // Testing the Error Propagation in ReadableStream
        try {
            const readableStream = new ReadableStream({
                start(controller) {
                    controller.enqueue("1");
                    controller.error(new Error("Stream error"));
                },
            });

            const transformStream = new TransformStream({
                transform(chunk, controller) {
                    controller.enqueue(chunk + " transformed");
                },
            });

            const concatenatedErrors = [];
            try {
                const reader = readableStream.pipeThrough(transformStream).getReader();
                while (true) {
                    await reader.read();
                }
            } catch (error) {
                concatenatedErrors.push(error.message);
            }

            assertEquals(
                concatenatedErrors[0],
                "Stream error",
                `Error propagation test failed. Expected 'Stream error' but got ${concatenatedErrors[0]}`
            );
        } catch (error) {
            assert(false, `Stream error propagation test failed: ${error}`);
        }

        try {
            let stream = ReadableStream.from(
                (function* () {
                    yield "a";
                    yield "b";
                    yield "c";
                })()
            );
            let arr = await readableStreamToArray(stream);
            assert_array_equals(
                arr,
                ["a", "b", "c"],
                "Stream contents should be correct"
            );
        } catch (error) {
            assert(false, `ReadableStream.from test failed: ${error}`);
        }

        try {
            let stream = ReadableStream.from(
                (async function* () {
                    yield "a";
                    yield "b";
                    yield "c";
                })()
            );
            let arr = await readableStreamToArray(stream);
            assert_array_equals(
                arr,
                ["a", "b", "c"],
                "Stream contents should be correct"
            );
        } catch (error) {
            assert(
                false,
                `ReadableStream.from test with async iterable failed: ${error}`
            );
        }

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