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

// netlify/functions/linkedin-oauth-callback.js
var linkedin_oauth_callback_exports = {};
__export(linkedin_oauth_callback_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(linkedin_oauth_callback_exports);
async function handler(event, context) {
  console.log("OAuth callback called with:", event.queryStringParameters);
  const { code, state } = event.queryStringParameters || {};
  if (!code) {
    console.error("No authorization code provided");
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "No authorization code provided" })
    };
  }
  try {
    const clientId = state === "dma" ? process.env.LINKEDIN_DMA_CLIENT_ID : process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = state === "dma" ? process.env.LINKEDIN_DMA_CLIENT_SECRET : process.env.LINKEDIN_CLIENT_SECRET;
    console.log("Using client ID:", clientId, "for state:", state);
    if (!clientId || !clientSecret) {
      console.error("Missing client credentials for state:", state);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing client credentials" })
      };
    }
    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${process.env.URL}/.netlify/functions/linkedin-oauth-callback`,
        client_id: clientId,
        client_secret: clientSecret
      })
    });
    const tokens = await tokenResponse.json();
    console.log("Token response:", tokens);
    if (tokens.error) {
      console.error("Token error:", tokens);
      throw new Error(tokens.error_description || tokens.error);
    }
    const tokenType = state === "dma" ? "dma_token" : "access_token";
    const baseUrl = process.env.NODE_ENV === "development" ? "http://localhost:5173" : process.env.URL || "https://localhost:5173";
    const redirectUrl = `${baseUrl}/?${tokenType}=${tokens.access_token}`;
    console.log("Redirecting to:", redirectUrl);
    return {
      statusCode: 302,
      headers: {
        Location: redirectUrl,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    };
  } catch (error) {
    console.error("OAuth callback error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: error.message })
    };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=linkedin-oauth-callback.js.map
