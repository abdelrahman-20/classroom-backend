import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/node";

let aj: ReturnType<typeof arcjet> | null = null;

function getArcjetClient() {
  if (!aj) {
    if (!process.env.ARCJET_KEY) {
      throw Error("ARCJET_KEY must be provided.");
    }
    aj = arcjet({
  // Get your site key from https://console.arcjet.com and set it as an environment
  // variable rather than hard coding.
  key: process.env.ARCJET_KEY!,
  rules: [
    // Shield protects your app from common attacks e.g. SQL injection
    shield({ mode: "LIVE" }),
    // Create a bot detection rule
    detectBot({
      mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
      // Block all bots except the following
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
        "CATEGORY:PREVIEW", // Link previews e.g. Slack, Discord
        // Uncomment to allow these other common bot categories
        // See the full list at https://arcjet.com/bot-list
        //"CATEGORY:MONITOR", // Uptime monitoring services
      ],
    }),
    slidingWindow({
      mode: "LIVE",
      // See https://docs.arcjet.com/fingerprints
      //characteristics: ["ip.src"],
      interval: 60,
      max: 100,
    }),
  ],
  proxies: process.env.ARCJET_PROXIES?.split(",").map((p) => p.trim()) || [],
    });
  }
  return aj;
}

export default getArcjetClient();
