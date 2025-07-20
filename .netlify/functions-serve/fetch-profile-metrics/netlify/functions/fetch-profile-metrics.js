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

// netlify/functions/fetch-profile-metrics.js
var fetch_profile_metrics_exports = {};
__export(fetch_profile_metrics_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(fetch_profile_metrics_exports);
async function handler(event, context) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
      }
    };
  }
  const { authorization } = event.headers;
  if (!authorization) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "No authorization token" })
    };
  }
  try {
    const profileResponse = await fetch(
      "https://api.linkedin.com/rest/memberSnapshotData?q=criteria&domain=PROFILE",
      {
        headers: {
          "Authorization": authorization,
          "LinkedIn-Version": "202312"
        }
      }
    );
    const profileData = await profileResponse.json();
    const profile = profileData.elements?.[0]?.snapshotData?.[0] || {};
    const metrics = {
      profileViews: profile["Profile Views"] || profile["profile_views"] || profile.profileViews || 0,
      searchAppearances: profile["Search Appearances"] || profile["search_appearances"] || profile.searchAppearances || 0,
      uniqueViewers: profile["Unique Viewers"] || profile["unique_viewers"] || profile.uniqueViewers || 0,
      viewerCompanies: profile["Viewer Companies"] || profile["viewer_companies"] || profile.viewerCompanies || [],
      viewerTitles: profile["Viewer Titles"] || profile["viewer_titles"] || profile.viewerTitles || []
    };
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      },
      body: JSON.stringify(metrics)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ error: error.message })
    };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=fetch-profile-metrics.js.map
