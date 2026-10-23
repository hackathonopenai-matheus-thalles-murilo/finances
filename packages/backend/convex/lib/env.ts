export function requireEnv(name: string) {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`${name} is not set on the Convex deployment`);
  }
  return value;
}
