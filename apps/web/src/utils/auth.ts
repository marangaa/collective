import { createAuthClient } from "better-auth/client";
import { adminClient, anonymousClient, magicLinkClient } from "better-auth/client/plugins";

import { ENV } from "../env";

export const authClient = createAuthClient({
  baseURL: `${ENV.VITE_SERVER_URL.replace(/\/$/, "")}/api/auth`,
  fetchOptions: {
    credentials: "include",
  },
  plugins: [anonymousClient(), magicLinkClient(), adminClient()],
});

export async function ensureAnonymousSession() {
  const session = await authClient.getSession();
  if (session.data?.user) return session.data;
  const result = await authClient.signIn.anonymous();
  if (result.error) throw new Error(result.error.message ?? "Could not create anonymous session");
  return result.data;
}
