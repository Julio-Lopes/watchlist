import { defineRailway, github, preserve, project, service } from "railway/iac";

export default defineRailway(() => {
  const whatchlistapi = service("whatchlist/api", {
    source: github("Julio-Lopes/whatchlist", { checkSuites: false }),
    build: "pnpm --filter @watchlist/api build",
    start: "node apps/api/dist/index.js",
    healthcheck: "/health",
    replicas: { "ams": 1 },
        deploy: {
      sleepApplication: true,
      preDeployCommand: ["pnpm", "--filter", "@watchlist/db", "migrate"]
    },
    networking: { privateNetworkEndpoint: "whatchlist" },
    env: { ANILIST_MIN_INTERVAL_MS: preserve(), ANILIST_RATE_LIMIT: preserve(), COOKIE_SECRET: preserve(), DATABASE_URL: preserve(), DATABASE_URL_UNPOOLED: preserve(), EMAIL_FROM: preserve(), GOOGLE_CLIENT_ID: preserve(), GOOGLE_CLIENT_SECRET: preserve(), GOOGLE_REDIRECT_URI: preserve(), LOG_LEVEL: preserve(), MEDIA_TTL_HOURS: preserve(), NODE_ENV: preserve(), RESEND_API_KEY: preserve(), SESSION_TTL_DAYS: preserve(), TMDB_API_KEY: preserve(), WEB_ORIGIN: preserve() },
  });
  const cron = service("cron", {
    source: github("Julio-Lopes/whatchlist", { checkSuites: false }),
    start: "node apps/api/dist/cron.js",
    replicas: { "ams": 1 },
    deploy: { cronSchedule: "0 3 * * *", restartPolicyType: "NEVER" },
    env: { COOKIE_SECRET: preserve(), DATABASE_URL: preserve(), DATABASE_URL_UNPOOLED: preserve(), GOOGLE_CLIENT_ID: preserve(), GOOGLE_CLIENT_SECRET: preserve(), GOOGLE_REDIRECT_URI: preserve(), LOG_LEVEL: preserve(), NODE_ENV: preserve(), TMDB_API_KEY: preserve(), WEB_ORIGIN: preserve() },
  });

  return project("steadfast-upliftment", {
    resources: [whatchlistapi, cron],
  });
});
