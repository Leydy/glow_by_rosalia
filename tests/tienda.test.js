// Reglas de la tienda: tallas, rutina de Glow Skin, mundos e importación de Temu.
import { describe, it, expect } from "vitest";
import { recommendedSize, sizeForHeight, buildRoutine, worldOf, fitsGender } from "../src/worlds.js";
import { guessCategory, guessGender, suggestName, autoDesc } from "../src/admin/temuText.js";
import { parseTemuPaste } from "../src/admin/temuBookmarklet.js";

describe("tallas de Glow Kids", () => {
  it("recomienda la talla según la estatura", () => {
    expect(sizeForHeight(95).size).toBe("2");
    expect(sizeForHeight(116).size).toBe("6");
    expect(recommendedSize(["2", "4", "6"], 105)).toBe("4");
  });
  it("en calzado elige la talla más cercana", () => {
    expect(recommendedSize(["24", "26", "28"], 120)).toBe("28");
  });
  it("filtra niña / niño (las de ambos salen en los dos)", () => {
    const nina = { details: { gender: "niña" } }, ambos = { details: { gender: "unisex" } };
    expect(fitsGender(nina, "niño")).toBe(false);
    expect(fitsGender(ambos, "niño")).toBe(true);
    expect(fitsGender(nina, "")).toBe(true);
  });
});

describe("rutina de Glow Skin", () => {
  const P = (name, step, concerns, price = 40) => ({ name, price, stock: 5, details: { step, concerns, skinTypes: ["Todo tipo"] } });
  it("elige el sérum que ayuda con más de lo que se marcó", () => {
    const r = buildRoutine([P("A", "serum", ["Manchas"]), P("B", "serum", ["Manchas", "Granitos"])], { piel: "Mixta", meta: ["Manchas", "Granitos"], budget: "S/ 100 – 200" });
    expect(r.find((s) => s.step.key === "serum").product.name).toBe("B");
  });
  it("devuelve los 5 pasos aunque falten productos", () => {
    expect(buildRoutine([], { piel: "Seca", meta: ["Hidratación"], budget: "Lo mejor" })).toHaveLength(5);
  });
});

describe("mundos", () => {
  it("cada categoría va a su mundo", () => {
    expect(worldOf("Aretes")).toBe("michi");
    expect(worldOf("Sérums")).toBe("skin");
    expect(worldOf("Botines")).toBe("kids");
    expect(worldOf("Relojes")).toBe("variedades");
  });
});

describe("importar de Temu", () => {
  it("sugiere la categoría: michi solo si tiene gato", () => {
    expect(guessCategory("Aretes de gato negro con luna")).toBe("Aretes");
    expect(guessCategory("1 par de aretes de lazo")).toBe("Accesorios");
    expect(guessCategory("Aretes de mariposa con piedra ojo de gato")).toBe("Accesorios");
    expect(guessCategory("Un reloj de pulsera elegante")).toBe("Relojes");
    expect(guessCategory("Botines de invierno para niña")).toBe("Botines");
    expect(guessGender("Vestido de princesa para niñas")).toBe("niña");
  });
  it("acorta el nombre y escribe una descripción corta", () => {
    expect(suggestName("Aretes de gato con perla para mujer, 2 piezas, estilo coreano")).toBe("Aretes de gato con perla");
    expect(autoDesc("Conjunto con dinosaurio", "Conjuntos").length).toBeLessThan(120);
  });
  it("solo acepta lo copiado con el marcador y fotos de Temu", () => {
    expect(parseTemuPaste("hola")).toBeNull();
    const ok = parseTemuPaste(JSON.stringify({ glowTemu: 1, productos: [{ nombre: "X", precio: 10, fotos: ["https://img.kwcdn.com/a.jpg", "https://malo.com/b.jpg"], url: "u" }] }));
    expect(ok[0].fotos).toEqual(["https://img.kwcdn.com/a.jpg"]);
  });
});
