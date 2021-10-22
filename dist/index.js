import {serialize} from "../_snowpack/pkg/@thi.ng/hiccup.js";
import {render_nav} from "./nav.js";
const domain = "https://staging.gss-data.org.uk";
const li = (title, text, link) => {
  const item = [
    "li.pv3.pv4-ns.bb.b--black-10",
    [
      "a.link.dim",
      {href: link},
      ["b.db.f3.mb1", title],
      ["span.f4.db.lh-copy.measure", text]
    ]
  ];
  return item;
};
const page = [
  "article#main.mw8.center",
  [
    "p.f3.lh-copy",
    "Linked Data tools for working with reference data from the ",
    ["a.link", {href: domain}, "Integrated Data Service"],
    "."
  ],
  [
    "ul.list.pl0",
    li("Discover Components", [
      "span.dark-gray",
      "The Components Register provides descriptions of each component property ",
      "along with the sub-components and codelists involved."
    ], "./components.html"),
    li("Lookup Resources", [
      "span.dark-gray",
      "The URI Lookup tool helps you retreive resource descriptions. ",
      "You can either go to the page providing the description or fetch a ",
      "JSON-LD representation without leaving the tool"
    ], "./dereferencer.html"),
    li("Search across Datasets", [
      "span.dark-gray",
      "The Code Search tool lets you search for datasets based upon the ",
      "codelists that they adopt."
    ], "./search.html")
  ]
];
render_nav();
document.getElementById("app").innerHTML = serialize(page);
