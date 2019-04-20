var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var res = mod._cached ? mod._cached : mod();
    return res;
}

require.paths = [];
require.modules = {};
require.extensions = [".js",".coffee"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        var y = cwd || '.';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = x + '/package.json';
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key)
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

require.define = function (filename, fn) {
    var dirname = require._core[filename]
        ? ''
        : require.modules.path().dirname(filename)
    ;
    
    var require_ = function (file) {
        return require(file, dirname)
    };
    require_.resolve = function (name) {
        return require.resolve(name, dirname);
    };
    require_.modules = require.modules;
    require_.define = require.define;
    var module_ = { exports : {} };
    
    require.modules[filename] = function () {
        require.modules[filename]._cached = module_.exports;
        fn.call(
            module_.exports,
            require_,
            module_,
            module_.exports,
            dirname,
            filename
        );
        require.modules[filename]._cached = module_.exports;
        return module_.exports;
    };
};

if (typeof process === 'undefined') process = {};

if (!process.nextTick) process.nextTick = (function () {
    var queue = [];
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;
    
    if (canPost) {
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);
    }
    
    return function (fn) {
        if (canPost) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        }
        else setTimeout(fn, 0);
    };
})();

if (!process.title) process.title = 'browser';

if (!process.binding) process.binding = function (name) {
    if (name === 'evals') return require('vm')
    else throw new Error('No such module')
};

if (!process.cwd) process.cwd = function () { return '.' };

require.define("path", function (require, module, exports, __dirname, __filename) {
    function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

});

require.define("/lib/profiles/algo-diff-xcc.js", function (require, module, exports, __dirname, __filename) {
    var factory = require('../delta/diff-xcc-factory.js');
module.exports = new factory.DiffXCCFactory();

});

require.define("/lib/delta/diff-xcc-factory.js", function (require, module, exports, __dirname, __filename) {
    /**
 * @fileoverview This module contains the factory class necessary to
 * instantiate the xcc algorithm class.
 */


/** @ignore */
var tree = require('../delta/tree');
/** @ignore */
var xcc = require('../delta/xcc');


/**
 * Return new instance of XCC diff factory class.
 *
 * @param {Object} [options] Options which will be passed to the xcc algorithm
 *         upon instantiation.
 *
 * @constructor
 */
function DiffXCCFactory(options) {
    this.options = options;
}


/**
 * Return new initialized instance of XCC diff algorithm.
 *
 * @param {Object} doc1         The original document. Use
 *         ``loadOriginalDocument`` of the document factory to load a suitable
 *         document.
 * @param {Object} doc2         The changed document. Use ``loadInputDocument``
 *         of the document factory to load a suitable document.
 * @param {function} [equals]   The equality test-function used during diffing.
 *         Use the method ``createNodeEqualityTest`` of the document factory to
 *         create a suitable equality test function.
 *
 * @return {xcc.Diff} An initialized xcc.Diff instance.
 */
DiffXCCFactory.prototype.createDiffAlgorithm = function(doc1, doc2, equals) {
    var diff;

    if (!doc1.tree || !doc2.tree) {
        throw new Error('Parameter error: Document objects must have tree property');
    }

    diff = new xcc.Diff(doc1.tree, doc2.tree, this.options);

    if (equals) {
        diff.equals = equals;
    }

    return diff;
}


/**
 * Return new tree matching object
 *
 * @return {tree.Matching} Empty matching object.
 */
DiffXCCFactory.prototype.createMatching = function() {
    return new tree.Matching();
}

exports.DiffXCCFactory = DiffXCCFactory;

});

require.define("/lib/delta/tree.js", function (require, module, exports, __dirname, __filename) {
    /**
 * @file:   A collection of classes supporting tree structures and operations
 * @module  tree
 */

/**
 * Create a new tree node and set its value and optionally user data.
 *
 * @param {String} [value]  The node value.
 * @param {object} [data]   User data for this tree node. You may store a
 *         reference to the corresponding object in the underlying document
 *         structure. E.g. a reference to a DOM element.
 *
 * @constructor
 */
function Node(value, data) {
    this.value = value;
    this.data = data;
    this.depth = 0;

    // this.par = undefined;
    // this.childidx = undefined;
    this.children = [];
}


/**
 * Append the given node as a child node.
 *
 * @param {object} child The new child node.
 */
Node.prototype.append = function(child) {
    if (child.par) {
        throw new Error('Cannot append a child which already has a parent');
    }

    child.depth = this.depth + 1;
    child.par = this;
    child.childidx = this.children.length;
    this.children.push(child);
};


/**
 * Invokes a callback for the node and all its child nodes in preorder
 * (document order).
 *
 * @param {function}    callback    The function which will be invoked for each
 *         node.
 * @param {object}      [T]         Context object bound to "this" when the
 *         callback is invoked.
 */
Node.prototype.forEach = function(callback, T) {
    callback.call(T, this);
    this.children.forEach(function(node) {
        node.forEach(callback, T);
    });
};


/**
 * Invokes a callback for the node and all its child nodes in postorder.
 *
 * @param {function}    callback    The function which will be invoked for each
 *         node.
 * @param {object}      [T]         Context object bound to "this" when the
 *         callback is invoked.
 */
Node.prototype.forEachPostorder = function(callback, T) {
    this.children.forEach(function(node) {
        node.forEachPostorder(callback, T);
    });
    callback.call(T, this);
};


/**
 * Equal to forEach except that the callback is not invoked for the context
 * node.
 *
 * @param {function}    callback    The function which will be invoked for each
 *         node.
 * @param {object}      [T]         Context object bound to "this" when the
 *         callback is invoked.
 */
Node.prototype.forEachDescendant = function(callback, T) {
    this.children.forEach(function(node) {
        node.forEach(callback, T);
    });
};


/**
 * Create a new Matching instance. Optionally specify the property used to
 * store partner links in target objects.
 *
 * @param {String}  [propname]  The name of the property which should be used
 *         on a tree.Node to store a reference to its partner.
 *
 * @constructor
 */
function Matching(propname) {
    this.propname = propname || 'partner';
}


/**
 * Return the partner of given object.
 *
 * @param {object} obj  The tree node whose partner should be returned.
 * @return {object} The object associated with the given tree node.
 */
Matching.prototype.get = function(obj) {
    return obj && obj[this.propname];
};


/**
 * Associate the given objects.
 *
 * @param {object} a    The first candidate for the new pair.
 * @param {object} b    The second candidate for the new pair.
 */
Matching.prototype.put = function(a, b) {
    if (a[this.propname] || b[this.propname]) {
        throw new Error('Cannot associate objects which are already part of a matching');
    }
    a[this.propname] = b;
    b[this.propname] = a;
};


/**
 * Create a new secondary tree structure providing quick access to all
 * nodes of a generation.
 *
 * @param {object}  root        A tree.Node representing the root of the tree
 * @param {string}  [propname]  The name of the property which will be used to
 *         cache index values on tree.Node objects.
 *
 * @constructor
 */
function GenerationIndex(root, propname) {
    /**
     * The root of the tree.
     */
    this.root = root;

    /**
     * A property set at every indexed tree.Node indicating the position
     * of the node in the generation.
     */
    this.propname = propname || 'gencacheidx';

    /**
     * An array of arrays of tree.Nodes. Each containing tree.Nodes at the
     * same depth.
     */
    this.generations = [];

    /**
     * An array of booleans indexed by tree depth indicating whether all
     * nodes of a generation have been indexed.
     */
    this.gencomplete = [];

    /**
     * Return true if the whole generation index is complete.
     */
    this.idxcomplete = false;
}


/**
 * Build up complete generation index upfront if necessary.
 */
GenerationIndex.prototype.buildAll = function() {
    var i;
    if (!this.idxcomplete) {
        this.buildSubtree(this.root);
        for (i = 0; i < this.generations.length; i++) {
            this.gencomplete[i] = true;
        }
        this.idxcomplete = true;
    }
};


/**
 * Build up index of a subtree rooting at the specified node.
 */
GenerationIndex.prototype.buildSubtree = function(node) {
    var i, depth;
    depth = node.depth - this.root.depth;

    // Prepare generation structure
    if (this.generations.length === depth) {
        this.generations.push([]);
        this.gencomplete[depth] = true;
    }

    // Append current node
    node[this.propname] = this.generations[depth].length;
    this.generations[depth].push(node);

    // Recurse for children
    for (i = 0; i < node.children.length; i++) {
        this.buildSubtree(node.children[i]);
    }
};


/**
 * Extend generation index dynamically (not implemented yet)
 */
GenerationIndex.extendGeneration = function(depth, offset) {
    throw new Error('Dynamic index expansion not implemented yet');
};


/**
 * Return first node of the generation at depth.
 */
GenerationIndex.prototype.first = function(depth) {
    if (depth < this.generations.length) {
        // First node is in index, return it
        if (this.generations[depth].length > 0) {
            return this.generations[depth][0];
        }

        // Requested index is beyond upper bound of generation array
        // and the generation cache is complete.
        else if (this.gencomplete[depth]) {
            return undefined;
        }
    }

    if (this.idxcomplete) {
        // No need to attempt searching for the node if index is complete.
        return undefined;
    }
    else {
        // Extend generations
        // return this.extendGeneration(depth, refindex + offset);
        throw new Error('Dynamic index expansion not implemented yet');
    }
};


/**
 * Return last node of the generation at depth.
 */
GenerationIndex.prototype.last = function(depth) {
    if (depth < this.generations.length) {
        // Generation cache is complete. Return last item.
        if (this.gencomplete[depth]) {
            return this.generations[depth][this.generations[depth].length - 1];
        }
    }

    if (this.idxcomplete) {
        // No need to attempt searching for the node if index is complete.
        return undefined;
    }
    else {
        // Extend generations
        // return this.extendGeneration(depth, refindex + offset);
        throw new Error('Dynamic index expansion not implemented yet');
    }
};


/**
 * Return a tree.Node with the same depth at the given offset relative to
 * the given reference node.
 *
 * @param {object}  refnode   The reference tree.Node
 * @param {number}  offset    An integer value
 *
 * @returns {object} tree.Node or undefined
 */
GenerationIndex.prototype.get = function(refnode, offset) {
    var depth, refindex;

    offset = offset || 0;

    if (refnode === this.root) {
        // Return the root node if refnode is equal to the tree root.
        if (offset === 0) {
            return refnode;
        }
        else {
            return undefined;
        }
    }

    depth = refnode.depth - this.root.depth;
    if (depth < this.generations.length) {
        // If we already have cached some nodes in this tree depth, go for
        // them.
        if (refnode.hasOwnProperty(this.propname)) {
            refindex = refnode[this.propname];
            if (this.generations[depth][refindex] !== refnode) {
                throw new Error('GenerationIndex index corrupt');
            }

            // Requested offset lies beyond lower bound. Return undefined.
            if (refindex + offset < 0) {
                return undefined;
            }

            // Requested offset is already indexed. Return it.
            else if (refindex + offset < this.generations[depth].length) {
                return this.generations[depth][refindex + offset];
            }

            // Requested index is beyond upper bound of generation array
            // and the generation cache is complete.
            else if (this.gencomplete[depth]) {
                return undefined;
            }

            // Requested index is beyand upper bound of generation array
            // but the generation cache is not yet complete. Fall through
            // to code outside below.
        }

    }

    if (this.idxcomplete) {
        // No need to attempt searching for the node if index is complete.
        return undefined;
    }
    else {
        // Extend generations
        // return this.extendGeneration(depth, refindex + offset);
        throw new Error('Dynamic index expansion not implemented yet');
    }
};


/**
 * Create a new secondary tree structure providing quick access to all
 * nodes in document order.
 *
 * @param {object}  root      A tree.Node representing the root of the tree
 * @param {string}  [propname]  The name of the property which will be used to
 *         cache index values on tree.Node objects.
 *
 * @constructor
 */
function DocumentOrderIndex(root, propname) {
    /**
     * The root of the tree.
     */
    this.root = root;

    /**
     * A property set at every indexed tree.Node indicating the position
     * of the node in the generation.
     */
    this.propname = propname || 'docorderidx';

    /**
     * Return true if the whole generation index is complete.
     */
    this.idxcomplete = false;

    /**
     * Array of nodes in document order.
     */
    this.nodes = [];
}


/**
 * Build up complete document order index upfront if necessary.
 */
DocumentOrderIndex.prototype.buildAll = function() {
    if (!this.idxcomplete) {
        this.root.forEach(function(node) {
            node[this.propname] = this.nodes.length;
            this.nodes.push(node);
        }, this);
        this.idxcomplete = true;
    }
};


/**
 * Return a tree.Node at the offset relative to the given reference node.
 *
 * @param {object}  refnode   The reference tree.Node
 * @param {number}  offset    An integer value
 *
 * @returns {object} tree.Node or undefined
 */
DocumentOrderIndex.prototype.get = function(refnode, offset) {
    var depth, refindex;

    offset = offset || 0;

    // If we already have cached some nodes in this tree depth, go for
    // them.
    if (refnode.hasOwnProperty(this.propname)) {
        refindex = refnode[this.propname];
        if (this.nodes[refindex] !== refnode) {
            throw new Error('Document order index corrupt');
        }

        // Requested offset lies beyond lower bound. Return undefined.
        if (refindex + offset < 0) {
            return undefined;
        }

        // Requested offset is already indexed. Return it.
        else if (refindex + offset < this.nodes.length) {
            return this.nodes[refindex + offset];
        }

        // Requested index is beyond upper bound of index. Fall through to
        // code outside the if below.
    }

    if (this.idxcomplete) {
        // No need to attempt searching for the node if index is complete.
        return undefined;
    }
    else {
        // Extend document order index
        // return this.extendIndex(depth, refnode, index);
        throw new Error('Dynamic index expansion not implemented yet');
    }
};


/**
 * Return the size of a subtree when traversed using this index
 * Static function: must work also with nodes which are not part of the index.
 */
DocumentOrderIndex.prototype.size = function(refnode) {
    var i=0;
    refnode.forEach(function(n) {
        i++;
    });
    return i;
};


/**
 * Return an array of all nodes contained in the subtree under refnode in
 * document order index.
 * Static function: must work also with nodes which are not part of the index.
 */
DocumentOrderIndex.prototype.flatten = function(refnode) {
    var result = [];
    refnode.forEach(function(n) {
        result.push(n);
    });
    return result;
};


/**
 * Simple subtree hashing algorithm.
 *
 * @param {function}    HashAlgorithm   Constructor function for the hash
 * @param {object}      nodehashindex   An instance of :js:class:`NodeHashIndex`
 *
 * @constructor
 */
function SimpleTreeHash(HashAlgorithm, nodehashindex) {
    this.HashAlgorithm = HashAlgorithm;
    this.nodehashindex = nodehashindex;
}


/**
 * Calculate hash value of subtree
 *
 * @param {object}  node    A tree.Node specifying the root of the subtree.
 * @param {object}  [hash]  If provided, use this hash instance. Otherwise
 *         create a new one.
 */
SimpleTreeHash.prototype.process = function(node, hash) {
    hash = hash || new this.HashAlgorithm();

    node.forEach(function(n) {
        var nodehash = this.nodehashindex.get(n);
        hash.update(nodehash);
    }, this);

    return hash.get();
};


/**
 * Create new instance of a node hash index.
 *
 * @param {object}  nodehash    An object implementing the node-hashing method
 *         for the underlying document. E.g. an instance of
 *         :js:class:`DOMNodeHash`.
 * @param {string}  [propname]  The name of the property which will be used to
 *         cache the hash values on tree.Node objects. Defaults to 'nodehash'.
 *
 * @constructor
 */
function NodeHashIndex(nodehash, propname) {
    this.nodehash = nodehash;
    this.propname = propname || 'nodehash';
}


/**
 * Return the hash value for the given node.
 *
 * @param {object}  node    A tree.Node.
 *
 * @return {number} Hash value of the tree node.
 */
NodeHashIndex.prototype.get = function(node) {
    if (node) {
        if (!(node.hasOwnProperty(this.propname))) {
            node[this.propname] = this.nodehash.process(node);
        }

        return node[this.propname];
    }
};


/**
 * Create new instance of a tree hash index.
 *
 * @param {object}  treehash    An object implementing the tree-hashing method.
 *         E.g. an instance of
 *         :js:class`SimpleTreeHash`.
 * @param {string}  [propname]  The name of the property which will be used to
 *         cache the hash values on tree.Node objects. Defaults to 'treehash'.
 *
 * @constructor
 */
function TreeHashIndex(treehash, propname) {
    this.treehash = treehash;
    this.propname = propname || 'treehash';
}


/**
 * Return the hash value for the subtree rooted at the given node.
 *
 * @param {object}  node    A tree.Node.
 *
 * @return {number} Hash value of the subtree rooted at the given node.
 */
TreeHashIndex.prototype.get = function(node) {
    if (node) {
        if (!(node.hasOwnProperty(this.propname))) {
            node[this.propname] = this.treehash.process(node);
        }

        return node[this.propname];
    }
};


/**
 * Construct a new tree anchor object. The tree anchor is a pure data object
 * used to point to a position in the tree. The object has the following
 * properties:
 *
 * base
 *      The base node of the anchor. If the anchor points at the root node,
 *      base is undefined.
 *
 * target
 *      The target node this anchor points at. This node is a child node of
 *      base. This property may be undefined if the anchor points before or
 *      after the children list.
 *
 * index
 *      The index into the children list of the base node. This property is
 *      undefined when the anchor points at the root of the tree.
 *
 * @param {tree.Node} root      The root node of the tree.
 * @param {tree.Node} [base]    The base node for this anchor. If index is left
 *         out, this parameter specifies the target node.  Otherwise it
 *         specifies the parent node of the target pointed at by index.
 * @param {Number} [index]      The child index of the target node.
 *
 * @constructor
 */
function Anchor(root, base, index) {
    if (!root) {
        throw new Error('Parameter error: need a reference to the tree root');
    }

    if (!base || (root === base && typeof index === 'undefined')) {
        this.base = undefined;
        this.target = root;
        this.index = undefined;
    }
    else if (typeof index === 'undefined') {
        this.base = base.par;
        this.target = base;
        this.index = base.childidx;
    }
    else {
        this.base = base;
        this.target = base.children[index];
        this.index = index;
    }
}


exports.Node = Node;
exports.Matching = Matching;
exports.GenerationIndex = GenerationIndex;
exports.DocumentOrderIndex = DocumentOrderIndex;
exports.SimpleTreeHash = SimpleTreeHash;
exports.NodeHashIndex = NodeHashIndex;
exports.TreeHashIndex = TreeHashIndex;
exports.Anchor = Anchor;

});

