console.log = function (...args) {
    // iterate over args toString
    let stringArgs = args.map(arg => arg.toString());
    console.print(...stringArgs);
}

console.info = function (...args) {
    let stringArgs = args.map(arg => arg.toString());
    console.print(...stringArgs);
}

console.error = function (...args) {
    let stringArgs = args.map(arg => arg.toString());
    console.print_error(...stringArgs);
}