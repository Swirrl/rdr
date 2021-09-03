/** @internal */
const PROC_TAGS = {
    "?xml": "?>\n",
    "!DOCTYPE": ">\n",
    "!ENTITY": ">\n",
    "!ELEMENT": ">\n",
    "!ATTLIST": ">\n",
};
/** @internal */
const ENTITIES = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
};
/** @internal */
const RE_TAG = /^([^\s\.#]+)(?:#([^\s\.#]+))?(?:\.([^\s#]+))?$/;
/** @internal */
const RE_ENTITY = new RegExp(`[${Object.keys(ENTITIES).join("")}]`, "g");
/** @internal */
const COMMENT = "__COMMENT__";
/** @internal */
const CDATA = "!CDATA";
/** @internal */
const NO_SPANS = {
    button: 1,
    option: 1,
    script: 1,
    style: 1,
    text: 1,
    textarea: 1,
    title: 1,
};
const tagMap = (tags) => tags.split(" ").reduce((acc, x) => ((acc[x] = true), acc), {});
/** @internal */
// tslint:disable-next-line
const SVG_TAGS = tagMap("animate animateColor animateMotion animateTransform circle clipPath color-profile defs desc discard ellipse feBlend feColorMatrix feComponentTransfer feComposite feConvolveMatrix feDiffuseLighting feDisplacementMap feDistantLight feDropShadow feFlood feFuncA feFuncB feFuncG feFuncR feGaussianBlur feImage feMerge feMergeNode feMorphology feOffset fePointLight feSpecularLighting feSpotLight feTile feTurbulence filter font foreignObject g image line linearGradient marker mask metadata mpath path pattern polygon polyline radialGradient rect set stop style svg switch symbol text textPath title tref tspan use view");
/** @internal */
// tslint:disable-next-line
const VOID_TAGS = tagMap("area base br col command embed hr img input keygen link meta param source stop track use wbr ?xml");
/** @internal */
// tslint:disable-next-line
const NO_CLOSE_EMPTY = tagMap("animate circle ellipse line path polygon polyline rect");
/** @internal */
const ATTRIB_JOIN_DELIMS = {
    accept: ",",
    sizes: ",",
    srcset: ",",
};

/**
 * Returns true iff `x` implements {@link IDeref}.
 *
 * @param x
 */
const isDeref = (x) => x != null && typeof x["deref"] === "function";
/**
 * If `x` implements {@link IDeref}, returns its wrapped value, else
 * returns `x` itself.
 *
 * @param x -
 */
const deref = (x) => (isDeref(x) ? x.deref() : x);

const isFunction = (x) => typeof x === "function";

const implementsFunction = (x, fn) => x != null && typeof x[fn] === "function";

const isArray = Array.isArray;

const isString = (x) => typeof x === "string";

const isNotStringAndIterable = (x) => x != null &&
    typeof x !== "string" &&
    typeof x[Symbol.iterator] === "function";

const OBJP = Object.getPrototypeOf;
/**
 * Similar to {@link isObject}, but also checks if prototype is that of
 * `Object` (or `null`).
 *
 * @param x -
 */
const isPlainObject = (x) => {
    let p;
    return (x != null &&
        typeof x === "object" &&
        ((p = OBJP(x)) === null || OBJP(p) === null));
};

/**
 * Takes a space separated string of existing CSS class names and merges
 * it with `val`, which is either another string of class names, an
 * object of booleans or an `IDeref` evaluating to either. Returns
 * updated class string.
 *
 * @remarks
 * If `val` evaluates to a string, it will be appended to `existing`.
 *
 * If `val` is an object, its keys are used as class names and their
 * values indicate if the class should be added or removed from the
 * existing set.
 *
 * @example
 * ```ts
 * mergeClasses("foo bar", { foo: false, baz: true })
 * // "bar baz"
 *
 * mergeClasses("foo bar", "baz");
 * // "baz"
 * ```
 *
 * @param existing
 * @param val
 */
const mergeClasses = (existing, val) => {
    val = deref(val);
    if (val == null)
        return existing;
    if (isString(val))
        return existing + " " + val;
    const classes = new Set(existing.split(" "));
    for (let id in val) {
        deref(val[id]) ? classes.add(id) : classes.delete(id);
    }
    return [...classes].join(" ");
};
/**
 * Takes an attrib object and optional element ID and CSS class names from Emmet-style
 * hiccup tag, then transforms and merges definitions, returns attribs.
 *
 * @param attribs
 * @param id
 * @param classes
 */
const mergeEmmetAttribs = (attribs, id, classes) => {
    id && (attribs.id = id);
    let aclass = deref(attribs.class);
    if (classes) {
        classes = classes.replace(/\./g, " ");
        attribs.class = aclass ? mergeClasses(classes, aclass) : classes;
    }
    else if (aclass) {
        attribs.class = isString(aclass) ? aclass : mergeClasses("", aclass);
    }
    return attribs;
};

const css = (rules) => {
    let css = "";
    let v;
    for (let r in rules) {
        v = deref(rules[r]);
        isFunction(v) && (v = v(rules));
        v != null && (css += `${r}:${v};`);
    }
    return css;
};

const escape = (x) => x.replace(RE_ENTITY, (y) => ENTITIES[y]);

const defError = (prefix, suffix = (msg) => (msg !== undefined ? ": " + msg : "")) => class extends Error {
    constructor(msg) {
        super(prefix(msg) + suffix(msg));
    }
};

const IllegalArgumentError = defError(() => "illegal argument(s)");
const illegalArgs = (msg) => {
    throw new IllegalArgumentError(msg);
};

const normalize = (tag) => {
    let name = tag[0];
    let match;
    const hasAttribs = isPlainObject(tag[1]);
    const attribs = hasAttribs ? Object.assign({}, tag[1]) : {};
    if (!isString(name) || !(match = RE_TAG.exec(name))) {
        illegalArgs(`"${name}" is not a valid tag name`);
    }
    name = match[1];
    mergeEmmetAttribs(attribs, match[2], match[3]);
    if (tag.length > 1) {
        tag = tag.slice(hasAttribs ? 2 : 1).filter((x) => x != null);
        if (tag.length > 0) {
            return [name, attribs, tag];
        }
    }
    return [name, attribs];
};

/**
 * Takes an object of RDF/XML prefixes and returns formatted string for
 * the RDFa `prefix` attribute.
 *
 * @example
 * ```ts
 * import { foaf, xsd } from "@thi.ng/prefixes";
 *
 * formatPrefixes({ foaf, xsd })
 * // "foaf: http://xmlns.com/foaf/0.1/ rdf: http://www.w3.org/2001/XMLSchema#"
 * ```
 *
 * @param prefixes -
 */
const formatPrefixes = (prefixes) => Object.keys(prefixes)
    .reduce((acc, k) => (acc.push(`${k}: ${prefixes[k]}`), acc), [])
    .join(" ");

/**
 * Recursively normalizes and serializes given tree as HTML/SVG/XML
 * string. Expands any embedded component functions with their results.
 *
 * @remarks
 * Each node of the input tree can have one of the following input
 * forms:
 *
 * ```js
 * ["tag", ...]
 * ["tag#id.class1.class2", ...]
 * ["tag", {other: "attrib"}, ...]
 * ["tag", {...}, "body", function, ...]
 * [function, arg1, arg2, ...]
 * [{render: (ctx,...) => [...]}, args...]
 * iterable
 * ```
 *
 * Tags can be defined in "Zencoding" convention, e.g.
 *
 * ```js
 * ["div#foo.bar.baz", "hi"] // <div id="foo" class="bar baz">hi</div>
 * ```
 *
 * The presence of the attributes object (2nd array index) is optional.
 * Any attribute values, incl. functions are allowed. If the latter, the
 * function is called with the full attribs object as argument and the
 * return value is used for the attribute. This allows for the dynamic
 * creation of attrib values based on other attribs. The only exception
 * to this are event attributes, i.e. attribute names starting with
 * "on". Function values assigned to event attributes will be omitted
 * from the output.
 *
 * ```js
 * ["div#foo", { bar: (attribs) => attribs.id + "-bar" }]
 * // <div id="foo" bar="foo-bar"></div>
 * ```
 *
 * The `style` attribute can ONLY be defined as string or object.
 *
 * ```js
 * ["div", {style: {color: "red", background: "#000"}}]
 * // <div style="color:red;background:#000;"></div>
 * ```
 *
 * Boolean attribs are serialized in HTML5 syntax (present or not).
 * `null`, `undefined` or empty string attrib values are ignored.
 *
 * Any `null` or `undefined` array values (other than in head position)
 * will also be removed, unless a function is in head position.
 *
 * A function in head position of a node acts as a mechanism for
 * component composition & delayed execution. The function will only be
 * executed at serialization time. In this case the optional global
 * context object and all other elements of that node / array are passed
 * as arguments when that function is called. The return value the
 * function MUST be a valid new tree (or `undefined`).
 *
 * If the `ctx` object it'll be passed to each embedded component fns.
 * Optionally call {@link derefContext} prior to {@link serialize} to
 * auto-deref context keys with values implementing the
 * {@link @thi.ng/api#IDeref} interface.
 *
 * ```js
 * const foo = (ctx, a, b) => ["div#" + a, ctx.foo, b];
 *
 * serialize([foo, "id", "body"], { foo: { class: "black" } })
 * // <div id="id" class="black">body</div>
 * ```
 *
 * Functions located in other positions are called ONLY with the global
 * context arg and can return any (serializable) value (i.e. new trees,
 * strings, numbers, iterables or any type with a suitable
 * `.toString()`, `.toHiccup()` or `.deref()` implementation).
 *
 * If the optional `span` flag is true (default: false), all text
 * content will be wrapped in <span> elements (this is to ensure DOM
 * compatibility with hdom). The only elements for spans are never
 * created are listed in `NO_SPANS` in `api.ts`.
 *
 * If the optional `keys` flag is true (default: false), all elements
 * will have an autogenerated `key` attribute injected. If `span` is
 * enabled, `keys` will be enabled by default too (since in this case we
 * assume the output is meant to be compatible with
 * {@link @thi.ng/hdom# | @thi.ng/hdom}).
 *
 * hiccup & hdom control attributes (i.e. attrib names prefixed with
 * `__`) will be omitted from the output. The only control attrib
 * supported by this package is `__serialize`. If set to `false`, the
 * entire tree branch will be excluded from the output.
 *
 * Single or multiline comments can be included using the special
 * `COMMENT` tag (`__COMMENT__`) (always WITHOUT attributes!).
 *
 * ```
 * [COMMENT, "Hello world"]
 * // <!-- Hello world -->
 *
 * [COMMENT, "Hello", "world"]
 * <!--
 *     Hello
 *     world
 * -->
 * ```
 *
 * Currently, the only processing / DTD instructions supported are:
 *
 * - `?xml`
 * - `!DOCTYTPE`
 * - `!ELEMENT`
 * - `!ENTITY`
 * - `!ATTLIST`
 *
 * These are used as follows (attribs are only allowed for `?xml`, all
 * others only accept a body string which is taken as is):
 *
 * ```
 * ["?xml", { version: "1.0", standalone: "yes" }]
 * // <?xml version="1.0" standalone="yes"?>
 *
 * ["!DOCTYPE", "html"]
 * // <!DOCTYPE html>
 * ```
 *
 * @param tree - hiccup elements / component tree
 * @param ctx - arbitrary user context object
 * @param escape - auto-escape entities
 * @param span - use spans for text content
 * @param keys - attach key attribs
 */
const serialize = (tree, ctx, escape = false, span = false, keys = span, path = [0]) => _serialize(tree, ctx, escape, span, keys, path);
const _serialize = (tree, ctx, esc, span, keys, path) => tree == null
    ? ""
    : Array.isArray(tree)
        ? serializeElement(tree, ctx, esc, span, keys, path)
        : isFunction(tree)
            ? _serialize(tree(ctx), ctx, esc, span, keys, path)
            : implementsFunction(tree, "toHiccup")
                ? _serialize(tree.toHiccup(ctx), ctx, esc, span, keys, path)
                : isDeref(tree)
                    ? _serialize(tree.deref(), ctx, esc, span, keys, path)
                    : isNotStringAndIterable(tree)
                        ? serializeIter(tree, ctx, esc, span, keys, path)
                        : ((tree = esc ? escape(String(tree)) : String(tree)), span)
                            ? `<span${keys ? ` key="${path.join("-")}"` : ""}>${tree}</span>`
                            : tree;
const serializeElement = (tree, ctx, esc, span, keys, path) => {
    let tag = tree[0];
    return !tree.length
        ? ""
        : isFunction(tag)
            ? _serialize(tag.apply(null, [ctx, ...tree.slice(1)]), ctx, esc, span, keys, path)
            : implementsFunction(tag, "render")
                ? _serialize(tag.render.apply(null, [ctx, ...tree.slice(1)]), ctx, esc, span, keys, path)
                : tag === COMMENT
                    ? serializeComment(tree)
                    : tag == CDATA
                        ? serializeCData(tree)
                        : isString(tag)
                            ? serializeTag(tree, ctx, esc, span, keys, path)
                            : isNotStringAndIterable(tree)
                                ? serializeIter(tree, ctx, esc, span, keys, path)
                                : illegalArgs(`invalid tree node: ${tree}`);
};
const serializeTag = (tree, ctx, esc, span, keys, path) => {
    tree = normalize(tree);
    const attribs = tree[1];
    if (attribs.__skip || attribs.__serialize === false)
        return "";
    keys && attribs.key === undefined && (attribs.key = path.join("-"));
    const tag = tree[0];
    const body = tree[2]
        ? serializeBody(tag, tree[2], ctx, esc, span, keys, path)
        : !VOID_TAGS[tag] && !NO_CLOSE_EMPTY[tag]
            ? `></${tag}>`
            : PROC_TAGS[tag] || "/>";
    return `<${tag}${serializeAttribs(attribs, esc)}${body}`;
};
const serializeAttribs = (attribs, esc) => {
    let res = "";
    for (let a in attribs) {
        if (a.startsWith("__"))
            continue;
        const v = serializeAttrib(attribs, a, deref(attribs[a]), esc);
        v != null && (res += v);
    }
    return res;
};
const serializeAttrib = (attribs, a, v, esc) => {
    return v == null
        ? null
        : isFunction(v) && (/^on\w+/.test(a) || (v = v(attribs)) == null)
            ? null
            : v === true
                ? " " + a
                : v === false
                    ? null
                    : a === "data"
                        ? serializeDataAttribs(v, esc)
                        : attribPair(a, v, esc);
};
const attribPair = (a, v, esc) => {
    v =
        a === "style" && isPlainObject(v)
            ? css(v)
            : a === "prefix" && isPlainObject(v)
                ? formatPrefixes(v)
                : isArray(v)
                    ? v.join(ATTRIB_JOIN_DELIMS[a] || " ")
                    : v.toString();
    return v.length ? ` ${a}="${esc ? escape(v) : v}"` : null;
};
const serializeDataAttribs = (data, esc) => {
    let res = "";
    for (let id in data) {
        let v = deref(data[id]);
        isFunction(v) && (v = v(data));
        v != null && (res += ` data-${id}="${esc ? escape(v) : v}"`);
    }
    return res;
};
const serializeBody = (tag, body, ctx, esc, span, keys, path) => {
    if (VOID_TAGS[tag]) {
        illegalArgs(`No body allowed in tag: ${tag}`);
    }
    const proc = PROC_TAGS[tag];
    let res = proc ? " " : ">";
    span = span && !proc && !NO_SPANS[tag];
    for (let i = 0, n = body.length; i < n; i++) {
        res += _serialize(body[i], ctx, esc, span, keys, [...path, i]);
    }
    return res + (proc || `</${tag}>`);
};
const serializeComment = (tree) => tree.length > 2
    ? `\n<!--\n${tree
        .slice(1)
        .map((x) => "    " + x)
        .join("\n")}\n-->\n`
    : `\n<!-- ${tree[1]} -->\n`;
const serializeCData = (tree) => `<![CDATA[\n${tree.slice(1).join("\n")}\n]]>`;
const serializeIter = (iter, ctx, esc, span, keys, path) => {
    const res = [];
    const p = path.slice(0, path.length - 1);
    let k = 0;
    for (let i of iter) {
        res.push(_serialize(i, ctx, esc, span, keys, [...p, k++]));
    }
    return res.join("");
};

export { serialize };
