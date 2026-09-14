import { createContext } from "react-router";

export type CloudflareEnvironment = Partial<CloudflareBindings>;

export const cloudflareEnvironmentContext =
  createContext<CloudflareEnvironment>();
