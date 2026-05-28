import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    runtimeCaching: [
      {
        // Auth must always hit the network. Caching the magic-link redirect
        // /auth/callback (a 307 + Set-Cookie) breaks the login session, so the
        // user bounces back to /login. Keep /auth/* and /login uncached.
        urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
          sameOrigin &&
          (url.pathname.startsWith("/auth") || url.pathname === "/login"),
        handler: "NetworkOnly",
      },
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
        handler: "NetworkOnly",
      },
    ],
  },
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
