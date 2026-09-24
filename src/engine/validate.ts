/* ──────────────────────────────────────────────────────────────
   Field validation
   Each variable has a `kind`; the kind decides the format check.
   An empty value is never an error: it's just not filled in yet.
   Messages are keys, translated by the UI.
   ────────────────────────────────────────────────────────────── */

export const KINDS = ["text", "ip", "cidr", "port", "hostname", "domain", "user", "email", "secret", "path", "url"] as const;
export type Kind = (typeof KINDS)[number];

export type ValidationError =
  | "invalid_ip"
  | "invalid_cidr"
  | "invalid_port"
  | "invalid_hostname"
  | "invalid_domain"
  | "invalid_user"
  | "invalid_email"
  | "invalid_path"
  | "invalid_url"
  | "too_short";

const HOST_LABEL = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

export function isIpv4(v: string): boolean {
  const parts = v.split(".");
  return parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
}

export function isIpv6(v: string): boolean {
  if (!v.includes(":") || !/^[0-9a-fA-F:.]+$/.test(v)) return false;
  const doubles = v.split("::").length - 1;
  if (doubles > 1) return false;
  const groups = v.split(":").filter(Boolean);
  return doubles === 1 ? groups.length <= 7 : groups.length === 8;
}

export function isHostname(v: string): boolean {
  if (v.length > 253) return false;
  return v.split(".").every((label) => HOST_LABEL.test(label));
}

export function validate(kind: Kind, value: string): ValidationError | null {
  if (value === "") return null;
  switch (kind) {
    case "ip":
      return isIpv4(value) || isIpv6(value) ? null : "invalid_ip";
    case "cidr": {
      const [ip, len, ...rest] = value.split("/");
      if (rest.length || len === undefined || !/^\d{1,3}$/.test(len)) return "invalid_cidr";
      const max = isIpv4(ip) ? 32 : isIpv6(ip) ? 128 : -1;
      return max > 0 && Number(len) <= max ? null : "invalid_cidr";
    }
    case "port": {
      const n = Number(value);
      return /^\d+$/.test(value) && n >= 1 && n <= 65535 ? null : "invalid_port";
    }
    case "hostname":
      return isHostname(value) ? null : "invalid_hostname";
    case "domain":
      return isHostname(value) && /\.[a-zA-Z]{2,}$/.test(value) ? null : "invalid_domain";
    case "user":
      return /^[a-z_][a-z0-9_-]{0,31}$/.test(value) ? null : "invalid_user";
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : "invalid_email";
    case "secret":
      return value.length >= 12 ? null : "too_short";
    case "path":
      return value.startsWith("/") && !/\s/.test(value) ? null : "invalid_path";
    case "url":
      try {
        const u = new URL(value);
        return u.protocol === "http:" || u.protocol === "https:" ? null : "invalid_url";
      } catch {
        return "invalid_url";
      }
    default:
      return null;
  }
}
