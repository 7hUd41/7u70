import { describe, expect, it } from "vitest";
import { DiagramSpec, layoutDiagram, NODE_W, samePath, summarize, Validation, atLeast, buildInstallScript, defaultsOf, evaluate, fill, inherit, joinCommands, keysOf, PageContract, scanDangers, segments, SeriesContract, TutoContract, validate } from "./index";

describe("template", () => {
  const vars = { HOST: "netbox.lan", PORT: "8001" };

  it("fills known keys and leaves unknown ones untouched", () => {
    expect(fill("curl http://${HOST}:${PORT}/${PATH}", vars)).toBe("curl http://netbox.lan:8001/${PATH}");
  });

  it("ignores lowercase shell-style expansions", () => {
    expect(fill("echo ${home} ${HOME}", { HOME: "/root" })).toBe("echo ${home} /root");
  });

  it("lists distinct keys in order", () => {
    expect(keysOf("${B} ${A} ${B}")).toEqual(["B", "A"]);
  });

  it("splits into segments", () => {
    expect(segments("ssh ${USER}@${HOST}")).toEqual([
      { kind: "text", text: "ssh " },
      { kind: "var", key: "USER", raw: "${USER}" },
      { kind: "text", text: "@" },
      { kind: "var", key: "HOST", raw: "${HOST}" },
    ]);
  });
});

describe("conditions", () => {
  const choices = { LDAP: true, TLS: false, WEB: "nginx" };
  it("flag / notFlag", () => {
    expect(evaluate({ flag: "LDAP" }, choices)).toBe(true);
    expect(evaluate({ flag: "TLS" }, choices)).toBe(false);
    expect(evaluate({ notFlag: "TLS" }, choices)).toBe(true);
    expect(evaluate({ flag: "MISSING" }, choices)).toBe(false);
  });
  it("is / equals / oneOf", () => {
    expect(evaluate({ is: "WEB", equals: "nginx" }, choices)).toBe(true);
    expect(evaluate({ is: "WEB", equals: "apache" }, choices)).toBe(false);
    expect(evaluate({ is: "WEB", oneOf: ["apache", "nginx"] }, choices)).toBe(true);
  });
  it("empty condition is always true", () => {
    expect(evaluate({}, choices)).toBe(true);
  });
});

describe("levels", () => {
  it("orders run < quick < guided < deep", () => {
    expect(atLeast("deep", "guided")).toBe(true);
    expect(atLeast("quick", "guided")).toBe(false);
    expect(atLeast("run", "run")).toBe(true);
  });
});

describe("validate", () => {
  it("accepts empty values", () => {
    expect(validate("ip", "")).toBeNull();
  });
  it("ip", () => {
    expect(validate("ip", "10.0.0.1")).toBeNull();
    expect(validate("ip", "256.0.0.1")).toBe("invalid_ip");
    expect(validate("ip", "2001:db8::1")).toBeNull();
    expect(validate("ip", "2001:db8::1::2")).toBe("invalid_ip");
  });
  it("cidr", () => {
    expect(validate("cidr", "10.0.0.0/8")).toBeNull();
    expect(validate("cidr", "10.0.0.0/33")).toBe("invalid_cidr");
    expect(validate("cidr", "10.0.0.0")).toBe("invalid_cidr");
  });
  it("port", () => {
    expect(validate("port", "22")).toBeNull();
    expect(validate("port", "0")).toBe("invalid_port");
    expect(validate("port", "70000")).toBe("invalid_port");
    expect(validate("port", "8a")).toBe("invalid_port");
  });
  it("hostname / domain", () => {
    expect(validate("hostname", "netbox-01")).toBeNull();
    expect(validate("hostname", "-bad")).toBe("invalid_hostname");
    expect(validate("domain", "netbox.example.com")).toBeNull();
    expect(validate("domain", "netbox")).toBe("invalid_domain");
  });
  it("user / email / secret / path / url", () => {
    expect(validate("user", "netbox")).toBeNull();
    expect(validate("user", "NetBox")).toBe("invalid_user");
    expect(validate("email", "a@b.co")).toBeNull();
    expect(validate("email", "nope")).toBe("invalid_email");
    expect(validate("secret", "short")).toBe("too_short");
    expect(validate("path", "/opt/netbox")).toBeNull();
    expect(validate("path", "opt/netbox")).toBe("invalid_path");
    expect(validate("url", "https://x.y")).toBeNull();
    expect(validate("url", "ftp://x.y")).toBe("invalid_url");
  });
});

