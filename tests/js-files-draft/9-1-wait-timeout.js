export default {
    async fetch(request, env, ctx) {
        const after = async () => {
            let promise = new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve("after called");
                }, 1000);
            });
            return promise;
        };
        ctx.waitUntil(after());
        return new Response("Hello World!", {
            headers: { "content-type": "text/plain" },
        });
    }
}
