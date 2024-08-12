async function handleRequest(request) {
    const assert = (condition, message) => {
        if (!condition) {
            throw new Error(message || "Assertion failed");
        }
    };

    const assert_equals = (actual, expected, message) => {
        assert(
            actual === expected,
            message || `Expected ${expected} but got ${actual}`
        );
    };

    const readStream = async (stream) => {
        let reader = stream.pipeThrough(new TextDecoderStream()).getReader();
        let result = "";
        while (true) {
            let chunk = await reader.read();
            if (chunk.done) {
                break;
            }
            result += chunk.value.toString();
        }
        return result;
    };

    try {
        let file = new File(['abc', 'def'], 'file.txt', { type: 'text/plain', lastModified: 123 });
        assert_equals(await file.text(), 'abcdef');
        assert_equals(file.lastModified, 123);
        assert_equals(file.name, 'file.txt');
        assert_equals(file.type, 'text/plain');

        let stream = file.stream();
        assert(stream instanceof ReadableStream, 'File.stream() should return an instance of ReadableStream');

        let sliced = file.slice(2, 4, 'application/json');
        assert_equals(await sliced.text(), 'cd');
        assert_equals(sliced.type, 'application/json');

        stream = sliced.stream();
        let read = await readStream(stream);
        assert_equals(read, 'cd');

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
