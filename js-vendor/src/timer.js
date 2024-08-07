(function () {

    let timers = {};
    let timers_intervals = {};

    globalThis.setTimeout = function (callback, delay) {
        let id = hostcall.new_asyncio_task(delay);
        let item = {
            id: id,
            callback: callback,
        };
        timers[id] = item;
        return id;
    }

    globalThis.runTimer = function (id) {
        let item = timers[id];
        if (item) {
            item.callback();
            delete timers[id];
        }
    }

    globalThis.clearTimeout = function (id) {
        delete timers[id];
        hostcall.cancel_asyncio_task(id);
    }

    globalThis.setInterval = function (callback, delay) {
        let id = hostcall.new_asyncio_task(delay);
        let item = {
            id: id,
            callback: function () {
                callback();
                let next_id = hostcall.new_asyncio_task(delay);
                timers_intervals[id].push(next_id);
            },
        };
        timers[id] = item;
        timers_intervals[id] = [id];
        return id;
    }

    globalThis.clearInterval = function (id) {
        let ids = timers_intervals[id];
        if (ids) {
            for (let i = 0; i < ids.length; i++) {
                hostcall.cancel_asyncio_task(ids[i]);
            }
            delete timers_intervals[id];
        }
        delete timers[id]
    }

}())