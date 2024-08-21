function isPromise(p) {
    return p && Object.prototype.toString.call(p) === "[object Promise]"
}

const methods = ['CONNECT', 'DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT', 'TRACE']

function normalizeMethod(method) {
    var upcased = method.toUpperCase()
    return methods.indexOf(upcased) > -1 ? upcased : method
}

export { normalizeMethod, isPromise };