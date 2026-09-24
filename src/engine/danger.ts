/* ──────────────────────────────────────────────────────────────
   Side-effect detection for shell blocks
   Purely informative: flags commands worth a second look before
   pasting. Reasons are keys, translated by the UI.
   ────────────────────────────────────────────────────────────── */

export type DangerReason =
  | "rm_recursive"
  | "firewall_enable"
  | "mkfs"
  | "dd"
  | "overwrite_system_file"
  | "chmod_777"
  | "fork_bomb"
  | "ssh_stop"
  | "firewall_flush"
  | "remote_script"
  | "reboot"
  | "drop_database";

const RULES: ReadonlyArray<{ re: RegExp; reason: DangerReason }> = [
  { re: /\brm\b[^\n|]*\s-[a-zA-Z]*[rf]/, reason: "rm_recursive" },
  { re: /\b(ufw\s+enable|firewall-cmd\s+--reload)\b/, reason: "firewall_enable" },
  { re: /\bmkfs(\.\w+)?\b/, reason: "mkfs" },
  { re: /\bdd\s+if=/, reason: "dd" },
  { re: />\s*\/(etc|boot|usr)\//, reason: "overwrite_system_file" },
  { re: /\bchmod\s+(-R\s+)?0?777\b/, reason: "chmod_777" },
  { re: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, reason: "fork_bomb" },
  { re: /\bsystemctl\s+(stop|disable|mask)\s+(ssh|sshd)\b/, reason: "ssh_stop" },
  { re: /\biptables\s+-F\b|\bnft\s+flush\b/, reason: "firewall_flush" },
  { re: /\b(curl|wget)\b[^\n]*\|\s*(sudo\s+)?(bash|sh|python3?)\b/, reason: "remote_script" },
  { re: /\b(reboot|shutdown|poweroff|halt)\b/, reason: "reboot" },
  { re: /\b(DROP\s+(DATABASE|TABLE)|dropdb)\b/i, reason: "drop_database" },
];

export function scanDangers(code: string): DangerReason[] {
  const out: DangerReason[] = [];
  for (const r of RULES) if (r.re.test(code) && !out.includes(r.reason)) out.push(r.reason);
  return out;
}
