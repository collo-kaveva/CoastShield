import type { Api } from "./types";
import { mockApi } from "./mock/mockApi";
import { httpApi } from "./http/httpApi";

/**
 * The only place that chooses an implementation.
 *   VITE_DATA_MODE=demo (default): browser-only mock with sample data. NOT secure.
 *   VITE_DATA_MODE=api:            the Django REST backend (real sessions, real database).
 */
export const IS_DEMO = import.meta.env.VITE_DATA_MODE !== "api";
export const SHOW_SAMPLE_LOGIN = IS_DEMO || import.meta.env.VITE_SHOW_SAMPLE_LOGIN === "true";
/** Logo upload is validated and stored by the backend, so it is only offered when one is connected. */
export const SUPPORTS_UPLOADS = !IS_DEMO;
export const api: Api = IS_DEMO ? mockApi : httpApi;
export { ApiError } from "./errors";
