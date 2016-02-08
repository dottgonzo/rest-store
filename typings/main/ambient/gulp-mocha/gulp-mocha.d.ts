// Compiled using typings@0.6.6
// Source: https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/37b6a533837766f0c765e4181dfc11e06dfbd752/gulp-mocha/gulp-mocha.d.ts
// Type definitions for gulp-mocha
// Project: https://github.com/sindresorhus/gulp-mocha
// Definitions by: Asana <https://asana.com>
// Definitions: https://github.com/borisyankov/DefinitelyTyped


declare module "gulp-mocha" {
    function mocha(setupOptions?: MochaSetupOptions): NodeJS.ReadWriteStream;
    namespace mocha {}
    export = mocha;
}