describe("danger", () => {
  it("flags risky commands once each", () => {
    expect(scanDangers("sudo rm -rf /opt/netbox && sudo rm -rf /tmp/x")).toEqual(["rm_recursive"]);
    expect(scanDangers("curl -fsSL https://x | sudo bash")).toEqual(["remote_script"]);
    expect(scanDangers("sudo -u postgres dropdb netbox")).toEqual(["drop_database"]);
  });
  it("stays quiet on ordinary commands", () => {
    expect(scanDangers("sudo apt install -y postgresql")).toEqual([]);
  });
});

describe("script", () => {
  const blocks = [
    { code: "sudo apt update", step: "Update" },
    { code: "sudo apt install -y ${PKG}", step: "Update" },
    { code: "   ", step: "Empty" },
    { code: "systemctl status ${SVC}", step: "Verify" },
  ];
  const vars = { PKG: "postgresql", SVC: "postgresql" };

  it("assembles a strict bash script with step comments", () => {
    const s = buildInstallScript(blocks, { title: "NetBox", target: "netbox-01", vars });
    expect(s.startsWith("#!/usr/bin/env bash\nset -euo pipefail\n# NetBox — netbox-01")).toBe(true);
    expect(s).toContain("# ── Update\nsudo apt update\n\nsudo apt install -y postgresql");
    expect(s).not.toContain("# ── Empty");
    expect(s).toContain("# ── Verify\nsystemctl status postgresql");
  });

  it("joins commands for the clipboard", () => {
    expect(joinCommands(blocks, vars)).toBe("sudo apt update\nsudo apt install -y postgresql\nsystemctl status postgresql");
  });
});

describe("contract", () => {
  const base = {
    title: { en: "Install", fr: "Installer" },
    summary: { en: "s", fr: "s" },
    groups: [{ id: "net", label: { en: "Network", fr: "Réseau" } }],
    vars: [{ key: "HOST", kind: "hostname", group: "net", default: "netbox", label: { en: "Host", fr: "Hôte" } }],
    choices: [
      { key: "WEB", type: "select", label: { en: "Web", fr: "Web" }, options: [{ value: "nginx", label: { en: "nginx", fr: "nginx" } }, { value: "apache", label: { en: "Apache", fr: "Apache" } }] },
      { key: "LDAP", type: "boolean", label: { en: "LDAP", fr: "LDAP" }, default: true },
    ],
  };

  it("parses a valid contract and derives defaults", () => {
    const t = TutoContract.parse(base);
    expect(t.difficulty).toBe("intermediate");
    expect(defaultsOf(t)).toEqual({ vars: { HOST: "netbox" }, choices: { WEB: "nginx", LDAP: true } });
  });

  it("rejects a missing locale", () => {
    expect(() => TutoContract.parse({ ...base, title: { en: "only" } })).toThrow();
  });

  it("rejects unknown groups and bad defaults", () => {
    expect(() => TutoContract.parse({ ...base, vars: [{ ...base.vars[0], group: "nope" }] })).toThrow(/unknown group/);
    expect(() => TutoContract.parse({ ...base, choices: [{ ...base.choices[0], default: "caddy" }] })).toThrow(/not an option/);
  });

  it("accepts `when` on groups and variables, rejects unknown choices in it", () => {
    const ok = { ...base, groups: [{ ...base.groups[0], when: { flag: "LDAP" } }], vars: [{ ...base.vars[0], when: { is: "WEB", equals: "nginx" } }] };
    expect(TutoContract.parse(ok).groups[0].when).toEqual({ flag: "LDAP" });
    expect(() => TutoContract.parse({ ...base, groups: [{ ...base.groups[0], when: { flag: "NOPE" } }] })).toThrow(/unknown choice/);
  });

  it("rejects lowercase keys", () => {
    expect(() => TutoContract.parse({ ...base, vars: [{ ...base.vars[0], key: "host" }] })).toThrow();
  });
});

