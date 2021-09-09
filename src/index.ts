import { serialize } from "@thi.ng/hiccup";
import { render_nav } from './nav';

const domain = 'https://staging.gss-data.org.uk';

const li = (title, text, link) => {
  const item = ["li.pv3.pv4-ns.bb.b--black-10",
    ["a.link", { href: link},
      ["b.db.f3.mb1", title],
      ["span.f4.db.lh-copy.measure", text]
    ]
  ]
  return(item)
}

const page = ["article#main.mw8.center",
  ["p.f3.lh-copy",
    "Linked Data tools for working with reference data from the ",
    ["a.link", { href: domain}, "Integrated Data Service"], "."
  ],
  [
    "ul.list.pl0",
    li("Discover Components",
       ["span",
         "The Components Register provides descriptions of each component property ",
         "along with the sub-components and codelists involved."],
       "./components.html"),
    li("Lookup Resources",
       ["span",
         "The URI Lookup tool helps you retreive resource descriptions. ",
         "You can either go to the page providing the description or fetch a ",
         "JSON-LD representation without leaving the tool"],
       "./dereferencer.html")
  ]
]

render_nav();

document.getElementById("app").innerHTML = serialize(page);
