/*
css3-mediaqueries.js - CSS Helper and CSS3 Media Queries Enabler
author: Wouter van der Graaf <wouter at dynora nl>
version: 1.0 (20110330)
license: MIT
website: http://code.google.com/p/css3-mediaqueries-js/
W3C spec: http://www.w3.org/TR/css3-mediaqueries/
Note: use of embedded <style> is not recommended when using media queries, because IE  has no way of returning the raw literal css text from a <style> element.
*/


// true prototypal inheritance (http://javascript.crockford.com/prototypal.html)
if (typeof Object.create !== 'function') {
	Object.create = function (o) {
		function F() {}
		F.prototype = o;
		return new F();
	};
}


// user agent sniffing shortcuts
var ua = {
	toString: function () {
		return navigator.userAgent;
	},
	test: function (s) {
		return this.toString().toLowerCase().indexOf(s.toLowerCase()) > -1;
	}
};
ua.version = (ua.toString().toLowerCase().match(/[\s\S]+(?:rv|it|ra|ie)[\/: ]([\d.]+)/) || [])[1];
ua.webkit = ua.test('webkit');
ua.gecko = ua.test('gecko') && !ua.webkit;
ua.opera = ua.test('opera');
ua.ie = ua.test('msie') && !ua.opera;
ua.ie6 = ua.ie && document.compatMode && typeof document.documentElement.style.maxHeight === 'undefined';
ua.ie7 = ua.ie && document.documentElement && typeof document.documentElement.style.maxHeight !== 'undefined' && typeof XDomainRequest === 'undefined';
ua.ie8 = ua.ie && typeof XDomainRequest !== 'undefined';



// initialize when DOM content is loaded
var domReady = function () {
	var fns = [];
	var init = function () {
		if (!arguments.callee.done) { // run init functions once
			arguments.callee.done = true;
			for (var i = 0; i < fns.length; i++) {
				fns[i]();
			}
		}
	};

	// listeners for different browsers
	if (document.addEventListener) {
		document.addEventListener('DOMContentLoaded', init, false);
	}
	if (ua.ie) {
		(function () {
			try {
				// throws errors until after ondocumentready
				document.documentElement.doScroll('left');

				// If we are in an iframe, the above does not work properly.
        // Trying to access the length attribute of document.body, however,
        // does throw an error until ondocumentready, fixing this issue.
        document.body.length;
			}
			catch (e) {
				setTimeout(arguments.callee, 50);
				return;
			}
			// no errors, fire
			init();
		})();
		// trying to always fire before onload
		document.onreadystatechange = function () {
			if (document.readyState === 'complete') {
				document.onreadystatechange = null;
				init();
			}
		};
	}
	if (ua.webkit && document.readyState) {
		(function () {
			if (document.readyState !== 'loading') {
				init();
			}
			else {
				setTimeout(arguments.callee, 10);
			}
		})();
	}
	window.onload = init; // fallback

  return function (fn) { // add fn to init functions
    if (typeof fn === 'function') {
      // If DOM ready has already been fired, fire the function
      // right away.
      if(init.done) {
        fn();
      } else {
        // Add to the queue
        fns[fns.length] = fn;
      }
    }
    return fn;
  };
}();


