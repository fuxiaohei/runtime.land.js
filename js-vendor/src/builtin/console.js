function convertStringArgs(args) {
    let stringArgs = args.map(arg => {
        if (arg === undefined) {
            return 'undefined';
        }
        if (arg === null) {
            return 'null';
        }
        return arg.toString();
    });
    return stringArgs;
}

console.log = function (...args) {
    // iterate over args toString
    let stringArgs = convertStringArgs(args);
    console.print(...stringArgs);
}

console.info = function (...args) {
    let stringArgs = convertStringArgs(args);
    console.print(...stringArgs);
}

console.error = function (...args) {
    let stringArgs = convertStringArgs(args);
    console.print_error(...stringArgs);
}