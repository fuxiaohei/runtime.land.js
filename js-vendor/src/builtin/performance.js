if (!Date.now) { Date.now = function () { return new Date().getTime(); } }

globalThis.performance = {
    timeOrigin: Date.now(),
    now() {
        return Date.now() - this.timeOrigin;
    },
};