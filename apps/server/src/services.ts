import { createDb } from "@collective/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);
