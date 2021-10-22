import { expand } from 'jsonld';

// appends expanded @id to uri property
const append_expanded_uri = async (jsonld, context, base: string) => {
  const resources = jsonld["@graph"];
  if (typeof resources !== 'undefined') {
    const compact_ids = resources.map(r => r["@id"]);
    const expanded_ids = (await expand({
      "@context": {...context, ...{"resource": {"@type": "@id"}}},
      "resource": compact_ids
    }))[0][`${base}resource`].map((r) => r["@id"]);
    const resource_with_uris = resources.map((r, i) => {return({...r, ...{ uri: expanded_ids[i]}})});
    jsonld["@graph"] = resource_with_uris;
  }
  return(jsonld)
}

export { append_expanded_uri };