require.define("/lib/delta/xcc.js", function (require, module, exports, __dirname, __filename) {
    /**
 * @fileoverview Implementation of Rönnau/Borghoff XML tree diff algorithm XCC.
 *
 * @see:
 * * http://dx.doi.org/10.1007/s00450-010-0140-2
 * * https://launchpad.net/xcc
 */

/** @ignore */
var lcs = require('./lcs');

/**
 * Create a new instance of the XCC diff implementation.
 *
 * @param {tree.Node} a Root node of original tree
 * @param {tree.Node} b Root node of changed tree
 * @param {Object} options Options
 *
 * @constructor
 * @name xcc.Diff
 */
function Diff(a, b, options) {
    this.a = a; // Root node of tree a
    this.b = b; // Root node of tree b
    this.options = options || {
        'ludRejectCallbacks': undefined,
            'detectLeafUpdates': true
    };
}

/**
 * Create a matching between the two nodes using the xcc diff algorithm
 *
 * @param {tree.Matching} matching A tree matching which will be populated by
 *         diffing tree a and b.
 *
 * @memberOf xcc.Diff
 */
Diff.prototype.matchTrees = function(matching) {
    // Associate root nodes
    matching.put(this.b, this.a);

    this.matchLeafLCS(matching);
    if (this.options.detectLeafUpdates) {
        this.matchLeafUpdates(matching);
    }
};


/**
 * Default equality test. Override this method if you need to test other
 * node properties instead/beside node value.
 *
 * @param {tree.Node} a Candidate node from tree a
 * @param {tree.Node} b Candidate node from tree b
 *
 * @return {boolean} Return true if the value of the two nodes is equal.
 *
 * @memberOf xcc.Diff
 */
Diff.prototype.equals = function(a, b) {
    return (a.value === b.value);
};


/**
 * Identify unchanged leaves by comparing them using myers longest common
 * subsequence algorithm.
 *
 * @param {tree.Matching} matching A tree matching which will be populated by
 *         diffing tree a and b.
 *
 * @memberOf xcc.Diff
 */
Diff.prototype.matchLeafLCS = function(matching) {
    var a_leaves = [],
        b_leaves = [],
        lcsinst = new lcs.LCS(a_leaves, b_leaves);

    // Leaves are considered equal if their values match and if they have
    // the same tree depth. Need to wrap the equality-test function into
    // a closure executed immediately in order to maintain correct context
    // (rename 'this' into 'that').
    lcsinst.equals = (function(that){
        return function(a, b) {
            return a.depth === b.depth && that.equals(a, b);
        };
    }(this));

    // Populate leave-node arrays.
    this.a.forEachDescendant(function(n) {
        if (n.children.length === 0) {
            a_leaves.push(n);
        }
    });
    this.b.forEachDescendant(function(n) {
        if (n.children.length === 0) {
            b_leaves.push(n);
        }
    });

    // Identify structure-preserving changes. Run lcs over leave nodes of
    // tree a and tree b. Associate the identified leaf nodes and also
    // their ancestors except if this would result in structure-affecting
    // change.
    lcsinst.forEachCommonSymbol(function(x, y) {
        var a = a_leaves[x], b = b_leaves[y], a_nodes = [], b_nodes = [], i;

        // Bubble up hierarchy until we encounter the first ancestor which
        // already has been matched. Record potential pairs in the a_nodes and
        // b_nodes arrays.
        while(a && b && !matching.get(a) && !matching.get(b)) {
            a_nodes.push(a);
            b_nodes.push(b);
            a = a.par;
            b = b.par;
        }

        // Record nodes a and b and all of their ancestors in the matching if
        // and only if the nearest matched ancestors are partners.
        if (a && b && a === matching.get(b)) {
            for (i=0; i<a_nodes.length; i++) {
                matching.put(a_nodes[i], b_nodes[i]);
            }
        }
    }, this);
};


/**
 * Identify leaf-node updates by traversing descendants of b_node top-down.
 * b_node must already be part of the matching.
 *
 * @param {tree.Matching} matching A tree matching which will be populated by
 *         diffing tree a and b.
 * @param {tree.Node} a_node A node from tree a which already takes part in the
 *         matching.
 * @param {function} [reject] A user supplied function which may indicate
 *         a given node should not be considered when detecting node updates.
 *         The function should take one argument (tree.Node) and return true
 *         (reject) or false (do not reject).
 *
 * @memberOf xcc.Diff
 */
Diff.prototype.matchLeafUpdatesOnDescendants = function(matching, a_node, reject) {
    var a_nodes = a_node.children,
        b_nodes = matching.get(a_node).children,
        pm = true,  // True if the previous node pair matched
        i = 0,      // Array index into a_nodes
        k = 0,      // Array index into b_nodes
        a,          // Current candidate node in a_nodes
        b;          // Current candidate node in b_nodes

    // Loop through a_nodes and b_nodes simultaneously
    while (a_nodes[i] && b_nodes[k]) {
        a = a_nodes[i];
        b = b_nodes[k];

        if (reject && !matching.get(a) && reject(a)) {
            // Skip a if it gets rejected by the user defined function
            pm = false;
            i++;
        }
        else if (reject && !matching.get(b) && reject(b)) {
            // Skip b if it gets rejected by the user defined function
            pm = false;
            k++;
        }
        else if (pm && !matching.get(a) && !matching.get(b) && a.children.length === 0 && b.children.length === 0) {
            // If the previous sibling takes part in the matching and both
            // candidates are leaf-nodes, they should form a pair (leaf-update)
            matching.put(a, b);
            i++;
            k++;
        }
        else if (pm && !matching.get(a) && !matching.get(b) && this.equals(a, b)) {
            // If the previous sibling takes part in the matching and both
            // candidates have the same value, they should form a pair
            matching.put(a, b);
            // Recurse
            this.matchLeafUpdatesOnDescendants(matching, a, reject);
            i++;
            k++;
        }
        else if (!matching.get(a)) {
            // Skip a if above rules did not apply and a is not in the matching
            pm = false;
            i++;
        }
        else if (!matching.get(b)) {
            // Skip b if above rules did not apply and b is not in the matching
            pm = false;
            k++;
        }
        else if (a === matching.get(b)) {
            // Recurse, both candidates are in the matching
            this.matchLeafUpdatesOnDescendants(matching, a, reject);
            pm = true;
            i++;
            k++;
        }
        else {
            // Both candidates are in the matching but they are no partners.
            // This is impossible, bail out.
            throw new Error('Matching is not consistent');
        }
    }
}


/**
 * Detect updated leaf nodes by analyzing their neighborhood top-down.
 *
 * @param {tree.Matching} matching A tree matching which will be populated by
 *         diffing tree a and b.
 *
 * @memberOf xcc.Diff
 */
Diff.prototype.matchLeafUpdates = function(matching) {
    var i, rejects = this.options.ludRejectCallbacks || [undefined];
    for (i=0; i<rejects.length; i++) {
        this.matchLeafUpdatesOnDescendants(matching, this.b, rejects[i]);
    }
};


exports.Diff = Diff;

});

require.define("/lib/delta/lcs.js", function (require, module, exports, __dirname, __filename) {
    /**
 * @file:   Implementation of Myers linear space longest common subsequence
 *          algorithm.
 * @see:
 * * http://dx.doi.org/10.1007/BF01840446
 * * http://citeseer.ist.psu.edu/viewdoc/summary?doi=10.1.1.4.6927
 *
 * @module  lcs
 */

/**
 * Create a new instance of the LCS implementation.
 *
 * @param a     The first sequence
 * @param b     The second sequence
 *
 * @constructor
 */
function LCS(a, b) {
    this.a = a;
    this.b = b;
}


/**
 * Returns true if the sequence members a and b are equal. Override this
 * method if your sequences contain special things.
 */
LCS.prototype.equals = function(a, b) {
    return (a === b);
};


/**
 * Compute longest common subsequence using myers divide & conquer linear
 * space algorithm.
 *
 * Call a callback for each snake which is part of the longest common
 * subsequence.
 *
 * This algorithm works with strings and arrays. In order to modify the
 * equality-test, just override the equals(a, b) method on the LCS
 * object.
 *
 * @param callback  A function(x, y) called for A[x] and B[y] for symbols
 *                  taking part in the LCS.
 * @param T         Context object bound to "this" when the callback is
 *                  invoked.
 * @param limit     A Limit instance constraining the window of operation to
 *                  the given limit. If undefined the algorithm will iterate
 *                  over the whole sequences a and b.
 */
LCS.prototype.compute = function(callback, T, limit) {
    var midleft = new exports.KPoint(),
        midright = new exports.KPoint(),
        d;

    if (typeof limit === 'undefined') {
        limit = this.defaultLimit();
    }

    // Return if there is nothing left
    if (limit.N <= 0 && limit.M <= 0) {
        return 0;
    }

    // Callback for each right-edge when M is zero and return number of
    // edit script operations.
    if (limit.N > 0 && limit.M === 0) {
        midleft.set(0, 0).translate(limit.left);
        midright.set(1, 1).translate(limit.left);
        for (d = 0; d < limit.N; d++) {
            callback.call(T, midleft, midright);
            midleft.moveright();
            midright.moveright();
        }
        return d;
    }

    // Callback for each down-edge when N is zero and return number of edit
    // script operations.
    if (limit.N === 0 && limit.M > 0) {
        midleft.set(0, 0).translate(limit.left);
        midright.set(0, -1).translate(limit.left);
        for (d = 0; d < limit.M; d++) {
            callback.call(T, midleft, midright);
            midleft.movedown();
            midright.movedown();
        }
        return d;
    }

    // Find the middle snake and store the result in midleft and midright
    d = this.middleSnake(midleft, midright, limit);

    if (d === 0) {
        // No single insert / delete operation was identified by the middle
        // snake algorithm, this means that all the symbols between left and
        // right are equal -> one straight diagonal on k=0
        if (!limit.left.equal(limit.right)) {
            callback.call(T, limit.left, limit.right);
        }
    }
    else if (d === 1) {
        // Middle-snake algorithm identified exactly one operation. Report
        // the involved snake(s) to the caller.
        if (!limit.left.equal(midleft)) {
            callback.call(T, limit.left, midleft);
        }

        if (!midleft.equal(midright)) {
            callback.call(T, midleft, midright);
        }

        if (!midright.equal(limit.right)) {
            callback.call(T, midright, limit.right);
        }
    }
    else {
        // Recurse if the middle-snake algorithm encountered more than one
        // operation.
        if (!limit.left.equal(midleft)) {
            this.compute(callback, T, new exports.Limit(limit.left, midleft));
        }

        if (!midleft.equal(midright)) {
            callback.call(T, midleft, midright);
        }

        if (!midright.equal(limit.right)) {
            this.compute(callback, T, new exports.Limit(midright, limit.right));
        }
    }

    return d;
};


/**
 * Call a callback for each symbol which is part of the longest common
 * subsequence between A and B.
 *
 * Given that the two sequences A and B were supplied to the LCS
 * constructor, invoke the callback for each pair A[x], B[y] which is part
 * of the longest common subsequence of A and B.
 *
 * This algorithm works with strings and arrays. In order to modify the
 * equality-test, just override the equals(a, b) method on the LCS
 * object.
 *
 * Usage:
 * <code>
 * var lcs = [];
 * var A = 'abcabba';
 * var B = 'cbabac';
 * var l = new LCS(A, B);
 * l.forEachCommonSymbol(function(x, y) {
 *     lcs.push(A[x]);
 * });
 * console.log(lcs);
 * // -> [ 'c', 'a', 'b', 'a' ]
 * </code>
 *
 * @param callback  A function(x, y) called for A[x] and B[y] for symbols
 *                  taking part in the LCS.
 * @param T         Context object bound to "this" when the callback is
 *                  invoked.
 */
LCS.prototype.forEachCommonSymbol = function(callback, T) {
    return this.compute(function(left, right) {
        this.forEachPositionInSnake(left, right, callback, T);
    }, this);
};


/**
 * Internal use. Compute new values for the next head on the given k-line
 * in forward direction by examining the results of previous calculations
 * in V in the neighborhood of the k-line k.
 *
 * @param head  (Output) Reference to a KPoint which will be populated
 *              with the new values
 * @param k     (In) Current k-line
 * @param kmin  (In) Lowest k-line in current d-round
 * @param kmax  (In) Highest k-line in current d-round
 * @param limit (In) Current lcs search limits (left, right, N, M, delta, dmax)
 * @param V     (In-/Out) Vector containing the results of previous
 *              calculations. This vector gets updated automatically by
 *              nextSnakeHeadForward method.
 */
LCS.prototype.nextSnakeHeadForward = function(head, k, kmin, kmax, limit, V) {
    var k0, x, bx, by, n;

    // Determine the preceeding snake head. Pick the one whose furthest
    // reaching x value is greatest.
    if (k === kmin || (k !== kmax && V[k-1] < V[k+1])) {
        // Furthest reaching snake is above (k+1), move down.
        k0 = k+1;
        x = V[k0];
    }
    else {
        // Furthest reaching snake is left (k-1), move right.
        k0 = k-1;
        x = V[k0] + 1;
    }

    // Follow the diagonal as long as there are common values in a and b.
    bx = limit.left.x;
    by = bx - (limit.left.k + k);
    n = Math.min(limit.N, limit.M + k);
    while (x < n && this.equals(this.a[bx + x], this.b[by + x])) {
        x++;
    }

    // Store x value of snake head after traversing the diagonal in forward
    // direction.
    head.set(x, k).translate(limit.left);

    // Memozie furthest reaching x for k
    V[k] = x;

    // Return k-value of preceeding snake head
    return k0;
};


/**
 * Internal use. Compute new values for the next head on the given k-line
 * in reverse direction by examining the results of previous calculations
 * in V in the neighborhood of the k-line k.
 *
 * @param head  (Output) Reference to a KPoint which will be populated
 *              with the new values
 * @param k     (In) Current k-line
 * @param kmin  (In) Lowest k-line in current d-round
 * @param kmax  (In) Highest k-line in current d-round
 * @param limit (In) Current lcs search limits (left, right, N, M, delta, dmax)
 * @param V     (In-/Out) Vector containing the results of previous
 *              calculations. This vector gets updated automatically by
 *              nextSnakeHeadForward method.
 */
LCS.prototype.nextSnakeHeadBackward = function(head, k, kmin, kmax, limit, V) {
    var k0, x, bx, by, n;

    // Determine the preceeding snake head. Pick the one whose furthest
    // reaching x value is greatest.
    if (k === kmax || (k !== kmin && V[k-1] < V[k+1])) {
        // Furthest reaching snake is underneath (k-1), move up.
        k0 = k-1;
        x = V[k0];
    }
    else {
        // Furthest reaching snake is left (k-1), move right.
        k0 = k+1;
        x = V[k0]-1;
    }

    // Store x value of snake head before traversing the diagonal in
    // reverse direction.
    head.set(x, k).translate(limit.left);

    // Follow the diagonal as long as there are common values in a and b.
    bx = limit.left.x - 1;
    by = bx - (limit.left.k + k);
    n = Math.max(k, 0);
    while (x > n && this.equals(this.a[bx + x], this.b[by + x])) {
        x--;
    }

    // Memozie furthest reaching x for k
    V[k] = x;

    // Return k-value of preceeding snake head
    return k0;
};


/**
 * Internal use. Find the middle snake and set lefthead to the left end and
 * righthead to the right end.
 *
 * @param lefthead  (Output) A reference to a KPoint which will be
 *                  populated with the values corresponding to the left end
 *                  of the middle snake.
 * @param righthead (Output) A reference to a KPoint which will be
 *                  populated with the values corresponding to the right
 *                  end of the middle snake.
 * @param limit     (In) Current lcs search limits (left, right, N, M, delta, dmax)
 *
 * @returns         d, number of edit script operations encountered within
 *                  the given limit
 */
LCS.prototype.middleSnake = function (lefthead, righthead, limit) {
    var d, k, head, k0;
    var delta = limit.delta;
    var dmax = Math.ceil(limit.dmax / 2);
    var checkBwSnake = (delta % 2 === 0);
    var Vf = {};
    var Vb = {};

    Vf[1] = 0;
    Vb[delta-1] = limit.N;
    for (d = 0; d <= dmax; d++) {
        for (k = -d; k <= d; k+=2) {
            k0 = this.nextSnakeHeadForward(righthead, k, -d, d, limit, Vf);

            // check for overlap
            if (!checkBwSnake && k >= -d-1+delta && k <= d-1+delta) {
                if (Vf[k] >= Vb[k]) {
                    // righthead already contains the right stuff, now set
                    // the lefthead to the values of the last k-line.
                    lefthead.set(Vf[k0], k0).translate(limit.left);
                    // return the number of edit script operations
                    return 2 * d - 1;
                }
            }
        }

        for (k = -d+delta; k <= d+delta; k+=2) {
            k0 = this.nextSnakeHeadBackward(lefthead, k, -d+delta, d+delta, limit, Vb);

            // check for overlap
            if (checkBwSnake && k >= -d && k <= d) {
                if (Vf[k] >= Vb[k]) {
                    // lefthead already contains the right stuff, now set
                    // the righthead to the values of the last k-line.
                    righthead.set(Vb[k0], k0).translate(limit.left);
                    // return the number of edit script operations
                    return 2 * d;
                }
            }
        }
    }
};


/**
 * Return the default limit spanning the whole input
 */
LCS.prototype.defaultLimit = function() {
    return new exports.Limit(
            new exports.KPoint(0,0),
            new exports.KPoint(this.a.length, this.a.length - this.b.length));
};


/**
 * Invokes a function for each position in the snake between the left and
 * the right snake head.
 *
 * @param left      Left KPoint
 * @param right     Right KPoint
 * @param callback  Callback of the form function(x, y)
 * @param T         Context object bound to "this" when the callback is
 *                  invoked.
 */
LCS.prototype.forEachPositionInSnake = function(left, right, callback, T) {
    var k = right.k;
    var x = (k > left.k) ? left.x + 1 : left.x;
    var n = right.x;

    while (x < n) {
        callback.call(T, x, x-k);
        x++;
    }
};


/**
 * Create a new KPoint instance.
 *
 * A KPoint represents a point identified by an x-coordinate and the
 * number of the k-line it is located at.
 *
 * @constructor
 */
var KPoint = function(x, k) {
    /**
     * The x-coordinate of the k-point.
     */
    this.x = x;

    /**
     * The k-line on which the k-point is located at.
     */
    this.k = k;
};


/**
 * Return a new copy of this k-point.
 */
KPoint.prototype.copy = function() {
    return new KPoint(this.x, this.k);
};


/**
 * Set the values of a k-point.
 */
KPoint.prototype.set = function(x, k) {
    this.x = x;
    this.k = k;
    return this;
};


/**
 * Translate this k-point by adding the values of the given k-point.
 */
KPoint.prototype.translate = function(other) {
    this.x += other.x;
    this.k += other.k;
    return this;
};


/**
 * Move the point left by d units
 */
KPoint.prototype.moveleft = function(d) {
    this.x -= d || 1;
    this.k -= d || 1;
    return this;
};


/**
 * Move the point right by d units
 */
KPoint.prototype.moveright = function(d) {
    this.x += d || 1;
    this.k += d || 1;
    return this;
};


/**
 * Move the point up by d units
 */
KPoint.prototype.moveup = function(d) {
    this.k -= d || 1;
    return this;
};


/**
 * Move the point down by d units
 */
KPoint.prototype.movedown = function(d) {
    this.k += d || 1;
    return this;
};


/**
 * Returns true if the given k-point has equal values
 */
KPoint.prototype.equal = function(other) {
    return (this.x === other.x && this.k === other.k);
};


/**
 * Create a new LCS Limit instance. This is a pure data object which holds
 * precalculated parameters for the lcs algorithm.
 *
 * @constructor
 */
var Limit = function(left, right) {
    this.left = left;
    this.right = right;
    this.delta = right.k - left.k;
    this.N = right.x - left.x;
    this.M = this.N - this.delta;
    this.dmax = this.N + this.M;
};


// CommonJS exports
exports.LCS = LCS;
exports.KPoint = KPoint;
exports.Limit = Limit;

});

