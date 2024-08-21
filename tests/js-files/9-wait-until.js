export default {
    async fetch(request, env, ctx) {
        const after = async () => {
            console.log("after called");
        };
        ctx.waitUntil(after());
        return new Response("Hello World!", {
            headers: { "content-type": "text/plain" },
        });
    }
}
