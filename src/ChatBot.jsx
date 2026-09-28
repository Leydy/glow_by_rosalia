// Asistente de la tienda (chatbot sencillo, sin conexión ni costo).
// Conoce el catálogo que recibe por props y responde con reglas simples:
// saluda, muestra productos, dice precios, recomienda y pasa a WhatsApp.
import { useState, useRef, useEffect, useMemo } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { C, money } from "./theme.js";

/* ---------- Utilidades de texto ---------- */
// Minúsculas y sin acentos, para comparar sin importar tildes/mayúsculas.
const norm = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

// ¿El texto contiene alguna de estas palabras/raíces?
const has = (text, words) => words.some((w) => text.includes(w));

// Enlace de WhatsApp con un mensaje ya escrito (igual que el resto de la tienda).
const waLink = (phone, text) =>
  `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

/* ---------- Motor de respuestas ----------
   Recibe lo que escribió el cliente y el catálogo, y devuelve un mensaje del
   bot: { text, products?, wa? }. Es todo con reglas, no usa internet. */
function answer(raw, products, settings) {
  const t = norm(raw);
  const store = settings.storeName;

  // Categorías presentes en el catálogo (raíz normalizada -> nombre real).
  const cats = [...new Set(products.map((p) => p.category).filter(Boolean))];

  // Buscar productos por nombre: puntúa cuántas palabras del nombre aparecen.
  const words = t.split(/\W+/).filter((w) => w.length >= 3);
  const byName = products
    .map((p) => {
      const nameTokens = norm(p.name).split(/\W+/).filter(Boolean);
      const score = nameTokens.filter(
        (tok) => tok.length >= 3 && t.includes(tok)
      ).length;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);

  // Saludo
  if (has(t, ["hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", "hey", "holi", "que tal", "saludos"])) {
    return {
      text: `¡Hola! 🐱 Soy la asistente de ${store}. Puedo mostrarte productos, decirte precios y ayudarte con tu pedido. ¿Qué te gustaría ver?`,
    };
  }

  // Gracias / despedida
  if (has(t, ["gracias", "graciass", "thank", "chau", "adios", "bye"])) {
    return { text: "¡De nada! Si necesitas algo más, aquí estoy. 🐾" };
  }

  // Cómo comprar / hacer pedido
  if (has(t, ["comprar", "compro", "pedir", "pedido", "ordenar", "orden", "adquirir", "reservar", "quiero uno", "lo quiero"])) {
    return {
      text:
        "Comprar es muy fácil:\n" +
        "1. Elige tus productos y añádelos al carrito\n" +
        "2. Pulsa «Pedir por WhatsApp»\n" +
        "3. Nos escribes y coordinamos todo\n\n" +
        "¿Quieres escribirnos ahora?",
      wa: true,
    };
  }

  // Envío / entrega / pago
  if (has(t, ["envio", "envian", "envias", "delivery", "entrega", "llega", "llegar", "pago", "pagar", "yape", "plin", "efectivo", "contra entrega"])) {
    return {
      text:
        "El envío y el pago los coordinamos por WhatsApp, según tu zona y el método que prefieras. ¿Te ayudo a escribirnos?",
      wa: true,
    };
  }

  // Más barato / económico
  if (has(t, ["barato", "barata", "economic", "mas bajo", "menos precio", "el mas barato"])) {
    const cheapest = [...products].sort((a, b) => a.price - b.price)[0];
    if (cheapest)
      return {
        text: `El más económico es este:`,
        products: [cheapest],
      };
  }

  // Recomendación / lo más vendido
  if (has(t, ["recomien", "recomend", "sugier", "sugeren", "mas vendido", "mas vendidos", "popular", "favorito", "lo mejor", "que me recomiendas"])) {
    const top = products.filter((p) => p.bestSeller);
    const list = (top.length ? top : products).slice(0, 4);
    return {
      text: top.length ? "Estos son los más vendidos:" : "Te muestro algunos favoritos:",
      products: list,
    };
  }

  // Por categoría (aretes, collares, etc.)
  const catMatch = cats.find((cat) => {
    const cn = norm(cat);
    // Coincide por la raíz para aceptar singular/plural (arete/aretes).
    const root = cn.replace(/s$/, "");
    return t.includes(root);
  });
  if (catMatch) {
    const list = products.filter((p) => p.category === catMatch);
    if (list.length)
      return { text: `Esto tenemos en ${catMatch}:`, products: list.slice(0, 6) };
    return {
      text: `Por ahora no tengo productos en ${catMatch}. ¿Quieres ver otras cosas?`,
    };
  }

  // Nombre de producto concreto
  if (byName.length) {
    return {
      text: byName.length === 1 ? "Aquí lo tienes:" : "Esto encontré para ti:",
      products: byName.slice(0, 4),
    };
  }

  // Precio (sin nombre claro)
  if (has(t, ["precio", "cuesta", "cuanto", "vale", "cuánto"])) {
    return {
      text: "¿De qué producto quieres saber el precio? Escríbeme su nombre, o mira el catálogo:",
      products: products.slice(0, 4),
    };
  }

  // Ver catálogo / qué tienen
  if (has(t, ["catalog", "productos", "que tienes", "que tienen", "que hay", "muestra", "muestrame", "ver todo", "todo", "que venden", "que vendes"])) {
    return {
      text:
        (cats.length ? `Tenemos: ${cats.join(", ")}. ` : "") +
        "Aquí van algunos productos:",
      products: products.slice(0, 6),
    };
  }

  // No entendí
  return {
    text:
      "Miau~ no entendí bien eso. Puedo ayudarte a ver productos, decirte precios o pasarte con " +
      store +
      " por WhatsApp. ¿Qué prefieres?",
    wa: true,
  };
}

/* ---------- Tarjeta de producto dentro del chat ---------- */
function ChatProduct({ p, settings }) {
  const img = Array.isArray(p.images) && p.images[0];
  const order = waLink(
    settings.whatsapp,
    `Hola ${settings.storeName} 👋 Me interesa: ${p.name} — ${money(p.price)}. ¿Está disponible?`
  );
  return (
    <div
      style={{
        display: "flex", gap: 10, alignItems: "center", padding: 8,
        borderRadius: 12, background: C.surface, border: `1px solid ${C.line}`,
        marginTop: 6,
      }}
    >
      <div
        style={{
          width: 46, height: 46, flexShrink: 0, borderRadius: 10, overflow: "hidden",
          background: C.blush, display: "grid", placeItems: "center", fontSize: 22,
        }}
      >
        {img ? (
          <img src={img} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span>{p.emoji || "🐱"}</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {p.name}
        </div>
        <div style={{ color: C.ink, fontWeight: 700, fontSize: 13 }}>{money(p.price)}</div>
      </div>
      <a
        href={order}
        target="_blank"
        rel="noreferrer"
        style={{
          flexShrink: 0, textDecoration: "none", fontSize: 12, fontWeight: 600,
          color: "#fff", background: "#25D366", padding: "6px 10px", borderRadius: 999,
          display: "inline-flex", alignItems: "center", gap: 4,
        }}
      >
        <MessageCircle size={13} /> Pedir
      </a>
    </div>
  );
}

/* ---------- Burbuja de mensaje ---------- */
function Bubble({ m, settings }) {
  const isBot = m.from === "bot";
  return (
    <div style={{ display: "flex", justifyContent: isBot ? "flex-start" : "flex-end", marginBottom: 10 }}>
      <div style={{ maxWidth: "85%" }}>
        <div
          style={{
            padding: "9px 12px", borderRadius: 14, fontSize: 13.5, lineHeight: 1.45,
            whiteSpace: "pre-wrap",
            background: isBot ? "#F5F1F4" : C.blush,
            color: C.ink,
            border: isBot ? "1px solid #EDE7EC" : "none",
            borderBottomLeftRadius: isBot ? 4 : 14,
            borderBottomRightRadius: isBot ? 14 : 4,
          }}
        >
          {m.text}
        </div>
        {m.products?.map((p) => (
          <ChatProduct key={p.id} p={p} settings={settings} />
        ))}
        {m.wa && (
          <a
            href={waLink(settings.whatsapp, `Hola ${settings.storeName} 👋 Tengo una consulta.`)}
            target="_blank"
            rel="noreferrer"
            style={{
              marginTop: 6, textDecoration: "none", fontSize: 12.5, fontWeight: 600,
              color: "#fff", background: "#25D366", padding: "8px 12px", borderRadius: 999,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            <MessageCircle size={14} /> Escribir por WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

/* ---------- Widget principal ---------- */
export default function ChatBot({ products, settings }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: `¡Hola! 🐱 Soy la asistente de ${settings.storeName}. Pregúntame por productos, precios o cómo hacer tu pedido.`,
    },
  ]);
  const scrollRef = useRef(null);

  // Botones de respuesta rápida.
  const quick = useMemo(
    () => ["Ver productos", "¿Cómo compro?", "Lo más vendido", "¿Hacen envíos?"],
    []
  );

  // Baja el scroll al último mensaje cada vez que cambia la conversación.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const send = (raw) => {
    const text = (raw ?? input).trim();
    if (!text) return;
    const reply = answer(text, products, settings);
    setMessages((m) => [...m, { from: "user", text }, { from: "bot", ...reply }]);
    setInput("");
  };

  return (
    <>
      {/* Botón flotante para abrir/cerrar */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Cerrar chat" : "Abrir chat de ayuda"}
        style={{
          position: "fixed", right: 20, bottom: 20, zIndex: 60,
          width: 58, height: 58, borderRadius: 999, border: "none", cursor: "pointer",
          background: C.rose,
          color: "#fff", display: "grid", placeItems: "center",
          boxShadow: `0 6px 18px ${C.rose}55`,
        }}
      >
        {open ? <X size={24} /> : <MessageCircle size={26} />}
      </button>

      {/* Panel del chat */}
      {open && (
        <div
          style={{
            position: "fixed", right: 20, bottom: 88, zIndex: 60,
            width: "min(360px, calc(100vw - 40px))",
            height: "min(520px, calc(100vh - 130px))",
            display: "flex", flexDirection: "column",
            borderRadius: 18, overflow: "hidden", background: C.surface,
            border: `1px solid ${C.line}`, boxShadow: "0 12px 40px rgba(43,37,48,0.18)",
          }}
        >
          {/* Cabecera */}
          <div
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
              background: C.surface, borderBottom: `1px solid ${C.line}`, color: C.ink,
            }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 999, background: C.blush, display: "grid", placeItems: "center", fontSize: 18 }}>
              🐱
            </div>
            <div style={{ lineHeight: 1.25 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Asistente de {settings.storeName}</div>
              <div style={{ fontSize: 11, color: C.inkSoft }}>Aquí para ayudarte</div>
            </div>
          </div>

          {/* Mensajes */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 14 }}>
            {messages.map((m, i) => (
              <Bubble key={i} m={m} settings={settings} />
            ))}
          </div>

          {/* Respuestas rápidas */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "0 12px 8px" }}>
            {quick.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                style={{
                  fontSize: 12, fontWeight: 600, color: C.roseDeep, background: C.surface,
                  border: `1px solid ${C.line}`, borderRadius: 999, padding: "6px 10px", cursor: "pointer",
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Entrada de texto */}
          <div style={{ display: "flex", gap: 8, padding: 12, borderTop: `1px solid ${C.line}`, background: C.surface }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Escribe tu pregunta…"
              style={{
                flex: 1, padding: "10px 12px", borderRadius: 999, outline: "none",
                border: `1px solid ${C.line}`, background: C.bg, color: C.ink, fontSize: 13,
              }}
            />
            <button
              onClick={() => send()}
              aria-label="Enviar"
              disabled={!input.trim()}
              style={{
                flexShrink: 0, width: 42, height: 42, borderRadius: 999, border: "none",
                background: input.trim() ? C.primary : C.line, color: C.primaryInk,
                display: "grid", placeItems: "center", cursor: input.trim() ? "pointer" : "not-allowed",
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