require.define("/lib/profiles/algo-diff-skelmatch.js", function (require, module, exports, __dirname, __filename) {
    var factory = require('../delta/diff-skelmatch-factory.js');
module.exports = new factory.DiffSkelmatchFactory();

});

require.define("/lib/delta/diff-skelmatch-factory.js", function (require, module, exports, __dirname, __filename) {
    /**
 * @fileoverview This module contains the factory class necessary to
 * instantiate the skelmatch algorithm class.
 */


/** @ignore */
var tree = require('../delta/tree');
/** @ignore */
var skelmatch = require('../delta/skelmatch');


/**
 * Create a new instance of the skelmatch diff factory.
 * @constructor
 */
function DiffSkelmatchFactory() {
}


/**
 * Return new initialized instance of Skel-Match diff algorithm.
 *
 * @param {Object} doc1         The original document. Use
 *         ``loadOriginalDocument`` of the document factory to load a suitable
 *         document.
 * @param {Object} doc2         The changed document. Use ``loadInputDocument``
 *         of the document factory to load a suitable document.
 * @param {function} [equals]   The equality test-function used during diffing.
 *         Use the method ``createNodeEqualityTest`` of the document factory to
 *         create a suitable equality test function.
 *
 * @return {skelmatch.Diff} An initialized skelmatch.Diff instance.
 */
DiffSkelmatchFactory.prototype.createDiffAlgorithm = function(doc1, doc2, equals) {
    var diff;

    if (!doc1.tree || !doc2.tree) {
        throw new Error('Parameter error: Document objects must have tree property');
    }

    diff = new skelmatch.Diff(doc1.tree, doc2.tree);

    if (equals) {
        diff.equals = equals;
    }

    return diff;
}


/**
 * Return new tree matching object
 *
 * @return {tree.Matching} Empty matching object.
 */
DiffSkelmatchFactory.prototype.createMatching = function() {
    return new tree.Matching();
}


exports.DiffSkelmatchFactory = DiffSkelmatchFactory;

});

require.define("/lib/delta/skelmatch.js", function (require, module, exports, __dirname, __filename) {
    /**
 * @fileoverview    Implementation of the "skelmatch" tree matching algorithm.
 *
 * This algorithm is heavily inspired by the XCC tree matching algorithm by
 * Sebastian Rönnau and Uwe M. Borghoff. It shares the idea that the
 * interesting bits are found towards the bottom of the tree.
 *
 * Skel-match divides the problem of finding a partial matching between two
 * structured documents represented by ordered trees into two subproblems:
 * 1.   Detect changes in document content (Longest Common Subsequence among
 *      leaf-nodes).
 * 2.   Detect changes in remaining document structure.
 *
 * By default leaf-nodes are considered content, and internal nodes are
 * treated as structure.
 */


/** @ignore */
var lcs = require('./lcs');


/**
 * Create a new instance of the XCC diff implementation.
 *
 * @param {tree.Node} a Root node of original tree
 * @param {tree.Node} b Root node of changed tree
 *
 * @constructor
 * @name skelmatch.Diff
 */
function Diff(a, b) {
    this.a = a; // Root node of tree a
    this.b = b; // Root node of tree b
}


/**
 * Create a matching between the two nodes using the skelmatch algorithm
 *
 * @param {tree.Matching} matching A tree matching which will be populated by
 *         diffing tree a and b.
 *
 * @memberOf skelmatch.Diff
 */
Diff.prototype.matchTrees = function(matching) {
    // Associate root nodes
    matching.put(this.b, this.a);

    this.matchContent(matching);
    this.matchStructure(matching);
};


/**
 * Return true if the given node should be treated as a content node. Override
 * this method in order to implement custom logic to decide whether a node
 * should be examined during the initial LCS (content) or during the second
 * pass. Default: Return true for leaf-nodes.
 *
 * @param {tree.Node} The node which should be examined.
 *
 * @return {boolean} True if the node is a content-node, false otherwise.
 *
 * @memberOf skelmatch.Diff
 */
Diff.prototype.isContent = function(node) {
    return (node.children.length === 0);
};


/**
 * Return true if the given node should be treated as a structure node.
 * Default: Return true for internal nodes.
 *
 * @param {tree.Node} The node which should be examined.
 *
 * @return {boolean} True if the node is a content-node, false otherwise.
 *
 * @memberOf skelmatch.Diff
 */
Diff.prototype.isStructure = function(node) {
    return !this.isContent(node);
};


/**
 * Default equality test for node values. Override this method if you need to
 * test other node properties instead/beside node value.
 *
 * @param {tree.Node} a Candidate node from tree a
 * @param {tree.Node} b Candidate node from tree b
 *
 * @return {boolean} Return true if the value of the two nodes is equal.
 *
 * @memberOf skelmatch.Diff
 */
Diff.prototype.equals = function(a, b) {
    return (a.value === b.value);
};


/**
 * Default equality test for content nodes. Also test all descendants of a and
 * b for equality. Override this method if you want to use tree hashing for
 * this purpose.
 *
 * @param {tree.Node} a Candidate node from tree a
 * @param {tree.Node} b Candidate node from tree b
 *
 * @return {boolean} Return true if the value of the two nodes is equal.
 *
 * @memberOf skelmatch.Diff
 */
Diff.prototype.equalContent = function(a, b) {
    var i;

    if (a.children.length !== b.children.length) {
        return false;
    }
    for (i = 0; i < a.children.length; i++) {
        if (!this.equalContent(a.children[i], b.children[i])) {
            return false;
        }
    }

    return this.equals(a, b);
};


/**
 * Default equality test for structure nodes. Return true if ancestors either
 * have the same node value or if they form a pair. Override this method if you
 * want to use tree hashing for this purpose.
 *
 * @param {tree.Node} a Candidate node from tree a
 * @param {tree.Node} b Candidate node from tree b
 *
 * @return {boolean} Return true if the value of the two nodes is equal.
 *
 * @memberOf skelmatch.Diff
 */
Diff.prototype.equalStructure = function(matching, a, b) {
    if (!matching.get(a) && !matching.get(b)) {
        // Return true if all ancestors fullfill the requirement and if the
        // values of a and b are equal.
        return this.equalStructure(matching, a.par, b.par) && this.equals(a, b);
    }
    else {
        // Return true if a and b form a pair.
        return a === matching.get(b);
    }
};


/**
 * Return true if a pair is found in the ancestor chain of a and b.
 *
 * @param {tree.Matching} matching A tree matching which will be populated by
 *         diffing tree a and b.
 * @param {tree.Node} a Candidate node from tree a
 * @param {tree.Node} b Candidate node from tree b
 *
 * @return {boolean} Return true if a pair is found in the ancestor chain.
 *
 * @memberOf skelmatch.Diff
 */
Diff.prototype.matchingCheckAncestors = function(matching, a, b) {
    if (!a || !b) {
        return false;
    }
    else if (!matching.get(a) && !matching.get(b)) {
        return this.matchingCheckAncestors(matching, a.par, b.par);
    }
    else {
        return a === matching.get(b);
    }
};


/**
 * Put a and b and all their unmatched ancestors into the matching.
 *
 * @param {tree.Matching} matching A tree matching which will be populated by
 *         diffing tree a and b.
 * @param {tree.Node} a Candidate node from tree a
 * @param {tree.Node} b Candidate node from tree b
 *
 * @memberOf skelmatch.Diff
 */
Diff.prototype.matchingPutAncestors = function(matching, a, b) {
    if (!a || !b) {
        throw new Error('Parameter error: may not match undefined tree nodes');
    }
    else if (!matching.get(a) && !matching.get(b)) {
        this.matchingPutAncestors(matching, a.par, b.par);
        matching.put(a, b);
    }
    else if (a !== matching.get(b)) {
        throw new Error('Parameter error: fundamental matching rule violated.');
    }
};


/**
 * Identify unchanged leaves by comparing them using myers longest common
 * subsequence algorithm.
 *
 * @param {tree.Matching} matching A tree matching which will be populated by
 *         diffing tree a and b.
 *
 * @memberOf skelmatch.Diff
 */
Diff.prototype.matchContent = function(matching) {
    var a_content = [],
        b_content = [],
        lcsinst = new lcs.LCS(a_content, b_content);

    // Leaves are considered equal if their values match and if they have
    // the same tree depth. Need to wrap the equality-test function into
    // a closure executed immediately in order to maintain correct context
    // (rename 'this' into 'that').
    lcsinst.equals = (function(that){
        return function(a, b) {
            return a.depth === b.depth && that.equalContent(a, b);
        };
    }(this));

    // Populate leave-node arrays.
    this.a.forEachDescendant(function(n) {
        if (this.isContent(n)) a_content.push(n);
    }, this);
    this.b.forEachDescendant(function(n) {
        if (this.isContent(n)) b_content.push(n);
    }, this);

    // Identify structure-preserving changes. Run lcs over leave nodes of
    // tree a and tree b. Associate the identified leaf nodes and also
    // their ancestors except if this would result in structure-affecting
    // change.
    lcsinst.forEachCommonSymbol(function(x, y) {
        var a = a_content[x], b = b_content[y];

        // Verify that ancestor chain allows that a and b to form a pair.
        if (this.matchingCheckAncestors(matching, a, b)) {
            // Record nodes a and b and all of their ancestors in the
            // matching if and only if the nearest matched ancestors are
            // partners.
            this.matchingPutAncestors(matching, a, b);
        }
    }, this);
};


/**
 * Return an array of the bottom-most structure-type nodes beneath the given
 * node.
 *
 * @param {tree.Node} node The internal node from where the search should
 *         start.
 *
 * @memberOf skelmatch.Diff
 */
Diff.prototype.collectBones = function(node) {
    var result = [], outer, i = 0;

    if (this.isStructure(node)) {
        for (i = 0; i < node.children.length; i++) {
            outer = this.collectBones(node.children[i]);
            Array.prototype.push.apply(outer);
        }
        if (result.length === 0) {
            // If we do not have any structure-type descendants, this node is
            // the outer most.
            result.push(node);
        }
    }

    return result;
}


/**
 * Invoke the given callback with each sequence of unmatched nodes.
 *
 * @param {tree.Matching}   matching  A partial matching
 * @param {Array}           a_sibs    A sequence of siblings from tree a
 * @param {Array}           b_sibs    A sequence of siblings from tree b
 * @param {function}        callback  A function (a_nodes, b_nodes, a_parent, b_parent)
 *         called for every consecutive sequence of nodes from a_sibs and
 *         b_sibs seperated by one or more node pairs.
 * @param {Object}          T         Context object bound to "this" when the
 *         callback is invoked.
 *
 * @memberOf skelmatch.Diff
 */
Diff.prototype.forEachUnmatchedSequenceOfSiblings = function(matching,
        a_sibs, b_sibs, callback, T)
{
    var a_xmatch = [],  // Array of consecutive sequence of unmatched nodes
                        // from a_sibs.
        b_xmatch = [],  // Array of consecutive sequence of unmatched nodes
                        // from b_sibs.
        i = 0,      // Array index into a_sibs
        k = 0,      // Array index into b_sibs
        a,          // Current candidate node in a_sibs
        b;          // Current candidate node in b_sibs

    // Loop through a_sibs and b_sibs simultaneously
    while (a_sibs[i] || b_sibs[k]) {
        a = a_sibs[i];
        b = b_sibs[k];

        if (a && !matching.get(a)) {
            // Skip a if above rules did not apply and a is not in the matching
            a_xmatch.push(a);
            i++;
        }
        else if (b && !matching.get(b)) {
            // Skip b if above rules did not apply and b is not in the matching
            b_xmatch.push(b);
            k++;
        }
        else if (a && b && a === matching.get(b)) {
            // Collect nodes at border structure and detect matches
            callback.call(T, a_xmatch, b_xmatch, a, b);
            a_xmatch = [];
            b_xmatch = [];

            // Recurse, both candidates are in the matching
            this.forEachUnmatchedSequenceOfSiblings(matching, a.children, b.children, callback, T);
            i++;
            k++;
        }
        else {
            // Both candidates are in the matching but they are no partners.
            // This is impossible, bail out.
            throw new Error('Matching is not consistent');
        }
    }

    if (a_xmatch.length > 0 || b_xmatch.length > 0) {
        callback.call(T, a_xmatch, b_xmatch, a, b);
    }
}


/**
 * Traverse a partial matching and detect equal structure-type nodes between
 * matched content nodes.
 *
 * @param {tree.Matching}   matching  A partial matching
 *
 * @memberOf skelmatch.Diff
 */
Diff.prototype.matchStructure = function(matching) {
    // Collect unmatched sequences of siblings from tree a and b. Run lcs over
    // bones for each.
    this.forEachUnmatchedSequenceOfSiblings(matching, this.a.children,
            this.b.children, function(a_nodes, b_nodes) {
        var a_bones = [],
            b_bones = [],
            lcsinst = new lcs.LCS(a_bones, b_bones);

        // Override equality test.
        lcsinst.equals = (function(that){
            return function(a, b) {
                return that.equalStructure(matching, a, b);
            };
        }(this));

        // Populate bone array
        a_nodes.forEach(function(n) {
            Array.prototype.push.apply(a_bones, this.collectBones(n));
        }, this);
        b_nodes.forEach(function(n) {
            Array.prototype.push.apply(b_bones, this.collectBones(n));
        }, this);

        // Identify structure-preserving changes. Run lcs over lower bone ends
        // in tree a and tree b. Associate the identified nodes and also their
        // ancestors except if this would result in structure-affecting change.
        lcsinst.forEachCommonSymbol(function(x, y) {
            var a = a_bones[x], b = b_bones[y];

            // Verify that ancestor chain allows that a and b to form a pair.
            if (this.matchingCheckAncestors(matching, a, b)) {
                // Record nodes a and b and all of their ancestors in the
                // matching if and only if the nearest matched ancestors are
                // partners.
                this.matchingPutAncestors(matching, a, b);
            }
        }, this);
    }, this);
};

exports.Diff = Diff;

});

