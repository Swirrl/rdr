import { fromRDF, compact, frame, expand } from 'jsonld';
import { serialize } from "@thi.ng/hiccup";
import { render_nav } from "./nav";

const domain = () => {
  return((<HTMLSelectElement>document.getElementById("domain")).value)
}

const endpoint = () => {
  return(`${domain()}/sparql`);
}

const describe_query = (uri) => {
  return(`CONSTRUCT { <${uri}> ?p ?o } WHERE { <${uri}> ?p ?o }`)
}

const get_description = async (uri: string, endpoint: string): Promise<string> =>  {
  const triples = fetch(`${endpoint}`, {
    method: 'POST',
    headers: {
      accept: 'application/n-triples',
      'Content-Type': 'application/sparql-query'
    },
    body: describe_query(uri)
  })
  .then(response => response.text())
  .catch(error => {
    renderError(error);
    throw error;
  });
  return(triples) 
}

const deserialise = async (text: string): Promise<object> => {
  const jsonld = fromRDF(text, {format: 'application/n-quads'});
  return(jsonld)
}

const renderLoading = () => {
  document.getElementById("description").innerHTML = `<p class="f3">Loading...</p>`
}

const renderJson = (json: object) => {
  const pre = ["pre.ma0", {style: "white-space: pre-wrap"}, JSON.stringify(json, null, 2)]
  document.getElementById("description").innerHTML = serialize(pre);
}

const renderError = (error) => {
  const msg = ["span.light-red.f4", error];
  document.getElementById("description").innerHTML = serialize(msg);
}

const ensure_description_div = () => {
  if (document.getElementById("description") === null) {
    const description = serialize(["div#description.bg-white.pa2.mv3.ba.b--black-10.f6"])
    document.getElementById("main").insertAdjacentHTML("beforeend", description);
  }
}

const fetch_and_render_description = () => {
  ensure_description_div();
  renderLoading();
  get_description(get_uri(), endpoint()).then(deserialise).then(renderJson);
}

const dereference = () => {
  const uri = encodeURIComponent(get_uri());
  window.location.replace(`${domain()}/resource?uri=${uri}`)
}

const get_uri = () => {
  return((<HTMLInputElement>document.getElementById("uri")).value);
}

const set_uri = (uri) => {
  (<HTMLInputElement>document.getElementById("uri")).value = uri;
}

const page = ["article#main.mw8.center",
  ["h1.f1", "URI Lookup"],
  ["div.mb4",
    ["p.f3.lh-copy",
      "The ", ["a.link", { href: "https://staging.gss-data.org.uk"}, "Integrated Data Service"], " ",
      "provides a variety of resources to describe statistical data. You can use ",
      "this page to dereference URIs (i.e. go to the page which describes them) ",
      "or to fetch the description and return it here as JSON-LD."],
    ["p.f4.lh-copy", "Here are some examples:"],
    ["ul#examples.f4",
      ["li",
        ["a.link",
          { href: "#", "data-uri": "http://statistics.data.gov.uk/id/statistical-geography/W06000022"},
          "Newport (Statistical Geography)"]],
      ["li",
        ["a.link",
          { href: "#", "data-uri": "http://gss-data.org.uk/data/gss_data/trade/hmrc-regional-trade-statistics#dataset"},
          "Regional Trade Statistics (Dataset)"]],
      ["li",
        ["a.link",
          { href: "#", "data-uri": "http://gss-data.org.uk/data/gss_data/towns-high-streets/dft-journey-times-to-key-services-by-lower-super-output-area/general-practices/year/2017/E01005121/E08000003/gpptt"},
          "Walking time to nearest GP from Woodlea Aveune, Manchester (Observation)"]]
    ],
  ],
  ["form.f5.mt10", { name: "lookup" },
    ["div.cf",
      ["input#uri.fl.f4.mb2.ph2.pv1.b--black-10.input-reset",
        { type: "url", "aria-label": "URI", placeholder: "URI", style: "width: 85%"}],
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
      ["a#dereference.br-pill.bg-blue.washed-blue.no-underline.ba.pv2.ph3.dib.grow.mr3", { href: "#"}, "Go to page"],
      ["a#fetch_description.br-pill.blue.no-underline.ba.pv2.ph3.dib.grow", { href: "#"}, "Fetch description here"]
    ]
  ],  
]

render_nav();

document.getElementById("app").innerHTML= serialize(page);

const attach_handlers = () => {
  document.getElementById("fetch_description").onclick = fetch_and_render_description;
  document.getElementById("dereference").onclick = dereference;
  const examples = document.getElementById("examples").getElementsByTagName("a");
  for (let e of Array.from(examples)) {
    e.onclick = () => set_uri(e.dataset.uri)
  }

}

attach_handlers();