import {fromRDF, compact, frame} from "../_snowpack/pkg/jsonld.js";
import {serialize} from "../_snowpack/pkg/@thi.ng/hiccup.js";
import {render_nav} from "./nav.js";
import {append_expanded_uri} from "./util.js";
const domain = "https://staging.gss-data.org.uk";
const endpoint = `${domain}/sparql`;
const base = "http://gss-data.org.uk/";
const context = {
  "@base": "http://gss-data.org.uk/",
  "@vocab": "http://gss-data.org.uk/",
  qb: "http://purl.org/linked-data/cube#",
  sdmxd: "http://purl.org/linked-data/sdmx/2009/dimension#",
  sdmxa: "http://purl.org/linked-data/sdmx/2009/attribute#",
  sdmxm: "http://purl.org/linked-data/sdmx/2009/measure#",
  sdmxc: "http://purl.org/linked-data/sdmx/2009/code#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  dcterms: "http://purl.org/dc/terms/",
  pmdcat: "http://publishmydata.com/pmdcat#",
  dimension: "http://gss-data.org.uk/def/dimension/",
  measure: "http://gss-data.org.uk/def/measure/",
  skos: "http://www.w3.org/2004/02/skos/core#",
  label: {"@id": "rdfs:label"},
  comment: {"@id": "rdfs:comment"},
  codelist: {"@id": "qb:codeList"},
  subPropertyOf: {"@id": "rdfs:subPropertyOf", "@type": "@id"},
  children: {"@reverse": "subPropertyOf", "@container": "@set"}
};
const framing = {
  "@context": context,
  "@type": [
    "qb:ComponentProperty",
    "qb:DimensionProperty",
    "qb:AttributeProperty",
    "qb:MeasureProperty"
  ],
  children: {"@embed": "@always"}
};
const query = `
PREFIX qb: <http://purl.org/linked-data/cube#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

CONSTRUCT {
  ?component
    a ?component_property;
    rdfs:label ?label;
    rdfs:comment ?comment;
    qb:codeList ?codelist;
    rdfs:subPropertyOf ?parent_component;
    .

  ?codelist
    rdfs:label ?codelist_label;
  	.
} WHERE {
  ?component_property rdfs:subClassOf qb:ComponentProperty .

  ?component
    a ?component_property;
    rdfs:label ?label_;
    .

  BIND(STR(?label_) AS ?label)# strip language tag

  OPTIONAL {
    ?component rdfs:comment ?comment_

    BIND(STR(?comment_) AS ?comment)
  }
  
  OPTIONAL {
    ?component qb:codeList ?codelist;

    OPTIONAL {
      ?codelist rdfs:label ?codelist_label_
      BIND(STR(?codelist_label_) AS ?codelist_label)
    }
  }

  OPTIONAL {
    ?component rdfs:subPropertyOf ?parent_component;
  }
}
`;
render_nav();
const page = [
  "article.mw8.center",
  ["h1.f1", "Components Register"],
  [
    "p.f3.lh-copy",
    "The ",
    ["a.link", {href: domain}, "Integrated Data Service"],
    " ",
    "uses the following components to describe statistical data; ",
    "these are all the columns you can expect to find in the data tables."
  ],
  [
    "p.f4.lh-copy",
    "Under each component the sub-components are listed if any exist. ",
    "Components with more sub-components appear first. Blue links take you ",
    "to the description of the RDF resources. Grey links provide URIs for ",
    "use in CSVW annotations of SPARQL queries etc. Descriptive comments are ",
    "provided where they exist and differ from the labels. The codelist ",
    "adopted by each sub-component is shown on the right-hand side; ",
    "these are lists of values you can expect to find within the column."
  ],
  [
    "div#components",
    ["h1.tc.v-mid", {style: "line-height: 20vh"}, "Loading..."]
  ]
];
document.getElementById("app").innerHTML = serialize(page);
fetch(`${endpoint}`, {
  method: "POST",
  headers: {
    accept: "application/n-triples",
    "Content-Type": "application/sparql-query"
  },
  body: query
}).then((response) => response.text()).then((text) => fromRDF(text, {format: "application/n-quads"})).then((jsonld) => compact(jsonld, context)).then((jsonld) => append_expanded_uri(jsonld, context, base)).then((jsonld) => frame(jsonld, framing)).then((jsonld) => render(jsonld["@graph"]));
const renderJson = (json) => {
  document.body.innerHTML = `<pre>${JSON.stringify(json, null, 2)}</pre>`;
};
const pmd_link = (uri, label) => {
  return ["a.link", {href: `${domain}/resource?uri=${encodeURIComponent(uri)}`}, label];
};
const uri_link = (expanded_uri, compact_uri) => {
  return ["a.link.gray", {href: expanded_uri}, compact_uri];
};
const render_component = (component) => {
  const codelist = "codelist" in component ? [
    "p",
    pmd_link(component.codelist.uri, component.codelist.label || "(missing codelist)"),
    ["span.f7.ml1", uri_link(component.codelist.uri, component.codelist["@id"])]
  ] : ["p", "(no codelist)"];
  const dimension = [
    [
      "p.mb0",
      pmd_link(component.uri, component.label || "(missing component)"),
      ["span.f7.ml1", uri_link(component.uri, component["@id"])]
    ],
    "comment" in component && component.comment != component.label ? ["p.f7.mt1.mb0", component.comment] : null
  ];
  return [
    "div.cf.mb1",
    {},
    ["div.fl.w-100.w-50-ns.pr3", dimension],
    ["div.fl.w-100.w-50-ns.pr3", codelist]
  ];
};
const render = (components) => {
  components = components.filter((c) => {
    return !("subPropertyOf" in c);
  }).sort((a, b) => {
    if ("children" in a) {
      if ("children" in b) {
        return b.children.length - a.children.length;
      } else {
        return -1;
      }
    } else {
      if ("children" in b) {
        return 1;
      } else {
        return b.label < a.label;
      }
    }
  });
  const doc = components.map((c) => {
    return [
      "div.cf",
      {},
      ["h2.f2.mb0", pmd_link(c.uri, c.label || "(missing component)")],
      ["span.f5", uri_link(c.uri, c["@id"])],
      "comment" in c && c.comment != c.label ? ["p.mt2.mb2", c.comment] : null,
      "children" in c ? [
        "details",
        ["summary.f6", `${c.children.length} Sub-component${c.children.length > 1 ? "s" : ""}`],
        c.children.map(render_component)
      ] : null
    ];
  });
  document.getElementById("components").innerHTML = serialize(doc);
};
