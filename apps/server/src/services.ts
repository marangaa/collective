import { createDb } from "@collective/db";

import { ENV } from "./env";

export const db = createDb(ENV);
