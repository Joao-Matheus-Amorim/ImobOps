import { describe, it, expect } from "vitest";
import { ALL_TOOLS, getTool, toolNames } from "./registry";

describe("tool registry", () => {
  it("todos os tools tem nomes unicos", () => {
    const names = ALL_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("todos os tools tem schema Zod valido", () => {
    for (const t of ALL_TOOLS) {
      expect(t.schema).toBeDefined();
      expect(typeof t.schema.parse).toBe("function");
    }
  });

  it("todos os tools tem effect, feature e action definidos", () => {
    for (const t of ALL_TOOLS) {
      expect(["read", "write"]).toContain(t.effect);
      expect(t.feature).toBeTruthy();
      expect(t.action).toBeTruthy();
    }
  });

  it("getTool retorna undefined para nome inexistente", () => {
    expect(getTool("nao_existe")).toBeUndefined();
  });

  it("getTool retorna definicao correta", () => {
    const t = getTool("search_clients");
    expect(t).toBeDefined();
    expect(t!.effect).toBe("read");
    expect(t!.feature).toBe("clients");
  });

  it("toolNames retorna lista completa de nomes", () => {
    const names = toolNames();
    expect(names.length).toBe(ALL_TOOLS.length);
    expect(names).toContain("search_clients");
    expect(names).toContain("create_charge");
  });

  it("write tools tem preview definido", () => {
    for (const t of ALL_TOOLS) {
      if (t.effect === "write") {
        expect(t.preview).toBeDefined();
      }
    }
  });

  it("nenhuma tool tem nome vazio", () => {
    for (const t of ALL_TOOLS) {
      expect(t.name.length).toBeGreaterThan(0);
    }
  });
});
