/*!
 * @overview ContentKit-Editor: A modern, minimalist WYSIWYG editor.
 * @version  0.1.0
 * @author   Garth Poitras <garth22@gmail.com> (http://garthpoitras.com/)
 * @license  MIT
 * Last modified: Aug 31, 2014
 */

(function(exports, document) {

'use strict';

define("content-kit",
  ["./content-kit-compiler/types/type","./content-kit-compiler/models/block","./content-kit-compiler/models/text","./content-kit-compiler/models/image","./content-kit-compiler/models/embed","./content-kit-compiler/compiler","./content-kit-compiler/parsers/html-parser","./content-kit-compiler/renderers/html-renderer","./content-kit-editor/editor/editor-factory","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __dependency8__, __dependency9__, __exports__) {
    "use strict";
    var Type = __dependency1__["default"];
    var BlockModel = __dependency2__["default"];
    var TextModel = __dependency3__["default"];
    var ImageModel = __dependency4__["default"];
    var EmbedModel = __dependency5__["default"];
    var Compiler = __dependency6__["default"];
    var HTMLParser = __dependency7__["default"];
    var HTMLRenderer = __dependency8__["default"];

    var EditorFactory = __dependency9__["default"];

    var ContentKit = {};
    ContentKit.Type = Type;
    ContentKit.BlockModel = BlockModel;
    ContentKit.TextModel = TextModel;
    ContentKit.ImageModel = ImageModel;
    ContentKit.EmbedModel = EmbedModel;
    ContentKit.Compiler = Compiler;
    ContentKit.HTMLParser = HTMLParser;
    ContentKit.HTMLRenderer = HTMLRenderer;

    ContentKit.Editor = EditorFactory;

    __exports__["default"] = ContentKit;
  });
define("content-kit-compiler/compiler",
  ["./parsers/html-parser","./renderers/html-renderer","./types/default-types","../content-kit-utils/object-utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var HTMLParser = __dependency1__["default"];
    var HTMLRenderer = __dependency2__["default"];
    var DefaultBlockTypeSet = __dependency3__.DefaultBlockTypeSet;
    var DefaultMarkupTypeSet = __dependency3__.DefaultMarkupTypeSet;
    var mergeWithOptions = __dependency4__.mergeWithOptions;

    /**
     * @class Compiler
     * @constructor
     * @param options
     */
    function Compiler(options) {
      var parser = new HTMLParser();
      var renderer = new HTMLRenderer();
      var defaults = {
        parser           : parser,
        renderer         : renderer,
        blockTypes       : DefaultBlockTypeSet,
        markupTypes      : DefaultMarkupTypeSet,
        includeTypeNames : false // true will output type_name: 'TEXT' etc. when parsing for easier debugging
      };
      mergeWithOptions(this, defaults, options);

      // Reference the compiler settings
      parser.blockTypes  = renderer.blockTypes  = this.blockTypes;
      parser.markupTypes = renderer.markupTypes = this.markupTypes;
      parser.includeTypeNames = this.includeTypeNames;
    }

    /**
     * @method parse
     * @param input
     * @return Object
     */
    Compiler.prototype.parse = function(input) {
      return this.parser.parse(input);
    };

    /**
     * @method render
     * @param data
     * @return Object
     */
    Compiler.prototype.render = function(data) {
      return this.renderer.render(data);
    };

    /**
     * @method registerBlockType
     * @param {Type} type
     */
    Compiler.prototype.registerBlockType = function(type) {
      return this.blockTypes.addType(type);
    };

    /**
     * @method registerMarkupType
     * @param {Type} type
     */
    Compiler.prototype.registerMarkupType = function(type) {
      return this.markupTypes.addType(type);
    };

    __exports__["default"] = Compiler;
  });
define("content-kit-editor/constants",
  ["../content-kit-compiler/types/type","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Type = __dependency1__["default"];

    var Keycodes = {
      BKSP  : 8,
      ENTER : 13,
      ESC   : 27,
      DEL   : 46
    };

    var RegEx = {
      NEWLINE       : /[\r\n]/g,
      HTTP_PROTOCOL : /^https?:\/\//i,
      HEADING_TAG   : /^(h1|h2|h3|h4|h5|h6)$/i
    };

    var SelectionDirection = {
      LEFT_TO_RIGHT : 1,
      RIGHT_TO_LEFT : 2,
      SAME_NODE     : 3
    };

    var ToolbarDirection = {
      TOP   : 1,
      RIGHT : 2
    };

    // TODO: remove, get from Compiler DefaultBlockTypeSet
    var RootTags = [
      Type.TEXT.tag,
      Type.HEADING.tag,
      Type.SUBHEADING.tag,
      Type.QUOTE.tag,
      Type.LIST.tag,
      Type.ORDERED_LIST.tag
    ];

    __exports__.Keycodes = Keycodes;
    __exports__.RegEx = RegEx;
    __exports__.SelectionDirection = SelectionDirection;
    __exports__.ToolbarDirection = ToolbarDirection;
    __exports__.RootTags = RootTags;
  });
define("content-kit-utils/array-utils",
  ["exports"],
  function(__exports__) {
    "use strict";
    /**
     * Converts an array-like object (i.e. NodeList) to Array
     * Note: could just use Array.prototype.slice but does not work in IE <= 8
     */
    function toArray(obj) {
      var array = [];
      var i = obj && obj.length >>> 0; // cast to Uint32
      while (i--) {
        array[i] = obj[i];
      }
      return array;
    }

    /**
     * Computes the sum of values in a (sparse) array
     */
    function sumSparseArray(array) {
      var sum = 0, i;
      for (i in array) { // 'for in' is better for sparse arrays
        if (array.hasOwnProperty(i)) {
          sum += array[i];
        }
      }
      return sum;
    }

    __exports__.toArray = toArray;
    __exports__.sumSparseArray = sumSparseArray;
  });
define("content-kit-utils/node-utils",
  ["./string-utils","./array-utils","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var sanitizeWhitespace = __dependency1__.sanitizeWhitespace;
    var toArray = __dependency2__.toArray;

    /**
     * A document instance separate from the page's document. (if browser supports it)
     * Prevents images, scripts, and styles from executing while parsing nodes.
     */
    var standaloneDocument = (function() {
      var implementation = document.implementation;
      var createHTMLDocument = implementation.createHTMLDocument;

      if (createHTMLDocument) {
        return createHTMLDocument.call(implementation, '');
      }
      return document;
    })();

    /**
     * document.createElement with our lean, standalone document
     */
    function createElement(type) {
      return standaloneDocument.createElement(type);
    }

    /**
     * A reusable DOM Node for parsing html content.
     */
    var DOMParsingNode = createElement('div');

    /**
     * Returns plain-text of a `Node`
     */
    function textOfNode(node) {
      var text = node.textContent || node.innerText;
      return text ? sanitizeWhitespace(text) : '';
    }

    /**
     * Replaces a `Node` with its children
     */
    function unwrapNode(node) {
      var children = toArray(node.childNodes);
      var len = children.length;
      var parent = node.parentNode, i;
      for (i = 0; i < len; i++) {
        parent.insertBefore(children[i], node);
      }
    }

    /**
     * Extracts attributes of a `Node` to a hash of key/value pairs
     */
    function attributesForNode(node, blacklist) {
      var attrs = node.attributes;
      var len = attrs && attrs.length;
      var i, attr, name, hash;
      
      for (i = 0; i < len; i++) {
        attr = attrs[i];
        name = attr.name;
        if (attr.specified && attr.value) {
          if (blacklist && (name in blacklist)) { continue; }
          hash = hash || {};
          hash[name] = attr.value;
        }
      }
      return hash;
    }

    __exports__.createElement = createElement;
    __exports__.DOMParsingNode = DOMParsingNode;
    __exports__.textOfNode = textOfNode;
    __exports__.unwrapNode = unwrapNode;
    __exports__.attributesForNode = attributesForNode;
  });
define("content-kit-utils/object-utils",
  ["exports"],
  function(__exports__) {
    "use strict";
    /**
     * Merges defaults/options into an Object
     * Useful for constructors
     */
    function mergeWithOptions(original, updates, options) {
      options = options || {};
      for(var prop in updates) {
        if (options.hasOwnProperty(prop)) {
          original[prop] = options[prop];
        } else if (updates.hasOwnProperty(prop)) {
          original[prop] = updates[prop];
        }
      }
      return original;
    }

    /**
     * Merges properties of one object into another
     */
    function merge(original, updates) {
      return mergeWithOptions(original, updates);
    }

    /**
     * Prototype inheritance helper
     */
    function inherit(Subclass, Superclass) {
      if (typeof Object.create === 'function') {
        Subclass._super = Superclass;
        Subclass.prototype = Object.create(Superclass.prototype, {
          constructor: {
            value: Subclass,
            enumerable: false,
            writable: true,
            configurable: true
          }
        });
      } else {
        for (var key in Superclass) {
          if (Superclass.hasOwnProperty(key)) {
            Subclass[key] = Superclass[key];
          }
        }
        Subclass.prototype = new Superclass();
        Subclass.constructor = Subclass;
      }
    }

    __exports__.mergeWithOptions = mergeWithOptions;
    __exports__.merge = merge;
    __exports__.inherit = inherit;
  });
define("content-kit-utils/string-utils",
  ["exports"],
  function(__exports__) {
    "use strict";
    var RegExpTrim        = /^\s+|\s+$/g;
    var RegExpTrimLeft    = /^\s+/;
    var RegExpWSChars     = /(\r\n|\n|\r|\t|\u00A0)/gm;
    var RegExpMultiWS     = /\s+/g;
    var RegExpNonAlphaNum = /[^a-zA-Z\d]/g;

    /**
     * String.prototype.trim polyfill
     * Removes whitespace at beginning and end of string
     */
    function trim(string) {
      return string ? (string + '').replace(RegExpTrim, '') : '';
    }

    /**
     * String.prototype.trimLeft polyfill
     * Removes whitespace at beginning of string
     */
    function trimLeft(string) {
      return string ? (string + '').replace(RegExpTrimLeft, '') : '';
    }

    /**
     * Replaces non-alphanumeric chars with underscores
     */
    function underscore(string) {
      return string ? trim(string + '').replace(RegExpNonAlphaNum, '_') : '';
    }

    /**
     * Cleans line breaks, tabs, non-breaking spaces, then multiple occuring whitespaces.
     */
    function sanitizeWhitespace(string) {
      return string ? (string + '').replace(RegExpWSChars, '').replace(RegExpMultiWS, ' ') : '';
    }

    /**
     * Injects a string into another string at the index specified
     */
    function injectIntoString(string, injection, index) {
      return string.substr(0, index) + injection + string.substr(index);
    }

    __exports__.trim = trim;
    __exports__.trimLeft = trimLeft;
    __exports__.underscore = underscore;
    __exports__.sanitizeWhitespace = sanitizeWhitespace;
    __exports__.injectIntoString = injectIntoString;
  });
define("ext/content-kit-services",
  ["exports"],
  function(__exports__) {
    "use strict";

    function createXHR(options) {
      var xhr = new XMLHttpRequest();
      xhr.open(options.method, options.url);
      xhr.onload = function () {
        var response = xhr.responseText;
        if (xhr.status === 200) {
          return options.success.call(this, response);
        }
        options.error.call(this, response);
      };
      xhr.onerror = function (error) {
        options.error.call(this, error);
      };
      return xhr;
    }

    function xhrGet(options) {
      options.method = 'GET';
      var xhr = createXHR(options);
      try {
        xhr.send();
      } catch(error) {}
    }

    function xhrPost(options) {
      options.method = 'POST';
      var xhr = createXHR(options);
      var formData = new FormData();
      formData.append('file', options.data);
      try {
        xhr.send(formData);
      } catch(error) {}
    }

    function responseJSON(jsonString) {
      if (!jsonString) { return null; }
      try {
        return JSON.parse(jsonString);
      } catch(e) {
        return jsonString;
      }
    }

    // --------------------------------------------

    function FileUploader(options) {
      options = options || {};
      var url = options.url;
      var maxFileSize = options.maxFileSize;
      if (url) {
        this.url = url;
      } else {
        throw new Error('FileUploader: setting the `url` to an upload service is required');
      }
      if (maxFileSize) {
        this.maxFileSize = maxFileSize;
      }
    }

    FileUploader.prototype.upload = function(options) {
      if (!options) { return; }

      var fileInput = options.fileInput;
      var file = options.file || (fileInput && fileInput.files && fileInput.files[0]);
      var callback = options.complete;
      var maxFileSize = this.maxFileSize;
      if (!file || !(file instanceof window.File)) { return; }

      if (maxFileSize && file.size > maxFileSize) {
        if (callback) { callback.call(this, null, { message: 'max file size is ' + maxFileSize + ' bytes' }); }
        return;
      }

      xhrPost({
        url: this.url,
        data: file,
        success: function(response) {
          if (callback) { callback.call(this, responseJSON(response)); }
        },
        error: function(error) {
          if (callback) { callback.call(this, null, responseJSON(error)); }
        }
      });
    };

    function OEmbedder(options) {
      options = options || {};
      var url = options.url;
      if (url) {
        this.url = url;
      } else {
        throw new Error('OEmbedder: setting the `url` to an embed service is required');
      }
    }

    OEmbedder.prototype.fetch = function(options) {
      var callback = options.complete;
      xhrGet({
        url: this.url + "?url=" + encodeURI(options.url),
        success: function(response) {
          if (callback) { callback.call(this, responseJSON(response)); }
        },
        error: function(error) {
          if (callback) { callback.call(this, null, responseJSON(error)); }
        }
      });
    };

    __exports__.FileUploader = FileUploader;
    __exports__.OEmbedder = OEmbedder;
  });
define("ext/loader",
  [],
  function() {
    "use strict";
    var define, requireModule, require, requirejs;

    (function() {

      var _isArray;
      if (!Array.isArray) {
        _isArray = function (x) {
          return Object.prototype.toString.call(x) === "[object Array]";
        };
      } else {
        _isArray = Array.isArray;
      }

      var registry = {}, seen = {};
      var FAILED = false;

      var uuid = 0;

      function tryFinally(tryable, finalizer) {
        try {
          return tryable();
        } finally {
          finalizer();
        }
      }


      function Module(name, deps, callback, exports) {
        var defaultDeps = ['require', 'exports', 'module'];

        this.id       = uuid++;
        this.name     = name;
        this.deps     = !deps.length && callback.length ? defaultDeps : deps;
        this.exports  = exports || { };
        this.callback = callback;
        this.state    = undefined;
      }

      define = function(name, deps, callback) {
        if (!_isArray(deps)) {
          callback = deps;
          deps     =  [];
        }

        registry[name] = new Module(name, deps, callback);
      };

      define.amd = {};

      function reify(mod, name, seen) {
        var deps = mod.deps;
        var length = deps.length;
        var reified = new Array(length);
        var dep;
        // TODO: new Module
        // TODO: seen refactor
        var module = { };

        for (var i = 0, l = length; i < l; i++) {
          dep = deps[i];
          if (dep === 'exports') {
            module.exports = reified[i] = seen;
          } else if (dep === 'require') {
            reified[i] = require;
          } else if (dep === 'module') {
            mod.exports = seen;
            module = reified[i] = mod;
          } else {
            reified[i] = require(resolve(dep, name));
          }
        }

        return {
          deps: reified,
          module: module
        };
      }

      requirejs = require = requireModule = function(name) {
        var mod = registry[name];
        if (!mod) {
          throw new Error('Could not find module ' + name);
        }

        if (mod.state !== FAILED &&
            seen.hasOwnProperty(name)) {
          return seen[name];
        }

        var reified;
        var module;
        var loaded = false;

        seen[name] = { }; // placeholder for run-time cycles

        tryFinally(function() {
          reified = reify(mod, name, seen[name]);
          module = mod.callback.apply(this, reified.deps);
          loaded = true;
        }, function() {
          if (!loaded) {
            mod.state = FAILED;
          }
        });

        if (module === undefined && reified.module.exports) {
          return (seen[name] = reified.module.exports);
        } else {
          return (seen[name] = module);
        }
      };

      function resolve(child, name) {
        if (child.charAt(0) !== '.') { return child; }

        var parts = child.split('/');
        var nameParts = name.split('/');
        var parentBase = nameParts.slice(0, -1);

        for (var i = 0, l = parts.length; i < l; i++) {
          var part = parts[i];

          if (part === '..') { parentBase.pop(); }
          else if (part === '.') { continue; }
          else { parentBase.push(part); }
        }

        return parentBase.join('/');
      }

      requirejs.entries = requirejs._eak_seen = registry;
      requirejs.clear = function(){
        requirejs.entries = requirejs._eak_seen = registry = {};
        seen = state = {};
      };
    })();
  });
define("content-kit-compiler/models/block",
  ["./model","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Model = __dependency1__["default"];

    /**
     * Ensures block markups at the same index are always in a specific order.
     * For example, so all bold links are consistently marked up 
     * as <a><b>text</b></a> instead of <b><a>text</a></b>
     */
    function sortBlockMarkups(markups) {
      return markups.sort(function(a, b) {
        if (a.start === b.start && a.end === b.end) {
          return b.type - a.type;
        }
        return 0;
      });
    }

    /**
     * @class BlockModel
     * @constructor
     * @extends Model
     */
    function BlockModel(options) {
      options = options || {};
      Model.call(this, options);
      this.value = options.value || '';
      this.markup = sortBlockMarkups(options.markup || []);
    }

    __exports__["default"] = BlockModel;
  });
define("content-kit-compiler/models/embed",
  ["../models/model","../types/type","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Model = __dependency1__["default"];
    var Type = __dependency2__["default"];

    /**
     * @class EmbedModel
     * @constructor
     * @extends Model
     * Massages data from an oEmbed response into an EmbedModel
     */
    function EmbedModel(options) {
      if (!options) { return null; }

      Model.call(this, {
        type: Type.EMBED.id,
        type_name: Type.EMBED.name,
        attributes: {}
      });

      var attributes = this.attributes;
      var embedType = options.type;
      var providerName = options.provider_name;
      var embedUrl = options.url;
      var embedTitle = options.title;
      var embedThumbnail = options.thumbnail_url;
      var embedHtml = options.html;

      if (embedType)    { attributes.embed_type = embedType; }
      if (providerName) { attributes.provider_name = providerName; }
      if (embedUrl)     { attributes.url = embedUrl; }
      if (embedTitle)   { attributes.title = embedTitle; }

      if (embedType === 'photo') {
        attributes.thumbnail = options.media_url || embedUrl;
      } else if (embedThumbnail) {
        attributes.thumbnail = embedThumbnail;
      }

      if (embedHtml && embedType === 'rich') {
        attributes.html = embedHtml;
      }
    }

    __exports__["default"] = EmbedModel;
  });
define("content-kit-compiler/models/image",
  ["./block","../types/type","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var BlockModel = __dependency1__["default"];
    var Type = __dependency2__["default"];

    /**
     * @class ImageModel
     * @constructor
     * @extends BlockModel
     * A simple BlockModel subclass representing an image
     */
    function ImageModel(options) {
      options = options || {};
      options.type = Type.IMAGE.id;
      options.type_name = Type.IMAGE.name;
      if (options.src) {
        options.attributes = { src: options.src };
      }
      BlockModel.call(this, options);
    }

    __exports__["default"] = ImageModel;
  });
define("content-kit-compiler/models/markup",
  ["./model","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Model = __dependency1__["default"];

    /**
     * @class MarkupModel
     * @constructor
     * @extends Model
     */
    function MarkupModel(options) {
      options = options || {};
      Model.call(this, options);
      this.start = options.start || 0;
      this.end = options.end || 0;
    }

    __exports__["default"] = MarkupModel;
  });
define("content-kit-compiler/models/model",
  ["exports"],
  function(__exports__) {
    "use strict";
    /**
     * @class Model
     * @constructor
     * @private
     */
    function Model(options) {
      options = options || {};
      var type_name = options.type_name;
      var attributes = options.attributes;

      this.type = options.type || null;
      if (type_name) {
        this.type_name = type_name;
      }
      if (attributes) {
        this.attributes = attributes;
      }
    }

    __exports__["default"] = Model;
  });
define("content-kit-compiler/models/text",
  ["./block","../types/type","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var BlockModel = __dependency1__["default"];
    var Type = __dependency2__["default"];

    /**
     * @class TextModel
     * @constructor
     * @extends BlockModel
     * A simple BlockModel subclass representing a paragraph of text
     */
    function TextModel(options) {
      options = options || {};
      options.type = Type.TEXT.id;
      options.type_name = Type.TEXT.name;
      BlockModel.call(this, options);
    }

    __exports__["default"] = TextModel;
  });
define("content-kit-compiler/parsers/html-parser",
  ["../models/block","../models/markup","../types/default-types","../../content-kit-utils/object-utils","../../content-kit-utils/array-utils","../../content-kit-utils/string-utils","../../content-kit-utils/node-utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __exports__) {
    "use strict";
    var BlockModel = __dependency1__["default"];
    var MarkupModel = __dependency2__["default"];
    var DefaultBlockTypeSet = __dependency3__.DefaultBlockTypeSet;
    var DefaultMarkupTypeSet = __dependency3__.DefaultMarkupTypeSet;
    var mergeWithOptions = __dependency4__.mergeWithOptions;
    var toArray = __dependency5__.toArray;
    var trim = __dependency6__.trim;
    var trimLeft = __dependency6__.trimLeft;
    var sanitizeWhitespace = __dependency6__.sanitizeWhitespace;
    var createElement = __dependency7__.createElement;
    var DOMParsingNode = __dependency7__.DOMParsingNode;
    var textOfNode = __dependency7__.textOfNode;
    var unwrapNode = __dependency7__.unwrapNode;
    var attributesForNode = __dependency7__.attributesForNode;

    /**
     * Gets the last block in the set or creates and return a default block if none exist yet.
     */
    function getLastBlockOrCreate(parser, blocks) {
      var block;
      if (blocks.length) {
        block = blocks[blocks.length - 1];
      } else {
        block = parser.parseBlock(createElement(DefaultBlockTypeSet.TEXT.tag));
        blocks.push(block);
      }
      return block;
    }

    /**
     * Helper to retain stray elements at the root of the html that aren't blocks
     */
    function handleNonBlockElementAtRoot(parser, elementNode, blocks) {
      var block = getLastBlockOrCreate(parser, blocks),
          markup = parser.parseElementMarkup(elementNode, block.value.length);
      if (markup) {
        block.markup.push(markup);
      }
      block.value += textOfNode(elementNode);
    }

    /**
     * @class HTMLParser
     * @constructor
     */
    function HTMLParser(options) {
      var defaults = {
        blockTypes       : DefaultBlockTypeSet,
        markupTypes      : DefaultMarkupTypeSet,
        includeTypeNames : false
      };
      mergeWithOptions(this, defaults, options);
    }

    /**
     * @method parse
     * @param html String of HTML content
     * @return Array Parsed JSON content array
     */
    HTMLParser.prototype.parse = function(html) {
      DOMParsingNode.innerHTML = sanitizeWhitespace(html);

      var children = toArray(DOMParsingNode.childNodes),
          len = children.length,
          blocks = [],
          i, currentNode, block, text;

      for (i = 0; i < len; i++) {
        currentNode = children[i];
        // All top level nodes *should be* `Element` nodes and supported block types.
        // We'll handle some cases if it isn't so we don't lose any content when parsing.
        // Parser assumes sane input (such as from the ContentKit Editor) and is not intended to be a full html sanitizer.
        if (currentNode.nodeType === 1) {
          block = this.parseBlock(currentNode);
          if (block) {
            blocks.push(block);
          } else {
            handleNonBlockElementAtRoot(this, currentNode, blocks);
          }
        } else if (currentNode.nodeType === 3) {
          text = currentNode.nodeValue;
          if (trim(text)) {
            block = getLastBlockOrCreate(this, blocks);
            block.value += text;
          }
        }
      }

      return blocks;
    };

    /**
     * @method parseBlock
     * @param node DOM node to parse
     * @return {BlockModel} parsed block model
     * Parses a single block type node into a model
     */
    HTMLParser.prototype.parseBlock = function(node) {
      var type = this.blockTypes.findByNode(node);
      if (type) {
        return new BlockModel({
          type       : type.id,
          type_name  : this.includeTypeNames && type.name,
          value      : trim(textOfNode(node)),
          attributes : attributesForNode(node),
          markup     : this.parseBlockMarkup(node)
        });
      }
    };

    /**
     * @method parseBlockMarkup
     * @param node DOM node to parse
     * @return {Array} parsed markups
     * Parses a single block type node's markup
     */
    HTMLParser.prototype.parseBlockMarkup = function(node) {
      var processedText = '',
          markups = [],
          index = 0,
          currentNode, markup;

      // Clone the node since it will be recursively torn down
      node = node.cloneNode(true);

      while (node.hasChildNodes()) {
        currentNode = node.firstChild;
        if (currentNode.nodeType === 1) {
          markup = this.parseElementMarkup(currentNode, processedText.length);
          if (markup) {
            markups.push(markup);
          }
          // unwrap the element so we can process any children
          if (currentNode.hasChildNodes()) {
            unwrapNode(currentNode);
          }
        } else if (currentNode.nodeType === 3) {
          var text = sanitizeWhitespace(currentNode.nodeValue);
          if (index === 0) { text = trimLeft(text); }
          if (text) { processedText += text; }
        }

        // node has been processed, remove it
        currentNode.parentNode.removeChild(currentNode);
        index++;
      }

      return markups;
    };

    /**
     * @method parseElementMarkup
     * @param node DOM node to parse
     * @param startIndex DOM node to parse
     * @return {MarkupModel} parsed markup model
     * Parses markup of a single html element node
     */
    HTMLParser.prototype.parseElementMarkup = function(node, startIndex) {
      var type = this.markupTypes.findByNode(node),
          selfClosing, endIndex;

      if (type) {
        selfClosing = type.selfClosing;
        if (!selfClosing && !node.hasChildNodes()) { return; } // check for empty nodes

        endIndex = startIndex + (selfClosing ? 0 : textOfNode(node).length);
        if (endIndex > startIndex || (selfClosing && endIndex === startIndex)) { // check for empty nodes
          return new MarkupModel({
            type       : type.id,
            type_name  : this.includeTypeNames && type.name,
            start      : startIndex,
            end        : endIndex,
            attributes : attributesForNode(node, { style: 1 }) // filter out inline styles
          });
        }
      }
    };

    __exports__["default"] = HTMLParser;
  });
define("content-kit-compiler/renderers/html-element-renderer",
  ["../../content-kit-utils/string-utils","../../content-kit-utils/array-utils","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var injectIntoString = __dependency1__.injectIntoString;
    var sumSparseArray = __dependency2__.sumSparseArray;

    /**
     * Builds an opening html tag. i.e. '<a href="http://link.com/" rel="author">'
     */
    function createOpeningTag(tagName, attributes, selfClosing /*,blacklist*/) {
      var tag = '<' + tagName;
      for (var attr in attributes) {
        if (attributes.hasOwnProperty(attr)) {
          //if (blacklist && attr in blacklist) { continue; }
          tag += ' ' + attr + '="' + attributes[attr] + '"';
        }
      }
      if (selfClosing) { tag += '/'; }
      tag += '>';
      return tag;
    }

    /**
     * Builds a closing html tag. i.e. '</p>'
     */
    function createCloseTag(tagName) {
      return '</' + tagName + '>';
    }

    /**
     * @class HTMLElementRenderer
     * @constructor
     */
    function HTMLElementRenderer(options) {
      options = options || {};
      this.type = options.type;
      this.markupTypes = options.markupTypes;
    }

    /**
     * @method render
     * @param model a block model
     * @return String html
     * Renders a block model into a HTML string.
     */
    HTMLElementRenderer.prototype.render = function(model) {
      var html = '';
      var type = this.type;
      var tagName = type.tag;
      var selfClosing = type.selfClosing;

      if (tagName) {
        html += createOpeningTag(tagName, model.attributes, selfClosing);
      }
      if (!selfClosing) {
        html += this.renderMarkup(model.value, model.markup);
        if (tagName) {
          html += createCloseTag(tagName);
        }
      }
      return html;
    };

    /**
     * @method renderMarkup
     * @param text plain text to apply markup to
     * @param markup an array of markup models
     * @return String html
     * Renders a markup model into a HTML string.
     */
    HTMLElementRenderer.prototype.renderMarkup = function(text, markups) {
      var parsedTagsIndexes = [],
          len = markups && markups.length, i;

      for (i = 0; i < len; i++) {
        var markup = markups[i],
            markupMeta = this.markupTypes.findById(markup.type),
            tagName = markupMeta.tag,
            selfClosing = markupMeta.selfClosing,
            start = markup.start,
            end = markup.end,
            openTag = createOpeningTag(tagName, markup.attributes, selfClosing),
            parsedTagLengthAtIndex = parsedTagsIndexes[start] || 0,
            parsedTagLengthBeforeIndex = sumSparseArray(parsedTagsIndexes.slice(0, start + 1));

        text = injectIntoString(text, openTag, start + parsedTagLengthBeforeIndex);
        parsedTagsIndexes[start] = parsedTagLengthAtIndex + openTag.length;

        if (!selfClosing) {
          var closeTag = createCloseTag(tagName);
          parsedTagLengthAtIndex = parsedTagsIndexes[end] || 0;
          parsedTagLengthBeforeIndex = sumSparseArray(parsedTagsIndexes.slice(0, end));
          text = injectIntoString(text, closeTag, end + parsedTagLengthBeforeIndex);
          parsedTagsIndexes[end]  = parsedTagLengthAtIndex + closeTag.length;
        }
      }

      return text;
    };

    __exports__["default"] = HTMLElementRenderer;
  });
define("content-kit-compiler/renderers/html-embed-renderer",
  ["./embeds/youtube","./embeds/twitter","./embeds/instagram","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var YouTubeRenderer = __dependency1__["default"];
    var TwitterRenderer = __dependency2__["default"];
    var InstagramRenderer = __dependency3__["default"];

    /**
     * A dictionary of supported embed services
     */
    var services = {
      YOUTUBE : {
        id: 1,
        renderer: new YouTubeRenderer()
      },
      TWITTER : {
        id: 2,
        renderer: new TwitterRenderer()
      },
      INSTAGRAM : {
        id: 3,
        renderer: new InstagramRenderer()
      }
    };

    /**
     * @class EmbedRenderer
     * @constructor
     */
    function EmbedRenderer() {}

    /**
     * @method render
     * @param model
     * @return String html
     */
    EmbedRenderer.prototype.render = function(model) {
      var renderer = this.rendererFor(model);
      if (renderer) {
        return renderer.render(model);
      }
      var attrs = model.attributes;
      return attrs && attrs.html || '';
    };

    /**
     * @method rendererFor
     * @param model
     * @return service renderer
     */
    EmbedRenderer.prototype.rendererFor = function(model) {
      var provider = model.attributes.provider_name;
      var providerKey = provider && provider.toUpperCase();
      var service = services[providerKey];
      return service && service.renderer;
    };

    __exports__["default"] = EmbedRenderer;
  });
define("content-kit-compiler/renderers/html-renderer",
  ["../types/type","./html-element-renderer","./html-embed-renderer","../types/default-types","../../content-kit-utils/object-utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    var Type = __dependency1__["default"];
    var HTMLElementRenderer = __dependency2__["default"];
    var HTMLEmbedRenderer = __dependency3__["default"];
    var DefaultBlockTypeSet = __dependency4__.DefaultBlockTypeSet;
    var DefaultMarkupTypeSet = __dependency4__.DefaultMarkupTypeSet;
    var mergeWithOptions = __dependency5__.mergeWithOptions;

    /**
     * @class HTMLRenderer
     * @constructor
     */
    function HTMLRenderer(options) {
      var defaults = {
        blockTypes    : DefaultBlockTypeSet,
        markupTypes   : DefaultMarkupTypeSet,
        typeRenderers : {}
      };
      mergeWithOptions(this, defaults, options);
    }

    /**
     * @method willRenderType
     * @param type {Number|Type}
     * @param renderer the rendering function that returns a string of html
     * Registers custom rendering hooks for a type
     */
    HTMLRenderer.prototype.willRenderType = function(type, renderer) {
      if ('number' !== typeof type) {
        type = type.id;
      }
      this.typeRenderers[type] = renderer;
    };

    /**
     * @method rendererFor
     * @param model
     * @returns renderer
     * Returns an instance of a renderer for supplied model
     */
    HTMLRenderer.prototype.rendererFor = function(model) {
      var type = this.blockTypes.findById(model.type);
      if (type === Type.EMBED) {
        return new HTMLEmbedRenderer();
      }
      return new HTMLElementRenderer({ type: type, markupTypes: this.markupTypes });
    };

    /**
     * @method render
     * @param model
     * @return String html
     */
    HTMLRenderer.prototype.render = function(model) {
      var html = '';
      var len = model && model.length;
      var i, item, renderer, renderHook, itemHtml;

      for (i = 0; i < len; i++) {
        item = model[i];
        renderer = this.rendererFor(item);
        renderHook = this.typeRenderers[item.type];
        itemHtml = renderHook ? renderHook.call(renderer, item) : renderer.render(item);
        if (itemHtml) { html += itemHtml; }
      }
      return html;
    };

    __exports__["default"] = HTMLRenderer;
  });
define("content-kit-compiler/types/default-types",
  ["./type-set","./type","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var TypeSet = __dependency1__["default"];
    var Type = __dependency2__["default"];

    /**
     * Default supported block types
     */
    var DefaultBlockTypeSet = new TypeSet([
      new Type({ tag: 'p', name: 'text' }),
      new Type({ tag: 'h2', name: 'heading' }),
      new Type({ tag: 'h3', name: 'subheading' }),
      new Type({ tag: 'img', name: 'image' }),
      new Type({ tag: 'blockquote', name: 'quote' }),
      new Type({ tag: 'ul', name: 'list' }),
      new Type({ tag: 'ol', name: 'ordered list' }),
      new Type({ name: 'embed' })
    ]);

    /**
     * Default supported markup types
     */
    var DefaultMarkupTypeSet = new TypeSet([
      new Type({ tag: 'b', name: 'bold' }),
      new Type({ tag: 'i', name: 'italic' }),
      new Type({ tag: 'u', name: 'underline' }),
      new Type({ tag: 'a', name: 'link' }),
      new Type({ tag: 'br', name: 'break' }),
      new Type({ tag: 'li', name: 'list item' }),
      new Type({ tag: 'sub', name: 'subscript' }),
      new Type({ tag: 'sup', name: 'superscript' })
    ]);

    __exports__.DefaultBlockTypeSet = DefaultBlockTypeSet;
    __exports__.DefaultMarkupTypeSet = DefaultMarkupTypeSet;
  });
define("content-kit-compiler/types/type-set",
  ["./type","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Type = __dependency1__["default"];

    /**
     * @class TypeSet
     * @private
     * @constructor
     * A Set of Types
     */
    function TypeSet(types) {
      var len = types && types.length, i;

      this._autoId    = 1;  // Auto-increment id counter
      this.idLookup   = {}; // Hash cache for finding by id
      this.tagLookup  = {}; // Hash cache for finding by tag

      for (i = 0; i < len; i++) {
        this.addType(types[i]);
      }
    }

    TypeSet.prototype = {
      /**
       * Adds a type to the set
       */
      addType: function(type) {
        if (type instanceof Type) {
          this[type.name] = type;
          if (type.id === undefined) {
            type.id = this._autoId++;
          }
          this.idLookup[type.id] = type;
          if (type.tag) {
            this.tagLookup[type.tag] = type;
          }
          return type;
        }
      },

      /**
       * Returns type info for a given Node
       */
      findByNode: function(node) {
        if (node) {
          return this.findByTag(node.tagName);
        }
      },
      /**
       * Returns type info for a given tag
       */
      findByTag: function(tag) {
        if (tag) {
          return this.tagLookup[tag.toLowerCase()];
        }
      },
      /**
       * Returns type info for a given id
       */
      findById: function(id) {
        return this.idLookup[id];
      }
    };

    __exports__["default"] = TypeSet;
  });
define("content-kit-compiler/types/type",
  ["../../content-kit-utils/string-utils","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var underscore = __dependency1__.underscore;

    /**
     * @class Type
     * @constructor
     * Contains meta info about a node type (id, name, tag, etc).
     */
    function Type(options) {
      if (options) {
        this.name = underscore(options.name || options.tag).toUpperCase();
        if (options.id !== undefined) {
          this.id = options.id;
        }
        if (options.tag) {
          this.tag = options.tag.toLowerCase();
          this.selfClosing = /^(br|img|hr|meta|link|embed)$/i.test(this.tag);
        }

        // Register the type as constant
        Type[this.name] = this;
      }
    }

    __exports__["default"] = Type;
  });
define("content-kit-editor/commands/base",
  ["exports"],
  function(__exports__) {
    "use strict";
    function Command(options) {
      var command = this;
      var name = options.name;
      var prompt = options.prompt;
      command.name = name;
      command.button = options.button || name;
      if (prompt) { command.prompt = prompt; }
    }

    Command.prototype.exec = function() {};

    __exports__["default"] = Command;
  });
define("content-kit-editor/commands/bold",
  ["./text-format","../constants","../utils/selection-utils","../../content-kit-utils/object-utils","../../content-kit-compiler/types/type","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    var TextFormatCommand = __dependency1__["default"];
    var RegEx = __dependency2__.RegEx;
    var getSelectionBlockTagName = __dependency3__.getSelectionBlockTagName;
    var inherit = __dependency4__.inherit;
    var Type = __dependency5__["default"];

    function BoldCommand() {
      TextFormatCommand.call(this, {
        name: 'bold',
        tag: Type.BOLD.tag,
        button: '<i class="ck-icon-bold"></i>'
      });
    }
    inherit(BoldCommand, TextFormatCommand);

    BoldCommand.prototype.exec = function() {
      // Don't allow executing bold command on heading tags
      if (!RegEx.HEADING_TAG.test(getSelectionBlockTagName())) {
        BoldCommand._super.prototype.exec.call(this);
      }
    };

    __exports__["default"] = BoldCommand;
  });
define("content-kit-editor/commands/format-block",
  ["./text-format","../utils/selection-utils","../../content-kit-utils/object-utils","../../content-kit-compiler/types/type","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var TextFormatCommand = __dependency1__["default"];
    var getSelectionBlockElement = __dependency2__.getSelectionBlockElement;
    var selectNode = __dependency2__.selectNode;
    var inherit = __dependency3__.inherit;
    var Type = __dependency4__["default"];

    function FormatBlockCommand(options) {
      options.action = 'formatBlock';
      TextFormatCommand.call(this, options);
    }
    inherit(FormatBlockCommand, TextFormatCommand);

    FormatBlockCommand.prototype.exec = function() {
      var tag = this.tag;
      // Brackets neccessary for certain browsers
      var value =  '<' + tag + '>';
      var blockElement = getSelectionBlockElement();
      // Allow block commands to be toggled back to a text block
      if(tag === blockElement.tagName.toLowerCase()) {
        value = Type.TEXT.tag;
      } else {
        // Flattens the selection before applying the block format.
        // Otherwise, undesirable nested blocks can occur.
        // TODO: would love to be able to remove this
        var flatNode = document.createTextNode(blockElement.textContent);
        blockElement.parentNode.insertBefore(flatNode, blockElement);
        blockElement.parentNode.removeChild(blockElement);
        selectNode(flatNode);
      }
      
      FormatBlockCommand._super.prototype.exec.call(this, value);
    };

    __exports__["default"] = FormatBlockCommand;
  });
define("content-kit-editor/commands/heading",
  ["./format-block","../../content-kit-utils/object-utils","../../content-kit-compiler/types/type","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var FormatBlockCommand = __dependency1__["default"];
    var inherit = __dependency2__.inherit;
    var Type = __dependency3__["default"];

    function HeadingCommand() {
      FormatBlockCommand.call(this, {
        name: 'heading',
        tag: Type.HEADING.tag,
        button: '<i class="ck-icon-heading"></i>1'
      });
    }
    inherit(HeadingCommand, FormatBlockCommand);

    __exports__["default"] = HeadingCommand;
  });
define("content-kit-editor/commands/image",
  ["./base","../views/message","../../content-kit-compiler/models/image","../../content-kit-utils/object-utils","../../ext/content-kit-services","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    var Command = __dependency1__["default"];
    var Message = __dependency2__["default"];
    var ImageModel = __dependency3__["default"];
    var inherit = __dependency4__.inherit;
    var FileUploader = __dependency5__.FileUploader;

    function createFileInput(command) {
      var fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.className = 'ck-file-input';
      fileInput.addEventListener('change', function(e) {
        command.handleFile(e);
      });
      return fileInput;
    }

    function insertImageWithSrc(src, editor) {
      var imageModel = new ImageModel({ src: src });
      var index = editor.getCurrentBlockIndex();
      editor.replaceBlockAt(imageModel, index);
      editor.syncVisualAt(index);
    }

    function renderFromFile(file, editor) {
      if (file && window.FileReader) {
        var reader = new FileReader();
        reader.onload = function(e) {
          var base64Src = e.target.result;
          insertImageWithSrc(base64Src, editor);
        };
        reader.readAsDataURL(file);
      }
    }

    function ImageCommand(options) {
      Command.call(this, {
        name: 'image',
        button: '<i class="ck-icon-image"></i>'
      });
      this.uploader = new FileUploader({ url: options.serviceUrl, maxFileSize: 5000000 });
    }
    inherit(ImageCommand, Command);

    ImageCommand.prototype = {
      exec: function() {
        ImageCommand._super.prototype.exec.call(this);
        var fileInput = this.fileInput;
        if (!fileInput) {
          fileInput = this.fileInput = createFileInput(this);
          document.body.appendChild(fileInput);
        }
        fileInput.dispatchEvent(new MouseEvent('click', { bubbles: false }));
      },
      handleFile: function(e) {
        var fileInput = e.target;
        var editor = this.editorContext;
        var embedIntent = this.embedIntent;

        embedIntent.showLoading();
        this.uploader.upload({
          fileInput: fileInput,
          complete: function(response, error) {
            embedIntent.hideLoading();
            if (error || !response || !response.url) {
              return new Message().show(error.message || 'Error uploading image');
            }
            insertImageWithSrc(response.url, editor);
          }
        });
        renderFromFile(fileInput.files && fileInput.files[0], editor); // render image immediately client-side
        fileInput.value = null; // reset file input
      }
    };

    __exports__["default"] = ImageCommand;
  });
define("content-kit-editor/commands/italic",
  ["./text-format","../../content-kit-utils/object-utils","../../content-kit-compiler/types/type","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var TextFormatCommand = __dependency1__["default"];
    var inherit = __dependency2__.inherit;
    var Type = __dependency3__["default"];

    function ItalicCommand() {
      TextFormatCommand.call(this, {
        name: 'italic',
        tag: Type.ITALIC.tag,
        button: '<i class="ck-icon-italic"></i>'
      });
    }
    inherit(ItalicCommand, TextFormatCommand);

    __exports__["default"] = ItalicCommand;
  });
define("content-kit-editor/commands/link",
  ["./text-format","../views/prompt","../constants","../utils/selection-utils","../../content-kit-utils/object-utils","../../content-kit-compiler/types/type","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __exports__) {
    "use strict";
    var TextFormatCommand = __dependency1__["default"];
    var Prompt = __dependency2__["default"];
    var RegEx = __dependency3__.RegEx;
    var getSelectionTagName = __dependency4__.getSelectionTagName;
    var inherit = __dependency5__.inherit;
    var Type = __dependency6__["default"];

    function LinkCommand() {
      TextFormatCommand.call(this, {
        name: 'link',
        tag: Type.LINK.tag,
        action: 'createLink',
        removeAction: 'unlink',
        button: '<i class="ck-icon-link"></i>',
        prompt: new Prompt({
          command: this,
          placeholder: 'Enter a url, press return...'
        })
      });
    }
    inherit(LinkCommand, TextFormatCommand);

    LinkCommand.prototype.exec = function(url) {
      if(this.tag === getSelectionTagName()) {
        this.unexec();
      } else {
        if (!RegEx.HTTP_PROTOCOL.test(url)) {
          url = 'http://' + url;
        }
        LinkCommand._super.prototype.exec.call(this, url);
      }
    };

    __exports__["default"] = LinkCommand;
  });
define("content-kit-editor/commands/list",
  ["./text-format","../utils/selection-utils","../../content-kit-utils/object-utils","../../content-kit-compiler/types/type","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var TextFormatCommand = __dependency1__["default"];
    var getSelectionBlockElement = __dependency2__.getSelectionBlockElement;
    var selectNode = __dependency2__.selectNode;
    var getSelectionTagName = __dependency2__.getSelectionTagName;
    var inherit = __dependency3__.inherit;
    var Type = __dependency4__["default"];

    function ListCommand(options) {
      TextFormatCommand.call(this, options);
    }
    inherit(ListCommand, TextFormatCommand);

    ListCommand.prototype.exec = function() {
      ListCommand._super.prototype.exec.call(this);
      
      // After creation, lists need to be unwrapped
      // TODO: eventually can remove this when direct model manipulation is ready
      var listElement = getSelectionBlockElement();
      var wrapperNode = listElement.parentNode;
      if (wrapperNode.firstChild === listElement) {
        var editorNode = wrapperNode.parentNode;
        editorNode.insertBefore(listElement, wrapperNode);
        editorNode.removeChild(wrapperNode);
        selectNode(listElement);
      }
    };

    ListCommand.prototype.checkAutoFormat = function(node) {
      // Creates unordered lists when node starts with '- '
      // or ordered list if node starts with '1. '
      var regex = this.autoFormatRegex, text;
      if (node && regex) {
        text = node.textContent;
        if (Type.LIST_ITEM.tag !== getSelectionTagName() && regex.test(text)) {
          this.exec();
          window.getSelection().anchorNode.textContent = text.replace(regex, '');
          return true;
        }
      }
      return false;
    };

    __exports__["default"] = ListCommand;
  });
define("content-kit-editor/commands/oembed",
  ["./base","../views/prompt","../views/message","../../content-kit-compiler/models/embed","../../content-kit-utils/object-utils","../../ext/content-kit-services","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __exports__) {
    "use strict";
    var Command = __dependency1__["default"];
    var Prompt = __dependency2__["default"];
    var Message = __dependency3__["default"];
    var EmbedModel = __dependency4__["default"];
    var inherit = __dependency5__.inherit;
    var OEmbedder = __dependency6__.OEmbedder;

    function loadTwitterWidgets(element) {
      if (window.twttr) {
        window.twttr.widgets.load(element);
      } else {
        var script = document.createElement('script');
        script.async = true;
        script.src = 'http://platform.twitter.com/widgets.js';
        document.head.appendChild(script);
      }
    }

    function OEmbedCommand(options) {
      Command.call(this, {
        name: 'embed',
        button: '<i class="ck-icon-embed"></i>',
        prompt: new Prompt({
          command: this,
          placeholder: 'Paste a YouTube or Twitter url...'
        })
      });

      this.embedService = new OEmbedder({ url: options.serviceUrl });
    }
    inherit(OEmbedCommand, Command);

    OEmbedCommand.prototype.exec = function(url) {
      var command = this;
      var editorContext = command.editorContext;
      var embedIntent = command.embedIntent;
      var index = editorContext.getCurrentBlockIndex();
      
      embedIntent.showLoading();
      this.embedService.fetch({
        url: url,
        complete: function(response, error) {
          embedIntent.hideLoading();
          if (error) {
            var errorMsg = error;
            if (error.target && error.target.status === 0) {
              errorMsg = 'Could not connect to embed service';
            } else if (typeof error !== 'string') {
              errorMsg = 'Embed error';
            }
            new Message().show(errorMsg);
            embedIntent.show();
          } else {
            var embedModel = new EmbedModel(response);
            editorContext.insertBlockAt(embedModel, index);
            editorContext.syncVisualAt(index);
            if (embedModel.attributes.provider_name.toLowerCase() === 'twitter') {
              loadTwitterWidgets(editorContext.element);
            }
          }
        }
      });
    };

    __exports__["default"] = OEmbedCommand;
  });
define("content-kit-editor/commands/ordered-list",
  ["./list","../../content-kit-utils/object-utils","../../content-kit-compiler/types/type","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var ListCommand = __dependency1__["default"];
    var inherit = __dependency2__.inherit;
    var Type = __dependency3__["default"];

    function OrderedListCommand() {
      ListCommand.call(this, {
        name: 'ordered list',
        tag: Type.ORDERED_LIST.tag,
        action: 'insertOrderedList'
      });
    }
    inherit(OrderedListCommand, ListCommand);

    OrderedListCommand.prototype.autoFormatRegex = /^1\.\s/;

    __exports__["default"] = OrderedListCommand;
  });
define("content-kit-editor/commands/quote",
  ["./format-block","../../content-kit-utils/object-utils","../../content-kit-compiler/types/type","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var FormatBlockCommand = __dependency1__["default"];
    var inherit = __dependency2__.inherit;
    var Type = __dependency3__["default"];

    function QuoteCommand() {
      FormatBlockCommand.call(this, {
        name: 'quote',
        tag: Type.QUOTE.tag,
        button: '<i class="ck-icon-quote"></i>'
      });
    }
    inherit(QuoteCommand, FormatBlockCommand);

    __exports__["default"] = QuoteCommand;
  });
define("content-kit-editor/commands/subheading",
  ["./format-block","../../content-kit-utils/object-utils","../../content-kit-compiler/types/type","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var FormatBlockCommand = __dependency1__["default"];
    var inherit = __dependency2__.inherit;
    var Type = __dependency3__["default"];

    function SubheadingCommand() {
      FormatBlockCommand.call(this, {
        name: 'subheading',
        tag: Type.SUBHEADING.tag,
        button: '<i class="ck-icon-heading"></i>2'
      });
    }
    inherit(SubheadingCommand, FormatBlockCommand);

    __exports__["default"] = SubheadingCommand;
  });
define("content-kit-editor/commands/text-format",
  ["./base","../../content-kit-utils/object-utils","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Command = __dependency1__["default"];
    var inherit = __dependency2__.inherit;

    function TextFormatCommand(options) {
      Command.call(this, options);
      this.tag = options.tag;
      this.action = options.action || this.name;
      this.removeAction = options.removeAction || this.action;
    }
    inherit(TextFormatCommand, Command);

    TextFormatCommand.prototype = {
      exec: function(value) {
        document.execCommand(this.action, false, value || null);
      },
      unexec: function(value) {
        document.execCommand(this.removeAction, false, value || null);
      }
    };

    __exports__["default"] = TextFormatCommand;
  });
define("content-kit-editor/commands/unordered-list",
  ["./list","../../content-kit-utils/object-utils","../../content-kit-compiler/types/type","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var ListCommand = __dependency1__["default"];
    var inherit = __dependency2__.inherit;
    var Type = __dependency3__["default"];

    function UnorderedListCommand() {
      ListCommand.call(this, {
        name: 'list',
        tag: Type.LIST.tag,
        action: 'insertUnorderedList'
      });
    }
    inherit(UnorderedListCommand, ListCommand);

    UnorderedListCommand.prototype.autoFormatRegex =  /^[-*]\s/;

    __exports__["default"] = UnorderedListCommand;
  });
define("content-kit-editor/editor/editor-factory",
  ["./editor","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Editor = __dependency1__["default"];

    /**
     * @class EditorFactory
     * @private
     * `EditorFactory` is publically exposed as `Editor`
     * It takes an `element` param which can be a css selector, Node, or NodeList
     * and sets up indiviual `Editor` instances
     */
    function EditorFactory(element, options) {
      var editors = [];
      var elements, elementsLen, i;

      if (!element) {
        return new Editor(element, options);
      }

      if (typeof element === 'string') {
        elements = document.querySelectorAll(element);
      } else if (element && element.length) {
        elements = element;
      } else if (element) {
        elements = [element];
      }

      if (elements) {
        elementsLen = elements.length;
        for (i = 0; i < elementsLen; i++) {
          editors.push(new Editor(elements[i], options));
        }
      }

      return editors.length > 1 ? editors : editors[0];
    }

    EditorFactory.prototype = Editor.prototype;

    __exports__["default"] = EditorFactory;
  });
define("content-kit-editor/editor/editor-html-renderer",
  ["../constants","../../content-kit-compiler/renderers/html-renderer","../../content-kit-compiler/types/type","../../content-kit-utils/object-utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var RegEx = __dependency1__.RegEx;
    var HTMLRenderer = __dependency2__["default"];
    var Type = __dependency3__["default"];
    var inherit = __dependency4__.inherit;

    function embedRenderer(model) {
      var embedAttrs = model.attributes;
      var isVideo = embedAttrs.embed_type === 'video';
      return '<div class="ck-embed" contenteditable="false">' +
                '<figure>' +
                  (isVideo ? '<div class="ck-video-container">' : '') + this.render(model) + (isVideo ? '</div>' : '') +
                  '<figcaption>' + embedAttrs.provider_name + ': ' +
                    '<a target="_blank" href="' + embedAttrs.url + '">' + embedAttrs.title + '</a>' +
                  '</figcaption>' +
                '</figure>' +
              '</div>';
    }

    function imageRenderer(model) {
      var imagePersisted = RegEx.HTTP_PROTOCOL.test(model.attributes.src);
      return '<div class="ck-embed ck-image-embed' + (imagePersisted ? '' : ' ck-image-local') + '" contenteditable="false">' +
                '<figure>' + this.render(model) + '</figure>' +
              '</div>';
    }

    var typeRenderers = {};
    typeRenderers[Type.EMBED.id] = embedRenderer;
    typeRenderers[Type.IMAGE.id] = imageRenderer;

    /**
     * @class EditorHTMLRenderer
     * @constructor
     * Subclass of HTMLRenderer specifically for the Editor
     * Wraps interactive elements to add functionality
     */
    function EditorHTMLRenderer() {
      HTMLRenderer.call(this, {
        typeRenderers: typeRenderers
      });
    }
    inherit(EditorHTMLRenderer, HTMLRenderer);

    __exports__["default"] = EditorHTMLRenderer;
  });
define("content-kit-editor/editor/editor",
  ["./editor-html-renderer","../views/text-format-toolbar","../views/tooltip","../views/embed-intent","../commands/bold","../commands/italic","../commands/link","../commands/quote","../commands/heading","../commands/subheading","../commands/unordered-list","../commands/ordered-list","../commands/image","../commands/oembed","../commands/text-format","../constants","../utils/selection-utils","../utils/event-emitter","../utils/paste-utils","../../content-kit-compiler/compiler","../../content-kit-compiler/models/text","../../content-kit-compiler/types/type","../../content-kit-utils/array-utils","../../content-kit-utils/object-utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __dependency8__, __dependency9__, __dependency10__, __dependency11__, __dependency12__, __dependency13__, __dependency14__, __dependency15__, __dependency16__, __dependency17__, __dependency18__, __dependency19__, __dependency20__, __dependency21__, __dependency22__, __dependency23__, __dependency24__, __exports__) {
    "use strict";
    var EditorHTMLRenderer = __dependency1__["default"];
    var TextFormatToolbar = __dependency2__["default"];
    var Tooltip = __dependency3__["default"];
    var EmbedIntent = __dependency4__["default"];
    var BoldCommand = __dependency5__["default"];
    var ItalicCommand = __dependency6__["default"];
    var LinkCommand = __dependency7__["default"];
    var QuoteCommand = __dependency8__["default"];
    var HeadingCommand = __dependency9__["default"];
    var SubheadingCommand = __dependency10__["default"];
    var UnorderedListCommand = __dependency11__["default"];
    var OrderedListCommand = __dependency12__["default"];
    var ImageCommand = __dependency13__["default"];
    var OEmbedCommand = __dependency14__["default"];
    var TextFormatCommand = __dependency15__["default"];
    var RootTags = __dependency16__.RootTags;
    var Keycodes = __dependency16__.Keycodes;
    var getSelectionBlockElement = __dependency17__.getSelectionBlockElement;
    var getSelectionBlockTagName = __dependency17__.getSelectionBlockTagName;
    var EventEmitter = __dependency18__["default"];
    var cleanPastedContent = __dependency19__.cleanPastedContent;
    var Compiler = __dependency20__["default"];
    var TextModel = __dependency21__["default"];
    var Type = __dependency22__["default"];
    var toArray = __dependency23__.toArray;
    var merge = __dependency24__.merge;
    var mergeWithOptions = __dependency24__.mergeWithOptions;

    var defaults = {
      placeholder: 'Write here...',
      spellcheck: true,
      autofocus: true,
      textFormatCommands: [
        new BoldCommand(),
        new ItalicCommand(),
        new LinkCommand(),
        new QuoteCommand(),
        new HeadingCommand(),
        new SubheadingCommand()
      ],
      embedCommands: [
        new ImageCommand({  serviceUrl: '/images' }),
        new OEmbedCommand({ serviceUrl: '/embed'  })
      ],
      autoTypingCommands: [
        new UnorderedListCommand(),
        new OrderedListCommand()
      ],
      compiler: new Compiler({
        includeTypeNames: true, // outputs models with type names, i.e. 'BOLD', for easier debugging
        renderer: new EditorHTMLRenderer() // subclassed HTML renderer that adds dom structure for additional editor interactivity
      })
    };

    function bindContentEditableTypingCorrections(editor) {
      editor.element.addEventListener('keyup', function(e) {
        if(!e.shiftKey && e.which === Keycodes.ENTER) {
          var selectionTag = getSelectionBlockTagName();
          if (!selectionTag || selectionTag === Type.QUOTE.tag) {
            document.execCommand('formatBlock', false, Type.TEXT.tag);
          }
        } else if (e.which === Keycodes.BKSP) {
          if(!editor.element.innerHTML) {
            document.execCommand('formatBlock', false, Type.TEXT.tag);
          }
        }
      });
    }

    function bindPasteListener(editor) {
      editor.element.addEventListener('paste', function(e) {
        var cleanedContent = cleanPastedContent(e, Type.TEXT.tag);
        if (cleanedContent) {
          document.execCommand('insertHTML', false, cleanedContent);
          editor.syncModel();
        }
      });
    }

    function bindAutoTypingListeners(editor) {
      // Watch typing patterns for auto format commands (e.g. lists '- ', '1. ')
      editor.element.addEventListener('keyup', function(e) {
        var commands = editor.autoTypingCommands;
        var count = commands && commands.length;
        var selection, i;

        if (count) {
          selection = window.getSelection();
          for (i = 0; i < count; i++) {
            if (commands[i].checkAutoFormat(selection.anchorNode)) {
              e.stopPropagation();
              return;
            }
          }
        }
      });
    }

    function bindLiveUpdate(editor) {
      editor.element.addEventListener('input', function(e) {
        editor.syncModel();
      });

      // Experimental/buggy: parsing only the blocks where action took place
      // Not sure if this is even more efficient. Compiler is probably faster than dom/selection checks
      /*
      editor.element.addEventListener('input', function(e) {
        editor.syncModelAtSelection();
      });
      editor.element.addEventListener('keyup', function(e) {
        // When pressing enter: parse block before cursor too
        if(!e.shiftKey && e.which === Keycodes.ENTER) {
          editor.syncModelAt(editor.getCurrentBlockIndex()-1);
        }
        // When pressing backspace/del: parse block after cursor too
        else if(e.which === Keycodes.BKSP || e.which === Keycodes.DEL) {
          editor.syncModelAt(editor.getCurrentBlockIndex()+1);
        }
      });
      */
    }

    function initEmbedCommands(editor) {
      var commands = editor.embedCommands;
      if(commands) {
        return new EmbedIntent({
          editorContext: editor,
          commands: commands,
          rootElement: editor.element
        });
      }
    }

    function applyClassName(editorElement) {
      var editorClassName = 'ck-editor';
      var editorClassNameRegExp = new RegExp(editorClassName);
      var existingClassName = editorElement.className;

      if (!editorClassNameRegExp.test(existingClassName)) {
        existingClassName += (existingClassName ? ' ' : '') + editorClassName;
      }
      editorElement.className = existingClassName;
    }

    function applyPlaceholder(editorElement, placeholder) {
      var dataset = editorElement.dataset;
      if (placeholder && !dataset.placeholder) {
        dataset.placeholder = placeholder;
      }
    }

    /**
     * @class Editor
     * An individual Editor
     * @param element `Element` node
     * @param options hash of options
     */
    function Editor(element, options) {
      var editor = this;
      mergeWithOptions(editor, defaults, options);

      if (element) {
        applyClassName(element);
        applyPlaceholder(element, editor.placeholder);
        element.spellcheck = editor.spellcheck;
        element.setAttribute('contentEditable', true);
        editor.element = element;

        bindContentEditableTypingCorrections(editor);
        bindPasteListener(editor);
        bindAutoTypingListeners(editor);
        bindLiveUpdate(editor);
        initEmbedCommands(editor);

        editor.textFormatToolbar = new TextFormatToolbar({ rootElement: element, commands: editor.textFormatCommands });
        editor.linkTooltips = new Tooltip({ rootElement: element, showForTag: Type.LINK.tag });

        editor.syncModel();
        
        if(editor.autofocus) { element.focus(); }
      }
    }

    // Add event emitter pub/sub functionality
    merge(Editor.prototype, EventEmitter);

    Editor.prototype.syncModel = function() {
      this.model = this.compiler.parse(this.element.innerHTML);
      this.trigger('update');
    };

    Editor.prototype.syncModelAt = function(index) {
      if (index > -1) {
        var blockElements = toArray(this.element.children);
        var parsedBlockModel = this.compiler.parser.parseBlock(blockElements[index]);
        if (parsedBlockModel) {
          this.model[index] = parsedBlockModel;
        } else {
          this.model.splice(index, 1);
        }
        this.trigger('update', { index: index });
      }
    };

    Editor.prototype.syncModelAtSelection = function() {
      var index = this.getCurrentBlockIndex();
      this.syncModelAt(index);
    };

    Editor.prototype.syncVisual = function() {
      var html = this.compiler.render(this.model);
      this.element.innerHTML = html;
    };

    Editor.prototype.syncVisualAt = function(index) {
      if (index > -1) {
        var blockModel = this.model[index];
        var html = this.compiler.render([blockModel]);
        var blockElements = toArray(this.element.children);
        var element = blockElements[index];
        element.innerHTML = html;
      }
    };

    Editor.prototype.getCurrentBlockIndex = function() {
      var selectionEl = getSelectionBlockElement();
      var blockElements = toArray(this.element.children);
      return blockElements.indexOf(selectionEl);
    };

    Editor.prototype.insertBlock = function(model) {
      this.insertBlockAt(model, this.getCurrentBlockIndex());
    };

    Editor.prototype.insertBlockAt = function(model, index) {
      model = model || new TextModel();
      this.model.splice(index, 0, model);
    };

    Editor.prototype.replaceBlockAt = function(model, index) {
      this.model[index] = model;
    };

    Editor.prototype.addTextFormat = function(opts) {
      var command = new TextFormatCommand(opts);
      this.compiler.registerMarkupType(new Type({
        name : opts.name,
        tag  : opts.tag || opts.name
      }));
      this.textFormatCommands.push(command);
      this.textFormatToolbar.addCommand(command);
    };

    Editor.prototype.text = function() {
      getCursorIndexInSelectionBlockElement();
    }

    __exports__["default"] = Editor;
  });
define("content-kit-editor/utils/element-utils",
  ["exports"],
  function(__exports__) {
    "use strict";
    function createDiv(className) {
      var div = document.createElement('div');
      if (className) {
        div.className = className;
      }
      return div;
    }

    function hideElement(element) {
      element.style.display = 'none';
    }

    function showElement(element) {
      element.style.display = 'block';
    }

    function swapElements(elementToShow, elementToHide) {
      hideElement(elementToHide);
      showElement(elementToShow);
    }

    function getEventTargetMatchingTag(tag, target, container) {
      // Traverses up DOM from an event target to find the node matching specifed tag
      while (target && target !== container) {
        if (target.tagName.toLowerCase() === tag) {
          return target;
        }
        target = target.parentNode;
      }
    }

    function nodeIsDescendantOfElement(node, element) {
      var parentNode = node.parentNode;
      while(parentNode) {
        if (parentNode === element) {
          return true;
        }
        parentNode = parentNode.parentNode;
      }
      return false;
    }

    function getElementRelativeOffset(element) {
      var offset = { left: 0, top: -window.pageYOffset };
      var offsetParent = element.offsetParent;
      var offsetParentPosition = window.getComputedStyle(offsetParent).position;
      var offsetParentRect;

      if (offsetParentPosition === 'relative') {
        offsetParentRect = offsetParent.getBoundingClientRect();
        offset.left = offsetParentRect.left;
        offset.top  = offsetParentRect.top;
      }
      return offset;
    }

    function getElementComputedStyleNumericProp(element, prop) {
      return parseFloat(window.getComputedStyle(element)[prop]);
    }

    function positionElementToRect(element, rect, topOffset, leftOffset) {
      var relativeOffset = getElementRelativeOffset(element);
      var style = element.style;
      var round = Math.round;

      topOffset = topOffset || 0;
      leftOffset = leftOffset || 0;
      style.left = round(rect.left - relativeOffset.left - leftOffset) + 'px';
      style.top  = round(rect.top  - relativeOffset.top  - topOffset) + 'px';
    }

    function positionElementHorizontallyCenteredToRect(element, rect, topOffset) {
      var horizontalCenter = (element.offsetWidth / 2) - (rect.width / 2);
      positionElementToRect(element, rect, topOffset, horizontalCenter);
    }

    function positionElementCenteredAbove(element, aboveElement) {
      var elementMargin = getElementComputedStyleNumericProp(element, 'marginBottom');
      positionElementHorizontallyCenteredToRect(element, aboveElement.getBoundingClientRect(), element.offsetHeight + elementMargin);
    }

    function positionElementCenteredBelow(element, belowElement) {
      var elementMargin = getElementComputedStyleNumericProp(element, 'marginTop');
      positionElementHorizontallyCenteredToRect(element, belowElement.getBoundingClientRect(), -element.offsetHeight - elementMargin);
    }

    function positionElementCenteredIn(element, inElement) {
      var verticalCenter = (inElement.offsetHeight / 2) - (element.offsetHeight / 2);
      positionElementHorizontallyCenteredToRect(element, inElement.getBoundingClientRect(), -verticalCenter);
    }

    function positionElementToLeftOf(element, leftOfElement) {
      var verticalCenter = (leftOfElement.offsetHeight / 2) - (element.offsetHeight / 2);
      var elementMargin = getElementComputedStyleNumericProp(element, 'marginRight');
      positionElementToRect(element, leftOfElement.getBoundingClientRect(), -verticalCenter, element.offsetWidth + elementMargin);
    }

    function positionElementToRightOf(element, rightOfElement) {
      var verticalCenter = (rightOfElement.offsetHeight / 2) - (element.offsetHeight / 2);
      var elementMargin = getElementComputedStyleNumericProp(element, 'marginLeft');
      var rightOfElementRect = rightOfElement.getBoundingClientRect();
      positionElementToRect(element, rightOfElementRect, -verticalCenter, -rightOfElement.offsetWidth - elementMargin);
    }

    __exports__.createDiv = createDiv;
    __exports__.hideElement = hideElement;
    __exports__.showElement = showElement;
    __exports__.swapElements = swapElements;
    __exports__.getEventTargetMatchingTag = getEventTargetMatchingTag;
    __exports__.nodeIsDescendantOfElement = nodeIsDescendantOfElement;
    __exports__.getElementRelativeOffset = getElementRelativeOffset;
    __exports__.getElementComputedStyleNumericProp = getElementComputedStyleNumericProp;
    __exports__.positionElementToRect = positionElementToRect;
    __exports__.positionElementHorizontallyCenteredToRect = positionElementHorizontallyCenteredToRect;
    __exports__.positionElementCenteredAbove = positionElementCenteredAbove;
    __exports__.positionElementCenteredBelow = positionElementCenteredBelow;
    __exports__.positionElementCenteredIn = positionElementCenteredIn;
    __exports__.positionElementToLeftOf = positionElementToLeftOf;
    __exports__.positionElementToRightOf = positionElementToRightOf;
  });
define("content-kit-editor/utils/event-emitter",
  ["exports"],
  function(__exports__) {
    "use strict";
    // Based on https://github.com/jeromeetienne/microevent.js/blob/master/microevent.js
    // See also: https://github.com/allouis/minivents/blob/master/minivents.js

    var EventEmitter = {
      on : function(type, handler){
        var events = this.__events = this.__events || {};
        events[type] = events[type] || [];
        events[type].push(handler);
      },
      off : function(type, handler){
        var events = this.__events = this.__events || {};
        if (type in events) {
          events[type].splice(events[type].indexOf(handler), 1);
        }
      },
      trigger : function(type) {
        var events = this.__events = this.__events || {};
        var eventForTypeCount, i;
        if (type in events) {
          eventForTypeCount = events[type].length;
          for(i = 0; i < eventForTypeCount; i++) {
            events[type][i].apply(this, Array.prototype.slice.call(arguments, 1));
          }
        }
      }
    };

    __exports__["default"] = EventEmitter;
  });
define("content-kit-editor/utils/paste-utils",
  ["../constants","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var RegEx = __dependency1__.RegEx;

    function plainTextToBlocks(plainText, tag) {
      var blocks = plainText.split(RegEx.NEWLINE),
          len = blocks.length,
          block, openTag, closeTag, content, i;
      if(len < 2) {
        return plainText;
      } else {
        content = '';
        openTag = '<' + tag + '>';
        closeTag = '</' + tag + '>';
        for(i = 0; i < len; ++i) {
          block = blocks[i];
          if(block !== '') {
            content += openTag + block + closeTag;
          }
        }
        return content;
      }
    }

    function cleanPastedContent(event, defaultBlockTag) {
      event.preventDefault();
      var data = event.clipboardData, plainText;
      if(data && data.getData) {
        plainText = data.getData('text/plain');
        return plainTextToBlocks(plainText, defaultBlockTag);
      }
    }

    __exports__.cleanPastedContent = cleanPastedContent;
  });
define("content-kit-editor/utils/selection-utils",
  ["../constants","./element-utils","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var SelectionDirection = __dependency1__.SelectionDirection;
    var RootTags = __dependency1__.RootTags;
    var nodeIsDescendantOfElement = __dependency2__.nodeIsDescendantOfElement;

    function getDirectionOfSelection(selection) {
      var node = selection.anchorNode;
      var position = node && node.compareDocumentPosition(selection.focusNode);
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
        return SelectionDirection.LEFT_TO_RIGHT;
      } else if (position & Node.DOCUMENT_POSITION_PRECEDING) {
        return SelectionDirection.RIGHT_TO_LEFT;
      }
      return SelectionDirection.SAME_NODE;
    }

    function getSelectionElement(selection) {
      selection = selection || window.getSelection();
      var node = getDirectionOfSelection(selection) === SelectionDirection.LEFT_TO_RIGHT ? selection.anchorNode : selection.focusNode;
      return node && (node.nodeType === 3 ? node.parentNode : node);
    }

    function getSelectionBlockElement(selection) {
      selection = selection || window.getSelection();
      var element = getSelectionElement();
      var tag = element && element.tagName.toLowerCase();
      while (tag && RootTags.indexOf(tag) === -1) {
        if (element.contentEditable === 'true') { return; } // Stop traversing up dom when hitting an editor element
        element = element.parentNode;
        tag = element.tagName && element.tagName.toLowerCase();
      }
      return element;
    }

    function getSelectionTagName() {
      var element = getSelectionElement();
      return element ? element.tagName.toLowerCase() : null;
    }

    function getSelectionBlockTagName() {
      var element = getSelectionBlockElement();
      return element ? element.tagName && element.tagName.toLowerCase() : null;
    }

    function tagsInSelection(selection) {
      var element = getSelectionElement(selection);
      var tags = [];
      if (!selection.isCollapsed) {
        while(element) {
          if (element.contentEditable === 'true') { break; } // Stop traversing up dom when hitting an editor element
          if (element.tagName) {
            tags.push(element.tagName.toLowerCase());
          }
          element = element.parentNode;
        }
      }
      return tags;
    }

    function selectionIsInElement(selection, element) {
      var node = selection.anchorNode;
      return node && nodeIsDescendantOfElement(node, element);
    }

    function selectionIsEditable(selection) {
      var el = getSelectionBlockElement(selection);
      return el.isContentEditable;
    }

    /*
    function saveSelection() {
      var sel = window.getSelection();
      var ranges = [], i;
      if (sel.rangeCount) {
        var rangeCount = sel.rangeCount;
        for (i = 0; i < rangeCount; i++) {
          ranges.push(sel.getRangeAt(i));
        }
      }
      return ranges;
    }

    function restoreSelection(savedSelection) {
      var sel = window.getSelection();
      var len = savedSelection.length, i;
      sel.removeAllRanges();
      for (i = 0; i < len; i++) {
        sel.addRange(savedSelection[i]);
      }
    }
    */

    function moveCursorToBeginningOfSelection(selection) {
      var range = document.createRange();
      var node  = selection.anchorNode;
      range.setStart(node, 0);
      range.setEnd(node, 0);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    function restoreRange(range) {
      var selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }

    function selectNode(node) {
      var range = document.createRange();
      var selection = window.getSelection();
      range.setStart(node, 0);
      range.setEnd(node, node.length);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    __exports__.getDirectionOfSelection = getDirectionOfSelection;
    __exports__.getSelectionElement = getSelectionElement;
    __exports__.getSelectionBlockElement = getSelectionBlockElement;
    __exports__.getSelectionTagName = getSelectionTagName;
    __exports__.getSelectionBlockTagName = getSelectionBlockTagName;
    __exports__.tagsInSelection = tagsInSelection;
    __exports__.selectionIsInElement = selectionIsInElement;
    __exports__.selectionIsEditable = selectionIsEditable;
    __exports__.moveCursorToBeginningOfSelection = moveCursorToBeginningOfSelection;
    __exports__.restoreRange = restoreRange;
    __exports__.selectNode = selectNode;
  });
define("content-kit-editor/views/embed-intent",
  ["./view","./toolbar","../../content-kit-utils/object-utils","../utils/selection-utils","../utils/element-utils","../constants","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __exports__) {
    "use strict";
    var View = __dependency1__["default"];
    var Toolbar = __dependency2__["default"];
    var inherit = __dependency3__.inherit;
    var getSelectionBlockElement = __dependency4__.getSelectionBlockElement;
    var positionElementToLeftOf = __dependency5__.positionElementToLeftOf;
    var positionElementCenteredIn = __dependency5__.positionElementCenteredIn;
    var ToolbarDirection = __dependency6__.ToolbarDirection;
    var Keycodes = __dependency6__.Keycodes;
    var nodeIsDescendantOfElement = __dependency5__.nodeIsDescendantOfElement;
    var createDiv = __dependency5__.createDiv;

    function EmbedIntent(options) {
      var embedIntent = this;
      var rootElement = options.rootElement;
      options.tagName = 'button';
      options.classNames = ['ck-embed-intent-btn'];
      View.call(embedIntent, options);

      embedIntent.editorContext = options.editorContext;
      embedIntent.loadingIndicator = createDiv('ck-embed-loading');
      embedIntent.element.title = 'Insert image or embed...';
      embedIntent.element.addEventListener('mouseup', function(e) {
        if (embedIntent.isActive) {
          embedIntent.deactivate();
        } else {
          embedIntent.activate();
        }
        e.stopPropagation();
      });

      embedIntent.toolbar = new Toolbar({ embedIntent: embedIntent, editor: embedIntent.editorContext, commands: options.commands, direction: ToolbarDirection.RIGHT });
      embedIntent.isActive = false;

      function embedIntentHandler() {
        var blockElement = getSelectionBlockElement();
        var blockElementContent = blockElement && blockElement.innerHTML;
        if (blockElementContent === '' || blockElementContent === '<br>') {
          embedIntent.showAt(blockElement);
        } else {
          embedIntent.hide();
        }
      }

      rootElement.addEventListener('keyup', embedIntentHandler);

      document.addEventListener('mouseup', function(e) {
        setTimeout(function() {
          if (!nodeIsDescendantOfElement(e.target, embedIntent.toolbar.element)) {
            embedIntentHandler();
          }
        });
      });

      document.addEventListener('keyup', function(e) {
        if (e.keyCode === Keycodes.ESC) {
          embedIntent.hide();
        }
      });

      window.addEventListener('resize', function() {
        if(embedIntent.isShowing) {
          positionElementToLeftOf(embedIntent.element, embedIntent.atNode);
          if (embedIntent.toolbar.isShowing) {
            embedIntent.toolbar.positionToContent(embedIntent.element);
          }
        }
      });
    }
    inherit(EmbedIntent, View);

    EmbedIntent.prototype.hide = function() {
      if (EmbedIntent._super.prototype.hide.call(this)) {
        this.deactivate();
      }
    };

    EmbedIntent.prototype.showAt = function(node) {
      this.show();
      this.deactivate();
      this.atNode = node;
      positionElementToLeftOf(this.element, node);
    };

    EmbedIntent.prototype.activate = function() {
      if (!this.isActive) {
        this.addClass('activated');
        this.toolbar.show();
        this.toolbar.positionToContent(this.element);
        this.isActive = true;
      }
    };

    EmbedIntent.prototype.deactivate = function() {
      if (this.isActive) {
        this.removeClass('activated');
        this.toolbar.hide();
        this.isActive = false;
      }
    };

    EmbedIntent.prototype.showLoading = function() {
      var embedIntent = this;
      var loadingIndicator = embedIntent.loadingIndicator;
      embedIntent.hide();
      embedIntent.container.appendChild(loadingIndicator);
      positionElementCenteredIn(loadingIndicator, embedIntent.atNode);
    };

    EmbedIntent.prototype.hideLoading = function() {
      this.container.removeChild(this.loadingIndicator);
    };

    __exports__["default"] = EmbedIntent;
  });
define("content-kit-editor/views/message",
  ["./view","../../content-kit-utils/object-utils","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var View = __dependency1__["default"];
    var inherit = __dependency2__.inherit;

    function Message(options) {
      options = options || {};
      options.classNames = ['ck-message'];
      View.call(this, options);
    }
    inherit(Message, View);

    Message.prototype.show = function(message) {
      var messageView = this;
      messageView.element.innerHTML = message;
      Message._super.prototype.show.call(messageView);
      setTimeout(function() {
        messageView.hide();
      }, 3000);
    };

    __exports__["default"] = Message;
  });
define("content-kit-editor/views/prompt",
  ["./view","../../content-kit-utils/object-utils","../utils/selection-utils","../utils/element-utils","../constants","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    var View = __dependency1__["default"];
    var inherit = __dependency2__.inherit;
    var inherit = __dependency2__.inherit;
    var restoreRange = __dependency3__.restoreRange;
    var createDiv = __dependency4__.createDiv;
    var positionElementToRect = __dependency4__.positionElementToRect;
    var Keycodes = __dependency5__.Keycodes;

    var container = document.body;
    var hiliter = createDiv('ck-editor-hilite');

    function positionHiliteRange(range) {
      var rect = range.getBoundingClientRect();
      var style = hiliter.style;
      style.width  = rect.width  + 'px';
      style.height = rect.height + 'px';
      positionElementToRect(hiliter, rect);
    }

    function Prompt(options) {
      var prompt = this;
      options.tagName = 'input';
      View.call(prompt, options);

      prompt.command = options.command;
      prompt.element.placeholder = options.placeholder || '';
      prompt.element.addEventListener('mouseup', function(e) { e.stopPropagation(); }); // prevents closing prompt when clicking input 
      prompt.element.addEventListener('keyup', function(e) {
        var entry = this.value;
        if(entry && prompt.range && !e.shiftKey && e.which === Keycodes.ENTER) {
          restoreRange(prompt.range);
          prompt.command.exec(entry);
          if (prompt.onComplete) { prompt.onComplete(); }
        }
      });

      window.addEventListener('resize', function() {
        var activeHilite = hiliter.parentNode;
        var range = prompt.range;
        if(activeHilite && range) {
          positionHiliteRange(range);
        }
      });
    }
    inherit(Prompt, View);

    Prompt.prototype.show = function(callback) {
      var prompt = this;
      var element = prompt.element;
      var selection = window.getSelection();
      var range = selection && selection.rangeCount && selection.getRangeAt(0);
      element.value = null;
      prompt.range = range || null;
      if (range) {
        container.appendChild(hiliter);
        positionHiliteRange(prompt.range);
        setTimeout(function(){ element.focus(); }); // defer focus (disrupts mouseup events)
        if (callback) { prompt.onComplete = callback; }
      }
    };

    Prompt.prototype.hide = function() {
      if (hiliter.parentNode) {
        container.removeChild(hiliter);
      }
    };

    __exports__["default"] = Prompt;
  });
define("content-kit-editor/views/text-format-toolbar",
  ["./toolbar","../../content-kit-utils/object-utils","../utils/selection-utils","../constants","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var Toolbar = __dependency1__["default"];
    var inherit = __dependency2__.inherit;
    var selectionIsEditable = __dependency3__.selectionIsEditable;
    var selectionIsInElement = __dependency3__.selectionIsInElement;
    var Keycodes = __dependency4__.Keycodes;

    function handleTextSelection(toolbar) {
      var selection = window.getSelection();
      if (selection.isCollapsed || !selectionIsEditable(selection) || selection.toString().trim() === '' || !selectionIsInElement(selection, toolbar.rootElement)) {
        toolbar.hide();
      } else {
        toolbar.show();
        toolbar.updateForSelection(selection);
      }
    }

    function TextFormatToolbar(options) {
      var toolbar = this;
      Toolbar.call(this, options);
      toolbar.rootElement = options.rootElement;
      toolbar.rootElement.addEventListener('keyup', function() { handleTextSelection(toolbar); });

      document.addEventListener('mouseup', function() {
        setTimeout(function() {
          handleTextSelection(toolbar);
        });
      });

      document.addEventListener('keyup', function(e) {
        if (e.keyCode === Keycodes.ESC) {
          toolbar.hide();
        }
      });

      window.addEventListener('resize', function() {
        if(toolbar.isShowing) {
          var activePromptRange = toolbar.activePrompt && toolbar.activePrompt.range;
          toolbar.positionToContent(activePromptRange ? activePromptRange : window.getSelection().getRangeAt(0));
        }
      });
    }
    inherit(TextFormatToolbar, Toolbar);

    __exports__["default"] = TextFormatToolbar;
  });
define("content-kit-editor/views/toolbar-button",
  ["../commands/base","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Command = __dependency1__["default"];

    var buttonClassName = 'ck-toolbar-btn';

    function ToolbarButton(options) {
      var button = this;
      var toolbar = options.toolbar;
      var command = options.command;
      var prompt = command.prompt;
      var element = document.createElement('button');

      if(typeof command === 'string') {
        command = Command.index[command];
      }

      button.element = element;
      button.command = command;
      button.isActive = false;

      element.title = command.name;
      element.className = buttonClassName;
      element.innerHTML = command.button;
      element.addEventListener('mouseup', function(e) {
        if (!button.isActive && prompt) {
          toolbar.displayPrompt(prompt);
        } else {
          command.exec();
          toolbar.updateForSelection();
        }
        e.stopPropagation();
      });
    }

    ToolbarButton.prototype = {
      setActive: function() {
        var button = this;
        if (!button.isActive) {
          button.element.className = buttonClassName + ' active';
          button.isActive = true;
        }
      },
      setInactive: function() {
        var button = this;
        if (button.isActive) {
          button.element.className = buttonClassName;
          button.isActive = false;
        }
      }
    };

    __exports__["default"] = ToolbarButton;
  });
define("content-kit-editor/views/toolbar",
  ["./view","./toolbar-button","../../content-kit-utils/object-utils","../utils/selection-utils","../constants","../utils/element-utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __exports__) {
    "use strict";
    var View = __dependency1__["default"];
    var ToolbarButton = __dependency2__["default"];
    var inherit = __dependency3__.inherit;
    var tagsInSelection = __dependency4__.tagsInSelection;
    var ToolbarDirection = __dependency5__.ToolbarDirection;
    var createDiv = __dependency6__.createDiv;
    var swapElements = __dependency6__.swapElements;
    var positionElementToRightOf = __dependency6__.positionElementToRightOf;
    var positionElementCenteredAbove = __dependency6__.positionElementCenteredAbove;

    function updateButtonsForSelection(buttons, selection) {
      var selectedTags = tagsInSelection(selection),
          len = buttons.length,
          i, button;

      for (i = 0; i < len; i++) {
        button = buttons[i];
        if (selectedTags.indexOf(button.command.tag) > -1) {
          button.setActive();
        } else {
          button.setInactive();
        }
      }
    }

    function Toolbar(options) {
      var toolbar = this;
      var commands = options.commands;
      var commandCount = commands && commands.length, i;
      toolbar.editor = options.editor || null;
      toolbar.embedIntent = options.embedIntent || null;
      toolbar.direction = options.direction || ToolbarDirection.TOP;
      options.classNames = ['ck-toolbar'];
      if (toolbar.direction === ToolbarDirection.RIGHT) {
        options.classNames.push('right');
      }

      View.call(toolbar, options);

      toolbar.activePrompt = null;
      toolbar.buttons = [];

      toolbar.promptContainerElement = createDiv('ck-toolbar-prompt');
      toolbar.buttonContainerElement = createDiv('ck-toolbar-buttons');
      toolbar.element.appendChild(toolbar.promptContainerElement);
      toolbar.element.appendChild(toolbar.buttonContainerElement);

      for(i = 0; i < commandCount; i++) {
        this.addCommand(commands[i]);
      }

      // Closes prompt if displayed when changing selection
      document.addEventListener('mouseup', function() {
        toolbar.dismissPrompt();
      });
    }
    inherit(Toolbar, View);

    Toolbar.prototype.hide = function() {
      if (Toolbar._super.prototype.hide.call(this)) {
        var style = this.element.style;
        style.left = '';
        style.top = '';
        this.dismissPrompt();
      }
    };

    Toolbar.prototype.addCommand = function(command) {
      command.editorContext = this.editor;
      command.embedIntent = this.embedIntent;
      var button = new ToolbarButton({ command: command, toolbar: this });
      this.buttons.push(button);
      this.buttonContainerElement.appendChild(button.element);
    };

    Toolbar.prototype.displayPrompt = function(prompt) {
      var toolbar = this;
      swapElements(toolbar.promptContainerElement, toolbar.buttonContainerElement);
      toolbar.promptContainerElement.appendChild(prompt.element);
      prompt.show(function() {
        toolbar.dismissPrompt();
        toolbar.updateForSelection();
      });
      toolbar.activePrompt = prompt;
    };

    Toolbar.prototype.dismissPrompt = function() {
      var toolbar = this;
      var activePrompt = toolbar.activePrompt;
      if (activePrompt) {
        activePrompt.hide();
        swapElements(toolbar.buttonContainerElement, toolbar.promptContainerElement);
        toolbar.activePrompt = null;
      }
    };

    Toolbar.prototype.updateForSelection = function(selection) {
      var toolbar = this;
      selection = selection || window.getSelection();
      if (!selection.isCollapsed) {
        toolbar.positionToContent(selection.getRangeAt(0));
        updateButtonsForSelection(toolbar.buttons, selection);
      }
    };

    Toolbar.prototype.positionToContent = function(content) {
      var directions = ToolbarDirection;
      var positioningMethod;
      switch(this.direction) {
        case directions.RIGHT:
          positioningMethod = positionElementToRightOf;
          break;
        default:
          positioningMethod = positionElementCenteredAbove;
      }
      positioningMethod(this.element, content);
    };

    __exports__["default"] = Toolbar;
  });
define("content-kit-editor/views/tooltip",
  ["./view","../../content-kit-utils/object-utils","../utils/element-utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var View = __dependency1__["default"];
    var inherit = __dependency2__.inherit;
    var positionElementCenteredBelow = __dependency3__.positionElementCenteredBelow;
    var getEventTargetMatchingTag = __dependency3__.getEventTargetMatchingTag;

    function Tooltip(options) {
      var tooltip = this;
      var rootElement = options.rootElement;
      var delay = options.delay || 200;
      var timeout;
      options.classNames = ['ck-tooltip'];
      View.call(tooltip, options);

      rootElement.addEventListener('mouseover', function(e) {
        var target = getEventTargetMatchingTag(options.showForTag, e.target, rootElement);
        if (target && target.isContentEditable) {
          timeout = setTimeout(function() {
            tooltip.showLink(target.href, target);
          }, delay);
        }
      });
      
      rootElement.addEventListener('mouseout', function(e) {
        clearTimeout(timeout);
        var toElement = e.toElement || e.relatedTarget;
        if (toElement && toElement.className !== tooltip.element.className) {
          tooltip.hide();
        }
      });
    }
    inherit(Tooltip, View);

    Tooltip.prototype.showMessage = function(message, element) {
      var tooltip = this;
      var tooltipElement = tooltip.element;
      tooltipElement.innerHTML = message;
      tooltip.show();
      positionElementCenteredBelow(tooltipElement, element);
    };

    Tooltip.prototype.showLink = function(link, element) {
      var message = '<a href="' + link + '" target="_blank">' + link + '</a>';
      this.showMessage(message, element);
    };

    __exports__["default"] = Tooltip;
  });
define("content-kit-editor/views/view",
  ["exports"],
  function(__exports__) {
    "use strict";
    function View(options) {
      this.tagName = options.tagName || 'div';
      this.classNames = options.classNames || [];
      this.element = document.createElement(this.tagName);
      this.element.className = this.classNames.join(' ');
      this.container = options.container || document.body;
      this.isShowing = false;
    }

    View.prototype = {
      show: function() {
        var view = this;
        if(!view.isShowing) {
          view.container.appendChild(view.element);
          view.isShowing = true;
          return true;
        }
      },
      hide: function() {
        var view = this;
        if(view.isShowing) {
          view.container.removeChild(view.element);
          view.isShowing = false;
          return true;
        }
      },
      focus: function() {
        this.element.focus();
      },
      addClass: function(className) {
        this.classNames.push(className);
        this.element.className = this.classNames.join(' ');
      },
      removeClass: function(className) {
        this.classNames.splice(this.classNames.indexOf(className), 1);
        this.element.className = this.classNames.join(' ');
      }
    };

    __exports__["default"] = View;
  });
define("content-kit-compiler/renderers/embeds/instagram",
  ["exports"],
  function(__exports__) {
    "use strict";

    function InstagramRenderer() {}
    InstagramRenderer.prototype.render = function(model) {
      return '<img src="' + model.attributes.url + '"/>';
    };

    __exports__["default"] = InstagramRenderer;
  });
define("content-kit-compiler/renderers/embeds/link",
  ["exports"],
  function(__exports__) {
    "use strict";

    function LinkEmbedRenderer() {}
    LinkEmbedRenderer.prototype.render = function(model) {
      return '<a href="' + model.attributes.url + '" target="_blank"><img src="' + model.attributes.thumbnail_url + '"/></a>';
    };

    __exports__["default"] = LinkEmbedRenderer;
  });
define("content-kit-compiler/renderers/embeds/photo",
  ["exports"],
  function(__exports__) {
    "use strict";

    function PhotoEmbedRenderer() {}
    PhotoEmbedRenderer.prototype.render = function(model) {
      return '<img src="' + model.attributes.url + '"/>';
    };

    __exports__["default"] = PhotoEmbedRenderer;
  });
define("content-kit-compiler/renderers/embeds/twitter",
  ["exports"],
  function(__exports__) {
    "use strict";

    function TwitterRenderer() {}
    TwitterRenderer.prototype.render = function(model) {
      return '<blockquote class="twitter-tweet"><a href="' + model.attributes.url + '"></a></blockquote>';
    };

    __exports__["default"] = TwitterRenderer;
  });
define("content-kit-compiler/renderers/embeds/youtube",
  ["exports"],
  function(__exports__) {
    "use strict";

    var RegExVideoId = /.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/;

    function getVideoIdFromUrl(url) {
      var match = url && url.match(RegExVideoId);
      if (match && match[1].length === 11){
        return match[1];
      }
      return null;
    }

    function YouTubeRenderer() {}
    YouTubeRenderer.prototype.render = function(model) {
      var videoId = getVideoIdFromUrl(model.attributes.url);
      var embedUrl = 'http://www.youtube.com/embed/' + videoId + '?controls=2&showinfo=0&color=white&theme=light';
      return '<iframe width="100%" height="400" frameborder="0" allowfullscreen src="' + embedUrl + '"></iframe>';
    };

    __exports__["default"] = YouTubeRenderer;
  });
}(this, document));