describe("series inheritance", () => {
  const series = SeriesContract.parse({
    title: { en: "S", fr: "S" },
    summary: { en: "s", fr: "s" },
    groups: [{ id: "host", label: { en: "Host", fr: "Hôte" } }],
    vars: [{ key: "HOST", kind: "hostname", group: "host", default: "a", label: { en: "Host", fr: "Hôte" } }],
    choices: [{ key: "OS", type: "select", label: { en: "OS", fr: "OS" }, options: [{ value: "u", label: { en: "U", fr: "U" } }, { value: "r", label: { en: "R", fr: "R" } }] }],
  });
  const page = PageContract.parse({
    title: { en: "P", fr: "P" },
    summary: { en: "p", fr: "p" },
    vars: [{ key: "SMTP", kind: "hostname", group: "host", label: { en: "SMTP", fr: "SMTP" } }],
  });

  it("merges series-level declarations before the page's own", () => {
    const m = inherit(series, page);
    expect(m.vars.map((v) => v.key)).toEqual(["HOST", "SMTP"]);
    expect(m.choices.map((c) => c.key)).toEqual(["OS"]);
    expect(m.groups.map((g) => g.id)).toEqual(["host"]);
  });

  it("lets a page variable use a series group, and a page `when` use a series choice", () => {
    const p2 = PageContract.parse({ ...page, groups: [{ id: "mail", label: { en: "Mail", fr: "Mail" }, when: { is: "OS", equals: "u" } }] });
    expect(() => inherit(series, p2)).not.toThrow();
  });

  it("refuses a page redefining a series key", () => {
    const p3 = PageContract.parse({ ...page, vars: [{ key: "HOST", kind: "text", label: { en: "x", fr: "x" } }] });
    expect(() => inherit(series, p3)).toThrow(/already declared/);
  });
});

describe("validations", () => {
  const v = (at: string, choices: Record<string, string | boolean>) =>
    Validation.parse({ at, locale: "en", choices, checks: { done: 2, total: 2 } });
  const list = [v("2026-01-10T10:00:00Z", { OS: "ubuntu", WEB: "nginx" }), v("2026-03-01T10:00:00Z", { OS: "rhel", WEB: "nginx" }), v("2026-02-01T10:00:00Z", { OS: "ubuntu", WEB: "apache" })];

  it("matches a path on every recorded choice", () => {
    expect(samePath({ OS: "ubuntu" }, { OS: "ubuntu", WEB: "nginx" })).toBe(true);
    expect(samePath({ OS: "ubuntu", WEB: "apache" }, { OS: "ubuntu", WEB: "nginx" })).toBe(false);
  });

  it("summarizes totals, last, and the reader's own path", () => {
    const s = summarize(list, { OS: "ubuntu", WEB: "nginx" }, Date.parse("2026-03-11T00:00:00Z"));
    expect(s.total).toBe(3);
    expect(s.last?.at).toBe("2026-03-01T10:00:00Z");
    expect(s.onMyPath).toBe(1);
    expect(s.daysSince).toBe(9);
  });

  it("handles no validation", () => {
    const s = summarize([], {}, Date.now());
    expect(s.total).toBe(0);
    expect(s.daysSince).toBeNull();
  });

  it("rejects a bad timestamp", () => {
    expect(() => Validation.parse({ at: "yesterday", locale: "en", checks: { done: 0, total: 0 } })).toThrow();
  });
});

