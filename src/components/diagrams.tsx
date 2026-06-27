"use client";

import { useDoc, fill } from "./doc-context";

/* ── Diagrammes d'architecture (SVG déclaratif, stylé) ────────
   Usage MDX : <Diagram name="ovh-vps" />
   Chaque diagramme = des noeuds (dont des « conteneurs ») + des arêtes.
   Le rendu calcule les points d'ancrage des flèches selon la position
   relative des noeuds. Couleurs par « tone ». */

type Tone = "slate" | "cyan" | "emerald" | "sky" | "violet" | "orange" | "rose" | "amber";

type Node = {
  id: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  label: string;
  sub?: string;
  tone?: Tone;
  container?: boolean;
};

type Edge = { from: string; to: string; label?: string; dashed?: boolean; tone?: Tone };

type Spec = { w: number; h: number; caption?: string; nodes: Node[]; edges: Edge[] };

const TONES: Record<Tone, { fill: string; stroke: string; text: string; sub: string }> = {
  slate: { fill: "#f1f5f9", stroke: "#cbd5e1", text: "#334155", sub: "#64748b" },
  cyan: { fill: "#ecfeff", stroke: "#67e8f9", text: "#0e7490", sub: "#0891b2" },
  emerald: { fill: "#ecfdf5", stroke: "#6ee7b7", text: "#047857", sub: "#059669" },
  sky: { fill: "#f0f9ff", stroke: "#7dd3fc", text: "#0369a1", sub: "#0284c7" },
  violet: { fill: "#f5f3ff", stroke: "#c4b5fd", text: "#6d28d9", sub: "#7c3aed" },
  orange: { fill: "#fff7ed", stroke: "#fdba74", text: "#c2410c", sub: "#ea580c" },
  rose: { fill: "#fff1f2", stroke: "#fda4af", text: "#be123c", sub: "#e11d48" },
  amber: { fill: "#fffbeb", stroke: "#fcd34d", text: "#b45309", sub: "#d97706" },
};

const DW = 150;
const DH = 60;

function dims(n: Node) {
  return { x: n.x, y: n.y, w: n.w ?? DW, h: n.h ?? DH };
}

function anchors(from: Node, to: Node) {
  const a = dims(from);
  const b = dims(to);
  const fcx = a.x + a.w / 2;
  const fcy = a.y + a.h / 2;
  const tcx = b.x + b.w / 2;
  const tcy = b.y + b.h / 2;
  const dx = tcx - fcx;
  const dy = tcy - fcy;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return {
      x1: dx > 0 ? a.x + a.w : a.x,
      y1: fcy,
      x2: dx > 0 ? b.x : b.x + b.w,
      y2: tcy,
    };
  }
  return {
    x1: fcx,
    y1: dy > 0 ? a.y + a.h : a.y,
    x2: tcx,
    y2: dy > 0 ? b.y : b.y + b.h,
  };
}

function Box({ n }: { n: Node }) {
  const t = TONES[n.tone ?? "slate"];
  const { x, y, w, h } = dims(n);
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={14}
        fill={n.container ? "#ffffff" : t.fill}
        fillOpacity={n.container ? 0.5 : 1}
        stroke={t.stroke}
        strokeWidth={n.container ? 1.5 : 1.25}
        strokeDasharray={n.container ? "5 4" : undefined}
      />
      {n.container ? (
        <>
          <text x={x + 14} y={y + 22} fontSize={13} fontWeight={700} fill={t.text}>
            {n.label}
          </text>
          {n.sub && (
            <text x={x + 14} y={y + 38} fontSize={11} fill={t.sub} fontFamily="ui-monospace, monospace">
              {n.sub}
            </text>
          )}
        </>
      ) : (
        <>
          <text x={x + w / 2} y={n.sub ? y + h / 2 - 4 : y + h / 2 + 4} textAnchor="middle" fontSize={13} fontWeight={600} fill={t.text}>
            {n.label}
          </text>
          {n.sub && (
            <text x={x + w / 2} y={y + h / 2 + 13} textAnchor="middle" fontSize={10.5} fill={t.sub} fontFamily="ui-monospace, monospace">
              {n.sub}
            </text>
          )}
        </>
      )}
    </g>
  );
}

function Arrow({ from, to, edge }: { from: Node; to: Node; edge: Edge }) {
  const { x1, y1, x2, y2 } = anchors(from, to);
  const t = TONES[edge.tone ?? "slate"];
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={edge.dashed ? t.sub : "#94a3b8"}
        strokeWidth={1.75}
        strokeDasharray={edge.dashed ? "5 4" : undefined}
        markerEnd={edge.dashed ? `url(#arrow-${edge.tone ?? "slate"})` : "url(#arrow-slate)"}
      />
      {edge.label && (
        <g>
          <rect x={mx - edge.label.length * 3.3 - 5} y={my - 9} width={edge.label.length * 6.6 + 10} height={17} rx={8} fill="#ffffff" stroke="#e2e8f0" />
          <text x={mx} y={my + 3} textAnchor="middle" fontSize={10.5} fill={edge.dashed ? t.text : "#475569"} fontWeight={600}>
            {edge.label}
          </text>
        </g>
      )}
    </g>
  );
}

