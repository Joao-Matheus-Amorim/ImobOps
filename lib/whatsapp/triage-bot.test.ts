import { describe, it, expect } from "vitest";
import { classifyMessage } from "./triage-bot";

describe("classifyMessage", () => {
  it("detects rental intent", () => {
    expect(classifyMessage("Quero alugar um apartamento")).toBe("locacao");
    expect(classifyMessage("Sou fiador de um contrato")).toBe("locacao");
  });

  it("detects sale intent", () => {
    expect(classifyMessage("Gostaria de comprar uma casa")).toBe("venda");
    expect(classifyMessage("Tem financiamento disponível?")).toBe("venda");
  });

  it("detects condo intent", () => {
    expect(classifyMessage("Preciso falar com o síndico")).toBe("condominio");
    expect(classifyMessage("Sobre a assembleia do condomínio")).toBe("condominio");
  });

  it("detects finance intent", () => {
    expect(classifyMessage("Quero a 2ª via do boleto")).toBe("financeiro");
    expect(classifyMessage("Vou enviar o comprovante de pix")).toBe("financeiro");
  });

  it("falls back to outro", () => {
    expect(classifyMessage("Bom dia, tudo bem?")).toBe("outro");
  });
});
