var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// netlify/functions/linkedin-oauth-start.js
var linkedin_oauth_start_exports = {};
__export(linkedin_oauth_start_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(linkedin_oauth_start_exports);
async function handler(event, context) {
  console.log("OAuth start called with:", event.queryStringParameters);
  const { type = "basic" } = event.queryStringParameters || {};
  const baseUrl = "https://www.linkedin.com/oauth/v2/authorization";
  let clientId, scope;
  if (type === "dma") {
    clientId = process.env.LINKEDIN_DMA_CLIENT_ID;
    scope = "r_dma_portability_3rd_party";
  } else {
    clientId = process.env.LINKEDIN_CLIENT_ID;
    scope = "openid profile email w_member_social";
  }
  if (!clientId) {
    console.error("Missing client ID for type:", type);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing client configuration" })
    };
  }
  const redirectUri = `${process.env.URL}/.netlify/functions/linkedin-oauth-callback`;
  const actualRedirectUri = process.env.NODE_ENV === "development" ? "http://localhost:8888/.netlify/functions/linkedin-oauth-callback" : redirectUri;
  console.log("Redirect URI:", actualRedirectUri);
  const authUrl = `${baseUrl}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(actualRedirectUri)}&scope=${encodeURIComponent(scope)}&state=${type}`;
  console.log("Generated auth URL:", authUrl);
  return {
    statusCode: 302,
    headers: {
      Location: authUrl,
      "Access-Control-Allow-Origin": "*"
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=linkedin-oauth-start.js.map