require.define("/lib/profiles/doc-tree-xml.js", function (require, module, exports, __dirname, __filename) {
    var factory = require('../delta/doc-xml-factory.js');
module.exports = new factory.DocumentXMLFactory();

});

require.define("/lib/delta/doc-xml-factory.js", function (require, module, exports, __dirname, __filename) {
    /**
 * @fileoverview This module provides the factory class for XML documents
 */


/** @ignore */
var xmlpayload = require('./xmlpayload');
/** @ignore */
var fnv132 = require('./fnv132');
/** @ignore */
var tree = require('./tree');
/** @ignore */
var domtree = require('./domtree');
/** @ignore */
var domhandler = require('./domhandler');
/** @ignore */
var docmod = require('./doc');

/** Shared payload handler instance */
var payloadHandler = new xmlpayload.XMLPayloadHandler();

/** shared tree adapter instance */
var treeAdapter = new domtree.DOMTreeAdapter();

/**
 * Create a new instance of the XML document factory class.
 * @constructor
 */
function DocumentXMLFactory() {
}


/**
 * Return a new empty document.
 *
 * @return {Object} A document initialized with default values.
 */
DocumentXMLFactory.prototype.createEmptyDocument = function() {
    return new docmod.Document('xml', 'untitled.xml',
        payloadHandler.createDocument(),
        undefined,
        '',
        undefined,
        undefined,
        undefined
    );
};


/**
 * Return new document loaded from a DOMDocument.
 *
 * @param {String|Document} domdoc  The underlying DOMDocument.
 * @param {String}          [name]  The file name of the document.
 *
 * @return {Object} A document initialized from the given DOMDocument.
 */
DocumentXMLFactory.prototype.loadInputDocument = function(domdoc, name) {
    var src, result, valueindex, treevalueindex;

    valueindex = new tree.NodeHashIndex(new domtree.DOMNodeHash(fnv132.Hash));
    treevalueindex = new tree.TreeHashIndex(
            new tree.SimpleTreeHash(fnv132.Hash, valueindex));

    if (typeof domdoc === 'string') {
        src = domdoc;
        domdoc = payloadHandler.parseString(domdoc);
    }

    return new docmod.Document('xml', name,
        domdoc,
        treeAdapter.adaptDocument(domdoc),
        src,
        valueindex,
        treevalueindex,
        undefined
    );
}


/**
 * Return new document loaded from a DOMDocument. Use this method for loading
 * the original (unchanged) document and supply it as doc1 to diff.Diff or
 * patch.Patch.
 *
 * @param {String|Document} domdoc  The underlying DOMDocument.
 * @param {String}          [name]  The file name of the document.
 *
 * @return {Object} A document initialized from the given DOMDocument.
 */
DocumentXMLFactory.prototype.loadOriginalDocument = function(domdoc, name) {
    var result = DocumentXMLFactory.prototype.loadInputDocument(domdoc, name);

    var nodeindex = new tree.DocumentOrderIndex(result.tree);
    nodeindex.buildAll();
    result.nodeindex = nodeindex;

    return result;
}


/**
 * Return the proper document fragment adapter for the given deltadoc type.
 *
 * @param {String} type The document type of the delta document this adapter
 *         should be used for.
 *
 * @return {FragmentAdapter} A suitable fragment adapter for the given type.
 */
DocumentXMLFactory.prototype.createFragmentAdapter = function(type) {
    if (type === 'xml') {
        return new xmlpayload.XMLFragmentAdapter(treeAdapter);
    }
    else {
        return new xmlpayload.SerializedXMLFragmentAdapter(treeAdapter);
    }
}


/**
 * Return the proper node equality test function.
 *
 * @param {object} doc1 The original document
 * @param {object} doc2 The changed document
 *
 * @return {function} node equality test function.
 */
DocumentXMLFactory.prototype.createNodeEqualityTest = function(doc1, doc2) {
    if (!doc1.valueindex || !doc2.valueindex) {
        throw new Error('Parameter error: Document objects must have valueindex property');
    }

    // Use value index for node-comparison
    return function(a, b) {
        return doc1.valueindex.get(a) === doc2.valueindex.get(b);
    }
}


/**
 * Return the proper subtree equality test.
 *
 * @param {object} doc1 The original document
 * @param {object} doc2 The changed document
 *
 * @return {function} node equality test function.
 */
DocumentXMLFactory.prototype.createTreeEqualityTest = function(doc1, doc2) {
    if (!doc1.treevalueindex || !doc2.treevalueindex) {
        throw new Error('Parameter error: Document objects must have treevalueindex property');
    }

    // Use value index for node-comparison
    return function(a, b) {
        return doc1.treevalueindex.get(a) === doc2.treevalueindex.get(b);
    }
}


/**
 * Return proper value checker.
 *
 * @param {object} doc The original document
 *
 * @return {function} value comparison function.
 */
DocumentXMLFactory.prototype.createValueTest = function(doc) {
    if (!doc.valueindex) {
        throw new Error('Parameter error: Document objects must have valueindex property');
    }

    // Use value index for node-comparison
    return function(a, b) {
        return doc.valueindex.get(a) === b;
    }
};


/**
 * Returns delta operation handler factory.
 *
 * @return {object} Instance of the handler factory class suitable for XML
 *         documents.
 */
DocumentXMLFactory.prototype.createHandlerFactory = function() {
    return new domhandler.DOMOperationHandlerFactory();
}


/**
 * Serialize the data property into the src string and return it. Also store
 * the source into the ``src`` property of ``deltadoc``.
 *
 * @param {Object} deltadoc A populated delta document.
 *
 * @return {String} The XML representation of the delta document as a string.
 */
DocumentXMLFactory.prototype.serializeDocument = function(doc) {
    doc.src = payloadHandler.serializeToString(doc.data);

    return doc.src;
};


exports.DocumentXMLFactory = DocumentXMLFactory;

});

require.define("/lib/delta/xmlpayload.js", function (require, module, exports, __dirname, __filename) {
    /**
 * @file:   Payload handler for XML/DOM documents
 * @module  xmlpayload
 */

/** @ignore */
var xmlshim = require('xmlshim');


/**
 * @constructor
 */
function XMLPayloadHandler() {
}

XMLPayloadHandler.prototype.serializeToString = function(doc) {
    return (new xmlshim.XMLSerializer).serializeToString(doc);
};

XMLPayloadHandler.prototype.parseString = function(string) {
    return (new xmlshim.DOMParser).parseFromString(string, 'text/xml');
};

XMLPayloadHandler.prototype.createDocument = function() {
    return xmlshim.implementation.createDocument('', '', null);
};

XMLPayloadHandler.prototype.createTreeFragmentAdapter = function(docadapter, type) {
    if (type === 'xml') {
        return new exports.XMLFragmentAdapter(docadapter);
    }
    else {
        return new exports.SerializedXMLFragmentAdapter(docadapter);
    }
};


/**
 * @constructor
 */
function XMLFragmentAdapter(docadapter) {
    this.docadapter = docadapter;
}

XMLFragmentAdapter.prototype.adapt = function(doc, nodes, deep) {
    var i, result = doc.createDocumentFragment();

    for (i = 0; i < nodes.length; i++) {
        result.appendChild(doc.importNode(nodes[i].data, deep));
    }

    return result;
};


XMLFragmentAdapter.prototype.importFragment = function(domnodes, deep) {
    var result = [], node, i;

    for (i=0; i<domnodes.length; i++) {
        node = this.docadapter.adaptElement(domnodes[i]);
        if (node) {
            result.push(node);
        }
    }

    return result;
};


/**
 * @constructor
 */
function SerializedXMLFragmentAdapter(docadapter) {
    XMLFragmentAdapter.call(this, docadapter);
}

SerializedXMLFragmentAdapter.prototype.adapt = function(doc, nodes, deep) {
    mydoc = xmlshim.implementation.createDocument('', '', null);

    var frag = XMLFragmentAdapter.prototype.adapt.call(this, mydoc, nodes, deep);
    var root = mydoc.createElement('values');

    root.appendChild(frag);
    mydoc.appendChild(root);

    return (new xmlshim.XMLSerializer).serializeToString(mydoc);
};

exports.XMLPayloadHandler = XMLPayloadHandler;
exports.XMLFragmentAdapter = XMLFragmentAdapter;
exports.SerializedXMLFragmentAdapter = SerializedXMLFragmentAdapter;

});

require.define("/node_modules/xmlshim/package.json", function (require, module, exports, __dirname, __filename) {
    module.exports = {"main":"./index.js","browserify":"./browser.js"}
});

require.define("/node_modules/xmlshim/browser.js", function (require, module, exports, __dirname, __filename) {
    exports.XMLSerializer = XMLSerializer;
exports.DOMParser = DOMParser;
exports.implementation = document.implementation;

});

require.define("/lib/delta/fnv132.js", function (require, module, exports, __dirname, __filename) {
    /**
 * @file: Implementation of FNV-1 32bit hash algorithm
 * @see: http://isthe.com/chongo/tech/comp/fnv/
 *
 * @module  fnv132
 */


/**
 * Constant FNV-1 32bit prime number
 *
 * @constant
 */
var FNV132_PRIME = 16777619;

/**
 * High 16 bits of FNV-1 32bit prime number
 *
 * @constant
 */
var FNV132_PRIME_H = (FNV132_PRIME >>> 16) & 0xFFFF;

/**
 * Low 16 bits of FNV-1 32bit prime number
 *
 * @constant
 */
var FNV132_PRIME_L = FNV132_PRIME & 0xFFFF;

/**
 * Constant FNV-1 32bit offset basis
 *
 * @constant
 */
var FNV132_INIT = 2166136261;

/**
 * Create and initialize a new 32bit FNV-1 hash object.
 *
 * @constructor
 */
function FNV132Hash() {
    this.hash = FNV132_INIT;
}


/**
 * Update the hash with the given string and return the new hash value. No
 * calculation is performed when the bytes-parameter is left out.
 */
FNV132Hash.prototype.update = function (bytes) {
    var i, ah, al;

    if (typeof bytes === 'undefined' || bytes === null) {
        return this.get();
    }

    if (typeof bytes === 'number') {
        // FXME: Actually we should test for non-integer numbers here.
        bytes = String.fromCharCode(
                (bytes & 0xFF000000) >>> 24,
                (bytes & 0x00FF0000) >>> 16,
                (bytes & 0x0000FF00) >>> 8,
                (bytes & 0x000000FF)
        );
    }

    if (typeof bytes !== 'string') {
        throw new Error(typeof bytes + ' not supported by FNV-1 Hash algorithm');
    }

    for (i=0; i<(bytes && bytes.length); i++) {
        // A rather complicated way to multiply this.hash times
        // FNV132_PRIME.  Regrettably a workaround is necessary because the
        // value of a Number class is represented as a 64bit floating point
        // internally. This can lead to precision issues if the factors are
        // big enough.
        //
        // Each factor is separated into two 16bit numbers by shifting left
        // the high part and masking the low one.
        ah = (this.hash >>> 16) & 0xFFFF;
        al = this.hash & 0xFFFF;

        // Now the both low parts are multiplied. Also each low-high pair
        // gets multiplied. There is no reason to multiply the high-high
        // pair because overflow is guaranteed here.  The result is the sum
        // of the three multiplications. Because of the floating point
        // nature of JavaScript numbers, bitwise operations are *not*
        // faster than multiplications. Therefore we do not use "<< 16"
        // here but instead "* 0x100000".
        this.hash = (al * FNV132_PRIME_L) +
            ((ah * FNV132_PRIME_L) * 0x10000) +
            ((al * FNV132_PRIME_H) * 0x10000);

        this.hash ^= bytes.charCodeAt(i);
    }

    // Get rid of signum
    return this.hash >>> 0;
};


/**
 * Return current hash value;
 */
FNV132Hash.prototype.get = function () {
    return this.hash >>> 0;
};

// CommonJS exports
exports.Hash = FNV132Hash;

});

