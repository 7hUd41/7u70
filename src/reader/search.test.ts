import { describe, expect, it } from "vitest";
import { search } from "./Search";
import type { IndexEntry } from "@/content/search-index";

const index: IndexEntry[] = [
  {
    series: "netbox", seriesTitle: "NetBox", page: "install", title: "Install NetBox", summary: "", tags: ["netbox"], difficulty: "intermediate",
    sections: [
      { id: "", heading: "", text: "NetBox is four moving parts." },
      { id: "postgresql", heading: "PostgreSQL", text: "sudo apt install -y postgresql" },
      { id: "redis", heading: "Redis", text: "redis-cli ping PONG" },
    ],
  },
  { series: "example", seriesTitle: "Example", page: "ssh", title: "Secure SSH", summary: "", tags: ["ssh"], difficulty: "beginner", sections: [{ id: "firewall", heading: "Firewall", text: "sudo ufw allow 2222/tcp" }] },
];

describe("search", () => {
  it("ranks heading matches above body matches", () => {
    const hits = search(index, "postgresql");
    expect(hits[0].sectionId).toBe("postgresql");
  });
  it("requires every term", () => {
    expect(search(index, "ufw allow")).toHaveLength(1);
    expect(search(index, "ufw postgresql")).toHaveLength(0);
  });
  it("ignores accents and case", () => {
    expect(search(index, "REDIS")).toHaveLength(1);
  });
  it("returns nothing for a one-letter query", () => {
    expect(search(index, "s")).toHaveLength(0);
  });
});
