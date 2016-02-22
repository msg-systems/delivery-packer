#!/usr/bin/env node
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

/* global require: false */
/* global process: false */

/*  standard requirements  */
var fs = require("fs");
var path = require("path");
var util = require("util");

/*  extra requirements  */
var pkg = require("package");
var dashdash = require("dashdash");
var colors = require("colors");

/*  internal requirements  */
var deliveryPacker = require("../lib/deliveryPacker.js");

/*  gracefully die  */
var die = function (msg) {
    console.error("deliveryPacker: ERROR: ", msg);
    process.exit(1);
};

/*  command-line argument parsing  */
var options = [
    {names: ["version", "V"], type: "bool", "default": false, help: "Print tool version and exit."},
    {names: ["help", "h"], type: "bool", "default": false, help: "Print this help and exit."},
    {names: ["verbose", "v"], type: "bool", "default": false, help: "Print verbose processing information."},
    {names: ["outputFolder", "d"], type: "string", "default": "bld", help: "Output folder for the created delivery."},
    {names: ["assetsFolder", "a"], type: "string", "default": "assets", help: "Output assets folder for the created delivery."},
    {names: ["listreg", "R"], type: "bool", default: false, help: "List all registered delivery parts."},
    {names: ["listbld", "B"], type: "bool", default: false, help: "List delivery build order."},
    {names: ["listunused", "U"], type: "bool", default: false, help: "List unused registered delivery parts."},
    {names: ["outputPrefix", "p"], type: "string", "default": "lib", help: "Output file prefix for the delivery."},
    {names: ["minimize", "m"], type: "bool", default: false, help: "Minimize the delivery."}
];
var parser = dashdash.createParser({
    options: options,
    interspersed: false
});
try {
    var opts = parser.parse(process.argv);
    var args = opts._args;
} catch (e) {
    die(e.message);
}
if (opts.help) {
    var help = parser.help().trimRight();
    console.log("deliveryPacker: USAGE: deliveryPacker [options] arguments\n" + "options:\n" + help);
    process.exit(0);
}
else if (opts.version) {
    var p = pkg(module);
    console.log(util.format("%s deliveryPacker %s", p.name, p.version));
    process.exit(0);
}
var input = args.length ? args : ["."];

var files = [];
input.forEach(function (filepath) {
    try {
        var stat = fs.statSync(filepath);
        if (stat.isDirectory()) {
            try {
                stat = fs.statSync(path.join(filepath, deliveryPacker.filename));
                if (stat.isFile()) files.push(path.join(filepath, deliveryPacker.filename));
            } catch (e) {
            }
        } else if (stat.isFile()) {
            files.push(filepath);
        }
    } catch (e) {
    }
});

deliveryPacker.deliver(files, opts.outputFolder, {
    listRegister: opts.listreg,
    listBuildOrder: opts.listbld,
    listUnused: opts.listunused,
    prefix: opts.outputPrefix,
    minimize: opts.minimize,
    assetsFolder: opts.assetsFolder,
    log: function (msg) {
        process.stdout.write(msg + "\n");
    },
    verbose: function (filename, action, msg) {
        if (opts.verbose) {
            filename = path.relative(process.cwd(), filename);
            var msg = "++ " + colors.cyan.bold(filename) + ": " + colors.yellow(action) + ": " + msg + "\n";
            process.stderr.write(msg);
        }
    },
    error: function (filename, action, msg, fix) {
        filename = path.relative(process.cwd(), filename);
        var msg = "++ " + colors.cyan.bold(filename) + ": " + colors.red.bold(action) + ": " + msg + "\n";
        process.stderr.write(msg);
        if (fix) {
            process.stderr.write("Solution: " + colors.yellow.bold(fix) + "\n")
        }
        die("process stopped".red.bold);
    }
});