require.define("/lib/delta/domtree.js", function (require, module, exports, __dirname, __filename) {
    /**
 * @file:   Adapter class converting an XML DOM document into a simple tree
 *          structure suitable for comparison using the XCC tree diff
 *          algorithm.
 *
 * @module  domtree
 */

/** @ignore */
var tree = require('./tree');

/**
 * A function that visits every node of a DOM tree in document order. Calls
 * a callback with the visited node and the result of the callback from
 * visitting the parent node.
 *
 * This function is a modified version of Douglas Crockfords walk_the_DOM
 * function from his book "Javascript: The Good Parts".
 *
 * @param node      The DOM node representing the starting point for the
 *                  mapping operation
 * @param callback  function(node, parents_result)
 * @param T         context parameter bound to "this" when invoking the
 *                  callback 
 * @param presult   Internal use.
 */
function mapdom(node, callback, T, presult) {
    var result = callback.call(T, node, presult);
    node = node.firstChild;
    while (node) {
        mapdom(node, callback, T, result);
        node = node.nextSibling;
    }
    return result;
}


/**
 * @constructor
 */
function DOMTreeAdapter() {
}


/**
 * Create node wrappers for the specified element or text node and all its
 * descentants and return toplevel wrapper.
 **/
DOMTreeAdapter.prototype.adaptElement = function(element) {
    return mapdom(element, function(node, wrappedParent) {
        var wrappedNode;

        if (node.nodeType === 1 || node.nodeType === 3) {
            // Use nodeName as the node value. In order to get proper results
            // when comparing XML trees, an equality-function based on a
            // hashing method must be supplied to the xcc instance.
            wrappedNode = new tree.Node(node.nodeName, node);
            if (wrappedParent) {
                wrappedParent.append(wrappedNode);
            }
        }

        return wrappedNode;
    }, this);
};


/**
 * Create node wrappers for all element and text nodes in the specified
 * document and return the root wrapper.
 */
DOMTreeAdapter.prototype.adaptDocument = function(doc) {
    return this.adaptElement(doc.documentElement);
};


/**
 * Populate the document with the given dom tree.
 */
DOMTreeAdapter.prototype.createDocument = function(doc, tree) {
    var root;

    root = doc.importNode(tree.data, true);
    doc.appendChild(root);
};


/**
 * @constructor
 */
function DOMNodeHash(HashAlgorithm) {
    this.HashAlgorithm = HashAlgorithm;
}


// FIXME: CDATA sections
DOMNodeHash.prototype.ELEMENT_PREFIX = '\x00\x00\x00\x01';
DOMNodeHash.prototype.ATTRIBUTE_PREFIX = '\x00\x00\x00\x02';
DOMNodeHash.prototype.TEXT_PREFIX = '\x00\x00\x00\x03';
DOMNodeHash.prototype.PI_PREFIX = '\x00\x00\x00\x07';
DOMNodeHash.prototype.SEPARATOR = '\x00\x00';

DOMNodeHash.prototype.process = function(node, hash) {
    var domnode = node.data;

    hash = hash || new this.HashAlgorithm();

    switch(domnode.nodeType) {
        case (domnode.ELEMENT_NODE):
            this.processElement(domnode, hash);
            break;

        case (domnode.ATTRIBUTE_NODE):
            this.processAttribute(domnode, hash);
            break;

        case (domnode.TEXT_NODE):
            this.processText(domnode, hash);
            break;

        default:
            console.error('DOMNodeHash: node-type ' + domnode.nodeType + ' not supported');
            break;
    }

    return hash.get();
};


/**
 * Helper method: Return qualified name of a DOM element or attribute node
 */
DOMNodeHash.prototype.qualifiedName = function(domnode) {
    var ns = '';
    if (domnode.namespaceURI) {
        ns = domnode.namespaceURI + ':';
    }
    return ns + domnode.nodeName.split(':').slice(-1)[0];
};


DOMNodeHash.prototype.processElement = function(domnode, hash) {
    var attrqns, attrnodes, i, n, qn;

    // Process tag
    hash.update(this.ELEMENT_PREFIX);
    hash.update(this.qualifiedName(domnode));
    hash.update(this.SEPARATOR);

    // Process attributes
    if (domnode.hasAttributes()) {
        attrqns = [];
        attrnodes = {};
        for (i = domnode.attributes.length - 1; i >= 0; i--) {
            n = domnode.attributes[i];
            if (n.name !== 'xmlns' && n.prefix !== 'xmlns') {
                qn = this.qualifiedName(n);
                attrqns.unshift(qn);
                attrnodes[qn] = n;
            }
        }
        attrqns = attrqns.sort();
        attrqns.forEach(function(qn) {
            this.processAttribute(attrnodes[qn], hash, qn);
        }, this);
    }
};


DOMNodeHash.prototype.processAttribute = function(domnode, hash, qn) {
    qn = qn || this.qualifiedName(domnode);
    hash.update(this.ATTRIBUTE_PREFIX);
    hash.update(qn);
    hash.update(this.SEPARATOR);
    hash.update(domnode.nodeValue);
};


DOMNodeHash.prototype.processText = function(domnode, hash) {
    hash.update(this.TEXT_PREFIX);
    hash.update(domnode.nodeValue);
};


exports.DOMTreeAdapter = DOMTreeAdapter;
exports.DOMNodeHash = DOMNodeHash;

});

require.define("/lib/delta/domhandler.js", function (require, module, exports, __dirname, __filename) {
    /**
 * @fileoverview    Operation handler classes for XML/DOM based delta format
 */

/** @ignore */
var deltamod = require('./delta');

/**
 * Helper class for a memoizing the currently active DOM node during a patching
 * session. This mapping is necessary because DOMNodeReplaceOperationHandler
 * swaps dom nodes when toggled. Thus, any operation attached to a child node
 * needs to be capable of detecting the currently active parent in order to
 * prevent operations on inactive nodes which may lead to loss of data.
 *
 * @constructor
 */
function DOMOperationNodeDataMap(propname) {
    this.propname = propname || 'currentDOMNode';
}


/**
 * Return active DOM node for this tree.Node.
 */
DOMOperationNodeDataMap.prototype.getCurrentDOMNode = function(node) {
    return node && (node[this.propname] || node.data);
}


/**
 * Set active DOM node for this tree.Node.
 */
DOMOperationNodeDataMap.prototype.setCurrentDOMNode = function(node, domnode) {
    node[this.propname] = domnode;
}


/**
 * @constructor
 */
function DOMNodeReplaceOperationHandler(anchor, datamap, orignode, changednode) {
    this.anchor = anchor;
    this.datamap = datamap;
    this.orignode = orignode;
    this.changednode = changednode;

    // Changed node may not have any children
    while(this.changednode.firstChild) {
        this.changednode.removeChild(this.changednode.firstChild);
    }

    this.state = false;
}


/**
 * Toggle active state of this hunk.
 */
DOMNodeReplaceOperationHandler.prototype.toggle = function() {
    var fromnode = this.state ? this.changednode : this.orignode,
        tonode = this.state ? this.orignode : this.changednode,
        parent = (fromnode === fromnode.ownerDocument.documentElement) ?
            fromnode.ownerDocument : fromnode.parentNode;

    // Move children
    while (fromnode.firstChild) {
        tonode.appendChild(fromnode.firstChild);
    }

    // Replace node
    parent.replaceChild(tonode, fromnode);

    // Update node data map
    this.datamap.setCurrentDOMNode(this.anchor, tonode);

    this.state = !this.state;
};


/**
 * Return the currently activated node
 */
DOMNodeReplaceOperationHandler.prototype.getNode = function() {
    return this.state ? this.changednode : this.orignode;
}


/**
 * Return true if this hunk is active.
 */
DOMNodeReplaceOperationHandler.prototype.isActive = function() {
    return this.state;
};


/**
 * Activate this hunk, remove old attributes and insert new attributes if
 * necessary.
 */
DOMNodeReplaceOperationHandler.prototype.activate = function() {
    if (!this.state) {
        this.toggle();
    }
};


/**
 * Deactivate this hunk, remove inserted attributes and reinsert removed
 * attributes if necessary.
 */
DOMNodeReplaceOperationHandler.prototype.deactivate = function() {
    if (this.state) {
        this.toggle();
    }
};


/**
 * Construct a new DOM operation element capable of replacing the specified
 * subtrees.
 *
 * @param   par         The tree.Node whose children should be replaced
 * @param   before      The tree.Node where new nodes should be attached
 *                      before
 * @param   oldnodes    An array of the root DOM elements of the original
 *                      subtrees
 * @param   newnodes    An array of the root DOM elements of the changed
 *                      subtrees
 * @constructor
 */
function DOMTreeSequenceOperationHandler(par, before, datamap, oldnodes,
        newnodes) {
    this.par = par;
    this.before = before;
    this.datamap = datamap;

    this.oldnodes = oldnodes;
    this.newnodes = newnodes;
}


/**
 * Toggle active state
 */
DOMTreeSequenceOperationHandler.prototype.toggle = function() {
    var remove = this.state ? this.newnodes : this.oldnodes,
        insert = this.state ? this.oldnodes : this.newnodes,
        node = this.datamap.getCurrentDOMNode(this.par),
        before = this.datamap.getCurrentDOMNode(this.before),
        i;

    for (i = 0; i < remove.length; i++) {
        node.removeChild(remove[i]);
    }
    for (i = 0; i < insert.length; i++) {
        node.insertBefore(insert[i], before);
    }

    this.state = !this.state;
};


/**
 * Return true if the hunk is active
 */
DOMTreeSequenceOperationHandler.prototype.isActive = function() {
    return this.state;
};


/**
 * Activate this hunk, inserting new subtrees and removing old subtrees if
 * necessary.
 */
DOMTreeSequenceOperationHandler.prototype.activate = function() {
    if (!this.state) {
        this.toggle();
    }
};


/**
 * Deactivate this hunk, removing inserted nodes and inserting removed
 * nodes into if necessary.
 */
DOMTreeSequenceOperationHandler.prototype.deactivate = function() {
    if (this.state) {
        this.toggle();
    }
};


/**
 * Construct a DOM operation factory.
 * @constructor
 */
function DOMOperationHandlerFactory() {
    this.dataMap = new DOMOperationNodeDataMap();
}


/**
 * Return a new node update operation on the given node.
 *
 * @param anchor    A DeltaJS.tree.Anchor pointing to the node with old values
 * @param newnode   A DeltaJS.tree.node pointing to the node with the new values
 */
DOMOperationHandlerFactory.prototype.createNodeUpdateOperationHandler = function(
        anchor, newnode) {
    var oldnode;
    if (!anchor.target) {
        throw new Error('Parameter error: node update handler needs an anchor with a target');
    }
    oldnode = anchor.target;
    remove = oldnode.data;
    insert = oldnode.data.ownerDocument.importNode(newnode.data, false);
    return new DOMNodeReplaceOperationHandler(oldnode, this.dataMap, remove, insert);
};


/**
 * Return a new forest update operation for a sequence of children of the given
 * node. Remove all children from start through length and replace them with
 * the subtrees given in the replacement array.
 *
 * @param anchor    A DeltaJS.tree.Anchor pointing to the first node which
 *                  should be removed. Should point to the location before
 *                  which elements should be inserted if no nodes are to be
 *                  removed.
 * @param length    Number of tree nodes to be removed
 * @param replacement   Array of replacement tree nodes
 */
DOMOperationHandlerFactory.prototype.createForestUpdateOperationHandler = function(
        anchor, length, replacement, parenthandler) {
    var doc, oldnodes = [], newnodes = [], i,
        node = anchor.base,
        start = anchor.index;

    if (!node) {
        throw new Error('Parameter error: forest update handler needs an anchor with a base');
    }
    else if (typeof start === 'undefined') {
        throw new Error('Parameter error: forest update handler needs an anchor with an index');
    }
    else if (!length && !replacement.length) {
        throw new Error('Forest update operation requires at least one node');
    }

    doc = node.data.ownerDocument;

    for (i = start; i < start + length; i++) {
        oldnodes.push(node.children[i].data);
    }
    for (i = 0; i < replacement.length; i++) {
        newnodes.push(doc.importNode(replacement[i].data, true));
    }

    before = node.children[start + length];

    return new DOMTreeSequenceOperationHandler(node, before, this.dataMap,
            oldnodes, newnodes, parenthandler);
};


/**
 * Return a new operation handler for the given operation at the anchor.
 *
 * @param anchor    A DeltaJS.tree.Anchor
 * @param op        The operation to create a handler for
 */
DOMOperationHandlerFactory.prototype.createOperationHandler = function(anchor, type, path, remove, insert) {
    switch (type) {
        case deltamod.UPDATE_FOREST_TYPE:
            return this.createForestUpdateOperationHandler(anchor,
                    remove.length, insert);

        case deltamod.UPDATE_NODE_TYPE:
            return this.createNodeUpdateOperationHandler(anchor,
                    insert[0]);
    }

    throw new Error('Operation type not supported by this factory');
}


exports.DOMOperationNodeDataMap = DOMOperationNodeDataMap;
exports.DOMNodeReplaceOperationHandler = DOMNodeReplaceOperationHandler;
exports.DOMTreeSequenceOperationHandler = DOMTreeSequenceOperationHandler;
exports.DOMOperationHandlerFactory = DOMOperationHandlerFactory;

});

require.define("/lib/delta/delta.js", function (require, module, exports, __dirname, __filename) {
    /**
 * @fileoverview Provides classes and methods necessary for the construction of
 * attached operations.
 */

/** @ignore */
var tree = require('./tree');

/**
 * @constant
 */
var UPDATE_NODE_TYPE = 1;

/**
 * @constant
 */
var UPDATE_FOREST_TYPE = 2;

/**
 * Private utility class: Creates a new ParameterBuffer instance.
 *
 * @constructor
 */
function ParameterBuffer(callback, T) {
    this.callback = callback;
    this.T = T;
    this.removes = [];
    this.inserts = [];
}


/**
 * Append an item to the end of the buffer
 */
ParameterBuffer.prototype.pushRemove = function(item) {
    this.removes.push(item);
};


/**
 * Append an item to the end of the buffer
 */
ParameterBuffer.prototype.pushInsert = function(item) {
    this.inserts.push(item);
};


/**
 * Invoke callback with the contents of the buffer array and empty the
 * buffer afterwards.
 */
ParameterBuffer.prototype.flush = function() {
    if (this.removes.length > 0 || this.inserts.length > 0) {
        this.callback.call(this.T, this.removes, this.inserts);
        this.removes = [];
        this.inserts = [];
    }
};

/**
 * Utility class to construct a sequence of attached operations from a
 * matching.
 *
 * @constructor
 */
function DeltaCollector(matching, root_a, root_b) {
    this.matching = matching;
    this.root_a = root_a;
    this.root_b = root_b || matching.get(root_a);
}


/**
 * Default equality test. Override this method if you need to test other
 * node properties instead/beside node value.
 */
DeltaCollector.prototype.equals = function(a, b) {
    return a.value === b.value;
}


/**
 * Invoke a callback for each changeset detected between tree a and tree b
 * according to the given matching.
 *
 * @param callback  A function(type, path, removes, inserts) called
 *                  for each detected set of changes.
 * @param T         Context object bound to "this" when the callback is
 * @param root_a    (internal use) Root node in tree a
 * @param root_b    (internal use) Root node in tree b
 *                  invoked.
 * @param path      (internal use) current path relative to base node. Used
 *                  from recursive calls.
 *
 */
DeltaCollector.prototype.forEachChange = function(callback, T, root_a, root_b,
        path) {
    var parambuf, i, k, a_nodes, b_nodes, a, b, op, me = this;

    // Initialize stuff if not provided
    path = path || [];
    root_a = root_a || this.root_a;
    root_b = root_b || this.root_b;

    if (root_a !== this.matching.get(root_b)) {
        throw new Error('Parameter error, root_a and root_b must be partners');
    }

    // Flag node-update if value of partners do not match
    if (!this.equals(root_a, root_b)) {
        op = new AttachedOperation(
                new tree.Anchor(this.root_a, root_a),
                UPDATE_NODE_TYPE,
                path.slice(),
                [root_a], [root_b]);
        callback.call(T, op);
    }

    // Operation aggregator for subtree changes
    parambuf = new ParameterBuffer(function(removes, inserts) {
        var start = i - removes.length;
        var op = new AttachedOperation(
                new tree.Anchor(me.root_a, root_a, start),
                UPDATE_FOREST_TYPE,
                path.concat(start),
                removes, inserts);
        callback.call(T, op);
    });


    // Descend one level
    a_nodes = root_a.children;
    b_nodes = root_b.children;
    i = 0; k = 0;
    while (a_nodes[i] || b_nodes[k]) {
        a = a_nodes[i];
        b = b_nodes[k];

        if (a && !this.matching.get(a)) {
            parambuf.pushRemove(a);
            i++;
        }
        else if (b && !this.matching.get(b)) {
            parambuf.pushInsert(b);
            k++;
        }
        else if (a && b && a === this.matching.get(b)) {
            // Flush item aggregators
            parambuf.flush();

            // Recurse
            this.forEachChange(callback, T, a, b, path.concat(i));

            i++;
            k++;
        }
        else {
            throw new Error('Matching is not consistent.');
        }
    }

    parambuf.flush();

    return;
};


/**
 * Construct a new attached operation instance. An attached operation is always
 * bound to a tree-node identified thru the anchor.
 *
 * @constructor
 */
function AttachedOperation(anchor, type, path, remove, insert, handler) {
    /**
     * The anchor where the operation is attached
     */
    this.anchor = anchor;


    /**
     * The operation type, one of UPDATE_NODE_TYPE, UPDATE_FOREST_TYPE
     */
    this.type = type;


    /**
     * An array of integers representing the top-down path from the root
     * node to the anchor of this operation. The anchor point always is
     * the first position after the leading context values. For insert
     * operations it will must point to the first element of the tail
     * context.
     */
    this.path = path;


    /**
     * Null (insert), one tree.Node (update) or sequence of nodes (delete)
     */
    this.remove = remove;


    /**
     * Null (remove), one tree.Node (update) or sequence of nodes (insert)
     */
    this.insert = insert;


    /**
     * A handler object used to toggle operation state in the document. I.e.
     * apply and unapply the operation.
     */
    this.handler = handler;
}

/**
 * Return string representation of the operation.
 */
AttachedOperation.prototype.toString = function() {
    var result = 'Unknown operation', i, parts, rvals, ivals;

    switch (this.type) {
        case UPDATE_NODE_TYPE:
            result = 'Update "' + this.remove[0].value + '" at /' +
                this.path.join('/');
            break;
        case UPDATE_FOREST_TYPE:
            rvals = [];
            ivals = [];
            parts = [];
            for (i = 0; i < this.remove.length; i++) {
                rvals.push(this.remove[i].value);
            }
            for (i = 0; i < this.insert.length; i++) {
                ivals.push(this.insert[i].value);
            }
            if (rvals.length) {
                parts.push('remove "' + rvals.join('", "') + '"');
            }
            if (ivals.length) {
                parts.push('insert "' + ivals.join('", "') + '"');
            }

            result = parts.join(" and ") + " at /" + this.path.join('/');

            // uppercase first character
            result = result.replace(/^([a-z])/,
                    function (c) { return c.toUpperCase();});
            break;
    }

    return result;
}


/**
 * Create a new operation attacher instance. Use this class to convert detached
 * operations read from a patch-file.
 *
 * @constructor
 */
function Attacher(resolver) {
    this.resolver = resolver;
}


/**
 * Resolve anchor of one operation and return new attached operation instance.
 */
Attacher.prototype.attach = function(op) {
    res = this.resolver.find(op.path, op.remove, op.head, op.tail, op.type);

    if (res.anchor && res.tail.length === 0) {
        return new AttachedOperation(res.anchor, op.type, op.path, op.remove,
                op.insert);
    }
}


exports.DeltaCollector = DeltaCollector;
exports.AttachedOperation = AttachedOperation;
exports.Attacher = Attacher;

exports.UPDATE_NODE_TYPE = UPDATE_NODE_TYPE;
exports.UPDATE_FOREST_TYPE = UPDATE_FOREST_TYPE;

});

