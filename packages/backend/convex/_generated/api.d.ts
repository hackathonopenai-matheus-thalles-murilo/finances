/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as cashflow from "../cashflow.js";
import type * as cashflowWhatsApp from "../cashflowWhatsApp.js";
import type * as chatgpt from "../chatgpt.js";
import type * as connectionSync from "../connectionSync.js";
import type * as connections from "../connections.js";
import type * as crons from "../crons.js";
import type * as guides from "../guides.js";
import type * as healthCheck from "../healthCheck.js";
import type * as http from "../http.js";
import type * as lib_connectionStatus from "../lib/connectionStatus.js";
import type * as lib_env from "../lib/env.js";
import type * as lib_identity from "../lib/identity.js";
import type * as lib_pluggy from "../lib/pluggy.js";
import type * as lib_profile from "../lib/profile.js";
import type * as lib_sealed from "../lib/sealed.js";
import type * as lib_taxAgentModel from "../lib/taxAgentModel.js";
import type * as lib_whatsappPhone from "../lib/whatsappPhone.js";
import type * as obligations from "../obligations.js";
import type * as onboarding from "../onboarding.js";
import type * as overview from "../overview.js";
import type * as privateData from "../privateData.js";
import type * as profile from "../profile.js";
import type * as seed from "../seed.js";
import type * as taxAgent from "../taxAgent.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  cashflow: typeof cashflow;
  cashflowWhatsApp: typeof cashflowWhatsApp;
  chatgpt: typeof chatgpt;
  connectionSync: typeof connectionSync;
  connections: typeof connections;
  crons: typeof crons;
  guides: typeof guides;
  healthCheck: typeof healthCheck;
  http: typeof http;
  "lib/connectionStatus": typeof lib_connectionStatus;
  "lib/env": typeof lib_env;
  "lib/identity": typeof lib_identity;
  "lib/pluggy": typeof lib_pluggy;
  "lib/profile": typeof lib_profile;
  "lib/sealed": typeof lib_sealed;
  "lib/taxAgentModel": typeof lib_taxAgentModel;
  "lib/whatsappPhone": typeof lib_whatsappPhone;
  obligations: typeof obligations;
  onboarding: typeof onboarding;
  overview: typeof overview;
  privateData: typeof privateData;
  profile: typeof profile;
  seed: typeof seed;
  taxAgent: typeof taxAgent;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
};
