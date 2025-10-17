// Type declaration for next-pwa which doesn't provide its own types.
// next-pwa's default export is a higher-order function used like:
//   export default withPWA(opts)(nextConfig)
declare module "next-pwa" {
  import type { NextConfig } from "next";

  type WithPWA = (opts?: Record<string, any>) => (config?: NextConfig) => NextConfig;

  const withPWA: WithPWA;
  export default withPWA;
}
