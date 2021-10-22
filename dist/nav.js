import {serialize} from "../_snowpack/pkg/@thi.ng/hiccup.js";
const link = (path, title, home = false) => {
  const common = ".link.dim.f5.f4-ns.dib.mr3";
  const colour = home ? ".black.b" : ".gray";
  return [`a${common}${colour}`, {href: path, title}, title];
};
const render_nav = () => {
  const nav = [
    "nav.pv3.pv4-ns.mw8.center",
    link("./", "Reference Data Register", true),
    link("./components.html", "Components"),
    link("./dereferencer.html", "URI Lookup"),
    link("./search.html", "Search"),
    link("https://github.com/Swirrl/rdr/", "GitHub")
  ];
  document.body.insertAdjacentHTML("afterbegin", serialize(nav));
};
export {render_nav};
