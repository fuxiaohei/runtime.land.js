let timers = {};
let clear_intervals = {};

function create_timer(callback, delay, is_interval, interval_id) {
    // minimum delay is 1ms
    if ((delay || 0) < 1) {
        delay = 1;
    }
    let id = hostcall.sleep(delay);
    let item = {
        interval_id: 0,
        callback,
        delay,
    };
    if (is_interval) {
        item.interval_id = interval_id > 0 ? interval_id : id;
    }
    timers[id] = item;
    // console.log("create timer", id, "interval", item.interval_id)
    return id;
}

globalThis.setTimeout = function (callback, delay) {
    return create_timer(callback, delay, false, 0);
}

globalThis.clearTimeout = function (id) {
    delete timers[id]
}

globalThis.resolveTimeout = function (id) {
    let item = timers[id];
    if (item) {
        // if interval, create new timer to run next time
        if (item.interval_id > 0 && !clear_intervals[item.interval_id]) {
            create_timer(item.callback, item.delay, true, item.interval_id);
        }
        // if interval is clean, delete timer
        if (clear_intervals[item.interval_id]){
            delete timers[id];
            return;
        }
        // call timer function
        item.callback();
        delete timers[id];
    } else {
        // console.log("timer not found", id)
    }
}

globalThis.setInterval = function (cb, delay) {
    return create_timer(cb, delay, true, 0);
}

globalThis.clearInterval = function (id) {
    // console.log("clear interval: ", id)
    clear_intervals[id] = true;
}