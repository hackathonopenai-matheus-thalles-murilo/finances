/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as chatgpt from "../chatgpt.js";
import type * as connectionSync from "../connectionSync.js";
import type * as connections from "../connections.js";
import type * as crons from "../crons.js";
import type * as facts from "../facts.js";
import type * as foreignIncome from "../foreignIncome.js";
import type * as guides from "../guides.js";
import type * as healthCheck from "../healthCheck.js";
import type * as http from "../http.js";
import type * as lib_connectionStatus from "../lib/connectionStatus.js";
import type * as lib_deriveObligations from "../lib/deriveObligations.js";
import type * as lib_env from "../lib/env.js";
import type * as lib_identity from "../lib/identity.js";
import type * as lib_instructions from "../lib/instructions.js";
import type * as lib_money from "../lib/money.js";
import type * as lib_obligation from "../lib/obligation.js";
import type * as lib_payment from "../lib/payment.js";
import type * as lib_pluggy from "../lib/pluggy.js";
import type * as lib_pluggySandbox from "../lib/pluggySandbox.js";
import type * as lib_profile from "../lib/profile.js";
import type * as lib_receita from "../lib/receita.js";
import type * as lib_rules_calculate from "../lib/rules/calculate.js";
import type * as lib_rules_calculation from "../lib/rules/calculation.js";
import type * as lib_rules_calendar from "../lib/rules/calendar.js";
import type * as lib_rules_carneLeao from "../lib/rules/carneLeao.js";
import type * as lib_rules_dasMei from "../lib/rules/dasMei.js";
import type * as lib_rules_dasSimples from "../lib/rules/dasSimples.js";
import type * as lib_rules_dueOn from "../lib/rules/dueOn.js";
import type * as lib_sealed from "../lib/sealed.js";
import type * as lib_taxAgentModel from "../lib/taxAgentModel.js";
import type * as obligations from "../obligations.js";
import type * as onboarding from "../onboarding.js";
import type * as overview from "../overview.js";
import type * as privateData from "../privateData.js";
import type * as profile from "../profile.js";
import type * as seed from "../seed.js";
import type * as setup from "../setup.js";
import type * as taxAgent from "../taxAgent.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  chatgpt: typeof chatgpt;
  connectionSync: typeof connectionSync;
  connections: typeof connections;
  crons: typeof crons;
  facts: typeof facts;
  foreignIncome: typeof foreignIncome;
  guides: typeof guides;
  healthCheck: typeof healthCheck;
  http: typeof http;
  "lib/connectionStatus": typeof lib_connectionStatus;
  "lib/deriveObligations": typeof lib_deriveObligations;
  "lib/env": typeof lib_env;
  "lib/identity": typeof lib_identity;
  "lib/instructions": typeof lib_instructions;
  "lib/money": typeof lib_money;
  "lib/obligation": typeof lib_obligation;
  "lib/payment": typeof lib_payment;
  "lib/pluggy": typeof lib_pluggy;
  "lib/pluggySandbox": typeof lib_pluggySandbox;
  "lib/profile": typeof lib_profile;
  "lib/receita": typeof lib_receita;
  "lib/rules/calculate": typeof lib_rules_calculate;
  "lib/rules/calculation": typeof lib_rules_calculation;
  "lib/rules/calendar": typeof lib_rules_calendar;
  "lib/rules/carneLeao": typeof lib_rules_carneLeao;
  "lib/rules/dasMei": typeof lib_rules_dasMei;
  "lib/rules/dasSimples": typeof lib_rules_dasSimples;
  "lib/rules/dueOn": typeof lib_rules_dueOn;
  "lib/sealed": typeof lib_sealed;
  "lib/taxAgentModel": typeof lib_taxAgentModel;
  obligations: typeof obligations;
  onboarding: typeof onboarding;
  overview: typeof overview;
  privateData: typeof privateData;
  profile: typeof profile;
  seed: typeof seed;
  setup: typeof setup;
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
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
};