require.define("/lib/delta/doc.js", function (require, module, exports, __dirname, __filename) {
    /**
 * @fileoverview This module provides the pure data object Document
 */

/**
 * Create new document instance.
 *
 * @param {string}  type    The document type. E.g. 'xml' or 'json'
 * @param {string}  [name]  The file name.
 * @param {object}  data    A reference to the underlying document, the DOM.
 * @param {object}  [tree]  The root node of the document tree. Use an instance
 *         of :js:class:`Node`.
 * @param {string}  [src]   The serialized version of this document, e.g. the
 *         XML markup code.
 * @param {object}  [valueindex]    The object necessary to lookup node values.
 *         E.g. an instance of :js:class:`NodeHashIndex`.
 * @param {object}  [treevalueindex]    The object necessary to lookup the
 *         value of a whole subtree. E.g. an instance of
 *         :js:class:`TreeHashIndex`.
 * @param {object}  [nodeindex] The object necessary to resolve nodes relative
 *         to other nodes when generating and verifying context. Typically this
 *         should be an instance of :js:class:`DocumentOrderIndex`.
 *
 * @constructor
 */
function Document(type, name, data, tree, src, valueindex, treevalueindex, nodeindex) {
    /**
     * The document type. E.g. 'xml' or 'json'
     */
    this.type = type;

    /**
     * The file name
     */
    this.name = name;

    /**
     * A reference to the underlying document, e.g. the DOMDocument object.
     */
    this.data = data;

    /**
     * The root node of the document tree.
     */
    this.tree = tree;

    /**
     * The serialized version of this document.
     */
    this.src = src;

    /**
     * An object used to lookup node values.
     */
    this.valueindex = valueindex;

    /**
     * An object used to lookup the combined values of all nodes in a subtree.
     */
    this.treevalueindex = treevalueindex;

    /**
     * An object used to lookup nodes relative to other nodes along a specified
     * axis. Typically in document order.
     */
    this.nodeindex = nodeindex;
}

exports.Document = Document;

});

require.define("/lib/profiles/delta-tree-xml.js", function (require, module, exports, __dirname, __filename) {
    var factory = require('../delta/delta-xml-factory');
module.exports = new factory.DeltaXMLFactory();

});

require.define("/lib/delta/delta-xml-factory.js", function (require, module, exports, __dirname, __filename) {
    /**
 * @fileoverview This module contains a factory class for the XML patch format.
 */

/** @ignore */
var xmlpayload = require('./xmlpayload');
/** @ignore */
var deltamod = require('./delta');
/** @ignore */
var contextdelta= require('./contextdelta');
/** @ignore */
var domdelta = require('./domdelta');
/** @ignore */
var deltadocmod = require('./delta-doc');


/**
 * Return shared payload handler.
 */
var payloadHandler = new xmlpayload.XMLPayloadHandler();


/**
 * Create a new instance of the factory class supporting the XML patch file
 * format.
 *
 * @constructor
 */
function DeltaXMLFactory() {
}


/**
 * Return a new empty delta document.
 *
 * @param {tree.Matching} [matching] A matching produced by some tree diff algorithm.
 *
 * @return {Object} A delta document initialized with default values.
 */
DeltaXMLFactory.prototype.createEmptyDocument = function(matching) {
    return new deltadocmod.DeltaDocument('xml', 'untitled-diff.xml',
        payloadHandler.createDocument(),
        undefined,
        undefined,
        undefined,
        matching
    );
};


/**
 * Return a delta document loaded from the given string or DOMDocument.
 *
 * @param {String|Document} domdoc  A document containing delta operations.
 * @param {Object} fragAdapter      A document fragemnt adapter. Use the object
 *         produced by createFragmentAdapter method from a document factory.
 * @param {String}          [name]  The file name of the document.
 *
 * @return {Object} A delta document initialized from the given DOMDocument.
 */
DeltaXMLFactory.prototype.loadDocument = function(domdoc, fragAdapter, name) {
    var src, operations, entries = [], i,
        deltaAdapter = new domdelta.DOMDeltaAdapter(fragAdapter);

    if (typeof domdoc === 'string') {
        src = domdoc;
        domdoc = payloadHandler.parseString(domdoc);
    }

    return new deltadocmod.DeltaDocument('xml', name,
        domdoc,
        [],
        deltaAdapter.adaptDocument(domdoc),
        src,
        undefined
    );
};


/**
 * Return an initialized collector instance.
 *
 * @param {Object} deltadoc      The delta document produced by createEmptyDocument
 *         or loadDocument.
 * @param {Object} doc           The document as created by the
 *         loadOriginalDocument method of the document factory class.
 * @param {function} [equals]    The equality test-function used during diffing.
 *
 * @return {delta.DeltaCollector} An initialized collector instance.
 */
DeltaXMLFactory.prototype.createCollector = function(deltadoc, doc, equals) {
    var collector, root, partner;

    if (!doc.tree) {
        throw new Error('Parameter error: Document objects must have a tree property');
    }
    if (!doc.valueindex) {
        throw new Error('Parameter error: Document objects must have a valueindex property');
    }

    root = doc.tree;
    partner = deltadoc.matching.get(root);
    if (!partner) {
        throw new Error('Parameter error: Matching does not contain tree root');
    }

    collector = new deltamod.DeltaCollector(deltadoc.matching, root, partner);

    if (equals) {
        collector.equals = equals;
    }

    return collector;
}


/**
 * Return an initialized context delta detacher instance.
 *
 * @param {Object} doc           The document as created by the
 *         loadOriginalDocument method of the document factory class.
 *
 * @return {contextdelta.Detacher} Initialized detacher instance.
 */
DeltaXMLFactory.prototype.createDetacher = function(doc) {
    var contextgen = new contextdelta.ContextGenerator(4, doc.nodeindex, doc.valueindex);
    return new contextdelta.Detacher(contextgen);
}


/**
 * Return an initialized context delta attacher instance
 *
 * @param {Object} resolver An instance of ContextResolver. Use the output of
 *         createResolver method from the resolver factory.
 *
 * @return {delta.Attacher} Initialized attacher instance.
 */
DeltaXMLFactory.prototype.createAttacher = function(resolver) {
    return new deltamod.Attacher(resolver);
}


/**
 * Return an initialized delta adapter instance.
 *
 * @param {Object} fragAdapter      A document fragemnt adapter. Use the object
 *         produced by createFragmentAdapter method from a document factory.
 *
 * @return {domdelta.DOMDeltaAdapter} Initialized instance of the proper delta
 *         adapter.
 */
DeltaXMLFactory.prototype.createDeltaAdapter = function(fragAdapter) {
    return new domdelta.DOMDeltaAdapter(fragAdapter);
}


/**
 * Serialize the data property into the src string and return it. Also store
 * the source into the ``src`` property of ``deltadoc``.
 *
 * @param {Object} deltadoc A populated delta document.
 *
 * @return {String} The XML representation of the delta document as a string.
 */
DeltaXMLFactory.prototype.serializeDocument = function(deltadoc) {
    deltadoc.src = payloadHandler.serializeToString(deltadoc.data);

    return deltadoc.src;
};


exports.DeltaXMLFactory = DeltaXMLFactory;

});

require.define("/lib/delta/contextdelta.js", function (require, module, exports, __dirname, __filename) {
    /**
 * This module provides classes and methods for the conversion between attached
 * operations and detached context delta operations.
 */

/** @ignore */
var tree = require('./tree');

/** @ignore */
var deltamod = require('./delta');


/**
 * Construct a new detached context delta operation instance. This is a pure
 * data object without any methods.
 *
 * @constructor
 */
function DetachedContextOperation(type, path, remove, insert, head, tail) {
    /**
     * The operation type, one of deltamod.UPDATE_NODE_TYPE, deltamod.UPDATE_FOREST_TYPE
     */
    this.type = type;


    /**
     * An array of integers representing the top-down path from the root
     * node to the anchor of this operation. The anchor point always is
     * the first position after the leading context values. For insert
     * operations it will must point to the first element of the tail
     * context.
     */
    this.path = path;


    /**
     * Null (insert), one tree.Node (update) or sequence of nodes (delete)
     */
    this.remove = remove;


    /**
     * Null (remove), one tree.Node (update) or sequence of nodes (insert)
     */
    this.insert = insert;


    /**
     * Fingerprint values for the content. For insert operations, this
     * array should be empty. For remove-operations, the array should
     * contain the fingerprint values of the nodes which should be removed,
     * for update operations, the only element should be the fingerprint
     * value of the original node.
     */
    this.head = head;
    this.tail = tail;
}


/**
 * Return a string representation of the operation
 */
DetachedContextOperation.prototype.toString = function() {
    var result = 'Unknown operation', i, parts, rvals, ivals;

    switch (this.type) {
        case deltamod.UPDATE_NODE_TYPE:
            result = 'Update "' + this.remove[0].value + '" at /' +
                this.path.join('/');
            break;
        case deltamod.UPDATE_FOREST_TYPE:
            rvals = [];
            ivals = [];
            parts = [];
            for (i = 0; i < this.remove.length; i++) {
                rvals.push(this.remove[i].value);
            }
            for (i = 0; i < this.insert.length; i++) {
                ivals.push(this.insert[i].value);
            }
            if (rvals.length) {
                parts.push('remove "' + rvals.join('", "') + '"');
            }
            if (ivals.length) {
                parts.push('insert "' + ivals.join('", "') + '"');
            }

            result = parts.join(" and ") + " at /" + this.path.join('/');

            // uppercase first character
            result = result.replace(/^([a-z])/,
                    function (c) { return c.toUpperCase();});
            break;
    }

    return result;
}


/**
 * Create new operation detacher instance.
 *
 * @constructor
 */
function Detacher(contextgen) {
    this.contextgen = contextgen;
}


/**
 * Create new detached context operation from an attached operation.
 */
Detacher.prototype.detach = function(op) {
    var deep = (op.type === deltamod.UPDATE_FOREST_TYPE);
    var head = this.contextgen.head(op.anchor);
    var tail = this.contextgen.tail(op.anchor, op.remove.length, deep);
    return new DetachedContextOperation(op.type, op.path, op.remove, op.insert,
            head, tail);
}


/**
 * Constructor for a simple context generator with the given radius. Node
 * locations are resolved using nodeindex (typically an instance of
 * tree.DocumentOrderIndex) and values are mapped using the valindex.
 * @constructor
 */
function ContextGenerator(radius, nodeindex, valindex) {
    /**
     * Return n values representing the head-context where n is the size of the
     * radius.
     *
     * @param anchor    The tree.Anchor specifying the first node after head.
     */
    this.head = function(anchor) {
        var i, ref, result = [], par = anchor.base, before = anchor.index;

        // ref represents the last node of the head context.

        if (par) {
            if (before < 1) {
                ref = nodeindex.get(par, before);
            }
            else if (before <= par.children.length) {
                ref = nodeindex.get(par.children[before - 1],
                    nodeindex.size(par.children[before - 1]) - 1);
            }
            else if (before > par.children.length) {
                ref = nodeindex.skip(par);
            }
            else {
                ref = nodeindex.get(par, -1);
            }
        }

        for (i = -radius + 1; i < 1; i++) {
            result.push(valindex.get(ref && nodeindex.get(ref, i)));
        }
        return result;
    };

    /**
     * Return the values for the tail context starting with the given node.
     *
     * @param anchor    The tree.Anchor specifying the first node after head.
     * @param length    The number of siblings affected by the operation.
     * @param depth     Wether the operation affects subtrees (true) or only
     *                  one node (false).
     *
     */
    this.tail = function(anchor, length, deep) {
        var i, ref, result = [], par = anchor.base, after = anchor.index + length - 1;

        // ref represents the last node affected by the operation or the node
        // immediately preceeding the tail respectively.

        // FIXME: Divide this logic into two methods. One for depth=true and
        // another for depht=false.
        if (par) {
            if (after < 0) {
                ref = nodeindex.get(par, after + 1);
            }
            else if (after < par.children.length) {
                if (deep) {
                    ref = nodeindex.get(par.children[after],
                            nodeindex.size(par.children[after]) - 1);
                }
                else {
                    ref = par.children[after];
                }
            }
            else if (after >= par.children.length) {
                ref = nodeindex.get(par, nodeindex.size(par) - 1);
            }
            else {
                if (deep) {
                    ref = nodeindex.get(par, nodeindex.size(par) - 1);
                }
                else {
                    ref = par;
                }
            }
        }
        else {
            if (deep) {
                ref = nodeindex.get(anchor.target,
                        nodeindex.size(anchor.target) - 1);
            }
            else {
                ref = anchor.target;
            }
        }

        for (i = 1; i < radius + 1; i++) {
            result.push(valindex.get(ref && nodeindex.get(ref, i)));
        }
        return result;
    };
}


exports.DetachedContextOperation = DetachedContextOperation;
exports.Detacher = Detacher;
exports.ContextGenerator = ContextGenerator;

});

