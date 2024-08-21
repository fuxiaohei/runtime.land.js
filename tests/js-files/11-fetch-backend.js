
async function handleRequest(request) {
    const method = request.method;

    if (method == "GET" || method == "DELETE") {
        return new Response(`${method} request successful`, {
            headers: { "content-type": "text/plain" },
        });
    }

    if (method == "POST" || method == "PUT" || method == "PATCH") {
        const body = await request.text();
        return new Response(`${method} request successful with body: ${body}`, {
            headers: { "content-type": "text/plain" },
        });
    }

    if (method == "OPTIONS") {
        return new Response('OPTIONS request successful', {
            status: 200, headers: {
                "allow": "GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS"
            }
        });
    }

    return new Response(`Unsupported method ${method}`, {
        status: 405,
        headers: { "content-type": "text/plain" },
    });
}

export default {
    async fetch(request) {
        return handleRequest(request);
    }
}