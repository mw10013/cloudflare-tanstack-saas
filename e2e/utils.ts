/**
 * Appends a per-clone suffix to avoid e2e email collisions.
 */
export const scopeEmail = (email: string) => {
  const [local, domain] = email.split("@");
  const portSuffix = process.env.PORT ? `-${process.env.PORT}` : "";
  return `${local}${portSuffix}@${domain}`;
};
