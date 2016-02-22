/*
 **  deliveryPacker -- JavaScript lightweight delivery artifact creator
 **  Design and Development by msg Applied Technology Research
 **  Copyright (c) 2016 msg systems ag (http://www.msg-systems.com/)
 **
 **  Permission is hereby granted, free of charge, to any person obtaining
 **  a copy of this software and associated documentation files (the
 **  "Software"), to deal in the Software without restriction, including
 **  without limitation the rights to use, copy, modify, merge, publish,
 **  distribute, sublicense, and/or sell copies of the Software, and to
 **  permit persons to whom the Software is furnished to do so, subject to
 **  the following conditions:
 **
 **  The above copyright notice and this permission notice shall be included
 **  in all copies or substantial portions of the Software.
 **
 **  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 **  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 **  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 **  IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 **  CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 **  TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 **  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/* global module:  false */
/* global require: false */
/* global process: false */

/*  standard requirements  */
var path = require("path");

/*  external requirements  */
var glob = require("glob");
var colors = require("colors");
var _ = require("lodash");

/*  internal requirements  */
var deliveryPacker = require("../lib/deliveryPacker.js");

/*  export the Grunt plugin  */
module.exports = function (grunt) {
    /*  define the Grunt task  */
    grunt.registerMultiTask("deliveryPacker", "JavaScript delivery packer for delivery artifact creation", function () {
        /*  prepare task options  */
        var options = this.options({
            listreg: false,
            listbld: false,
            listunused: false,
            minimize: false
        });
        grunt.verbose.writeflags(options, "Options");

        /*  delivery packer input */
        var files = [];

        /*  iterate over all src file pairs  */
        this.files.forEach(function (f) {
            f.src.forEach(function (src) {
                if (grunt.file.isDir(src)) {
                    files.push(path.join(src, deliveryPacker.filename));
                } else if (grunt.file.isFile(src)) {
                    files.push(src)
                }
            });
        });

        /*  build the delivery output */
        deliveryPacker.deliver(files, options.outputFolder, {
            listRegister: options.listreg,
            listBuildOrder: options.listbld,
            listUnused: options.listunused,
            prefix: options.outputPrefix,
            minimize: options.minimize,
            assetsFolder: options.assetsFolder,
            log: function (msg) {
                grunt.log.writeln(msg);
            },
            verbose: function (filename, action, msg) {
                filename = path.relative(process.cwd(), filename);
                var msg = "++ " + colors.cyan.bold(filename) + ": " + colors.yellow(action) + ": " + msg + "\n";
                grunt.verbose.writeln(msg);
            },
            error: function (filename, action, msg, fix) {
                filename = path.relative(process.cwd(), filename);
                var msg = "++ " + colors.cyan.bold(filename) + ": " + colors.red.bold(action) + ": " + msg + "\n";
                grunt.log.writeln(msg);
                if (fix) {
                    grunt.log.writeln("Solution: " + colors.yellow.bold(fix) + "\n")
                }
                throw msg;
            }
        });
    });
};