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

/*  standard requirements  */
var fs = require("fs-extra");
var path = require("path");

/*  extra requirements  */
var buildify = require("buildify");
var YAML = require("js-yaml");
var _ = require("lodash");
var colors = require("colors");
var glob = require("glob");

var deliveryFile = "delivery.yaml";

/*  registry             */
var registry = {};

/*  build order register */
var bldOrder = [];

/*  send caller log information      */
var log = function (options, msg) {
    if (typeof options.log === "function")
        options.log(msg);
};

/*  send caller verbose information  */
var verbose = function (options, filename, action, msg) {
    if (typeof options.verbose === "function")
        options.verbose(filename, action, msg);
};

/*  send caller error information    */
var error = function (options, filename, action, msg, fix) {
    if (typeof options.error === "function")
        options.error(filename, action, msg, fix);
};

var findFileInNodeModulesHierarchy = function (file, filePath) {
    try {
        var fileName = path.join(filePath, "node_modules", file);
        var stat = fs.statSync(fileName);
        if (stat.isFile()) {
            return fileName;
        }
    } catch (e) {
        var idx = filePath.lastIndexOf("node_modules");
        if (idx === -1) {
            throw e;
        } else {
            return findFileInNodeModulesHierarchy(file, filePath.substr(0, idx))
        }
    }
};

var resolveNodeModulesFile = function (libPath, file) {
    var absFile = path.join(libPath, file);
    var idx = path.join(file).lastIndexOf("node_modules" + path.sep);
    if (idx != -1) {
        idx = idx + ("node_modules" + path.sep).length;
        var absPath = path.join(libPath, file.substr(0, idx));
        var fileName = file.substr(idx, file.length - 1);

        var foundFile = findFileInNodeModulesHierarchy(fileName, absPath);
        if (foundFile) {
            absFile = foundFile;
        }
    }
    return absFile;
};

var loadSource = function (options, source) {
    var contentYAML = fs.readFileSync(source, {encoding: "utf8"});
    var contentObj = YAML.safeLoad(contentYAML);
    importParts(options, source, contentObj);
    register(options, source, contentObj);
    createDeliveryOrder(options, source, contentObj);
};

var importParts = function (options, source, content) {
    var absPath = path.resolve(path.dirname(source));
    if (content && content.import) {
        _.forEach(content.import, function (importValue) {
            try {
                // importValue might be a node module
                var fileName = findFileInNodeModulesHierarchy(path.join(importValue, "delivery.yaml"), absPath);
                if (fileName) {
                    loadSource(options, fileName);
                }
            } catch (e) {
                // if no module is given - assume importValue is a file/dir glob pattern
                var sources = glob.sync(importValue, {cwd: absPath});
                _.forEach(sources, function (anotherSource) {
                    loadSource(options, path.join(absPath, anotherSource));
                })
            }
        })
    }
};

var register = function (options, source, content) {
    var absPath = path.resolve(path.dirname(source));
    if (content && content.register) {
        for (var key in content.register) {
            if (!content.register.hasOwnProperty(key))
                continue;
            var register = content.register[key];
            // remember the absolute path of the config file
            register.path = absPath;
            register.source = path.basename(source);

            if (!registry.hasOwnProperty(key)) {
                verbose(options, source, "REGISTER", key);
                registry[key] = register;
            } else {
                if (absPath !== registry[key].path || path.basename(source) !== registry[key].source) {
                    error(options, source, "DUPLICATE REGISTER", key,
                        "Ensure that no delivery part is registered twice. Either by not loading a config file or by registering the delivery part with a different name.")
                }
            }
        }
    }
};

var createDeliveryOrder = function (options, source, content) {
    if (content && content.build) {
        for (var key in content.build) {
            if (!content.build.hasOwnProperty(key))
                continue;
            var bldEntry = content.build[key];
            if (typeof bldEntry === "object" && typeof bldEntry.name !== "string") {
                error(options, source, "BUILD ORDER missing name", JSON.stringify(bldEntry), "Ensure that the given object has a legal 'name' attribute.")
            } else if (typeof bldEntry === "string") {
                bldEntry = {
                    name: bldEntry
                }
            }

            var negation = bldEntry.name ? bldEntry.name.indexOf("!") === 0 : false;
            if (negation) {
                bldEntry.name = bldEntry.name.substr(1, bldEntry.name.length);
            }

            var existingBldEntry = _.find(bldOrder, function (bldOrderEntry) {
                return bldOrderEntry.name === bldEntry.name;
            });

            if (existingBldEntry) {
                if (negation) {
                    bldOrder = _.without(bldOrder, existingBldEntry);
                    verbose(options, source, "BUILD ORDER negation", bldEntry.name)
                } else {
                    verbose(options, source, "BUILD ORDER ignore duplicate", bldEntry.name)
                }
            } else if (!negation) {
                if (registry.hasOwnProperty(bldEntry.name)) {
                    bldOrder.push(bldEntry);
                } else {
                    error(options, source, "DELIVERY PART UNKNOWN", bldEntry.name, "Register the delivery part in order to use it in a build.")
                }
            }
        }
    }
};