function render(spec: Spec) {
  const byId = Object.fromEntries(spec.nodes.map((n) => [n.id, n]));
  const containers = spec.nodes.filter((n) => n.container);
  const leaves = spec.nodes.filter((n) => !n.container);
  const tones: Tone[] = ["slate", "rose", "emerald", "violet", "orange", "sky"];
  return (
    <svg viewBox={`0 0 ${spec.w} ${spec.h}`} width="100%" style={{ maxWidth: spec.w }} role="img" aria-label={spec.caption}>
      <defs>
        {tones.map((tn) => (
          <marker key={tn} id={`arrow-${tn}`} viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={tn === "slate" ? "#94a3b8" : TONES[tn].sub} />
          </marker>
        ))}
      </defs>
      {containers.map((n) => (
        <Box key={n.id} n={n} />
      ))}
      {spec.edges.map((e, i) => (
        <Arrow key={i} from={byId[e.from]} to={byId[e.to]} edge={e} />
      ))}
      {leaves.map((n) => (
        <Box key={n.id} n={n} />
      ))}
    </svg>
  );
}

const DIAGRAMS: Record<string, Spec> = {
  "droplet-trek": {
    w: 700,
    h: 250,
    caption: "Tout passe par Caddy (443) ; les conteneurs partagent le réseau « edge »",
    nodes: [
      { id: "net", x: 24, y: 96, w: 150, h: 60, label: "Internet", sub: "443", tone: "slate" },
      { id: "edge", x: 220, y: 22, w: 452, h: 206, label: "réseau Docker « edge »", tone: "sky", container: true },
      { id: "caddy", x: 246, y: 96, w: 150, h: 64, label: "Caddy", sub: "auto-TLS", tone: "emerald" },
      { id: "porta", x: 496, y: 54, w: 158, h: 54, label: "Portainer", sub: "portainer.${DOMAIN}", tone: "violet" },
      { id: "trek", x: 496, y: 150, w: 158, h: 54, label: "TREK", sub: "travel.${DOMAIN}", tone: "cyan" },
    ],
    edges: [
      { from: "net", to: "caddy", label: "443" },
      { from: "caddy", to: "porta", label: "9000" },
      { from: "caddy", to: "trek", label: "3000" },
    ],
  },
  "vps-stack": {
    w: 700,
    h: 250,
    caption: "Un serveur physique découpé en plusieurs VPS isolés par l'hyperviseur",
    nodes: [
      { id: "hw", x: 30, y: 178, w: 640, h: 54, label: "Matériel — datacenter", sub: "CPU · RAM · NVMe · réseau", tone: "slate" },
      { id: "hyp", x: 30, y: 104, w: 640, h: 54, label: "Hyperviseur — KVM", sub: "partage et isole les ressources", tone: "orange" },
      { id: "vps1", x: 30, y: 24, w: 200, h: 60, label: "VPS (le tien)", sub: "OS invité", tone: "cyan" },
      { id: "vps2", x: 250, y: 24, w: 200, h: 60, label: "VPS", sub: "autre client", tone: "sky" },
      { id: "vps3", x: 470, y: 24, w: 200, h: 60, label: "VPS", sub: "autre client", tone: "emerald" },
    ],
    edges: [],
  },
  "ovh-vps": {
    w: 700,
    h: 250,
    caption: "Architecture cible du VPS OVH durci",
    nodes: [
      { id: "vps", x: 300, y: 24, w: 372, h: 202, label: "VPS OVH", sub: "${HOSTNAME}", tone: "cyan", container: true },
      { id: "toi", x: 28, y: 56, w: 150, h: 60, label: "Toi", sub: "clé SSH", tone: "slate" },
      { id: "visiteurs", x: 28, y: 150, w: 150, h: 60, label: "Visiteurs", sub: "navigateur", tone: "slate" },
      { id: "ufw", x: 326, y: 66, w: 150, h: 48, label: "UFW", sub: "${SSH_PORT}·80·443", tone: "emerald" },
      { id: "nginx", x: 326, y: 150, w: 150, h: 48, label: "Nginx + TLS", sub: "${DOMAIN}", tone: "emerald" },
      { id: "user", x: 500, y: 66, w: 150, h: 48, label: "${USERNAME}", sub: "sudo", tone: "amber" },
      { id: "f2b", x: 500, y: 150, w: 150, h: 48, label: "fail2ban", sub: "anti-bruteforce", tone: "amber" },
    ],
    edges: [
      { from: "toi", to: "ufw", label: "SSH ${SSH_PORT}" },
      { from: "visiteurs", to: "nginx", label: "HTTPS 443" },
    ],
  },
  "caddy-https": {
    w: 700,
    h: 210,
    caption: "Caddy en reverse proxy avec HTTPS automatique",
    nodes: [
      { id: "net", x: 28, y: 72, w: 156, h: 64, label: "Visiteurs", sub: "HTTPS", tone: "slate" },
      { id: "caddy", x: 270, y: 62, w: 170, h: 84, label: "Caddy", sub: "TLS auto · ${DOMAIN}", tone: "emerald" },
      { id: "app", x: 520, y: 72, w: 152, h: 64, label: "Ton app", sub: "127.0.0.1:8080", tone: "sky" },
    ],
    edges: [
      { from: "net", to: "caddy", label: "443" },
      { from: "caddy", to: "app", label: "reverse proxy" },
    ],
  },
  docker: {
    w: 700,
    h: 230,
    caption: "Docker Engine et trois services orchestrés par Compose",
    nodes: [
      { id: "engine", x: 40, y: 40, w: 620, h: 170, label: "Docker Engine", sub: "${HOSTNAME}", tone: "sky", container: true },
      { id: "web", x: 70, y: 108, w: 160, h: 72, label: "web", sub: "nginx", tone: "emerald" },
      { id: "app", x: 270, y: 108, w: 160, h: 72, label: "app", sub: "node", tone: "violet" },
      { id: "db", x: 470, y: 108, w: 160, h: 72, label: "db", sub: "postgres", tone: "amber" },
      { id: "compose", x: 270, y: 16, w: 160, h: 44, label: "compose.yml", tone: "slate" },
    ],
    edges: [
      { from: "web", to: "app", label: "réseau" },
      { from: "app", to: "db", label: "5432" },
    ],
  },
  wireguard: {
    w: 700,
    h: 200,
    caption: "Tunnel WireGuard entre un client et le serveur",
    nodes: [
      { id: "client", x: 28, y: 68, w: 170, h: 64, label: "Client", sub: "10.8.0.2", tone: "sky" },
      { id: "cloud", x: 270, y: 58, w: 160, h: 84, label: "Internet", sub: "UDP 51820", tone: "slate", container: true },
      { id: "server", x: 502, y: 68, w: 170, h: 64, label: "Serveur WG", sub: "${SERVER_IP}", tone: "violet" },
    ],
    edges: [
      { from: "client", to: "server", label: "tunnel chiffré", tone: "violet", dashed: true },
    ],
  },
  proxmox: {
    w: 700,
    h: 260,
    caption: "Proxmox VE : VMs et conteneurs LXC sur un hôte",
    nodes: [
      { id: "host", x: 200, y: 24, w: 472, h: 210, label: "Proxmox VE 9", sub: "${HOSTNAME}", tone: "orange", container: true },
      { id: "admin", x: 28, y: 96, w: 150, h: 64, label: "Toi", sub: ":8006 (web)", tone: "slate" },
      { id: "vm1", x: 226, y: 92, w: 130, h: 64, label: "VM", sub: "Ubuntu", tone: "sky" },
      { id: "vm2", x: 372, y: 92, w: 130, h: 64, label: "VM", sub: "Windows", tone: "cyan" },
      { id: "lxc", x: 518, y: 92, w: 130, h: 64, label: "LXC", sub: "conteneur", tone: "emerald" },
      { id: "store", x: 226, y: 172, w: 422, h: 44, label: "Stockage", sub: "local-lvm · ZFS", tone: "amber" },
    ],
    edges: [{ from: "admin", to: "host", label: "HTTPS 8006" }],
  },
  pihole: {
    w: 700,
    h: 240,
    caption: "Pi-hole en résolveur DNS pour tout le réseau",
    nodes: [
      { id: "dev", x: 28, y: 78, w: 170, h: 84, label: "Tes appareils", sub: "PC · tél · TV", tone: "slate" },
      { id: "pi", x: 280, y: 80, w: 170, h: 80, label: "Pi-hole v6", sub: "${SERVER_IP}", tone: "rose" },
      { id: "up", x: 528, y: 88, w: 150, h: 64, label: "DNS amont", sub: "1.1.1.1", tone: "sky" },
      { id: "ads", x: 280, y: 184, w: 170, h: 40, label: "Pub & traceurs", tone: "slate" },
    ],
    edges: [
      { from: "dev", to: "pi", label: "DNS" },
      { from: "pi", to: "up", label: "requêtes propres" },
      { from: "pi", to: "ads", label: "bloqué", tone: "rose", dashed: true },
    ],
  },
};

export function Diagram({ name }: { name: string }) {
  const { vars } = useDoc();
  const base = DIAGRAMS[name];
  if (!base) return null;
  // Injecte la config dans les libellés (${VAR} -> valeur).
  const spec: Spec = {
    ...base,
    nodes: base.nodes.map((n) => ({ ...n, label: fill(n.label, vars), sub: n.sub ? fill(n.sub, vars) : undefined })),
    edges: base.edges.map((e) => ({ ...e, label: e.label ? fill(e.label, vars) : undefined })),
  };
  return (
    <figure className="my-5 max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
      {render(spec)}
      {spec.caption && <figcaption className="mt-2 text-center text-[12px] text-slate-400">{spec.caption}</figcaption>}
    </figure>
  );
}
