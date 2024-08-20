
class Env {
    constructor() {
        return new Proxy(this, {
            get: function (_target, prop) {
                let env_key = prop.toUpperCase();
                return hostcall.read_env(env_key);
            }
        });
    }
}

export default Env;