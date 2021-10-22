import { fromRDF, compact, frame, expand } from 'jsonld';
import { serialize } from "@thi.ng/hiccup";
import { render_nav } from './nav';
import { append_expanded_uri } from './util';

const domain = () => {
  return((<HTMLSelectElement>document.getElementById("domain")).value)
}

const endpoint = () => {
  return(`${domain()}/sparql`);
}

// Find cubes based upon the code labels used
const dataset_query = (query: string, limit: number = 10) => `
PREFIX qb: <http://purl.org/linked-data/cube#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX pmdcat: <http://publishmydata.com/pmdcat#>
PREFIX : <http://example.net/>

CONSTRUCT {
  ?dataset
    rdfs:label ?dataset_label;
    :component ?dimension .

  ?dimension
    rdfs:label ?dimension_label;
    qb:codeList ?scheme .

  ?scheme
    rdfs:label ?scheme_label .

  ?code
    rdfs:label ?code_label;
    skos:inScheme ?scheme .
} WHERE {
  {
    SELECT DISTINCT ?code ?code_label_ WHERE {
      ?code a skos:Concept; rdfs:label ?code_label_ .

      FILTER CONTAINS(?code_label_, '${query}')
    }
    LIMIT ${limit}
  }

  ?code skos:inScheme ?scheme .
  ?dimension qb:codeList ?scheme .
  ?cube qb:structure/qb:component/qb:dimension ?dimension . # should support attributes here too
  ?dataset pmdcat:datasetContents ?cube .

  ?dataset rdfs:label ?dataset_label_ .
  ?dimension rdfs:label ?dimension_label_ .
  ?scheme rdfs:label ?scheme_label_ .

  # strip language tags
  BIND(STR(?dataset_label_) AS ?dataset_label)
  BIND(STR(?dimension_label_) AS ?dimension_label)
  BIND(STR(?scheme_label_) AS ?scheme_label)
  BIND(STR(?code_label_) AS ?code_label)
}
`

const context = {
  "@base": "http://gss-data.org.uk/",
  "@vocab": "http://gss-data.org.uk/",
  "qb": "http://purl.org/linked-data/cube#",
  "sdmxd": "http://purl.org/linked-data/sdmx/2009/dimension#",
  "sdmxa": "http://purl.org/linked-data/sdmx/2009/attribute#",
  "sdmxm": "http://purl.org/linked-data/sdmx/2009/measure#",
  "sdmxc": "http://purl.org/linked-data/sdmx/2009/code#",
  "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
  "dcterms": "http://purl.org/dc/terms/",
  "pmdcat": "http://publishmydata.com/pmdcat#",
  "dimension": "http://gss-data.org.uk/def/dimension/",
  "measure": "http://gss-data.org.uk/def/measure/",
  "skos": "http://www.w3.org/2004/02/skos/core#",

  "label": {"@id": "rdfs:label"},
  "components": {"@id": "http://example.net/component", "@type": "@id", "@container": "@set"},
  "codelist": {"@id": "qb:codeList"},
  "inScheme": {"@id": "skos:inScheme", "@type": "@id"},
  "codes": {"@reverse": "inScheme", "@container": "@set"},
};

const framing = {
  "@context": context,
  "components": {
    "@embed": "@always",
    "codelist": {
      "@embed": "@always",
      "codes": {
        "@embed": "@always"
      }
    }
  }
}


const get_query = () : string => {
  return((<HTMLInputElement>document.getElementById("query")).value);
}


const query = () : string => dataset_query(get_query());

const fetch_triples = async (query_string: string, endpoint: string): Promise<string> => {
  const triples = fetch(`${endpoint}`, {
    method: 'POST',
    headers: {
      accept: 'application/n-triples',
      'Content-Type': 'application/sparql-query'
    },
    body: query_string
  })
  .then(response => response.text())
  .catch(error => {
    renderError(error);
    throw error;
  });
  return(triples)
}

const search = () => {
  renderLoading()
  fetch_triples(query(), endpoint())
    .then(deserialise)
    .then(renderResults)
}

