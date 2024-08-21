function isPromise(p) {
    return p && Object.prototype.toString.call(p) === "[object Promise]"
}

export {
    isPromise,
}