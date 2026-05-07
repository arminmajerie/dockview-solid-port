const BaseJSDOMEnvironment = require('@jest/environment-jsdom-abstract').default;
const jsdom = require('jsdom');

class DockviewJSDOMEnvironment extends BaseJSDOMEnvironment {
    constructor(config, context) {
        super(config, context, jsdom);
    }
}

module.exports = DockviewJSDOMEnvironment;
