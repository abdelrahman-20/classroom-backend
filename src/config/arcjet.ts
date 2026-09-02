import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/node";

let aj: ReturnType<typeof arcjet> | null = null;

function getArcjetClient() {
  if (!aj) {
    if (!process.env.ARCJET_KEY) {
      throw Error("ARCJET_KEY must be provided.");
    }
    aj = arcjet({
      key: process.env.ARCJET_KEY!,
      rules: [
        // Shield protects your app from common attacks e.g. SQL injection
        shield({ mode: "LIVE" }),

        // Create a bot detection rule
        detectBot({
          mode: "LIVE",
          // Block all bots except the following
          allow: [
            "CATEGORY:SEARCH_ENGINE",
            "CATEGORY:PREVIEW",
            //"CATEGORY:MONITOR", // Uptime monitoring services
          ],
        }),

        // Sliding-Window For Rate-Limiting
        slidingWindow({
          mode: "LIVE",
          interval: 60,
          max: 100,
        }),
      ],
      proxies:
        process.env.ARCJET_PROXIES?.split(",").map((p) => p.trim()) || [],
    });
  }
  return aj;
}

export default getArcjetClient();
