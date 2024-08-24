export default {
    async fetch(request) {
        let body = "Hello World!"

        // setTimeout for 100ms
        const promise = new Promise((resolve) => {
            setTimeout(() => {
                body += " Sleep 100ms!"
                resolve();
            }, 100)
        })
        await promise;

        // setInterval for 100ms
        const promise2 = new Promise((resolve) => {
            let a = 1;
            let id = setInterval(() => {
                if (a == 5) {
                    clearInterval(id);
                    resolve();
                    return;
                }
                a++;
                body += " Interval 100ms!"
            }, 100)
        })
        await promise2;

        return new Response(body, {
            headers: { "content-type": "text/plain" },
        });
    }
}