require.define("/lib/delta/domdelta.js", function (require, module, exports, __dirname, __filename) {
    /**
 * @fileoverview    Adapter class for XML/DOM based delta format
 */

/** @ignore */
var deltamod = require('./delta');

/** @ignore */
var contextdelta = require('./contextdelta');

TYPE_TAGS = {};
TYPE_TAGS[deltamod.UPDATE_NODE_TYPE] = 'node';
TYPE_TAGS[deltamod.UPDATE_FOREST_TYPE] = 'forest';
TYPE_TAGS.node = deltamod.UPDATE_NODE_TYPE;
TYPE_TAGS.forest = deltamod.UPDATE_FOREST_TYPE;

/**
 * @constructor
 */
function DOMDeltaAdapter(fragmentadapter) {
    this.fragmentadapter = fragmentadapter;
}


DOMDeltaAdapter.prototype.adaptDocument = function(doc) {
    var operations = [], root, nodes, n, i;

    // loop through children and add documents and options to delta class
    root = doc.documentElement;

    nodes = Array.prototype.slice.call(root.childNodes);
    for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        if (n.nodeType === n.ELEMENT_NODE) {
            operations.push(this.adaptOperation(n, TYPE_TAGS[n.tagName]));
        }
    }

    return operations;
};


DOMDeltaAdapter.prototype.adaptOperation = function(element, type) {
    var path = element.getAttribute('path'),
        children, remove, insert, i, n, head, tail, body;

    switch (type) {
        case deltamod.UPDATE_NODE_TYPE:
        case deltamod.UPDATE_FOREST_TYPE:
            break;
        default:
            throw new Error('Encountered unsupported change type');
    }

    // Parse path
    if (path === '') {
        path = [];
    }
    else {
        path = path.split('/').map(function(component) {
            return parseInt(component, 10);
        });
    }

    children = Array.prototype.slice.call(element.childNodes);
    node = this.nextElement('context', children);
    head = this.parseContext(node);

    node = this.nextElement('remove', children);
    remove = this.fragmentadapter.importFragment(node.childNodes);

    node = this.nextElement('insert', children);
    insert = this.fragmentadapter.importFragment(node.childNodes);

    node = this.nextElement('context', children);
    tail = this.parseContext(node);

    return new contextdelta.DetachedContextOperation(type, path, remove, insert, head, tail);
};


DOMDeltaAdapter.prototype.nextElement = function(tag, domnodes) {
    var node = domnodes.shift();
    while (node && node.nodeType !== node.ELEMENT_NODE) {
        if (node.tagName === tag) {
            break;
        }
        node = domnodes.shift();
    }
    return node;
};


DOMDeltaAdapter.prototype.nextText = function(domnodes) {
    var node = domnodes.shift();
    while(node && node.nodeType !== node.TEXT_NODE) {
        node = domnodes.shift();
    }
    return node;
};


DOMDeltaAdapter.prototype.parseContext = function(node) {
    var children = Array.prototype.slice.call(node.childNodes);
    var text = this.nextText(children);
    if (text) {
        return text.nodeValue.split(';').map(function(component) {
            component = component.trim();
            if (component.length) {
                return parseInt(component, 16);
            }
        });
    }
};


/**
 * Populate the document with settings and operations from delta.
 */
DOMDeltaAdapter.prototype.populateDocument = function(doc, operations) {
    var i, root, element;
    // Loop through operations and append them to the given document

    root = doc.createElement('delta');

    for (i = 0; i < operations.length; i++) {
        element = this.constructOperationElement(doc, operations[i]);
        root.appendChild(element);
    }

    doc.appendChild(root);
};


DOMDeltaAdapter.prototype.constructOperationElement = function(doc, op) {
    var tag = TYPE_TAGS[op.type],
        deep = (op.type !== deltamod.UPDATE_NODE_TYPE),
        element = doc.createElement(tag),
        remove = doc.createElement('remove'),
        insert = doc.createElement('insert'),
        head = doc.createElement('context'),
        tail = doc.createElement('context'),
        oldcontent, newcontent;

    element.setAttribute('path', op.path.join('/'));

    head.appendChild(doc.createTextNode(this.formatFingerprint(op.head)));
    element.appendChild(head);

    if (op.remove) {
        oldcontent = this.fragmentadapter.adapt(doc, op.remove, deep);
        if (typeof oldcontent === 'string') {
            remove.appendChild(doc.createCDATASection(oldcontent));
        }
        else {
            remove.appendChild(oldcontent);
        }
        element.appendChild(remove);
    }

    if (op.insert) {
        newcontent = this.fragmentadapter.adapt(doc, op.insert, deep);
        if (typeof newcontent === 'string') {
            insert.appendChild(doc.createCDATASection(newcontent));
        }
        else {
            insert.appendChild(newcontent);
        }
        element.appendChild(insert);
    }

    tail.appendChild(doc.createTextNode(this.formatFingerprint(op.tail)));
    element.appendChild(tail);

    return element;
};

DOMDeltaAdapter.prototype.formatFingerprint = function(parts) {
    return parts.map(function(n) {
        return n ? n.toString(16) : '';
    }).join(';');
};


exports.DOMDeltaAdapter = DOMDeltaAdapter;

});

require.define("/lib/delta/delta-doc.js", function (require, module, exports, __dirname, __filename) {
    /**
 * @fileoverview This module provides the DeltaDocument object.
 */

/**
 * Create new delta document instance.
 *
 * @param {string}  type    The document type. E.g. 'xml' or 'json'
 * @param {string}  [name]  The file name.
 * @param {object}  data    A reference to the underlying document, the DOM.
 * @param {array}   [attached]  An array of attached operations (
 *         :js:class:AttachedOperation).
 * @param {array}   [detached]  An array of detached operations (e.g.
 *         :js:class:DetachedContextOperation) when loading from a file.
 * @param {string}  [src]   The serialized version of this document, e.g. the
 *         XML markup code.
 * @param {object}  [matching]  A matching which should be used to build up the
 *         document later on.
 *
 * @constructor
 */
function DeltaDocument(type, name, data, attached, detached, src, matching) {
    /**
     * The document type. E.g. 'xml' or 'json'
     */
    this.type = type;

    /**
     * The file name
     */
    this.name = name;

    /**
     * A reference to the underlying document, e.g. the DOMDocument object.
     */
    this.data = data;

    /**
     * An array of attached operations.
     */
    this.attached = attached || [];

    /**
     * An array of dettached operations.
     */
    this.detached = detached || [];

    /**
     * The serialized version of this document.
     */
    this.src = src || '';

    /**
     * A matching which is used to collect attached operations when building
     * the delta document.
     */
    this.matching = matching;
}


/**
 * Install handlers for a resolved delta.
 *
 * @param {Object}  handlerfactory  An instance returned from the document
 *         factory ``createHandlerFactory`` method.
 */
DeltaDocument.prototype.installHandlers = function(handlerfactory) {
    var i, op;

    // Install handlers for attached operations
    for (i = 0; i < this.attached.length; i++) {
        op = this.attached[i];
        if (op && !op.handler) {
            op.handler = handlerfactory.createOperationHandler(op.anchor,
                    op.type, op.path, op.remove, op.insert);
        }
    }
}


/**
 * Toggle all handlers of a delta document.
 */
DeltaDocument.prototype.toggleHandlers = function() {
    var i, op;

    // Toggle handler for each attached operation
    for (i = 0; i < this.attached.length; i++) {
        op = this.attached[i];
        if (op && op.handler) {
            op.handler.toggle();
        }
    }
}

exports.DeltaDocument = DeltaDocument;

});

require.define("/lib/delta/diff.js", function (require, module, exports, __dirname, __filename) {
    /**
 * @fileoverview High-Lever interface for diffing process
 */

/**
 * Create a new instance of a patch command based on the given factory objects.
 *
 * @param {Object} diffFactory      A reference to a diff algorithm profile.
 * @param {Object} docFactory       A reference to a document profile.
 * @param {Object} deltaFactory     A reference to a delta profile.
 *
 * Usage example:
 *
 * .. code-block:: javascript
 * 
 *      var diffProfile = require('./lib/profiles/algo-diff-skelmatch');
 *      var docProfile = require('./lib/profiles/doc-tree-xml');
 *      var deltaProfile = require('./lib/profiles/delta-tree-xml');
 *      var diff = require('./lib/delta/diff');
 *      
 *      var d = new diff.Diff(diffProfile, docProfile, deltaProfile);
 *
 *      var orig = docProfile.loadOriginalDocument(original_content);
 *      var changed = docProfile.loadInputDocument(changed_content);
 *
 *      var delta = d.diff(orig, changed);
 *
 *      var result = deltaProfile.serializeDocument(delta);
 *
 * @constructor
 * @creator
 * @name diff.Diff
 */
function Diff(diffFactory, docFactory, deltaFactory) {
    this.diffFactory = diffFactory;
    this.docFactory = docFactory;
    this.deltaFactory = deltaFactory;
}

/**
 * Return the delta object after computing and collecting the diff between
 * doc1 and doc2.
 *
 * @param {Object} doc1     Original document. An instance returned by document
 *                          profile loadOriginalDocument method.
 * @param {Object} doc2     Changed document. An instance returned by document
 *                          profile loadInputDocument method.
 * @return {Object} Delta document.
 * @memberOf diff.Diff
 */
Diff.prototype.diff = function(doc1, doc2) {
    var matching = this.diffFactory.createMatching(),
        equals = this.docFactory.createNodeEqualityTest(doc1, doc2),
        diff = this.diffFactory.createDiffAlgorithm(doc1, doc2, equals);

    // diff
    diff.matchTrees(matching);

    // Collect changes
    deltadoc = this.collect(doc1, doc2, matching);

    // Populate document
    this.populate(deltadoc, doc1);

    return deltadoc;
}


/**
 * Construct delta document.
 *
 * @param {Object} doc1     Original document. An instance returned by document
 *                          profile loadOriginalDocument method.
 * @param {Object} doc2     Changed document. An instance returned by document
 *                          profile loadInputDocument method.
 * @param {Object} matching The matching produced by the choosen diff
 *                          algorithm.
 * @return {Object} Delta document.
 *
 * @memberOf diff.Diff
 */
Diff.prototype.collect = function(doc1, doc2, matching) {
    var deltadoc = this.deltaFactory.createEmptyDocument(matching),
        equals = this.docFactory.createNodeEqualityTest(doc1, doc2),
        collector;

    collector = this.deltaFactory.createCollector(deltadoc, doc1, equals);

    // Collect changes and create operations in delta document
    collector.forEachChange(function(attached) {
        deltadoc.attached.push(attached);
    });

    return deltadoc;
};


/**
 * Populate delta document with detached operations
 *
 * @param {Object} deltadoc The delta document produced by diff.Diff.collect.
 * @param {Object} doc      Original document. An instance returned by document
 *                          profile loadInputDocument method.
 * @return {Object} The file-format specific representation of the delta
 *                  document (e.g. the DOM document).
 *
 * @memberOf diff.Diff
 */
Diff.prototype.populate = function(deltadoc, doc) {
    var i, detacher = this.deltaFactory.createDetacher(doc),
        fragadapter = this.docFactory.createFragmentAdapter(deltadoc.type),
        deltaadapter = this.deltaFactory.createDeltaAdapter(fragadapter);

    // Detach operations
    for (i = 0; i < deltadoc.attached.length; i++) {
        deltadoc.detached[i] = detacher.detach(deltadoc.attached[i]);
    }

    // Populate DOM of delta document
    deltaadapter.populateDocument(deltadoc.data, deltadoc.detached);

    return deltadoc.data;
}

exports.Diff = Diff;

});

require.define("/docannotator.js", function (require, module, exports, __dirname, __filename) {
    var style_html = require('./beautify-html').style_html;
var xs = new XMLSerializer();

/**
 * Create new DocumentAnnotator instance
 * @creator
 */
exports.DocumentAnnotator = function DocumentAnnotator(doc, nonce) {
    this.doc = doc;
    this.nonce = nonce || (new Date()).getTime().toString();
    this.indent_size = 4;
    this.indent_char = ' ';
    this.markers = [];
}

/**
 * Wrap the given DOM elements with a html element, typically a <span>.
 * Wrapped nodes will be escaped after serialization while special
 * characters of the html element will be preserved.
 */
exports.DocumentAnnotator.prototype.wrap = function(par, before, domnodes,
        starttag, endtag) {
    var content, node, indent = '',
    docfrag = this.doc.createDocumentFragment();

    // Indentation
    node = (par && par.parentNode);
    while(node) {
        for (i = 0; i < this.indent_size; i++) {
            indent += this.indent_char;
        }
        node = node.parentNode;
    }

    // Build up marker comment
    for (i = 0; i < domnodes.length; i++) {
        docfrag.appendChild(domnodes[i]);
    }

    content = '\nPRESERVE'+this.nonce+starttag+'ENDPRESERVE'+this.nonce;
    content += style_html(xs.serializeToString(docfrag), {'max_char': 70 - indent.length});
    content += 'PRESERVE'+this.nonce+endtag+'ENDPRESERVE'+this.nonce;
    content = content.replace(/^/mg, indent);
    node = this.doc.createComment(content);

    // Insert marker comment
    this.markers.push(par.insertBefore(node, before));
}


/**
 * Exclude the given DOM element from the serialized output.
 */
exports.DocumentAnnotator.prototype.exclude = function(domnode, deep) {
    var par, next, start, end;
    if (domnode.ownerDocument !== this.doc) {
        throw new Error('Cannot exclude element if it is not part of the document');
    }
    start = this.doc.createComment('EXCLUDE'+this.nonce);
    end = this.doc.createComment('ENDEXCLUDE'+this.nonce);

    par = domnode.parentNode || this.doc;
    this.markers.push(par.insertBefore(start, domnode));

    // insert after
    next = undefined;
    if (deep) {
        next = domnode.nextSibling;
    }
    else if (domnode) {
        next = domnode.firstChild || domnode.nextSibling;
        if (next) {
            par = next.parentNode || domnode.ownerDocument;
        }
        else {
            par = domnode.parentNode || domnode.ownerDocument;
        }
    }
    this.markers.push(par.insertBefore(end, next));
}

/**
 * Return the annotated source of the DOM tree.
 */
exports.DocumentAnnotator.prototype.toHTML = function(noclear) {
    var tmpdoc = document.implementation.createDocument('','',null);
    var source = style_html(xs.serializeToString(this.doc));

    // Remove excluded nodes from the output
    var exclude_pat = '<!--EXCLUDE'+this.nonce+'-->[\\s\\S]*?<!--ENDEXCLUDE'+this.nonce+'-->\n?';
    var exclude_re = new RegExp(exclude_pat, 'gm');
    source = source.replace(exclude_re,'');

    var preserve_pat = '<!--\\s*PRESERVE'+this.nonce+'([\\s\\S]*?)ENDPRESERVE'+this.nonce;
    preserve_pat += '([\\s\\S]*?)';
    preserve_pat += 'PRESERVE'+this.nonce+'([\\s\\S]*?)ENDPRESERVE'+this.nonce+'-->';
    var preserve_re = new RegExp(preserve_pat, 'gm');
    var tmptxt, result='', last=0;

    while ((match = preserve_re.exec(source))) {
        // Serialize (escape) input up to but not including the marker
        // comment
        tmptxt = this.doc.createTextNode(match.input.slice(last,
                    preserve_re.lastIndex - match[0].length));
        result += xs.serializeToString(tmptxt);

        // Append preserved start-tag unescaped
        result += match[1];
        last = preserve_re.lastIndex;

        // Append content escaped
        tmptxt = this.doc.createTextNode(match[2]);
        result += xs.serializeToString(tmptxt);

        // Append preserved end-tag unescaped
        result += match[3];
        last = preserve_re.lastIndex;
    }

    // Serialize rest
    tmptxt = this.doc.createTextNode(source.slice(last));
    result += xs.serializeToString(tmptxt);

    // Remove marker comments
    if (!noclear) {
        this.clear();
    }

    return result;
}

/**
 * Remove marker comments from underlying DOM tree.
 */
exports.DocumentAnnotator.prototype.clear = function() {
    var i, par;
    for (i = 0; i < this.markers.length; i++) {
        par = this.markers[i].parentNode || this.doc;
        par.removeChild(this.markers[i]);
    }
}

});