// helper library for parsing css to objects
var cssHelper = function () {

	var regExp = {
		BLOCKS: /[^\s{;][^{;]*\{(?:[^{}]*\{[^{}]*\}[^{}]*|[^{}]*)*\}/g,
		BLOCKS_INSIDE: /[^\s{][^{]*\{[^{}]*\}/g,
		DECLARATIONS: /[a-zA-Z\-]+[^;]*:[^;]+;/g,
		RELATIVE_URLS: /url\(['"]?([^\/\)'"][^:\)'"]+)['"]?\)/g,
		// strip whitespace and comments, @import is evil
		REDUNDANT_COMPONENTS: /(?:\/\*([^*\\\\]|\*(?!\/))+\*\/|@import[^;]+;|@-moz-document\s*url-prefix\(\)\s*{(([^{}])+{([^{}])+}([^{}])+)+})/g,
		REDUNDANT_WHITESPACE: /\s*(,|:|;|\{|\})\s*/g,
		WHITESPACE_IN_PARENTHESES: /\(\s*(\S*)\s*\)/g,
		MORE_WHITESPACE: /\s{2,}/g,
		FINAL_SEMICOLONS: /;\}/g,
		NOT_WHITESPACE: /\S+/g
	};

	var parsed, parsing = false;

	var waiting = [];
	var wait = function (fn) {
		if (typeof fn === 'function') {
			waiting[waiting.length] = fn;
		}
	};
	var ready = function () {
		for (var i = 0; i < waiting.length; i++) {
			waiting[i](parsed);
		}
	};
	var events = {};
	var broadcast = function (n, v) {
		if (events[n]) {
			var listeners = events[n].listeners;
			if (listeners) {
				for (var i = 0; i < listeners.length; i++) {
					listeners[i](v);
				}
			}
		}
	};

	var requestText = function (url, fnSuccess, fnFailure) {
		if (ua.ie && !window.XMLHttpRequest) {
			window.XMLHttpRequest = function () {
				return new ActiveXObject('Microsoft.XMLHTTP');
			};
		}
		if (!XMLHttpRequest) {
			return '';
		}
		var r = new XMLHttpRequest();
		try {
			r.open('get', url, true);
			r.setRequestHeader('X_REQUESTED_WITH', 'XMLHttpRequest');
		}
		catch (e) {
			fnFailure();
			return;
		}
		var done = false;
		setTimeout(function () {
			done = true;
		}, 5000);
		document.documentElement.style.cursor = 'progress';
		r.onreadystatechange = function () {
			if (r.readyState === 4 && !done) {
				if (!r.status && location.protocol === 'file:' ||
						(r.status >= 200 && r.status < 300) ||
						r.status === 304 ||
						navigator.userAgent.indexOf('Safari') > -1 && typeof r.status === 'undefined') {
					fnSuccess(r.responseText);
				}
				else {
					fnFailure();
				}
				document.documentElement.style.cursor = '';
				r = null; // avoid memory leaks
			}
		};
		r.send('');
	};

	var sanitize = function (text) {
		text = text.replace(regExp.REDUNDANT_COMPONENTS, '');
		text = text.replace(regExp.REDUNDANT_WHITESPACE, '$1');
        text = text.replace(regExp.WHITESPACE_IN_PARENTHESES, '($1)');
		text = text.replace(regExp.MORE_WHITESPACE, ' ');
		text = text.replace(regExp.FINAL_SEMICOLONS, '}'); // optional final semicolons
		return text;
	};

	var objects = {
	    stylesheet: function (el) {
	        var o = {};
	        var amqs = [], mqls = [], rs = [], rsw = [];
	        var s = el.cssHelperText;

	        // add attribute media queries
	        var attr = el.getAttribute('media');
	        if (attr) {
	            var qts = attr.toLowerCase().split(',')
	        }
	        else {
	            var qts = ['all'] // imply 'all'
            }
	        for (var i = 0; i < qts.length; i++) {
	            amqs[amqs.length] = objects.mediaQuery(qts[i], o);
	        }

	        // add media query lists and rules (top down order)
		    var blocks = s.match(regExp.BLOCKS); // @charset is not a block
		    if (blocks !== null) {
			    for (var i = 0; i < blocks.length; i++) {
				    if (blocks[i].substring(0, 7) === '@media ') { // media query (list)
					    var mql = objects.mediaQueryList(blocks[i], o);
					    rs = rs.concat(mql.getRules());
					    mqls[mqls.length] = mql;
				    }
				    else { // regular rule set, page context (@page) or font description (@font-face)
					    rs[rs.length] = rsw[rsw.length] = objects.rule(blocks[i], o, null);
				    }
			    }
		    }

	        o.element = el;
	        o.getCssText = function () {
	            return s;
	        };
	        o.getAttrMediaQueries = function () {
	            return amqs;
	        };
	        o.getMediaQueryLists = function () {
	            return mqls;
	        };
	        o.getRules = function () {
	            return rs;
	        };
	        o.getRulesWithoutMQ = function () {
	            return rsw;
	        };
	        return o;
	    },

		mediaQueryList: function (s, stsh) {
			var o = {};
			var idx = s.indexOf('{');
			var lt = s.substring(0, idx);
			s = s.substring(idx + 1, s.length - 1);
			var mqs = [], rs = [];

			// add media queries
			var qts = lt.toLowerCase().substring(7).split(',');
			for (var i = 0; i < qts.length; i++) { // parse each media query
				mqs[mqs.length] = objects.mediaQuery(qts[i], o);
			}

			// add rule sets
			var rts = s.match(regExp.BLOCKS_INSIDE);
			if (rts !== null) {
				for (i = 0; i < rts.length; i++) {
					rs[rs.length] = objects.rule(rts[i], stsh, o);
				}
			}

			o.type = 'mediaQueryList';
			o.getMediaQueries = function () {
				return mqs;
			};
			o.getRules = function () {
				return rs;
			};
			o.getListText = function () {
				return lt;
			};
			o.getCssText = function () {
				return s;
			};
			return o;
		},

		mediaQuery: function (s, listOrSheet) {
			s = s || '';
			var mql, stsh;
			if (listOrSheet.type === 'mediaQueryList') {
			    mql = listOrSheet;
		    }
		    else {
		        stsh = listOrSheet;
		    }
			var not = false, type;
			var expr = [];
			var valid = true;
			var tokens = s.match(regExp.NOT_WHITESPACE);



			for (var i = 0; i < tokens.length; i++) {
				var token = tokens[i];
				if (!type && (token === 'not' || token === 'only')) { // 'not' and 'only' keywords
					// keyword 'only' does nothing, as if it was not present
					if (token === 'not') {
						not = true;
					}
				}
				else if (!type) { // media type
					type = token;
				}
				else if (token.charAt(0) === '(') { // media feature expression
					var pair = token.substring(1, token.length - 1).split(':');
					expr[expr.length] = {
						mediaFeature: pair[0],
						value: pair[1] || null
					};
				}
			}

			return {
			    getQueryText: function () {
			        return s;
			    },
			    getAttrStyleSheet: function () {
			        return stsh || null;
			    },
				getList: function () {
					return mql || null;
				},
				getValid: function () {
					return valid;
				},
				getNot: function () {
					return not;
				},
				getMediaType: function () {
					return type;
				},
				getExpressions: function () {
					return expr;
				}
			};
		},

		rule: function (s, stsh, mql) {
			var o = {};
			var idx = s.indexOf('{');
			var st = s.substring(0, idx);
			var ss = st.split(',');
			var ds = [];
			var dts = s.substring(idx + 1, s.length - 1).split(';');
			for (var i = 0; i < dts.length; i++) {
				ds[ds.length] = objects.declaration(dts[i], o);
			}

			o.getStylesheet = function () {
			    return stsh || null;
			};
			o.getMediaQueryList = function () {
				return mql || null;
			};
			o.getSelectors = function () {
				return ss;
			};
			o.getSelectorText = function () {
				return st;
			};
			o.getDeclarations = function () {
				return ds;
			};
			o.getPropertyValue = function (n) {
				for (var i = 0; i < ds.length; i++) {
					if (ds[i].getProperty() === n) {
						return ds[i].getValue();
					}
				}
				return null;
			};
			return o;
		},

		declaration: function (s, r) {
			var idx = s.indexOf(':');
			var p = s.substring(0, idx);
			var v = s.substring(idx + 1);
			return {
				getRule: function () {
					return r || null;
				},
				getProperty: function () {
					return p;
				},
				getValue: function () {
					return v;
				}
			};
		}
	};

	var parseText = function (el) {
		if (typeof el.cssHelperText !== 'string') {
			return;
		}
		var o = {
		    stylesheet: null,
			mediaQueryLists: [],
			rules: [],
			selectors: {},
			declarations: [],
			properties: {}
		};

		// build stylesheet object
		var stsh = o.stylesheet = objects.stylesheet(el);

		// collect media query lists
		var mqls = o.mediaQueryLists = stsh.getMediaQueryLists();

		// collect all rules
		var ors = o.rules = stsh.getRules();

		// collect all selectors
		var oss = o.selectors;
		var collectSelectors = function (r) {
			var ss = r.getSelectors();
			for (var i = 0; i < ss.length; i++) {
				var n = ss[i];
				if (!oss[n]) {
					oss[n] = [];
				}
				oss[n][oss[n].length] = r;
			}
		};
		for (i = 0; i < ors.length; i++) {
			collectSelectors(ors[i]);
		}

		// collect all declarations
		var ods = o.declarations;
		for (i = 0; i < ors.length; i++) {
			ods = o.declarations = ods.concat(ors[i].getDeclarations());
		}

		// collect all properties
		var ops = o.properties;
		for (i = 0; i < ods.length; i++) {
			var n = ods[i].getProperty();
			if (!ops[n]) {
				ops[n] = [];
			}
			ops[n][ops[n].length] = ods[i];
		}

		el.cssHelperParsed = o;
		parsed[parsed.length] = el;
		return o;
	};

	var parseEmbedded = function (el, s) {
	    return;
	    // This function doesn't work because of a bug in IE, where innerHTML gives us parsed css instead of raw literal.
		el.cssHelperText = sanitize(s || el.innerHTML);
		return parseText(el);
	};

	var parse = function () {
		parsing = true;
		parsed = [];
		var linked = [];
		var finish = function () {
			for (var i = 0; i < linked.length; i++) {
				parseText(linked[i]);
			}
			var styles = document.getElementsByTagName('style');
			for (i = 0; i < styles.length; i++) {
				parseEmbedded(styles[i]);
			}
			parsing = false;
			ready();
		};
		var links = document.getElementsByTagName('link');
		for (var i = 0; i < links.length; i++) {
			var link = links[i];
			if (link.getAttribute('rel').indexOf('style') > -1 && link.href && link.href.length !== 0 && !link.disabled) {
				linked[linked.length] = link;
			}
		}
		if (linked.length > 0) {
			var c = 0;
			var checkForFinish = function () {
				c++;
				if (c === linked.length) { // parse in right order, so after last link is read
					finish();
				}
			};
			var processLink = function (link) {
				var href = link.href;
				requestText(href, function (text) {
					// fix url's
					text = sanitize(text).replace(regExp.RELATIVE_URLS, 'url(' + href.substring(0, href.lastIndexOf('/')) + '/$1)');
					link.cssHelperText = text;
					checkForFinish();
				}, checkForFinish);
			};
			for (i = 0; i < linked.length; i++) {
				processLink(linked[i]);
			}
		}
		else {
			finish();
		}
	};

	var types = {
	    stylesheets: 'array',
		mediaQueryLists: 'array',
		rules: 'array',
		selectors: 'object',
		declarations: 'array',
		properties: 'object'
	};

	var collections = {
	    stylesheets: null,
		mediaQueryLists: null,
		rules: null,
		selectors: null,
		declarations: null,
		properties: null
	};

	var addToCollection = function (name, v) {
		if (collections[name] !== null) {
			if (types[name] === 'array') {
				return (collections[name] = collections[name].concat(v));
			}
			else {
				var c = collections[name];
				for (var n in v) {
					if (v.hasOwnProperty(n)) {
						if (!c[n]) {
							c[n] = v[n];
						}
						else {
							c[n] = c[n].concat(v[n]);
						}
					}
				}
				return c;
			}
		}
	};

	var collect = function (name) {
		collections[name] = (types[name] === 'array') ? [] : {};
		for (var i = 0; i < parsed.length; i++) {
		    var pname = name === 'stylesheets' ? 'stylesheet' : name; // the exception
			addToCollection(name, parsed[i].cssHelperParsed[pname]);
		}
		return collections[name];
	};

	// viewport size
	var getViewportSize = function (d) {
		if (typeof window.innerWidth != 'undefined') {
			return window['inner' + d];
		}
		else if (typeof document.documentElement !== 'undefined'
				&& typeof document.documentElement.clientWidth !== 'undefined'
				&& document.documentElement.clientWidth != 0) {
			return document.documentElement['client' + d];
		}
	};

	// public static functions
	return {
		addStyle: function (s, mediaTypes, process) {
			var el;
			var styleElId = 'css-mediaqueries-js';
			var styleMedia = '';

			var styleEl = document.getElementById(styleElId);

			if (mediaTypes && mediaTypes.length > 0) {
			    styleMedia = mediaTypes.join(',');
					styleElId += styleMedia;
			}

      if (null !== styleEl) {
          el = styleEl;
      }
      else {
          el = document.createElement('style');
          el.setAttribute('type', 'text/css');
          el.setAttribute('id', styleElId);
          el.setAttribute('media', styleMedia);
          document.getElementsByTagName('head')[0].appendChild(el);
      }

      if (el.styleSheet) { // IE
          el.styleSheet.cssText += s;
      }
      else {
	        el.appendChild(document.createTextNode(s));
      }

			el.addedWithCssHelper = true;

			if (typeof process === 'undefined' || process === true) {
				cssHelper.parsed(function (parsed) {
					var o = parseEmbedded(el, s);
					for (var n in o) {
						if (o.hasOwnProperty(n)) {
							addToCollection(n, o[n]);
						}
					}
					broadcast('newStyleParsed', el);
				});
			}
			else {
				el.parsingDisallowed = true;
			}
			return el;
		},

		removeStyle: function (el) {
			if (el.parentNode)
				return el.parentNode.removeChild(el);
		},

		parsed: function (fn) {
			if (parsing) {
				wait(fn);
			}
			else {
				if (typeof parsed !== 'undefined') {
					if (typeof fn === 'function') {
						fn(parsed);
					}
				}
				else {
					wait(fn);
					parse();
				}
			}
		},

		stylesheets: function (fn) {
		    cssHelper.parsed(function (parsed) {
		        fn(collections.stylesheets || collect('stylesheets'));
		    });
		},

		mediaQueryLists: function (fn) {
			cssHelper.parsed(function (parsed) {
				fn(collections.mediaQueryLists || collect('mediaQueryLists'));
			});
		},

		rules: function (fn) {
			cssHelper.parsed(function (parsed) {
				fn(collections.rules || collect('rules'));
			});
		},

		selectors: function (fn) {
			cssHelper.parsed(function (parsed) {
				fn(collections.selectors || collect('selectors'));
			});
		},

		declarations: function (fn) {
			cssHelper.parsed(function (parsed) {
				fn(collections.declarations || collect('declarations'));
			});
		},

		properties: function (fn) {
			cssHelper.parsed(function (parsed) {
				fn(collections.properties || collect('properties'));
			});
		},

		broadcast: broadcast,

		addListener: function (n, fn) { // in case n is 'styleadd': added function is called everytime style is added and parsed
			if (typeof fn === 'function') {
				if (!events[n]) {
					events[n] = {
						listeners: []
					};
				}
				events[n].listeners[events[n].listeners.length] = fn;
			}
		},

		removeListener: function (n, fn) {
			if (typeof fn === 'function' && events[n]) {
				var ls = events[n].listeners;
				for (var i = 0; i < ls.length; i++) {
					if (ls[i] === fn) {
						ls.splice(i, 1);
						i -= 1;
					}
				}
			}
		},

		getViewportWidth: function () {
			return getViewportSize('Width');
		},

		getViewportHeight: function () {
			return getViewportSize('Height');
		}
	};
}();



// function to test and apply parsed media queries against browser capabilities
domReady(function enableCssMediaQueries() {
	var meter;

	var regExp = {
		LENGTH_UNIT: /[0-9]+(em|ex|px|in|cm|mm|pt|pc)$/,
		RESOLUTION_UNIT: /[0-9]+(dpi|dpcm)$/,
		ASPECT_RATIO: /^[0-9]+\/[0-9]+$/,
		ABSOLUTE_VALUE: /^[0-9]*(\.[0-9]+)*$/
	};

	var styles = [];

	var nativeSupport = function () {
		// check support for media queries
		var id = 'css3-mediaqueries-test';
		var el = document.createElement('div');
		el.id = id;
		var style = cssHelper.addStyle('@media all and (width) { #' + id +
			' { width: 1px !important; } }', [], false); // false means don't parse this temp style
		document.body.appendChild(el);
		var ret = el.offsetWidth === 1;
		style.parentNode.removeChild(style);
		el.parentNode.removeChild(el);
		nativeSupport = function () {
			return ret;
		};
		return ret;
	};

	var createMeter = function () { // create measuring element
		meter = document.createElement('div');
		meter.style.cssText = 'position:absolute;top:-9999em;left:-9999em;' +
			'margin:0;border:none;padding:0;width:1em;font-size:1em;'; // cssText is needed for IE, works for the others
		document.body.appendChild(meter);
		// meter must have browser default font size of 16px
		if (meter.offsetWidth !== 16) {
			meter.style.fontSize = 16 / meter.offsetWidth + 'em';
		}
		meter.style.width = '';
	};

	var measure = function (value) {
		meter.style.width = value;
		var amount = meter.offsetWidth;
		meter.style.width = '';
		return amount;
	};

	var testMediaFeature = function (feature, value) {
		// non-testable features: monochrome|min-monochrome|max-monochrome|scan|grid
		var l = feature.length;
		var min = (feature.substring(0, 4) === 'min-');
		var max = (!min && feature.substring(0, 4) === 'max-');

		if (value !== null) { // determine value type and parse to usable amount
			var valueType;
			var amount;
			if (regExp.LENGTH_UNIT.exec(value)) {
				valueType = 'length';
				amount = measure(value);
			}
			else if (regExp.RESOLUTION_UNIT.exec(value)) {
				valueType = 'resolution';
				amount = parseInt(value, 10);
				var unit = value.substring((amount + '').length);
			}
			else if (regExp.ASPECT_RATIO.exec(value)) {
				valueType = 'aspect-ratio';
				amount = value.split('/');
			}
			else if (regExp.ABSOLUTE_VALUE) {
				valueType = 'absolute';
				amount = value;
			}
			else {
				valueType = 'unknown';
			}
		}

		var width, height;
		if ('device-width' === feature.substring(l - 12, l)) { // screen width
			width = screen.width;
			if (value !== null) {
				if (valueType === 'length') {
					return ((min && width >= amount) || (max && width < amount) || (!min && !max && width === amount));
				}
				else {
					return false;
				}
			}
			else { // test width without value
				return width > 0;
			}
		}
		else if ('device-height' === feature.substring(l - 13, l)) { // screen height
			height = screen.height;
			if (value !== null) {
				if (valueType === 'length') {
					return ((min && height >= amount) || (max && height < amount) || (!min && !max && height === amount));
				}
				else {
					return false;
				}
			}
			else { // test height without value
				return height > 0;
			}
		}
		else if ('width' === feature.substring(l - 5, l)) { // viewport width
			width = document.documentElement.clientWidth || document.body.clientWidth; // the latter for IE quirks mode
			if (value !== null) {
				if (valueType === 'length') {
					return ((min && width >= amount) || (max && width < amount) || (!min && !max && width === amount));
				}
				else {
					return false;
				}
			}
			else { // test width without value
				return width > 0;
			}
		}
		else if ('height' === feature.substring(l - 6, l)) { // viewport height
			height = document.documentElement.clientHeight || document.body.clientHeight; // the latter for IE quirks mode
			if (value !== null) {
				if (valueType === 'length') {
					return ((min && height >= amount) || (max && height < amount) || (!min && !max && height === amount));
				}
				else {
					return false;
				}
			}
			else { // test height without value
				return height > 0;
			}
		}
		else if ('orientation' === feature.substring(l - 11, l)) { // orientation

			width = document.documentElement.clientWidth || document.body.clientWidth; // the latter for IE quirks mode
			height = document.documentElement.clientHeight || document.body.clientHeight; // the latter for IE quirks mode

			if (valueType === 'absolute') {
				return (amount === 'portrait') ? (width <= height) : (width > height);
			}
			else {
				return false;
			}
		}
		else if ('aspect-ratio' === feature.substring(l - 12, l)) { // window aspect ratio
			width = document.documentElement.clientWidth || document.body.clientWidth; // the latter for IE quirks mode
			height = document.documentElement.clientHeight || document.body.clientHeight; // the latter for IE quirks mode

			var curRatio = width / height;
			var ratio = amount[1] / amount[0];

			if (valueType === 'aspect-ratio') {
				return ((min && curRatio >= ratio) || (max && curRatio < ratio) || (!min && !max && curRatio === ratio));
			}
			else {
				return false;
			}
		}
		else if ('device-aspect-ratio' === feature.substring(l - 19, l)) { // screen aspect ratio
			return valueType === 'aspect-ratio' && screen.width * amount[1] === screen.height * amount[0];
		}
		else if ('color-index' === feature.substring(l - 11, l)) { // number of colors
			var colors = Math.pow(2, screen.colorDepth);
			if (value !== null) {
				if (valueType === 'absolute') {
					return ((min && colors >= amount) || (max && colors < amount) || (!min && !max && colors === amount));
				}
				else {
					return false;
				}
			}
			else { // test height without value
				return colors > 0;
			}
		}
		else if ('color' === feature.substring(l - 5, l)) { // bits per color component
			var color = screen.colorDepth;
			if (value !== null) {
				if (valueType === 'absolute') {
					return ((min && color >= amount) || (max && color < amount) || (!min && !max && color === amount));
				}
				else {
					return false;
				}
			}
			else { // test height without value
				return color > 0;
			}
		}
		else if ('resolution' === feature.substring(l - 10, l)) {
			var res;
			if (unit === 'dpcm') {
				res = measure('1cm');
			}
			else {
				res = measure('1in');
			}
			if (value !== null) {
				if (valueType === 'resolution') {
					return ((min && res >= amount) || (max && res < amount) || (!min && !max && res === amount));
				}
				else {
					return false;
				}
			}
			else { // test height without value
				return res > 0;
			}
		}
		else {
			return false;
		}
	};

	var testMediaQuery = function (mq) {
		var test = mq.getValid();
		var expressions = mq.getExpressions();
		var l = expressions.length;
		if (l > 0) {
			for (var i = 0; i < l && test; i++) {
				test = testMediaFeature(expressions[i].mediaFeature, expressions[i].value);
			}
			var not = mq.getNot();
			return (test && !not || not && !test);
		}
		return test;
	};

	var testMediaQueryList = function (mql, ts) {
	    // ts is null or an array with any media type but 'all'.
		var mqs = mql.getMediaQueries();
		var t = {};
		for (var i = 0; i < mqs.length; i++) {
		    var type = mqs[i].getMediaType();
		    if (mqs[i].getExpressions().length === 0) {
		        continue;
		        // TODO: Browser check! Assuming old browsers do apply the bare media types, even in a list with media queries.
		    }
		    var typeAllowed = true;
		    if (type !== 'all' && ts && ts.length > 0) {
		        typeAllowed = false;
		        for (var j = 0; j < ts.length; j++) {
		            if (ts[j] === type) {
		                typeAllowed = true;
                    }
		        }
		    }
			if (typeAllowed && testMediaQuery(mqs[i])) {
				t[type] = true;
			}
		}
		var s = [], c = 0;
		for (var n in t) {
			if (t.hasOwnProperty(n)) {
				if (c > 0) {
					s[c++] = ',';
				}
				s[c++] = n;
			}
		}
		if (s.length > 0) {
			styles[styles.length] = cssHelper.addStyle('@media ' + s.join('') + '{' + mql.getCssText() + '}', ts, false);
		}
	};

	var testMediaQueryLists = function (mqls, ts) {
		for (var i = 0; i < mqls.length; i++) {
			testMediaQueryList(mqls[i], ts);
		}
	};

	var testStylesheet = function (stsh) {
	    var amqs = stsh.getAttrMediaQueries();
	    var allPassed = false;
	    var t = {};
		for (var i = 0; i < amqs.length; i++) {
			if (testMediaQuery(amqs[i])) {
				t[amqs[i].getMediaType()] = amqs[i].getExpressions().length > 0;
			}
		}
		var ts = [], tswe = [];
		for (var n in t) {
			if (t.hasOwnProperty(n)) {
				ts[ts.length] = n;
				if (t[n]) {
				    tswe[tswe.length] = n
				}
			    if (n === 'all') {
			        allPassed = true;
                }
			}
		}
		if (tswe.length > 0) { // types with query expressions that passed the test
		    styles[styles.length] = cssHelper.addStyle(stsh.getCssText(), tswe, false);
		}
		var mqls = stsh.getMediaQueryLists();
		if (allPassed) {
		    // If 'all' in media attribute passed the test, then test all @media types in linked CSS and create style with those types.
		    testMediaQueryLists(mqls);
		}
		else {
		    // Or else, test only media attribute types that passed the test and also 'all'.
		    // For positive '@media all', create style with attribute types that passed their test.
		    testMediaQueryLists(mqls, ts);
	    }
    };

	var testStylesheets = function (stshs) {
	    for (var i = 0; i < stshs.length; i++) {
	        testStylesheet(stshs[i]);
	    }
	    if (ua.ie) {
			// force repaint in IE
			document.documentElement.style.display = 'block';
			setTimeout(function () {
				document.documentElement.style.display = '';
			}, 0);
			// delay broadcast somewhat for IE
			setTimeout(function () {
				cssHelper.broadcast('cssMediaQueriesTested');
			}, 100);
		}
		else {
			cssHelper.broadcast('cssMediaQueriesTested');
		}
	};

	var test = function () {
		for (var i = 0; i < styles.length; i++) {
			cssHelper.removeStyle(styles[i]);
		}
		styles = [];
		cssHelper.stylesheets(testStylesheets);
	};

	var scrollbarWidth = 0;
	var checkForResize = function () {
		var cvpw = cssHelper.getViewportWidth();
		var cvph = cssHelper.getViewportHeight();

		// determine scrollbar width in IE, see resizeHandler
		if (ua.ie) {
			var el = document.createElement('div');
			el.style.position = 'absolute';
			el.style.top = '-9999em';
			el.style.overflow = 'scroll';
			document.body.appendChild(el);
			scrollbarWidth = el.offsetWidth - el.clientWidth;
			document.body.removeChild(el);
		}

		var timer;
		var resizeHandler = function () {
			var vpw = cssHelper.getViewportWidth();
			var vph = cssHelper.getViewportHeight();
			// check whether vp size has really changed, because IE also triggers resize event when body size changes
			// 20px allowance to accomodate short appearance of scrollbars in IE in some cases
			if (Math.abs(vpw - cvpw) > scrollbarWidth || Math.abs(vph - cvph) > scrollbarWidth) {
				cvpw = vpw;
				cvph = vph;
				clearTimeout(timer);
				timer = setTimeout(function () {
					if (!nativeSupport()) {
						test();
					}
					else {
						cssHelper.broadcast('cssMediaQueriesTested');
					}
				}, 500);
			}
		};

		window.onresize = function () {
			var x = window.onresize || function () {}; // save original
			return function () {
				x();
				resizeHandler();
			};
		}();
	};

	// prevent jumping of layout by hiding everything before painting <body>
    var docEl = document.documentElement;
	docEl.style.marginLeft = '-32767px';

	// make sure it comes back after a while
	setTimeout(function () {
		docEl.style.marginLeft = '';
	}, 5000);

	return function () {
		if (!nativeSupport()) { // if browser doesn't support media queries
			cssHelper.addListener('newStyleParsed', function (el) {
				testStylesheet(el.cssHelperParsed.stylesheet);
			});
			// return visibility after media queries are tested
			cssHelper.addListener('cssMediaQueriesTested', function () {
				// force repaint in IE by changing width
				if (ua.ie) {
					docEl.style.width = '1px';
				}
				setTimeout(function () {
					docEl.style.width = ''; // undo width
					docEl.style.marginLeft = ''; // undo hide
				}, 0);
				// remove this listener to prevent following execution
				cssHelper.removeListener('cssMediaQueriesTested', arguments.callee);
			});
			createMeter();
			test();
		}
		else {
			docEl.style.marginLeft = ''; // undo visibility hidden
		}
		checkForResize();
	};
}());


// bonus: hotfix for IE6 SP1 (bug KB823727)
try {
	document.execCommand('BackgroundImageCache', false, true);
} catch (e) {}
/*!
 * imagesLoaded PACKAGED v4.1.0
 * JavaScript is all like "You images are done yet or what?"
 * MIT License
 */

!function(t,e){"function"==typeof define&&define.amd?define("ev-emitter/ev-emitter",e):"object"==typeof module&&module.exports?module.exports=e():t.EvEmitter=e()}(this,function(){function t(){}var e=t.prototype;return e.on=function(t,e){if(t&&e){var i=this._events=this._events||{},n=i[t]=i[t]||[];return-1==n.indexOf(e)&&n.push(e),this}},e.once=function(t,e){if(t&&e){this.on(t,e);var i=this._onceEvents=this._onceEvents||{},n=i[t]=i[t]||[];return n[e]=!0,this}},e.off=function(t,e){var i=this._events&&this._events[t];if(i&&i.length){var n=i.indexOf(e);return-1!=n&&i.splice(n,1),this}},e.emitEvent=function(t,e){var i=this._events&&this._events[t];if(i&&i.length){var n=0,o=i[n];e=e||[];for(var r=this._onceEvents&&this._onceEvents[t];o;){var s=r&&r[o];s&&(this.off(t,o),delete r[o]),o.apply(this,e),n+=s?0:1,o=i[n]}return this}},t}),function(t,e){"use strict";"function"==typeof define&&define.amd?define(["ev-emitter/ev-emitter"],function(i){return e(t,i)}):"object"==typeof module&&module.exports?module.exports=e(t,require("ev-emitter")):t.imagesLoaded=e(t,t.EvEmitter)}(window,function(t,e){function i(t,e){for(var i in e)t[i]=e[i];return t}function n(t){var e=[];if(Array.isArray(t))e=t;else if("number"==typeof t.length)for(var i=0;i<t.length;i++)e.push(t[i]);else e.push(t);return e}function o(t,e,r){return this instanceof o?("string"==typeof t&&(t=document.querySelectorAll(t)),this.elements=n(t),this.options=i({},this.options),"function"==typeof e?r=e:i(this.options,e),r&&this.on("always",r),this.getImages(),h&&(this.jqDeferred=new h.Deferred),void setTimeout(function(){this.check()}.bind(this))):new o(t,e,r)}function r(t){this.img=t}function s(t,e){this.url=t,this.element=e,this.img=new Image}var h=t.jQuery,a=t.console;o.prototype=Object.create(e.prototype),o.prototype.options={},o.prototype.getImages=function(){this.images=[],this.elements.forEach(this.addElementImages,this)},o.prototype.addElementImages=function(t){"IMG"==t.nodeName&&this.addImage(t),this.options.background===!0&&this.addElementBackgroundImages(t);var e=t.nodeType;if(e&&d[e]){for(var i=t.querySelectorAll("img"),n=0;n<i.length;n++){var o=i[n];this.addImage(o)}if("string"==typeof this.options.background){var r=t.querySelectorAll(this.options.background);for(n=0;n<r.length;n++){var s=r[n];this.addElementBackgroundImages(s)}}}};var d={1:!0,9:!0,11:!0};return o.prototype.addElementBackgroundImages=function(t){var e=getComputedStyle(t);if(e)for(var i=/url\((['"])?(.*?)\1\)/gi,n=i.exec(e.backgroundImage);null!==n;){var o=n&&n[2];o&&this.addBackground(o,t),n=i.exec(e.backgroundImage)}},o.prototype.addImage=function(t){var e=new r(t);this.images.push(e)},o.prototype.addBackground=function(t,e){var i=new s(t,e);this.images.push(i)},o.prototype.check=function(){function t(t,i,n){setTimeout(function(){e.progress(t,i,n)})}var e=this;return this.progressedCount=0,this.hasAnyBroken=!1,this.images.length?void this.images.forEach(function(e){e.once("progress",t),e.check()}):void this.complete()},o.prototype.progress=function(t,e,i){this.progressedCount++,this.hasAnyBroken=this.hasAnyBroken||!t.isLoaded,this.emitEvent("progress",[this,t,e]),this.jqDeferred&&this.jqDeferred.notify&&this.jqDeferred.notify(this,t),this.progressedCount==this.images.length&&this.complete(),this.options.debug&&a&&a.log("progress: "+i,t,e)},o.prototype.complete=function(){var t=this.hasAnyBroken?"fail":"done";if(this.isComplete=!0,this.emitEvent(t,[this]),this.emitEvent("always",[this]),this.jqDeferred){var e=this.hasAnyBroken?"reject":"resolve";this.jqDeferred[e](this)}},r.prototype=Object.create(e.prototype),r.prototype.check=function(){var t=this.getIsImageComplete();return t?void this.confirm(0!==this.img.naturalWidth,"naturalWidth"):(this.proxyImage=new Image,this.proxyImage.addEventListener("load",this),this.proxyImage.addEventListener("error",this),this.img.addEventListener("load",this),this.img.addEventListener("error",this),void(this.proxyImage.src=this.img.src))},r.prototype.getIsImageComplete=function(){return this.img.complete&&void 0!==this.img.naturalWidth},r.prototype.confirm=function(t,e){this.isLoaded=t,this.emitEvent("progress",[this,this.img,e])},r.prototype.handleEvent=function(t){var e="on"+t.type;this[e]&&this[e](t)},r.prototype.onload=function(){this.confirm(!0,"onload"),this.unbindEvents()},r.prototype.onerror=function(){this.confirm(!1,"onerror"),this.unbindEvents()},r.prototype.unbindEvents=function(){this.proxyImage.removeEventListener("load",this),this.proxyImage.removeEventListener("error",this),this.img.removeEventListener("load",this),this.img.removeEventListener("error",this)},s.prototype=Object.create(r.prototype),s.prototype.check=function(){this.img.addEventListener("load",this),this.img.addEventListener("error",this),this.img.src=this.url;var t=this.getIsImageComplete();t&&(this.confirm(0!==this.img.naturalWidth,"naturalWidth"),this.unbindEvents())},s.prototype.unbindEvents=function(){this.img.removeEventListener("load",this),this.img.removeEventListener("error",this)},s.prototype.confirm=function(t,e){this.isLoaded=t,this.emitEvent("progress",[this,this.element,e])},o.makeJQueryPlugin=function(e){e=e||t.jQuery,e&&(h=e,h.fn.imagesLoaded=function(t,e){var i=new o(this,t,e);return i.jqDeferred.promise(h(this))})},o.makeJQueryPlugin(),o});
/*!
 * Isotope PACKAGED v3.0.0
 *
 * Licensed GPLv3 for open source use
 * or Isotope Commercial License for commercial use
 *
 * http://isotope.metafizzy.co
 * Copyright 2016 Metafizzy
 */

!function(t,e){"use strict";"function"==typeof define&&define.amd?define("jquery-bridget/jquery-bridget",["jquery"],function(i){e(t,i)}):"object"==typeof module&&module.exports?module.exports=e(t,require("jquery")):t.jQueryBridget=e(t,t.jQuery)}(window,function(t,e){"use strict";function i(i,r,a){function u(t,e,n){var o,r="$()."+i+'("'+e+'")';return t.each(function(t,u){var h=a.data(u,i);if(!h)return void s(i+" not initialized. Cannot call methods, i.e. "+r);var d=h[e];if(!d||"_"==e.charAt(0))return void s(r+" is not a valid method");var l=d.apply(h,n);o=void 0===o?l:o}),void 0!==o?o:t}function h(t,e){t.each(function(t,n){var o=a.data(n,i);o?(o.option(e),o._init()):(o=new r(n,e),a.data(n,i,o))})}a=a||e||t.jQuery,a&&(r.prototype.option||(r.prototype.option=function(t){a.isPlainObject(t)&&(this.options=a.extend(!0,this.options,t))}),a.fn[i]=function(t){if("string"==typeof t){var e=o.call(arguments,1);return u(this,t,e)}return h(this,t),this},n(a))}function n(t){!t||t&&t.bridget||(t.bridget=i)}var o=Array.prototype.slice,r=t.console,s="undefined"==typeof r?function(){}:function(t){r.error(t)};return n(e||t.jQuery),i}),function(t,e){"function"==typeof define&&define.amd?define("ev-emitter/ev-emitter",e):"object"==typeof module&&module.exports?module.exports=e():t.EvEmitter=e()}(this,function(){function t(){}var e=t.prototype;return e.on=function(t,e){if(t&&e){var i=this._events=this._events||{},n=i[t]=i[t]||[];return-1==n.indexOf(e)&&n.push(e),this}},e.once=function(t,e){if(t&&e){this.on(t,e);var i=this._onceEvents=this._onceEvents||{},n=i[t]=i[t]||{};return n[e]=!0,this}},e.off=function(t,e){var i=this._events&&this._events[t];if(i&&i.length){var n=i.indexOf(e);return-1!=n&&i.splice(n,1),this}},e.emitEvent=function(t,e){var i=this._events&&this._events[t];if(i&&i.length){var n=0,o=i[n];e=e||[];for(var r=this._onceEvents&&this._onceEvents[t];o;){var s=r&&r[o];s&&(this.off(t,o),delete r[o]),o.apply(this,e),n+=s?0:1,o=i[n]}return this}},t}),function(t,e){"use strict";"function"==typeof define&&define.amd?define("get-size/get-size",[],function(){return e()}):"object"==typeof module&&module.exports?module.exports=e():t.getSize=e()}(window,function(){"use strict";function t(t){var e=parseFloat(t),i=-1==t.indexOf("%")&&!isNaN(e);return i&&e}function e(){}function i(){for(var t={width:0,height:0,innerWidth:0,innerHeight:0,outerWidth:0,outerHeight:0},e=0;h>e;e++){var i=u[e];t[i]=0}return t}function n(t){var e=getComputedStyle(t);return e||a("Style returned "+e+". Are you running this code in a hidden iframe on Firefox? See http://bit.ly/getsizebug1"),e}function o(){if(!d){d=!0;var e=document.createElement("div");e.style.width="200px",e.style.padding="1px 2px 3px 4px",e.style.borderStyle="solid",e.style.borderWidth="1px 2px 3px 4px",e.style.boxSizing="border-box";var i=document.body||document.documentElement;i.appendChild(e);var o=n(e);r.isBoxSizeOuter=s=200==t(o.width),i.removeChild(e)}}function r(e){if(o(),"string"==typeof e&&(e=document.querySelector(e)),e&&"object"==typeof e&&e.nodeType){var r=n(e);if("none"==r.display)return i();var a={};a.width=e.offsetWidth,a.height=e.offsetHeight;for(var d=a.isBorderBox="border-box"==r.boxSizing,l=0;h>l;l++){var f=u[l],c=r[f],m=parseFloat(c);a[f]=isNaN(m)?0:m}var p=a.paddingLeft+a.paddingRight,y=a.paddingTop+a.paddingBottom,g=a.marginLeft+a.marginRight,v=a.marginTop+a.marginBottom,_=a.borderLeftWidth+a.borderRightWidth,I=a.borderTopWidth+a.borderBottomWidth,z=d&&s,x=t(r.width);x!==!1&&(a.width=x+(z?0:p+_));var S=t(r.height);return S!==!1&&(a.height=S+(z?0:y+I)),a.innerWidth=a.width-(p+_),a.innerHeight=a.height-(y+I),a.outerWidth=a.width+g,a.outerHeight=a.height+v,a}}var s,a="undefined"==typeof console?e:function(t){console.error(t)},u=["paddingLeft","paddingRight","paddingTop","paddingBottom","marginLeft","marginRight","marginTop","marginBottom","borderLeftWidth","borderRightWidth","borderTopWidth","borderBottomWidth"],h=u.length,d=!1;return r}),function(t,e){"use strict";"function"==typeof define&&define.amd?define("desandro-matches-selector/matches-selector",e):"object"==typeof module&&module.exports?module.exports=e():t.matchesSelector=e()}(window,function(){"use strict";var t=function(){var t=Element.prototype;if(t.matches)return"matches";if(t.matchesSelector)return"matchesSelector";for(var e=["webkit","moz","ms","o"],i=0;i<e.length;i++){var n=e[i],o=n+"MatchesSelector";if(t[o])return o}}();return function(e,i){return e[t](i)}}),function(t,e){"function"==typeof define&&define.amd?define("fizzy-ui-utils/utils",["desandro-matches-selector/matches-selector"],function(i){return e(t,i)}):"object"==typeof module&&module.exports?module.exports=e(t,require("desandro-matches-selector")):t.fizzyUIUtils=e(t,t.matchesSelector)}(window,function(t,e){var i={};i.extend=function(t,e){for(var i in e)t[i]=e[i];return t},i.modulo=function(t,e){return(t%e+e)%e},i.makeArray=function(t){var e=[];if(Array.isArray(t))e=t;else if(t&&"number"==typeof t.length)for(var i=0;i<t.length;i++)e.push(t[i]);else e.push(t);return e},i.removeFrom=function(t,e){var i=t.indexOf(e);-1!=i&&t.splice(i,1)},i.getParent=function(t,i){for(;t!=document.body;)if(t=t.parentNode,e(t,i))return t},i.getQueryElement=function(t){return"string"==typeof t?document.querySelector(t):t},i.handleEvent=function(t){var e="on"+t.type;this[e]&&this[e](t)},i.filterFindElements=function(t,n){t=i.makeArray(t);var o=[];return t.forEach(function(t){if(t instanceof HTMLElement){if(!n)return void o.push(t);e(t,n)&&o.push(t);for(var i=t.querySelectorAll(n),r=0;r<i.length;r++)o.push(i[r])}}),o},i.debounceMethod=function(t,e,i){var n=t.prototype[e],o=e+"Timeout";t.prototype[e]=function(){var t=this[o];t&&clearTimeout(t);var e=arguments,r=this;this[o]=setTimeout(function(){n.apply(r,e),delete r[o]},i||100)}},i.docReady=function(t){"complete"==document.readyState?t():document.addEventListener("DOMContentLoaded",t)},i.toDashed=function(t){return t.replace(/(.)([A-Z])/g,function(t,e,i){return e+"-"+i}).toLowerCase()};var n=t.console;return i.htmlInit=function(e,o){i.docReady(function(){var r=i.toDashed(o),s="data-"+r,a=document.querySelectorAll("["+s+"]"),u=document.querySelectorAll(".js-"+r),h=i.makeArray(a).concat(i.makeArray(u)),d=s+"-options",l=t.jQuery;h.forEach(function(t){var i,r=t.getAttribute(s)||t.getAttribute(d);try{i=r&&JSON.parse(r)}catch(a){return void(n&&n.error("Error parsing "+s+" on "+t.className+": "+a))}var u=new e(t,i);l&&l.data(t,o,u)})})},i}),function(t,e){"function"==typeof define&&define.amd?define("outlayer/item",["ev-emitter/ev-emitter","get-size/get-size"],e):"object"==typeof module&&module.exports?module.exports=e(require("ev-emitter"),require("get-size")):(t.Outlayer={},t.Outlayer.Item=e(t.EvEmitter,t.getSize))}(window,function(t,e){"use strict";function i(t){for(var e in t)return!1;return e=null,!0}function n(t,e){t&&(this.element=t,this.layout=e,this.position={x:0,y:0},this._create())}function o(t){return t.replace(/([A-Z])/g,function(t){return"-"+t.toLowerCase()})}var r=document.documentElement.style,s="string"==typeof r.transition?"transition":"WebkitTransition",a="string"==typeof r.transform?"transform":"WebkitTransform",u={WebkitTransition:"webkitTransitionEnd",transition:"transitionend"}[s],h={transform:a,transition:s,transitionDuration:s+"Duration",transitionProperty:s+"Property",transitionDelay:s+"Delay"},d=n.prototype=Object.create(t.prototype);d.constructor=n,d._create=function(){this._transn={ingProperties:{},clean:{},onEnd:{}},this.css({position:"absolute"})},d.handleEvent=function(t){var e="on"+t.type;this[e]&&this[e](t)},d.getSize=function(){this.size=e(this.element)},d.css=function(t){var e=this.element.style;for(var i in t){var n=h[i]||i;e[n]=t[i]}},d.getPosition=function(){var t=getComputedStyle(this.element),e=this.layout._getOption("originLeft"),i=this.layout._getOption("originTop"),n=t[e?"left":"right"],o=t[i?"top":"bottom"],r=this.layout.size,s=-1!=n.indexOf("%")?parseFloat(n)/100*r.width:parseInt(n,10),a=-1!=o.indexOf("%")?parseFloat(o)/100*r.height:parseInt(o,10);s=isNaN(s)?0:s,a=isNaN(a)?0:a,s-=e?r.paddingLeft:r.paddingRight,a-=i?r.paddingTop:r.paddingBottom,this.position.x=s,this.position.y=a},d.layoutPosition=function(){var t=this.layout.size,e={},i=this.layout._getOption("originLeft"),n=this.layout._getOption("originTop"),o=i?"paddingLeft":"paddingRight",r=i?"left":"right",s=i?"right":"left",a=this.position.x+t[o];e[r]=this.getXValue(a),e[s]="";var u=n?"paddingTop":"paddingBottom",h=n?"top":"bottom",d=n?"bottom":"top",l=this.position.y+t[u];e[h]=this.getYValue(l),e[d]="",this.css(e),this.emitEvent("layout",[this])},d.getXValue=function(t){var e=this.layout._getOption("horizontal");return this.layout.options.percentPosition&&!e?t/this.layout.size.width*100+"%":t+"px"},d.getYValue=function(t){var e=this.layout._getOption("horizontal");return this.layout.options.percentPosition&&e?t/this.layout.size.height*100+"%":t+"px"},d._transitionTo=function(t,e){this.getPosition();var i=this.position.x,n=this.position.y,o=parseInt(t,10),r=parseInt(e,10),s=o===this.position.x&&r===this.position.y;if(this.setPosition(t,e),s&&!this.isTransitioning)return void this.layoutPosition();var a=t-i,u=e-n,h={};h.transform=this.getTranslate(a,u),this.transition({to:h,onTransitionEnd:{transform:this.layoutPosition},isCleaning:!0})},d.getTranslate=function(t,e){var i=this.layout._getOption("originLeft"),n=this.layout._getOption("originTop");return t=i?t:-t,e=n?e:-e,"translate3d("+t+"px, "+e+"px, 0)"},d.goTo=function(t,e){this.setPosition(t,e),this.layoutPosition()},d.moveTo=d._transitionTo,d.setPosition=function(t,e){this.position.x=parseInt(t,10),this.position.y=parseInt(e,10)},d._nonTransition=function(t){this.css(t.to),t.isCleaning&&this._removeStyles(t.to);for(var e in t.onTransitionEnd)t.onTransitionEnd[e].call(this)},d.transition=function(t){if(!parseFloat(this.layout.options.transitionDuration))return void this._nonTransition(t);var e=this._transn;for(var i in t.onTransitionEnd)e.onEnd[i]=t.onTransitionEnd[i];for(i in t.to)e.ingProperties[i]=!0,t.isCleaning&&(e.clean[i]=!0);if(t.from){this.css(t.from);var n=this.element.offsetHeight;n=null}this.enableTransition(t.to),this.css(t.to),this.isTransitioning=!0};var l="opacity,"+o(a);d.enableTransition=function(){if(!this.isTransitioning){var t=this.layout.options.transitionDuration;t="number"==typeof t?t+"ms":t,this.css({transitionProperty:l,transitionDuration:t,transitionDelay:this.staggerDelay||0}),this.element.addEventListener(u,this,!1)}},d.onwebkitTransitionEnd=function(t){this.ontransitionend(t)},d.onotransitionend=function(t){this.ontransitionend(t)};var f={"-webkit-transform":"transform"};d.ontransitionend=function(t){if(t.target===this.element){var e=this._transn,n=f[t.propertyName]||t.propertyName;if(delete e.ingProperties[n],i(e.ingProperties)&&this.disableTransition(),n in e.clean&&(this.element.style[t.propertyName]="",delete e.clean[n]),n in e.onEnd){var o=e.onEnd[n];o.call(this),delete e.onEnd[n]}this.emitEvent("transitionEnd",[this])}},d.disableTransition=function(){this.removeTransitionStyles(),this.element.removeEventListener(u,this,!1),this.isTransitioning=!1},d._removeStyles=function(t){var e={};for(var i in t)e[i]="";this.css(e)};var c={transitionProperty:"",transitionDuration:"",transitionDelay:""};return d.removeTransitionStyles=function(){this.css(c)},d.stagger=function(t){t=isNaN(t)?0:t,this.staggerDelay=t+"ms"},d.removeElem=function(){this.element.parentNode.removeChild(this.element),this.css({display:""}),this.emitEvent("remove",[this])},d.remove=function(){return s&&parseFloat(this.layout.options.transitionDuration)?(this.once("transitionEnd",function(){this.removeElem()}),void this.hide()):void this.removeElem()},d.reveal=function(){delete this.isHidden,this.css({display:""});var t=this.layout.options,e={},i=this.getHideRevealTransitionEndProperty("visibleStyle");e[i]=this.onRevealTransitionEnd,this.transition({from:t.hiddenStyle,to:t.visibleStyle,isCleaning:!0,onTransitionEnd:e})},d.onRevealTransitionEnd=function(){this.isHidden||this.emitEvent("reveal")},d.getHideRevealTransitionEndProperty=function(t){var e=this.layout.options[t];if(e.opacity)return"opacity";for(var i in e)return i},d.hide=function(){this.isHidden=!0,this.css({display:""});var t=this.layout.options,e={},i=this.getHideRevealTransitionEndProperty("hiddenStyle");e[i]=this.onHideTransitionEnd,this.transition({from:t.visibleStyle,to:t.hiddenStyle,isCleaning:!0,onTransitionEnd:e})},d.onHideTransitionEnd=function(){this.isHidden&&(this.css({display:"none"}),this.emitEvent("hide"))},d.destroy=function(){this.css({position:"",left:"",right:"",top:"",bottom:"",transition:"",transform:""})},n}),function(t,e){"use strict";"function"==typeof define&&define.amd?define("outlayer/outlayer",["ev-emitter/ev-emitter","get-size/get-size","fizzy-ui-utils/utils","./item"],function(i,n,o,r){return e(t,i,n,o,r)}):"object"==typeof module&&module.exports?module.exports=e(t,require("ev-emitter"),require("get-size"),require("fizzy-ui-utils"),require("./item")):t.Outlayer=e(t,t.EvEmitter,t.getSize,t.fizzyUIUtils,t.Outlayer.Item)}(window,function(t,e,i,n,o){"use strict";function r(t,e){var i=n.getQueryElement(t);if(!i)return void(u&&u.error("Bad element for "+this.constructor.namespace+": "+(i||t)));this.element=i,h&&(this.$element=h(this.element)),this.options=n.extend({},this.constructor.defaults),this.option(e);var o=++l;this.element.outlayerGUID=o,f[o]=this,this._create();var r=this._getOption("initLayout");r&&this.layout()}function s(t){function e(){t.apply(this,arguments)}return e.prototype=Object.create(t.prototype),e.prototype.constructor=e,e}function a(t){if("number"==typeof t)return t;var e=t.match(/(^\d*\.?\d*)(\w*)/),i=e&&e[1],n=e&&e[2];if(!i.length)return 0;i=parseFloat(i);var o=m[n]||1;return i*o}var u=t.console,h=t.jQuery,d=function(){},l=0,f={};r.namespace="outlayer",r.Item=o,r.defaults={containerStyle:{position:"relative"},initLayout:!0,originLeft:!0,originTop:!0,resize:!0,resizeContainer:!0,transitionDuration:"0.4s",hiddenStyle:{opacity:0,transform:"scale(0.001)"},visibleStyle:{opacity:1,transform:"scale(1)"}};var c=r.prototype;n.extend(c,e.prototype),c.option=function(t){n.extend(this.options,t)},c._getOption=function(t){var e=this.constructor.compatOptions[t];return e&&void 0!==this.options[e]?this.options[e]:this.options[t]},r.compatOptions={initLayout:"isInitLayout",horizontal:"isHorizontal",layoutInstant:"isLayoutInstant",originLeft:"isOriginLeft",originTop:"isOriginTop",resize:"isResizeBound",resizeContainer:"isResizingContainer"},c._create=function(){this.reloadItems(),this.stamps=[],this.stamp(this.options.stamp),n.extend(this.element.style,this.options.containerStyle);var t=this._getOption("resize");t&&this.bindResize()},c.reloadItems=function(){this.items=this._itemize(this.element.children)},c._itemize=function(t){for(var e=this._filterFindItemElements(t),i=this.constructor.Item,n=[],o=0;o<e.length;o++){var r=e[o],s=new i(r,this);n.push(s)}return n},c._filterFindItemElements=function(t){return n.filterFindElements(t,this.options.itemSelector)},c.getItemElements=function(){return this.items.map(function(t){return t.element})},c.layout=function(){this._resetLayout(),this._manageStamps();var t=this._getOption("layoutInstant"),e=void 0!==t?t:!this._isLayoutInited;this.layoutItems(this.items,e),this._isLayoutInited=!0},c._init=c.layout,c._resetLayout=function(){this.getSize()},c.getSize=function(){this.size=i(this.element)},c._getMeasurement=function(t,e){var n,o=this.options[t];o?("string"==typeof o?n=this.element.querySelector(o):o instanceof HTMLElement&&(n=o),this[t]=n?i(n)[e]:o):this[t]=0},c.layoutItems=function(t,e){t=this._getItemsForLayout(t),this._layoutItems(t,e),this._postLayout()},c._getItemsForLayout=function(t){return t.filter(function(t){return!t.isIgnored})},c._layoutItems=function(t,e){if(this._emitCompleteOnItems("layout",t),t&&t.length){var i=[];t.forEach(function(t){var n=this._getItemLayoutPosition(t);n.item=t,n.isInstant=e||t.isLayoutInstant,i.push(n)},this),this._processLayoutQueue(i)}},c._getItemLayoutPosition=function(){return{x:0,y:0}},c._processLayoutQueue=function(t){this.updateStagger(),t.forEach(function(t,e){this._positionItem(t.item,t.x,t.y,t.isInstant,e)},this)},c.updateStagger=function(){var t=this.options.stagger;return null===t||void 0===t?void(this.stagger=0):(this.stagger=a(t),this.stagger)},c._positionItem=function(t,e,i,n,o){n?t.goTo(e,i):(t.stagger(o*this.stagger),t.moveTo(e,i))},c._postLayout=function(){this.resizeContainer()},c.resizeContainer=function(){var t=this._getOption("resizeContainer");if(t){var e=this._getContainerSize();e&&(this._setContainerMeasure(e.width,!0),this._setContainerMeasure(e.height,!1))}},c._getContainerSize=d,c._setContainerMeasure=function(t,e){if(void 0!==t){var i=this.size;i.isBorderBox&&(t+=e?i.paddingLeft+i.paddingRight+i.borderLeftWidth+i.borderRightWidth:i.paddingBottom+i.paddingTop+i.borderTopWidth+i.borderBottomWidth),t=Math.max(t,0),this.element.style[e?"width":"height"]=t+"px"}},c._emitCompleteOnItems=function(t,e){function i(){o.dispatchEvent(t+"Complete",null,[e])}function n(){s++,s==r&&i()}var o=this,r=e.length;if(!e||!r)return void i();var s=0;e.forEach(function(e){e.once(t,n)})},c.dispatchEvent=function(t,e,i){var n=e?[e].concat(i):i;if(this.emitEvent(t,n),h)if(this.$element=this.$element||h(this.element),e){var o=h.Event(e);o.type=t,this.$element.trigger(o,i)}else this.$element.trigger(t,i)},c.ignore=function(t){var e=this.getItem(t);e&&(e.isIgnored=!0)},c.unignore=function(t){var e=this.getItem(t);e&&delete e.isIgnored},c.stamp=function(t){t=this._find(t),t&&(this.stamps=this.stamps.concat(t),t.forEach(this.ignore,this))},c.unstamp=function(t){t=this._find(t),t&&t.forEach(function(t){n.removeFrom(this.stamps,t),this.unignore(t)},this)},c._find=function(t){return t?("string"==typeof t&&(t=this.element.querySelectorAll(t)),t=n.makeArray(t)):void 0},c._manageStamps=function(){this.stamps&&this.stamps.length&&(this._getBoundingRect(),this.stamps.forEach(this._manageStamp,this))},c._getBoundingRect=function(){var t=this.element.getBoundingClientRect(),e=this.size;this._boundingRect={left:t.left+e.paddingLeft+e.borderLeftWidth,top:t.top+e.paddingTop+e.borderTopWidth,right:t.right-(e.paddingRight+e.borderRightWidth),bottom:t.bottom-(e.paddingBottom+e.borderBottomWidth)}},c._manageStamp=d,c._getElementOffset=function(t){var e=t.getBoundingClientRect(),n=this._boundingRect,o=i(t),r={left:e.left-n.left-o.marginLeft,top:e.top-n.top-o.marginTop,right:n.right-e.right-o.marginRight,bottom:n.bottom-e.bottom-o.marginBottom};return r},c.handleEvent=n.handleEvent,c.bindResize=function(){t.addEventListener("resize",this),this.isResizeBound=!0},c.unbindResize=function(){t.removeEventListener("resize",this),this.isResizeBound=!1},c.onresize=function(){this.resize()},n.debounceMethod(r,"onresize",100),c.resize=function(){this.isResizeBound&&this.needsResizeLayout()&&this.layout()},c.needsResizeLayout=function(){var t=i(this.element),e=this.size&&t;return e&&t.innerWidth!==this.size.innerWidth},c.addItems=function(t){var e=this._itemize(t);return e.length&&(this.items=this.items.concat(e)),e},c.appended=function(t){var e=this.addItems(t);e.length&&(this.layoutItems(e,!0),this.reveal(e))},c.prepended=function(t){var e=this._itemize(t);if(e.length){var i=this.items.slice(0);this.items=e.concat(i),this._resetLayout(),this._manageStamps(),this.layoutItems(e,!0),this.reveal(e),this.layoutItems(i)}},c.reveal=function(t){if(this._emitCompleteOnItems("reveal",t),t&&t.length){var e=this.updateStagger();t.forEach(function(t,i){t.stagger(i*e),t.reveal()})}},c.hide=function(t){if(this._emitCompleteOnItems("hide",t),t&&t.length){var e=this.updateStagger();t.forEach(function(t,i){t.stagger(i*e),t.hide()})}},c.revealItemElements=function(t){var e=this.getItems(t);this.reveal(e)},c.hideItemElements=function(t){var e=this.getItems(t);this.hide(e)},c.getItem=function(t){for(var e=0;e<this.items.length;e++){var i=this.items[e];if(i.element==t)return i}},c.getItems=function(t){t=n.makeArray(t);var e=[];return t.forEach(function(t){var i=this.getItem(t);i&&e.push(i)},this),e},c.remove=function(t){var e=this.getItems(t);this._emitCompleteOnItems("remove",e),e&&e.length&&e.forEach(function(t){t.remove(),n.removeFrom(this.items,t)},this)},c.destroy=function(){var t=this.element.style;t.height="",t.position="",t.width="",this.items.forEach(function(t){t.destroy()}),this.unbindResize();var e=this.element.outlayerGUID;delete f[e],delete this.element.outlayerGUID,h&&h.removeData(this.element,this.constructor.namespace)},r.data=function(t){t=n.getQueryElement(t);var e=t&&t.outlayerGUID;return e&&f[e]},r.create=function(t,e){var i=s(r);return i.defaults=n.extend({},r.defaults),n.extend(i.defaults,e),i.compatOptions=n.extend({},r.compatOptions),i.namespace=t,i.data=r.data,i.Item=s(o),n.htmlInit(i,t),h&&h.bridget&&h.bridget(t,i),i};var m={ms:1,s:1e3};return r.Item=o,r}),function(t,e){"function"==typeof define&&define.amd?define("isotope/item",["outlayer/outlayer"],e):"object"==typeof module&&module.exports?module.exports=e(require("outlayer")):(t.Isotope=t.Isotope||{},t.Isotope.Item=e(t.Outlayer))}(window,function(t){"use strict";function e(){t.Item.apply(this,arguments)}var i=e.prototype=Object.create(t.Item.prototype),n=i._create;i._create=function(){this.id=this.layout.itemGUID++,n.call(this),this.sortData={}},i.updateSortData=function(){if(!this.isIgnored){this.sortData.id=this.id,this.sortData["original-order"]=this.id,this.sortData.random=Math.random();var t=this.layout.options.getSortData,e=this.layout._sorters;for(var i in t){var n=e[i];this.sortData[i]=n(this.element,this)}}};var o=i.destroy;return i.destroy=function(){o.apply(this,arguments),this.css({display:""})},e}),function(t,e){"function"==typeof define&&define.amd?define("isotope/layout-mode",["get-size/get-size","outlayer/outlayer"],e):"object"==typeof module&&module.exports?module.exports=e(require("get-size"),require("outlayer")):(t.Isotope=t.Isotope||{},t.Isotope.LayoutMode=e(t.getSize,t.Outlayer))}(window,function(t,e){"use strict";function i(t){this.isotope=t,t&&(this.options=t.options[this.namespace],this.element=t.element,this.items=t.filteredItems,this.size=t.size)}var n=i.prototype,o=["_resetLayout","_getItemLayoutPosition","_manageStamp","_getContainerSize","_getElementOffset","needsResizeLayout","_getOption"];return o.forEach(function(t){n[t]=function(){return e.prototype[t].apply(this.isotope,arguments)}}),n.needsVerticalResizeLayout=function(){var e=t(this.isotope.element),i=this.isotope.size&&e;return i&&e.innerHeight!=this.isotope.size.innerHeight},n._getMeasurement=function(){this.isotope._getMeasurement.apply(this,arguments)},n.getColumnWidth=function(){this.getSegmentSize("column","Width")},n.getRowHeight=function(){this.getSegmentSize("row","Height")},n.getSegmentSize=function(t,e){var i=t+e,n="outer"+e;if(this._getMeasurement(i,n),!this[i]){var o=this.getFirstItemSize();this[i]=o&&o[n]||this.isotope.size["inner"+e]}},n.getFirstItemSize=function(){var e=this.isotope.filteredItems[0];return e&&e.element&&t(e.element)},n.layout=function(){this.isotope.layout.apply(this.isotope,arguments)},n.getSize=function(){this.isotope.getSize(),this.size=this.isotope.size},i.modes={},i.create=function(t,e){function o(){i.apply(this,arguments)}return o.prototype=Object.create(n),o.prototype.constructor=o,e&&(o.options=e),o.prototype.namespace=t,i.modes[t]=o,o},i}),function(t,e){"function"==typeof define&&define.amd?define("masonry/masonry",["outlayer/outlayer","get-size/get-size"],e):"object"==typeof module&&module.exports?module.exports=e(require("outlayer"),require("get-size")):t.Masonry=e(t.Outlayer,t.getSize)}(window,function(t,e){var i=t.create("masonry");return i.compatOptions.fitWidth="isFitWidth",i.prototype._resetLayout=function(){this.getSize(),this._getMeasurement("columnWidth","outerWidth"),this._getMeasurement("gutter","outerWidth"),this.measureColumns(),this.colYs=[];for(var t=0;t<this.cols;t++)this.colYs.push(0);this.maxY=0},i.prototype.measureColumns=function(){if(this.getContainerWidth(),!this.columnWidth){var t=this.items[0],i=t&&t.element;this.columnWidth=i&&e(i).outerWidth||this.containerWidth}var n=this.columnWidth+=this.gutter,o=this.containerWidth+this.gutter,r=o/n,s=n-o%n,a=s&&1>s?"round":"floor";r=Math[a](r),this.cols=Math.max(r,1)},i.prototype.getContainerWidth=function(){var t=this._getOption("fitWidth"),i=t?this.element.parentNode:this.element,n=e(i);this.containerWidth=n&&n.innerWidth},i.prototype._getItemLayoutPosition=function(t){t.getSize();var e=t.size.outerWidth%this.columnWidth,i=e&&1>e?"round":"ceil",n=Math[i](t.size.outerWidth/this.columnWidth);n=Math.min(n,this.cols);for(var o=this._getColGroup(n),r=Math.min.apply(Math,o),s=o.indexOf(r),a={x:this.columnWidth*s,y:r},u=r+t.size.outerHeight,h=this.cols+1-o.length,d=0;h>d;d++)this.colYs[s+d]=u;return a},i.prototype._getColGroup=function(t){if(2>t)return this.colYs;for(var e=[],i=this.cols+1-t,n=0;i>n;n++){var o=this.colYs.slice(n,n+t);e[n]=Math.max.apply(Math,o)}return e},i.prototype._manageStamp=function(t){var i=e(t),n=this._getElementOffset(t),o=this._getOption("originLeft"),r=o?n.left:n.right,s=r+i.outerWidth,a=Math.floor(r/this.columnWidth);a=Math.max(0,a);var u=Math.floor(s/this.columnWidth);u-=s%this.columnWidth?0:1,u=Math.min(this.cols-1,u);for(var h=this._getOption("originTop"),d=(h?n.top:n.bottom)+i.outerHeight,l=a;u>=l;l++)this.colYs[l]=Math.max(d,this.colYs[l])},i.prototype._getContainerSize=function(){this.maxY=Math.max.apply(Math,this.colYs);var t={height:this.maxY};return this._getOption("fitWidth")&&(t.width=this._getContainerFitWidth()),t},i.prototype._getContainerFitWidth=function(){for(var t=0,e=this.cols;--e&&0===this.colYs[e];)t++;return(this.cols-t)*this.columnWidth-this.gutter},i.prototype.needsResizeLayout=function(){var t=this.containerWidth;return this.getContainerWidth(),t!=this.containerWidth},i}),function(t,e){"function"==typeof define&&define.amd?define("isotope/layout-modes/masonry",["../layout-mode","masonry/masonry"],e):"object"==typeof module&&module.exports?module.exports=e(require("../layout-mode"),require("masonry-layout")):e(t.Isotope.LayoutMode,t.Masonry)}(window,function(t,e){"use strict";var i=t.create("masonry"),n=i.prototype,o={_getElementOffset:!0,layout:!0,_getMeasurement:!0};for(var r in e.prototype)o[r]||(n[r]=e.prototype[r]);var s=n.measureColumns;n.measureColumns=function(){this.items=this.isotope.filteredItems,s.call(this)};var a=n._getOption;return n._getOption=function(t){return"fitWidth"==t?void 0!==this.options.isFitWidth?this.options.isFitWidth:this.options.fitWidth:a.apply(this.isotope,arguments)},i}),function(t,e){"function"==typeof define&&define.amd?define("isotope/layout-modes/fit-rows",["../layout-mode"],e):"object"==typeof exports?module.exports=e(require("../layout-mode")):e(t.Isotope.LayoutMode)}(window,function(t){"use strict";var e=t.create("fitRows"),i=e.prototype;return i._resetLayout=function(){this.x=0,this.y=0,this.maxY=0,this._getMeasurement("gutter","outerWidth")},i._getItemLayoutPosition=function(t){t.getSize();var e=t.size.outerWidth+this.gutter,i=this.isotope.size.innerWidth+this.gutter;0!==this.x&&e+this.x>i&&(this.x=0,this.y=this.maxY);var n={x:this.x,y:this.y};return this.maxY=Math.max(this.maxY,this.y+t.size.outerHeight),this.x+=e,n},i._getContainerSize=function(){return{height:this.maxY}},e}),function(t,e){"function"==typeof define&&define.amd?define("isotope/layout-modes/vertical",["../layout-mode"],e):"object"==typeof module&&module.exports?module.exports=e(require("../layout-mode")):e(t.Isotope.LayoutMode)}(window,function(t){"use strict";var e=t.create("vertical",{horizontalAlignment:0}),i=e.prototype;return i._resetLayout=function(){this.y=0},i._getItemLayoutPosition=function(t){t.getSize();var e=(this.isotope.size.innerWidth-t.size.outerWidth)*this.options.horizontalAlignment,i=this.y;return this.y+=t.size.outerHeight,{x:e,y:i}},i._getContainerSize=function(){return{height:this.y}},e}),function(t,e){"function"==typeof define&&define.amd?define(["outlayer/outlayer","get-size/get-size","desandro-matches-selector/matches-selector","fizzy-ui-utils/utils","./item","./layout-mode","./layout-modes/masonry","./layout-modes/fit-rows","./layout-modes/vertical"],function(i,n,o,r,s,a){return e(t,i,n,o,r,s,a)}):"object"==typeof module&&module.exports?module.exports=e(t,require("outlayer"),require("get-size"),require("desandro-matches-selector"),require("fizzy-ui-utils"),require("./item"),require("./layout-mode"),require("./layout-modes/masonry"),require("./layout-modes/fit-rows"),require("./layout-modes/vertical")):t.Isotope=e(t,t.Outlayer,t.getSize,t.matchesSelector,t.fizzyUIUtils,t.Isotope.Item,t.Isotope.LayoutMode)}(window,function(t,e,i,n,o,r,s){function a(t,e){return function(i,n){for(var o=0;o<t.length;o++){var r=t[o],s=i.sortData[r],a=n.sortData[r];if(s>a||a>s){var u=void 0!==e[r]?e[r]:e,h=u?1:-1;return(s>a?1:-1)*h}}return 0}}var u=t.jQuery,h=String.prototype.trim?function(t){return t.trim()}:function(t){return t.replace(/^\s+|\s+$/g,"")},d=e.create("isotope",{layoutMode:"masonry",isJQueryFiltering:!0,sortAscending:!0});d.Item=r,d.LayoutMode=s;var l=d.prototype;l._create=function(){this.itemGUID=0,this._sorters={},this._getSorters(),e.prototype._create.call(this),this.modes={},this.filteredItems=this.items,this.sortHistory=["original-order"];for(var t in s.modes)this._initLayoutMode(t)},l.reloadItems=function(){this.itemGUID=0,e.prototype.reloadItems.call(this)},l._itemize=function(){for(var t=e.prototype._itemize.apply(this,arguments),i=0;i<t.length;i++){var n=t[i];n.id=this.itemGUID++}return this._updateItemsSortData(t),t},l._initLayoutMode=function(t){var e=s.modes[t],i=this.options[t]||{};this.options[t]=e.options?o.extend(e.options,i):i,this.modes[t]=new e(this)},l.layout=function(){return!this._isLayoutInited&&this._getOption("initLayout")?void this.arrange():void this._layout()},l._layout=function(){var t=this._getIsInstant();this._resetLayout(),this._manageStamps(),this.layoutItems(this.filteredItems,t),this._isLayoutInited=!0},l.arrange=function(t){this.option(t),this._getIsInstant();var e=this._filter(this.items);this.filteredItems=e.matches,this._bindArrangeComplete(),this._isInstant?this._noTransition(this._hideReveal,[e]):this._hideReveal(e),this._sort(),this._layout()},l._init=l.arrange,l._hideReveal=function(t){this.reveal(t.needReveal),this.hide(t.needHide)},l._getIsInstant=function(){var t=this._getOption("layoutInstant"),e=void 0!==t?t:!this._isLayoutInited;return this._isInstant=e,e},l._bindArrangeComplete=function(){function t(){e&&i&&n&&o.dispatchEvent("arrangeComplete",null,[o.filteredItems])}var e,i,n,o=this;this.once("layoutComplete",function(){e=!0,t()}),this.once("hideComplete",function(){i=!0,t()}),this.once("revealComplete",function(){n=!0,t()})},l._filter=function(t){var e=this.options.filter;e=e||"*";for(var i=[],n=[],o=[],r=this._getFilterTest(e),s=0;s<t.length;s++){var a=t[s];if(!a.isIgnored){var u=r(a);u&&i.push(a),u&&a.isHidden?n.push(a):u||a.isHidden||o.push(a)}}return{matches:i,needReveal:n,needHide:o}},l._getFilterTest=function(t){return u&&this.options.isJQueryFiltering?function(e){return u(e.element).is(t)}:"function"==typeof t?function(e){return t(e.element)}:function(e){return n(e.element,t)}},l.updateSortData=function(t){var e;t?(t=o.makeArray(t),e=this.getItems(t)):e=this.items,this._getSorters(),this._updateItemsSortData(e)},l._getSorters=function(){var t=this.options.getSortData;for(var e in t){var i=t[e];this._sorters[e]=f(i)}},l._updateItemsSortData=function(t){for(var e=t&&t.length,i=0;e&&e>i;i++){var n=t[i];n.updateSortData()}};var f=function(){function t(t){if("string"!=typeof t)return t;var i=h(t).split(" "),n=i[0],o=n.match(/^\[(.+)\]$/),r=o&&o[1],s=e(r,n),a=d.sortDataParsers[i[1]];return t=a?function(t){return t&&a(s(t))}:function(t){return t&&s(t)}}function e(t,e){return t?function(e){return e.getAttribute(t)}:function(t){var i=t.querySelector(e);
return i&&i.textContent}}return t}();d.sortDataParsers={parseInt:function(t){return parseInt(t,10)},parseFloat:function(t){return parseFloat(t)}},l._sort=function(){var t=this.options.sortBy;if(t){var e=[].concat.apply(t,this.sortHistory),i=a(e,this.options.sortAscending);this.filteredItems.sort(i),t!=this.sortHistory[0]&&this.sortHistory.unshift(t)}},l._mode=function(){var t=this.options.layoutMode,e=this.modes[t];if(!e)throw new Error("No layout mode: "+t);return e.options=this.options[t],e},l._resetLayout=function(){e.prototype._resetLayout.call(this),this._mode()._resetLayout()},l._getItemLayoutPosition=function(t){return this._mode()._getItemLayoutPosition(t)},l._manageStamp=function(t){this._mode()._manageStamp(t)},l._getContainerSize=function(){return this._mode()._getContainerSize()},l.needsResizeLayout=function(){return this._mode().needsResizeLayout()},l.appended=function(t){var e=this.addItems(t);if(e.length){var i=this._filterRevealAdded(e);this.filteredItems=this.filteredItems.concat(i)}},l.prepended=function(t){var e=this._itemize(t);if(e.length){this._resetLayout(),this._manageStamps();var i=this._filterRevealAdded(e);this.layoutItems(this.filteredItems),this.filteredItems=i.concat(this.filteredItems),this.items=e.concat(this.items)}},l._filterRevealAdded=function(t){var e=this._filter(t);return this.hide(e.needHide),this.reveal(e.matches),this.layoutItems(e.matches,!0),e.matches},l.insert=function(t){var e=this.addItems(t);if(e.length){var i,n,o=e.length;for(i=0;o>i;i++)n=e[i],this.element.appendChild(n.element);var r=this._filter(e).matches;for(i=0;o>i;i++)e[i].isLayoutInstant=!0;for(this.arrange(),i=0;o>i;i++)delete e[i].isLayoutInstant;this.reveal(r)}};var c=l.remove;return l.remove=function(t){t=o.makeArray(t);var e=this.getItems(t);c.call(this,t);for(var i=e&&e.length,n=0;i&&i>n;n++){var r=e[n];o.removeFrom(this.filteredItems,r)}},l.shuffle=function(){for(var t=0;t<this.items.length;t++){var e=this.items[t];e.sortData.random=Math.random()}this.options.sortBy="random",this._sort(),this._layout()},l._noTransition=function(t,e){var i=this.options.transitionDuration;this.options.transitionDuration=0;var n=t.apply(this,e);return this.options.transitionDuration=i,n},l.getFilteredItemElements=function(){return this.filteredItems.map(function(t){return t.element})},d});
$(function(){

  // sliders
  $('.slider1').sss({
    slideShow : true, // Set to false to prevent SSS from automatically animating.
    startOn : 0, // Slide to display first. Uses array notation (0 = first slide).
    transition : 400, // Length (in milliseconds) of the fade transition.
    speed : 3500, // Slideshow speed in milliseconds.
    showNav : true // Set to false to hide navigation arrows.
  });
  $('.slider2').sss({
    slideShow : true, // Set to false to prevent SSS from automatically animating.
    startOn : 1, // Slide to display first. Uses array notation (0 = first slide).
    transition : 400, // Length (in milliseconds) of the fade transition.
    speed : 3500, // Slideshow speed in milliseconds.
    showNav : true // Set to false to hide navigation arrows.
  });
  $('.slider3').sss({
    slideShow : true, // Set to false to prevent SSS from automatically animating.
    startOn : 2, // Slide to display first. Uses array notation (0 = first slide).
    transition : 400, // Length (in milliseconds) of the fade transition.
    speed : 3500, // Slideshow speed in milliseconds.
    showNav : true // Set to false to hide navigation arrows.
  });

  jQuery.support.cors = true;

  // создание оборачивающего дива для кастомного grid
  var $undertile = $('.undertile');
  $('<div class="grid"></div>').insertBefore($undertile);

  var $grid = $('.grid');
  $grid.append('<div class="grid-sizer"></div>');
  var $search = "";

  // старт поиска по нажатию кнопки или Enter
  $( ".search_partners" ).on('click', searching);
  $( ".tiles_input" ).on('keypress', function(e) {
    if(e.which == 13) {
        searching();
    }
  });

  function searching() {
    $search = $( '.tiles_input' ).val();
    $('.grid-item').remove();
    $('.noResults').remove();

    // получение данных поискового запроса
    var API_KEY = '2574751-d32821dd6594ad25f642f93c2';
    var URL = "https://pixabay.com/api/?key="+API_KEY+"&per_page=7"+"&q="+encodeURIComponent($search);

    $.getJSON(URL, function(data) {

        if (parseInt(data.totalHits) > 0){

            $.each(data.hits, function(i, hit) {

              function parseUrl( url, tags ) {
                  var $img = $('<img>');
                  $img.src = url;
                  var tag = tags.split(",");
                  var $tagText = tag[Math.floor(Math.random() * tag.length)];

                  var $links = $('<a href='+ $img.src +'><img src=' + $img.src + '><p class="tile_header">' + $tagText + '</p></a>');

                  $grid.append(
                    $('<div>')
                      .attr('class', 'grid-item')
                      .append($links)
                  );

                  $links.attr('target', "_blank");
                    $('.grid-item img').attr({
                        class: 'gridImg'
                    });

                  return $img;
              }

              parseUrl(hit.webformatURL, hit.tags);
            });

        } else {
          $('<p class = "noResults">').insertBefore($undertile);
            $('.noResults').text('К сожалению результаты поиска отсутсвуют, попробуйте еще раз...');
        }
    });
  }

  searching();

  // init Isotope
  var $grid = $('.grid').isotope({
    itemSelector: '.grid-item',
    percentPosition: true,
    masonry: {
      columnWidth: '.grid-sizer'
    }
  });
  // layout Isotope after each image loads
  $grid.imagesLoaded().progress( function() {
    $grid.isotope('layout');
  });


});
/** Super Simple Slider by @intllgnt **/

;(function($, window, document, undefined ) {

$.fn.sss = function(options) {

// Options

	var settings = $.extend({
	slideShow : true,
	startOn : 0,
	speed : 3500,
	transition : 400,
	arrows : true
	}, options);

	return this.each(function() {

// Variables

	var
	wrapper = $(this),
	slides = wrapper.children().wrapAll('<div class="sss"/>').addClass('ssslide'),
	slider = wrapper.find('.sss'),
	slide_count = slides.length,
	transition = settings.transition,
	starting_slide = settings.startOn,
	target = starting_slide > slide_count - 1 ? 0 : starting_slide,
	animating = false,
	clicked,
	timer,
	key,
	prev,
	next,

// Reset Slideshow

	reset_timer = settings.slideShow ? function() {
	clearTimeout(timer);
	timer = setTimeout(next_slide, settings.speed);
	} : $.noop;

// Animate Slider

	function get_height(target) {
	return ((slides.eq(target).height() / slider.width()) * 100) + '%';
	}

	function animate_slide(target) {
	if (!animating) {
	animating = true;
	var target_slide = slides.eq(target);

	target_slide.fadeIn(transition);
	slides.not(target_slide).fadeOut(transition);

	slider.animate({paddingBottom: get_height(target)}, transition,  function() {
	animating = false;
	});

	reset_timer();

	}};

// Next Slide

	function next_slide() {
	target = target === slide_count - 1 ? 0 : target + 1;
	animate_slide(target);
	}

// Prev Slide

	function prev_slide() {
	target = target === 0 ? slide_count - 1 : target - 1;
	animate_slide(target);
	}

	if (settings.arrows) {
	slider.append('<div class="sssprev"/>', '<div class="sssnext"/>');
	}

	next = slider.find('.sssnext'),
	prev = slider.find('.sssprev');

	$(window).load(function() {

	slider.css({paddingBottom: get_height(target)}).click(function(e) {
	clicked = $(e.target);
	if (clicked.is(next)) { next_slide() }
	else if (clicked.is(prev)) { prev_slide() }
	});

	animate_slide(target);

	$(document).keydown(function(e) {
	key = e.keyCode;
	if (key === 39) { next_slide() }
	else if (key === 37) { prev_slide() }
	});

	});
// End

});

};
})(jQuery, window, document);