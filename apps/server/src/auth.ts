import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { admin, anonymous, magicLink } from "better-auth/plugins";
import { eq } from "drizzle-orm";

import * as schema from "@collective/db/schema";
import { user as userTable } from "@collective/db/schema";
import { db } from "./services";

const isProduction = process.env.NODE_ENV === "production";
const secret = process.env.BETTER_AUTH_SECRET;
if (isProduction && (!secret || secret.length < 32)) {
  throw new Error("BETTER_AUTH_SECRET must be at least 32 characters in production");
}

const trustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? process.env.CORS_ORIGIN ?? "http://localhost:3001")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

async function sendMagicLink(email: string, url: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (!isProduction) console.info(`Magic link for ${email}: ${url}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "Collective <onboarding@resend.dev>",
      to: [email],
      subject: "Your Collective reviewer sign-in link",
      text: `Sign in to Collective: ${url}`,
    }),
  });

  if (!response.ok) throw new Error(`Resend rejected magic link: ${response.status}`);
}

export const auth = betterAuth({
  appName: "Collective",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: secret ?? "collective-development-secret-change-me-32-chars",
  trustedOrigins,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  plugins: [
    anonymous(),
    admin(),
    magicLink({
      sendMagicLink: async ({ email, url }) => sendMagicLink(email, url),
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async ({ data }) => {
          const created = data as { id: string; email: string };
          const reviewerEmail = process.env.REVIEWER_EMAIL?.trim().toLowerCase();
          if (reviewerEmail && created.email.toLowerCase() === reviewerEmail) {
            await db.update(userTable).set({ role: "reviewer" }).where(eq(userTable.id, created.id));
          }
        },
      },
    },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 10,
    max: 100,
    customRules: {
      "/sign-in/magic-link": { window: 60, max: 5 },
      "/sign-in/anonymous": { window: 60, max: 10 },
    },
  },
  advanced: {
    disableCSRFCheck: false,
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
    },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
export type AuthUser = AuthSession["user"];