const deserialise = async (text: string): Promise<object> => {
  const base = 'http://gss-data.org.uk/';
  const jsonld = fromRDF(text, {format: 'application/n-quads'})
    .then(jsonld => compact(jsonld, context))
    .then(jsonld => append_expanded_uri(jsonld, context, base))
    .then(jsonld => frame(jsonld, framing))

  return(jsonld)
}

const render = (hiccup) => { // does umbrella provide an interface to use as type?
  document.getElementById("results").innerHTML = serialize(hiccup);
}

const renderError = (error) => {
  const msg = ["span.light-red.f4", error];
  render(msg)
}

const renderResults = (results) => {
  const graph = results["@graph"]
  if (typeof graph !== 'undefined') {
    const list = results["@graph"].map((dataset) => {
      return(
        ["div.w-100.mb5", {},
          ["h2.f3.measure-wide", {}, cube_link(dataset.uri, dataset.label)],
          dataset.components.map(({uri, label, codelist}) => { return(
            ["div", {},
              ["h3.f4.gray.measure-wide", {},
                resource_link(uri, label, "dark-gray"),
                " (", resource_link(codelist.uri, codelist.label, "mid-gray"), "): "],
              ["ul", {}, codelist.codes.map((c) => { return(
                ["li.measure-wide", {}, resource_link(c.uri, `${c.label}`, "gray")] // interpolating label to catch unexpected cardinality
              )})]
            ]
          )})
        ]
      )
    })
    // console.log(list)
    render(list)
  } else {
    render(["p.f3", {}, "No results"])
  }
}

const renderLoading = () => {
  render(`<p class="f3">Loading...</p>`)
}

const cube_link = (uri, label) => {
  return(["a.link.dim", { href: `${domain()}/cube/explore?uri=${encodeURIComponent(uri)}`}, label])
}

const resource_link = (uri, label, colour: string ="blue") => {
  return([`a.link.dim.${colour}`, { href: `${domain()}/resource?uri=${encodeURIComponent(uri)}`}, label])
}

const page = ["article#main.mw8.center",
  ["h1.f1", "Code Search"],
  ["div.mb4",
    ["p.f3.lh-copy",
      "Find datasets from the words used in the data tables."],
    ["p.f4.lh-copy",
      "The search finds codes whose labels contain your query then retrieves ",
      "the codelists, dimensions and ultimately datasets that adopt those ",
      "codes. There's no guarantee that the dataset will provide observations ",
      "for those particular codes (only that it adopts the codelist that ",
      "includes them). You may only search for one code at time (i.e. you ",
      "would need to search for 'car' and 'imports' separately as there's no ",
      "single code with the label 'car imports'."]
  ],
  ["form#form.f5.mt10", { name: "search" },
    ["div.cf",
      ["input#query.fl.f4.mb2.ph2.pv1.b--black-10.input-reset",
        { type: "text", "aria-label": "Search term", placeholder: "Search term (e.g. 'GDP')", style: "width: 85%"}],
      ["select#domain.fl.f4.mb2.ph2.pv1.b--black-10",
        { type: "url", "aria-label": "Domain", placeholder: "Domain", style: "width: 15%"},
        Object.entries({
          "Staging": "https://staging.gss-data.org.uk",
          "Beta": "https://beta.gss-data.org.uk",
          "Live": "https://gss-data.org.uk",
          "Features": "https://features.staging.gss-data.org.uk",
        }).map(([env, uri]) => ["option", { value: uri }, env])],
    ],
    ["div.tc",
      ["a#submit.br-pill.bg-blue.washed-blue.no-underline.ba.pv2.ph3.dib.grow.mr3", { href: "#"}, "Search"],
    ]
  ],
  ["div#results.cf"]
]

render_nav();

document.getElementById("app").innerHTML= serialize(page);

const attach_handlers = () => {
  document.getElementById("submit").onclick = search;
  document.getElementById("form").onsubmit = (e) => { e.preventDefault(); search() };
}

attach_handlers();