describe("diagram layout", () => {
  const spec = DiagramSpec.parse({
    groups: [{ id: "srv", label: { en: "Server", fr: "Serveur" } }],
    nodes: [
      { id: "laptop", label: { en: "Laptop", fr: "Portable" }, kind: "client" },
      { id: "web", label: { en: "nginx", fr: "nginx" }, in: "srv", when: { is: "WEB", equals: "nginx" } },
      { id: "apache", label: { en: "Apache", fr: "Apache" }, in: "srv", when: { is: "WEB", equals: "apache" } },
      { id: "app", label: { en: "NetBox", fr: "NetBox" }, in: "srv", focus: true, sub: "${HOST}" },
      { id: "db", label: { en: "PostgreSQL", fr: "PostgreSQL" }, in: "srv", kind: "store" },
    ],
    edges: [
      { from: "laptop", to: "web", label: "HTTPS" },
      { from: "laptop", to: "apache", label: "HTTPS" },
      { from: "web", to: "app" },
      { from: "apache", to: "app" },
      { from: "app", to: "db" },
    ],
  });

  it("layers nodes left to right along the arrows", () => {
    const l = layoutDiagram(spec, { WEB: "nginx" });
    const layer = (id: string) => l.nodes.find((n) => n.id === id)!.layer;
    expect(layer("laptop")).toBe(0);
    expect(layer("web")).toBe(1);
    expect(layer("app")).toBe(2);
    expect(layer("db")).toBe(3);
    expect(l.width).toBeGreaterThan(4 * NODE_W);
  });

  it("drops nodes and edges hidden by the reader's choices", () => {
    const l = layoutDiagram(spec, { WEB: "apache" });
    expect(l.nodes.map((n) => n.id)).not.toContain("web");
    expect(l.nodes.map((n) => n.id)).toContain("apache");
    expect(l.edges.some((e) => e.from === "laptop" && e.to === "web")).toBe(false);
  });

  it("draws a container around its members", () => {
    const l = layoutDiagram(spec, { WEB: "nginx" });
    const g = l.groups[0];
    for (const id of ["web", "app", "db"]) {
      const n = l.nodes.find((x) => x.id === id)!;
      expect(n.x).toBeGreaterThanOrEqual(g.x);
      expect(n.y).toBeGreaterThanOrEqual(g.y);
      expect(n.x + n.w).toBeLessThanOrEqual(g.x + g.w);
      expect(n.y + n.h).toBeLessThanOrEqual(g.y + g.h);
    }
    const laptop = l.nodes.find((x) => x.id === "laptop")!;
    expect(laptop.x + laptop.w).toBeLessThan(g.x);
  });

  it("keeps a member with only a dashed arrow inside its group's columns", () => {
    const d = DiagramSpec.parse({
      groups: [{ id: "srv", label: { en: "S", fr: "S" } }],
      nodes: [
        { id: "you", label: { en: "You", fr: "Toi" } },
        { id: "fw", label: { en: "FW", fr: "FW" }, in: "srv" },
        { id: "f2b", label: { en: "f2b", fr: "f2b" }, in: "srv" },
      ],
      edges: [{ from: "you", to: "fw" }, { from: "f2b", to: "fw", dashed: true }],
    });
    const l = layoutDiagram(d, {});
    const layer = (id: string) => l.nodes.find((n) => n.id === id)!.layer;
    expect(layer("f2b")).toBe(layer("fw"));
    expect(layer("you")).toBe(0);
  });

  it("follows the reading level: elements from/up to a level, text overrides", () => {
    const d = DiagramSpec.parse({
      nodes: [
        { id: "you", label: { en: "You", fr: "Toi" }, sub: "short", deep: { sub: "a much longer line that wraps onto two lines" } },
        { id: "fw", label: { en: "FW", fr: "FW" }, level: "guided" },
        { id: "app", label: { en: "App", fr: "App" }, deep: { label: { en: "App (Django)", fr: "App (Django)" } } },
      ],
      edges: [
        { from: "you", to: "app", label: "HTTPS", max: "quick" },
        { from: "you", to: "fw", level: "guided", guided: { label: "TCP 443" }, deep: { label: "L7 HTTPS · L4 TCP 443" } },
        { from: "fw", to: "app", level: "guided" },
      ],
    });
    const ids = (l: ReturnType<typeof layoutDiagram>) => l.nodes.map((n) => n.id);
    const quick = layoutDiagram(d, {}, "quick");
    expect(ids(quick)).toEqual(["you", "app"]);
    expect(quick.edges).toHaveLength(1);
    expect(quick.edges[0].label).toBe("HTTPS");
    // Run reads the Quick drawing.
    expect(ids(layoutDiagram(d, {}, "run"))).toEqual(["you", "app"]);
    const guided = layoutDiagram(d, {}, "guided");
    expect(ids(guided)).toEqual(["you", "fw", "app"]);
    expect(guided.edges.map((e) => e.label)).toEqual(["TCP 443", undefined]);
    const deep = layoutDiagram(d, {}, "deep");
    expect(deep.edges.map((e) => e.label)).toEqual(["L7 HTTPS · L4 TCP 443", undefined]);
    expect(deep.nodes.find((n) => n.id === "app")!.label.en).toBe("App (Django)");
    // A long sub line gets a taller box; a long arrow label a longer arrow.
    expect(deep.nodes.find((n) => n.id === "you")!.h).toBeGreaterThan(quick.nodes.find((n) => n.id === "you")!.h);
    expect(deep.width).toBeGreaterThan(guided.width);
  });

  it("rejects an edge to an unknown node", () => {
    expect(() => DiagramSpec.parse({ nodes: [{ id: "a", label: { en: "A", fr: "A" } }], edges: [{ from: "a", to: "zz" }] })).toThrow(/unknown node/);
  });
});