require.define("/beautify-html.js", function (require, module, exports, __dirname, __filename) {
    /*
 Style HTML
---------------
  Written by Nochum Sossonko, (nsossonko@hotmail.com)
  Based on code initially developed by: Einar Lielmanis, <elfz@laacz.lv>
    http://jsbeautifier.org/
  You are free to use this in any way you want, in case you find this useful or working for you.
  Usage:
    style_html(html_source);
    style_html(html_source, options);
  The options are:
    indent_size (default 4)          — indentation size,
    indent_char (default space)      — character to indent with,
    max_char (default 70)            -  maximum amount of characters per line,
    brace_style (default "collapse") - "collapse" | "expand" | "end-expand"
            put braces on the same line as control statements (default), or put braces on own line (Allman / ANSI style), or just put end braces on own line.
    unformatted (default ['a'])      - list of tags, that shouldn't be reformatted
    e.g.
    style_html(html_source, {
      'indent_size': 2,
      'indent_char': ' ',
      'max_char': 78,
      'brace_style': 'expand',
      'unformatted': ['a', 'sub', 'sup', 'b', 'i', 'u']
    });
*/

function style_html(html_source, options) {
//Wrapper function to invoke all the necessary constructors and deal with the output.

  var multi_parser,
      indent_size,
      indent_character,
      max_char,
      brace_style;

  options = options || {};
  indent_size = options.indent_size || 4;
  indent_character = options.indent_char || ' ';
  brace_style = options.brace_style || 'collapse';
  max_char = options.max_char || '70';
  unformatted = options.unformatted || ['a'];

  function Parser() {

    this.pos = 0; //Parser position
    this.token = '';
    this.current_mode = 'CONTENT'; //reflects the current Parser mode: TAG/CONTENT
    this.tags = { //An object to hold tags, their position, and their parent-tags, initiated with default values
      parent: 'parent1',
      parentcount: 1,
      parent1: ''
    };
    this.tag_type = '';
    this.token_text = this.last_token = this.last_text = this.token_type = '';

    this.Utils = { //Uilities made available to the various functions
      whitespace: "\n\r\t ".split(''),
      single_token: 'br,input,link,meta,!doctype,basefont,base,area,hr,wbr,param,img,isindex,?xml,embed'.split(','), //all the single tags for HTML
      extra_liners: 'head,body,/html'.split(','), //for tags that need a line of whitespace before them
      in_array: function (what, arr) {
        for (var i=0; i<arr.length; i++) {
          if (what === arr[i]) {
            return true;
          }
        }
        return false;
      }
    }

    this.get_content = function () { //function to capture regular content between tags

      var input_char = '';
      var content = [];
      var space = false; //if a space is needed
      while (this.input.charAt(this.pos) !== '<') {
        if (this.pos >= this.input.length) {
          return content.length?content.join(''):['', 'TK_EOF'];
        }

        input_char = this.input.charAt(this.pos);
        this.pos++;
        this.line_char_count++;

        if (this.Utils.in_array(input_char, this.Utils.whitespace)) {
          if (content.length) {
            space = true;
          }
          this.line_char_count--;
          continue; //don't want to insert unnecessary space
        }
        else if (space) {
          if (this.line_char_count >= this.max_char) { //insert a line when the max_char is reached
            content.push('\n');
            for (var i=0; i<this.indent_level; i++) {
              content.push(this.indent_string);
            }
            this.line_char_count = 0;
          }
          else{
            content.push(' ');
            this.line_char_count++;
          }
          space = false;
        }
        content.push(input_char); //letter at-a-time (or string) inserted to an array
      }
      return content.length?content.join(''):'';
    }

    this.get_script = function () { //get the full content of a script to pass to js_beautify

      var input_char = '';
      var content = [];
      var reg_match = new RegExp('\<\/script' + '\>', 'igm');
      reg_match.lastIndex = this.pos;
      var reg_array = reg_match.exec(this.input);
      var end_script = reg_array?reg_array.index:this.input.length; //absolute end of script
      while(this.pos < end_script) { //get everything in between the script tags
        if (this.pos >= this.input.length) {
          return content.length?content.join(''):['', 'TK_EOF'];
        }

        input_char = this.input.charAt(this.pos);
        this.pos++;

        content.push(input_char);
      }
      return content.length?content.join(''):''; //we might not have any content at all
    }

    this.record_tag = function (tag){ //function to record a tag and its parent in this.tags Object
      if (this.tags[tag + 'count']) { //check for the existence of this tag type
        this.tags[tag + 'count']++;
        this.tags[tag + this.tags[tag + 'count']] = this.indent_level; //and record the present indent level
      }
      else { //otherwise initialize this tag type
        this.tags[tag + 'count'] = 1;
        this.tags[tag + this.tags[tag + 'count']] = this.indent_level; //and record the present indent level
      }
      this.tags[tag + this.tags[tag + 'count'] + 'parent'] = this.tags.parent; //set the parent (i.e. in the case of a div this.tags.div1parent)
      this.tags.parent = tag + this.tags[tag + 'count']; //and make this the current parent (i.e. in the case of a div 'div1')
    }

    this.retrieve_tag = function (tag) { //function to retrieve the opening tag to the corresponding closer
      if (this.tags[tag + 'count']) { //if the openener is not in the Object we ignore it
        var temp_parent = this.tags.parent; //check to see if it's a closable tag.
        while (temp_parent) { //till we reach '' (the initial value);
          if (tag + this.tags[tag + 'count'] === temp_parent) { //if this is it use it
            break;
          }
          temp_parent = this.tags[temp_parent + 'parent']; //otherwise keep on climbing up the DOM Tree
        }
        if (temp_parent) { //if we caught something
          this.indent_level = this.tags[tag + this.tags[tag + 'count']]; //set the indent_level accordingly
          this.tags.parent = this.tags[temp_parent + 'parent']; //and set the current parent
        }
        delete this.tags[tag + this.tags[tag + 'count'] + 'parent']; //delete the closed tags parent reference...
        delete this.tags[tag + this.tags[tag + 'count']]; //...and the tag itself
        if (this.tags[tag + 'count'] == 1) {
          delete this.tags[tag + 'count'];
        }
        else {
          this.tags[tag + 'count']--;
        }
      }
    }

    this.get_tag = function () { //function to get a full tag and parse its type
      var input_char = '';
      var content = [];
      var space = false;

      do {
        if (this.pos >= this.input.length) {
          return content.length?content.join(''):['', 'TK_EOF'];
        }

        input_char = this.input.charAt(this.pos);
        this.pos++;
        this.line_char_count++;

        if (this.Utils.in_array(input_char, this.Utils.whitespace)) { //don't want to insert unnecessary space
          space = true;
          this.line_char_count--;
          continue;
        }

        if (input_char === "'" || input_char === '"') {
          if (!content[1] || content[1] !== '!') { //if we're in a comment strings don't get treated specially
            input_char += this.get_unformatted(input_char);
            space = true;
          }
        }

        if (input_char === '=') { //no space before =
          space = false;
        }

        if (content.length && content[content.length-1] !== '=' && input_char !== '>'
            && space) { //no space after = or before >
          if (this.line_char_count >= this.max_char) {
            this.print_newline(false, content);
            this.line_char_count = 0;
          }
          else {
            content.push(' ');
            this.line_char_count++;
          }
          space = false;
        }
        content.push(input_char); //inserts character at-a-time (or string)
      } while (input_char !== '>');

      var tag_complete = content.join('');
      var tag_index;
      if (tag_complete.indexOf(' ') != -1) { //if there's whitespace, thats where the tag name ends
        tag_index = tag_complete.indexOf(' ');
      }
      else { //otherwise go with the tag ending
        tag_index = tag_complete.indexOf('>');
      }
      var tag_check = tag_complete.substring(1, tag_index).toLowerCase();
      if (tag_complete.charAt(tag_complete.length-2) === '/' ||
          this.Utils.in_array(tag_check, this.Utils.single_token)) { //if this tag name is a single tag type (either in the list or has a closing /)
        this.tag_type = 'SINGLE';
      }
      else if (tag_check === 'script') { //for later script handling
        this.record_tag(tag_check);
        this.tag_type = 'SCRIPT';
      }
      else if (tag_check === 'style') { //for future style handling (for now it justs uses get_content)
        this.record_tag(tag_check);
        this.tag_type = 'STYLE';
      }
      else if (this.Utils.in_array(tag_check, unformatted)) { // do not reformat the "unformatted" tags
        var comment = this.get_unformatted('</'+tag_check+'>', tag_complete); //...delegate to get_unformatted function
        content.push(comment);
        this.tag_type = 'SINGLE';
      }
      else if (tag_check.charAt(0) === '!') { //peek for <!-- comment
        if (tag_check.indexOf('[if') != -1) { //peek for <!--[if conditional comment
          if (tag_complete.indexOf('!IE') != -1) { //this type needs a closing --> so...
            var comment = this.get_unformatted('-->', tag_complete); //...delegate to get_unformatted
            content.push(comment);
          }
          this.tag_type = 'START';
        }
        else if (tag_check.indexOf('[endif') != -1) {//peek for <!--[endif end conditional comment
          this.tag_type = 'END';
          this.unindent();
        }
        else if (tag_check.indexOf('[cdata[') != -1) { //if it's a <[cdata[ comment...
          var comment = this.get_unformatted(']]>', tag_complete); //...delegate to get_unformatted function
          content.push(comment);
          this.tag_type = 'SINGLE'; //<![CDATA[ comments are treated like single tags
        }
        else {
          var comment = this.get_unformatted('-->', tag_complete);
          content.push(comment);
          this.tag_type = 'SINGLE';
        }
      }
      else {
        if (tag_check.charAt(0) === '/') { //this tag is a double tag so check for tag-ending
          this.retrieve_tag(tag_check.substring(1)); //remove it and all ancestors
          this.tag_type = 'END';
        }
        else { //otherwise it's a start-tag
          this.record_tag(tag_check); //push it on the tag stack
          this.tag_type = 'START';
        }
        if (this.Utils.in_array(tag_check, this.Utils.extra_liners)) { //check if this double needs an extra line
          this.print_newline(true, this.output);
        }
      }
      return content.join(''); //returns fully formatted tag
    }

    this.get_unformatted = function (delimiter, orig_tag) { //function to return unformatted content in its entirety

      if (orig_tag && orig_tag.indexOf(delimiter) != -1) {
        return '';
      }
      var input_char = '';
      var content = '';
      var space = true;
      do {

        if (this.pos >= this.input.length) {
          return content;
        }

        input_char = this.input.charAt(this.pos);
        this.pos++

        if (this.Utils.in_array(input_char, this.Utils.whitespace)) {
          if (!space) {
            this.line_char_count--;
            continue;
          }
          if (input_char === '\n' || input_char === '\r') {
            content += '\n';
            /*  Don't change tab indention for unformatted blocks.  If using code for html editing, this will greatly affect <pre> tags if they are specified in the 'unformatted array'
            for (var i=0; i<this.indent_level; i++) {
              content += this.indent_string;
            }
            space = false; //...and make sure other indentation is erased
            */
            this.line_char_count = 0;
            continue;
          }
        }
        content += input_char;
        this.line_char_count++;
        space = true;


      } while (content.indexOf(delimiter) == -1);
      return content;
    }

    this.get_token = function () { //initial handler for token-retrieval
      var token;

      if (this.last_token === 'TK_TAG_SCRIPT') { //check if we need to format javascript
        var temp_token = this.get_script();
        if (typeof temp_token !== 'string') {
          return temp_token;
        }
        token = js_beautify(temp_token.replace(/^[\r\n]+/, ''), {
          'indent_size': this.indent_size,
          'indent_char': this.indent_character,
          'brace_style': this.brace_style
        }); //call the JS Beautifier
        return [token, 'TK_CONTENT'];
      }
      if (this.current_mode === 'CONTENT') {
        token = this.get_content();
        if (typeof token !== 'string') {
          return token;
        }
        else {
          return [token, 'TK_CONTENT'];
        }
      }

      if (this.current_mode === 'TAG') {
        token = this.get_tag();
        if (typeof token !== 'string') {
          return token;
        }
        else {
          var tag_name_type = 'TK_TAG_' + this.tag_type;
          return [token, tag_name_type];
        }
      }
    }

    this.printer = function (js_source, indent_character, indent_size, max_char, brace_style) { //handles input/output and some other printing functions

      this.input = js_source || ''; //gets the input for the Parser
      this.output = [];
      this.indent_character = indent_character;
      this.indent_string = '';
      this.indent_size = indent_size;
      this.brace_style = brace_style;
      this.indent_level = 0;
      this.max_char = max_char;
      this.line_char_count = 0; //count to see if max_char was exceeded

      for (var i=0; i<this.indent_size; i++) {
        this.indent_string += this.indent_character;
      }

      this.print_newline = function (ignore, arr) {
        this.line_char_count = 0;
        if (!arr || !arr.length) {
          return;
        }
        if (!ignore) { //we might want the extra line
          while (this.Utils.in_array(arr[arr.length-1], this.Utils.whitespace)) {
            arr.pop();
          }
        }
        arr.push('\n');
        for (var i=0; i<this.indent_level; i++) {
          arr.push(this.indent_string);
        }
      }

      this.print_token = function (text) {
        this.output.push(text);
      }

      this.indent = function () {
        this.indent_level++;
      }

      this.unindent = function () {
        if (this.indent_level > 0) {
          this.indent_level--;
        }
      }
    }
    return this;
  }

  /*_____________________--------------------_____________________*/

  multi_parser = new Parser(); //wrapping functions Parser
  multi_parser.printer(html_source, indent_character, indent_size, max_char, brace_style); //initialize starting values

  while (true) {
      var t = multi_parser.get_token();
      multi_parser.token_text = t[0];
      multi_parser.token_type = t[1];

    if (multi_parser.token_type === 'TK_EOF') {
      break;
    }

    switch (multi_parser.token_type) {
      case 'TK_TAG_START':
      case 'TK_TAG_STYLE':
        multi_parser.print_newline(false, multi_parser.output);
        multi_parser.print_token(multi_parser.token_text);
        multi_parser.indent();
        multi_parser.current_mode = 'CONTENT';
        break;
      case 'TK_TAG_SCRIPT':
        multi_parser.print_newline(false, multi_parser.output);
        multi_parser.print_token(multi_parser.token_text);
        multi_parser.current_mode = 'CONTENT';
        break;
      case 'TK_TAG_END':
        multi_parser.print_newline(true, multi_parser.output);
        multi_parser.print_token(multi_parser.token_text);
        multi_parser.current_mode = 'CONTENT';
        break;
      case 'TK_TAG_SINGLE':
        multi_parser.print_newline(false, multi_parser.output);
        multi_parser.print_token(multi_parser.token_text);
        multi_parser.current_mode = 'CONTENT';
        break;
      case 'TK_CONTENT':
        if (multi_parser.token_text !== '') {
          multi_parser.print_newline(false, multi_parser.output);
          multi_parser.print_token(multi_parser.token_text);
        }
        multi_parser.current_mode = 'TAG';
        break;
    }
    multi_parser.last_token = multi_parser.token_type;
    multi_parser.last_text = multi_parser.token_text;
  }
  return multi_parser.output.join('');
}

exports.style_html = style_html;

});

require.define("/srcdiff-entry.js", function (require, module, exports, __dirname, __filename) {
    var xccDiffProfile = require('./lib/profiles/algo-diff-xcc');
var skelmatchDiffProfile = require('./lib/profiles/algo-diff-skelmatch');
var docProfile = require('./lib/profiles/doc-tree-xml');
var deltaProfile = require('./lib/profiles/delta-tree-xml');

var diff = require('./lib/delta/diff');

var da = require('./docannotator');
var style_html = require('./beautify-html').style_html;

/**
 * Annotate source tree by injecting comments into the underlying DOM
 */
function annotate_source(doc, matching, invert) {
    var collector = deltaProfile.createCollector(delta, doc,
            docProfile.createNodeEqualityTest(doc, doc));
    var domdoc = doc.tree.data.ownerDocument;
    var annotator = new da.DocumentAnnotator(domdoc);
    var excludes = [];

    
    //collector.forEachChange(function(type, path, par, remove, insert) {
    collector.forEachChange(function(op) {
        var deep = (op.type === 2),
        i, nodes, dompar, before, ancestors;

    if (op.anchor.base) {
        dompar = op.anchor.base.data;
        before = op.anchor.target;
        before = before && before.data;
    }
    else {
        dompar = domdoc;
        before = doc.tree.data;
    }

    for (nodes = [], i = 0; i < op.remove.length; i++) {
        nodes.push(op.remove[i].data.cloneNode(deep));
    }
    annotator.wrap(dompar, before, nodes,
        '<span class="change change-remove">', '</span>');

    for (nodes = [], i = 0; i < op.insert.length; i++) {
        nodes.push(domdoc.importNode(op.insert[i].data, deep));
    }
    annotator.wrap(dompar, before, nodes,
            '<span class="change change-insert">', '</span>');

    for (nodes = [], i = 0; i < op.remove.length; i++) {
        excludes.push([op.remove[i].data, deep]);
    }
    });

    for (var i = 0; i < excludes.length; i++) {
        annotator.exclude.apply(annotator, excludes[i]);
    }

    return annotator.toHTML();
}

function refresh() {
    if (doc1.tree && doc2.tree) {
        var d = new diff.Diff(skelmatchDiffProfile, docProfile, deltaProfile);
        delta = d.diff(doc1, doc2);
        
        $('#patch > pre').text(style_html(deltaProfile.serializeDocument(delta)));

        doc1.ansrc = annotate_source(doc1, delta.matching, false);
        doc2.ansrc = annotate_source(doc2, delta.matching, true);
        
    }
    $('#src1 > pre').html(doc1.ansrc);
    $('#src2 > pre').html(doc2.ansrc);
    delta2BPMNtpp(delta.src);

    sessionStorage.bpmn = encodeURIComponent(doc1.src);
    sessionStorage.bpmn2 = encodeURIComponent(doc2.src);
    window.location.href = "../modeler/web/index.html";
    
    prettyPrint();
}

function load_document(files, doc) {
    var file = files[0];
    var reader;
    var me = this;
    if (file) {
        //console.log(file);
        //if (file.type.match(/^(text\/xml|text\/html|.*\+xml)$/)) {
            if(file.name.includes("bpmn") || file.name.includes("BPMN") || file.name.includes("xml") ){
            reader = new FileReader();
            reader.onload = function(evt) {
                me[doc] = docProfile.loadOriginalDocument(evt.target.result);
                refresh();
            }
            reader.onerror = function(evt) {
                alert('Failed to load document.');
            }
            reader.readAsText(file);
        }
        else {
            alert('Filetype not supported');
        }
    }
}

$(function() {
    $('#file1').change(function() {
        load_document(this.files, 'doc1')
    });
    $('#file2').change(function() {
        load_document(this.files, 'doc2')
    });
});

});
require("/srcdiff-entry.js");