var buildDelivery = function (options, dest) {
    var filesJS = [];
    var filesMarkup = [];
    var filesCSS = [];
    var tmpFilesCSS = [];
    var assetsMap = {};
    var assetsAvailable = false;
    var builder;
    var prefix = (options.prefix || "lib");
    var assetFolder = (options.assetsFolder || "assets");
    _.forEach(bldOrder, function (bldEntry) {
        var libReg = registry[bldEntry.name];
        _.forEach(libReg.JS, function (file) {
            filesJS.push(resolveNodeModulesFile(libReg.path, file));
        });
        _.forEach(libReg.MARKUP, function (file) {
            filesMarkup.push(resolveNodeModulesFile(libReg.path, file));
        });
        _.forEach(libReg.CSS, function (file) {
            var cssFileName = resolveNodeModulesFile(libReg.path, file && file.name ? file.name : file);
            filesCSS.push(cssFileName);

            _.forEach(file.ASSETS, function (assteFile) {
                var assetFile = resolveNodeModulesFile(libReg.path, assteFile);
                assetsMap[assetFile] = {
                    filename: assetFile,
                    basename: path.basename(assetFile),
                    cssfile: cssFileName,
                    registername: bldEntry.name
                };
                assetsAvailable = true;
            })
        });
    });

    // Uglify the JavaScripts
    if (filesJS.length) {
        ensure(dest);
        builder = buildify("", {quiet: true})
            .setDir("")
            .concat(filesJS);
        if (options.minimize === true) {
            builder.uglify();
        }
        builder.save(path.join(dest, prefix + ".js"));
        log(options, "creating " + colors.cyan.bold(path.join(dest, prefix + ".js")));
    }

    if (filesMarkup.length) {
        ensure(dest);
        builder = buildify("", {quiet: true})
            .setDir("")
            .concat(filesMarkup);
        if (options.minimize === true) {
            builder.uglify();
        }
        builder.save(path.join(dest, prefix + ".html"));
        log(options, "creating " + colors.cyan.bold(path.join(dest, prefix + ".html")));
    }

    // Concat the CSS
    if (filesCSS.length) {
        ensure(dest);
        var tmpDir = path.join(dest, "__tmp");
        // iterate all css files and adjust asset refernces
        _.forEach(filesCSS, function (cssFile) {
            ensure(tmpDir);
            var tmpCssFile = path.join(tmpDir, path.basename(cssFile));
            buildify("", {quiet: true})
                .setDir("")
                .load(cssFile)
                .perform(function (content) {
                    return content.replace(/url\(('|")?(.*?)\1\)/g, function (m1, quote, file) {
                        var cssAssetFiles = _.filter(assetsMap, function (assetEntry) {
                            return assetEntry.cssfile === cssFile;
                        });
                        _.forEach(cssAssetFiles, function (asset) {
                            var re = new RegExp(".*?/?(" + asset.basename + ".*)", "g");
                            file = file.replace(re, function (m2, capture) {
                                return path.join(".", assetFolder, asset.registername, capture).replace(/\\/g, "/");
                            });
                        });
                        return "url('" + file + "')";
                    })
                })
                .save(tmpCssFile);
            tmpFilesCSS.push(tmpCssFile);
        });
        // concat the tmp css files
        builder = buildify("", {quiet: true})
            .setDir("")
            .concat(tmpFilesCSS);
        // maybe minimize them
        if (options.minimize === true) {
            builder.cssmin();
        }
        //save the build artifact to its destination
        builder.save(path.join(dest, prefix + ".css"));
        log(options, "creating " + colors.cyan.bold(path.join(dest, prefix + ".css")));

        // remove the temporary directory
        fs.removeSync(tmpDir)
    }

    // Copy the assets
    if (assetsAvailable) {
        ensure(path.join(dest, assetFolder));
        _.forEach(assetsMap, function (asset) {
            var dst = path.join(dest, assetFolder, asset.registername, asset.basename);
            fs.copySync(asset.filename, dst);
            log(options, "copying " + colors.cyan(path.relative(process.cwd(), asset.filename)) + " to " + colors.cyan.bold(dst));
        })
    }
};

var ensure = function (dest) {
    try {
        fs.mkdirSync(dest)
    } catch (e) {
        if (e.errno === -4075) {
            var stat = fs.statSync(dest);
            if (!stat.isDirectory())
                error(options, dest, "OUTPUT", e.toString())
        }
    }
};

var write = function (options, obj, attr) {
    if (Object.prototype.toString.apply(obj) === Object.prototype.toString.apply({})) {
        for (var key in obj) {
            if (!obj.hasOwnProperty(key))
                continue;
            log(options, "- " + key)
        }
    } else {
        _.forEach(obj, function (objEntry) {
            log(options, "- " + (attr ? objEntry[attr] : objEntry))
        });
    }
};

var writeLibRegister = function (options) {
    if (options.listRegister) {
        log(options, colors.white.bold("Registered libraries:"));
        write(options, registry)
    }
};

var writeBuildOrder = function (options) {
    if (options.listBuildOrder) {
        log(options, colors.white.bold("Delivery build order:"));
        write(options, bldOrder, "name");
    }
};

var writeUnusedLibs = function (options) {
    if (options.listUnused) {
        log(options, colors.white.bold("Unused libraries:"));
        var unusedLibs = _.clone(registry);
        _.forEach(bldOrder, function (buildEntry) {
            if (unusedLibs.hasOwnProperty(buildEntry.name)) {
                delete unusedLibs[buildEntry.name]
            }
        });
        write(options, unusedLibs);
    }
};

/*  delivery packer for a given list of configs  */
var deliveryPacker = function (sources, dest, options) {
    // analyse all configs and build up the bldOrder
    sources.forEach(function (source) {
        loadSource(options, source);
    });

    // build the lib
    buildDelivery(options, dest || "bld");

    // list outputs if requested
    writeLibRegister(options);
    writeBuildOrder(options);
    writeUnusedLibs(options);
};

/*  export the packing API function  */
module.exports = {
    deliver: deliveryPacker,
    filename: deliveryFile
};