export default {
    async fetch(request) {
        const destinationURL = "https://example.com";
        const statusCode = 301;
        return Response.redirect(destinationURL, statusCode);
    },
};