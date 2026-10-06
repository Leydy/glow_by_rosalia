// Revisión de la captura de Yape: lo que deja pasar y lo que bloquea.
import { describe, it, expect } from "vitest";
import { parseYapeText, checkYape } from "../src/checkout/payment.js";

const TITULAR = "Leydy Mayumy Coyllo Mamani";
const hoy = new Date().toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });
const yape = (monto, nombre = "Leydy Coy.", fecha = hoy) => `¡Yapeaste!\n${monto}\n${nombre}\n${fecha} - 10:22 am\nNro. de operación 03564821`;
const revisar = (texto, total) => checkYape(parseYapeText(texto, TITULAR), total);

describe("captura de pago", () => {
  it("acepta un Yape correcto con el nombre recortado", () => {
    expect(revisar(yape("S/ 65"), 65).block).toBe("");
  });
  it("acepta un pago desde Plin", () => {
    expect(revisar(`Plin\n¡Pago exitoso!\nS/ 65.00\nLeydy Coyllo M.\n${hoy} 10:22\nNro. de operación: 112233445`, 65).block).toBe("");
  });
  it("lee el número de operación", () => {
    expect(parseYapeText(yape("S/ 65"), TITULAR).op).toBe("03564821");
  });
  it("bloquea si el monto no es exacto (de más o de menos)", () => {
    expect(revisar(yape("S/ 40"), 19.9).block).toMatch(/no coincide/);
    expect(revisar(yape("S/ 19"), 19.9).block).toMatch(/no coincide/);
  });
  it("bloquea si no se puede leer el monto", () => {
    expect(revisar(yape("S/"), 19.9).block).toMatch(/No pudimos leer el monto/);
  });
  it("bloquea un pago a otra persona", () => {
    expect(revisar(yape("S/ 65", "Carlos Quispe R."), 65).block).toMatch(/titular/);
  });
  it("bloquea una captura antigua", () => {
    expect(revisar(yape("S/ 65", "Leydy Coy.", "3 ene. 2025"), 65).block).toMatch(/Sube el comprobante/);
  });
  it("bloquea una foto cualquiera y la pantalla de pago de la tienda", () => {
    expect(revisar("gatito durmiendo en la cama", 65).block).toMatch(/no parece un comprobante/);
    expect(revisar(`Pagar con Yape MONTO A YAPEAR S/ 65.00 ${TITULAR} Número Yape 900 628 674`, 65).block).toMatch(/pantalla de pago/);
  });
});
