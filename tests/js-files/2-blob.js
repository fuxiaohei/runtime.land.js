async function handleRequest(request) {
    try {
        // Create a new Blob with some text
        const blobParts = ["Hello,", " Blob!"];
        const myBlob = new Blob(blobParts, { type: "text/plain" });

        // Use the text() method to read the Blob's text
        const text = await myBlob.text();

        // Create a response with the Blob's text
        return new Response(text, {
            headers: {
                "Content-Type": myBlob.type,
                "Content-Length": myBlob.size.toString(),
            },
        });
    } catch (error) {
        // If there's an error, return the error message in the response
        return new Response(error.message, { status: 500 });
    }
}

export default {
    async fetch(request) {
        return handleRequest(request);
    }
}