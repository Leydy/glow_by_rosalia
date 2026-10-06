import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Image as ImageIcon, MessageCircle, Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { toPng } from "html-to-image";
import { createOrder, getConfig, getMyCredits, getMyPoints, getShalomAgencies } from "../api.js";
import UBIGEO from "../ubigeo.json";
import { C, money } from "../theme.js";
import { CREDIT_MIN, CREDIT_SHARE, DAY_SHORT, TEST_MODE, creditsChanged, fileToDataURL, fmtPts, hour12, nextDates, round2, scheduleText, slotsFor, whenText, ymd, imgUrl } from "../lib/util.js";
import { checkYape, makeSampleCapture, parseYapeText, readYapeCapture } from "./payment.js";
import { NoteLetter } from "../components/note.jsx";
import { Thumb, YapeMark } from "../components/ui.jsx";
import { RewardPicker } from "../account/account.jsx";
import { NotifyButton } from "../components/NotifyButton.jsx";

// Pago con Yape en 5 pasos: pagar → subir captura → leerla → revisar → notita.
// Paso 1 del pago: cómo recibe su pedido (gratis en Juliaca o envío Shalom).
export function DeliveryStep({ settings, customer, value, onChange, itemsTotal, discount, discountLabel = "Michipuntos", onNext, onBack }) {
  const [deps, setDeps] = useState([]);
  useEffect(() => {
    getConfig().then((c) => setDeps(c.departments || [])).catch(() => {});
  }, []);
  const cfg = settings.shipping || { juliacaPoints: [], defaultRate: 0, rates: {} };
  const v = value;
  // Agencias Shalom del departamento elegido (si la tienda tiene la clave).
  const [agencies, setAgencies] = useState({ enabled: false, items: [], loading: false });
  useEffect(() => {
    if (v.type !== "shalom" || !v.department) return;
    let alive = true;
    setAgencies((a) => ({ ...a, loading: true }));
    getShalomAgencies(v.department)
      .then((r) => alive && setAgencies({ ...r, loading: false }))
      .catch(() => alive && setAgencies({ enabled: false, items: [], loading: false }));
    return () => { alive = false; };
  }, [v.type, v.department]);
  const agencyList = agencies.enabled && agencies.items.length > 0;
  const suggested = (cfg.agencies || {})[v.department] || [];
  const OTHER = "__otra__";
  const set = (k, x) => onChange({ ...v, [k]: x });
  const rate = (dep) => {
    const r = cfg.rates?.[dep];
    return r !== "" && r != null && Number.isFinite(Number(r)) ? Number(r) : cfg.defaultRate;
  };
  const shipping = v.type === "shalom" && v.department ? rate(v.department) : 0;
  const cel = (v.phone || "").replace(/\D/g, "").replace(/^51(?=9\d{8}$)/, "");
  const celOk = /^9\d{8}$/.test(cel);
  const fullName = (v.name || "").trim().split(/\s+/).filter((w) => w.length > 1).length >= 2;
  const pt = cfg.juliacaPoints.find((p) => p.name === v.point);
  const ok =
    v.type === "juliaca" ? !!pt && !!v.date && !!v.time && v.name?.trim() && celOk
    : v.type === "shalom" ? !!v.department && !!v.province && !!v.district && v.agency?.trim() && fullName && /^\d{8}$/.test(v.dni || "") && celOk
    : false;
  const missing =
    v.type === "juliaca"
      ? !pt ? "Elige el punto de encuentro" : !v.date ? "Elige el día" : !v.time ? "Elige la hora" : !v.name?.trim() ? "Escribe tu nombre" : !celOk ? "Escribe un celular de 9 dígitos" : ""
      : v.type === "shalom"
      ? !v.department ? "Elige el departamento" : !v.province ? "Elige la provincia" : !v.district ? "Elige el distrito" : !v.agency?.trim() ? "Elige la agencia Shalom" : !fullName ? "Escribe nombres y apellidos completos" : !/^\d{8}$/.test(v.dni || "") ? "El DNI debe tener 8 dígitos" : !celOk ? "El celular debe tener 9 dígitos" : ""
      : "";
  // primera vez: completa con los datos del perfil
  useEffect(() => {
    if (customer && !v.name) onChange({ ...v, name: customer.name || "", phone: customer.phone || "" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="glow-deliv">
      <p className="glow-field-label" style={{ marginTop: 0 }}>¿Cómo quieres recibir tu pedido?</p>
      <div className="glow-deliv-opts">
        <button type="button" className={v.type === "juliaca" ? "is-on" : ""} onClick={() => set("type", "juliaca")}>
          <span className="glow-deliv-ico">📍</span>
          <b>Entrega en Juliaca</b>
          <small className="glow-free">GRATIS</small>
        </button>
        <button type="button" className={v.type === "shalom" ? "is-on" : ""} onClick={() => set("type", "shalom")}>
          <span className="glow-deliv-ico">🚚</span>
          <b>Envío por Shalom</b>
          <small>resto del Perú</small>
        </button>
      </div>

      {v.type === "juliaca" && (
        <>
          <p className="glow-field-label">Punto de entrega</p>
          <div className="glow-points">
            {cfg.juliacaPoints.map((pt) => (
              <label key={pt.name} className={v.point === pt.name ? "is-on" : ""}>
                <input type="radio" name="punto" checked={v.point === pt.name} onChange={() => onChange({ ...v, point: pt.name, date: "", time: "" })} />
                <span className="glow-rw-dot" />
                <span>{pt.name}<small className="glow-point-time">🕒 {scheduleText(pt)}</small></span>
              </label>
            ))}
          </div>
          {pt && (
            <>
              <p className="glow-field-label">Día</p>
              <div className="glow-chips">
                {nextDates(pt).map((dt) => {
                  const k = ymd(dt);
                  return (
                    <button key={k} type="button" className={v.date === k ? "is-on" : ""} onClick={() => onChange({ ...v, date: k, time: "" })}>
                      <small>{DAY_SHORT[dt.getDay()]}</small><b>{dt.getDate()}</b><small>{dt.toLocaleDateString("es-PE", { month: "short" })}</small>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {pt && v.date && (
            <>
              <p className="glow-field-label">Hora exacta</p>
              <div className="glow-chips is-time">
                {slotsFor(pt, v.date).map((t) => (
                  <button key={t} type="button" className={v.time === t ? "is-on" : ""} onClick={() => set("time", t)}>{hour12(t)}</button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {v.type === "shalom" && (
        <>
          <p className="glow-field-label">Departamento de destino</p>
          <select className="glow-select" value={v.department || ""} onChange={(e) => onChange({ ...v, department: e.target.value, province: "", district: "", agency: "", agencyPick: "", agencyId: "" })}>
            <option value="">Elige…</option>
            {deps.map((d) => <option key={d}>{d}</option>)}
          </select>
          {v.department && (
            <div className="glow-2col">
              <div>
                <p className="glow-field-label">Provincia</p>
                <select className="glow-select" value={v.province || ""} onChange={(e) => onChange({ ...v, province: e.target.value, district: "" })}>
                  <option value="">Elige…</option>
                  {Object.keys(UBIGEO[v.department] || {}).sort((a, b) => a.localeCompare(b, "es")).map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <p className="glow-field-label">Distrito</p>
                <select className="glow-select" value={v.district || ""} disabled={!v.province} onChange={(e) => set("district", e.target.value)}>
                  <option value="">{v.province ? "Elige…" : "Primero la provincia"}</option>
                  {((UBIGEO[v.department] || {})[v.province] || []).map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
          )}
          {agencyList ? (
            <>
              <p className="glow-field-label">Agencia Shalom donde recogerás</p>
              <select
                className="glow-select"
                value={v.agencyId || ""}
                onChange={(e) => {
                  const a = agencies.items.find((x) => x.id === e.target.value);
                  onChange({ ...v, agencyId: a?.id || "", agency: a ? `${a.name}${a.address ? " – " + a.address : ""}` : "" });
                }}
              >
                <option value="">Elige la agencia…</option>
                {[...new Set(agencies.items.map((a) => a.province))].map((prov) => (
                  <optgroup key={prov} label={prov || v.department}>
                    {agencies.items.filter((a) => a.province === prov).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}{a.district ? ` · ${a.district}` : ""}{a.address ? ` – ${a.address}` : ""}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </>
          ) : (
            <>
              <p className="glow-field-label">Agencia Shalom donde recogerás</p>
              {suggested.length > 0 && (
                <select
                  className="glow-select"
                  value={v.agencyPick || ""}
                  onChange={(e) => onChange({ ...v, agencyPick: e.target.value, agency: e.target.value === OTHER ? "" : e.target.value })}
                  style={{ marginBottom: 6 }}
                >
                  <option value="">Elige una agencia…</option>
                  {suggested.map((a) => <option key={a} value={a}>{a}</option>)}
                  <option value={OTHER}>Otra agencia (la escribo)</option>
                </select>
              )}
              {(suggested.length === 0 || v.agencyPick === OTHER) && (
                <>
                  <input className="glow-input" value={v.agency || ""} onChange={(e) => set("agency", e.target.value)} placeholder="DIRECCIÓN DE LA AGENCIA SHALOM" />
                  <p className="glow-hint">⚠️ Es la dirección de la <b>agencia Shalom</b> donde recogerás, no la de tu casa.</p>
                </>
              )}
            </>
          )}
          <a className="glow-map-link" href="https://shalom.com.pe/agencias" target="_blank" rel="noreferrer">
            🗺️ ¿No sabes qué agencia? Búscala en el mapa de Shalom
          </a>
          <p className="glow-field-label">DNI de quien recoge</p>
          <input className="glow-input" inputMode="numeric" value={v.dni || ""} onChange={(e) => set("dni", e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="8 dígitos" />
        </>
      )}

      {v.type && (
        <>
          <div className="glow-2col">
            <div><p className="glow-field-label">{v.type === "shalom" ? "Nombres y apellidos completos" : "Tu nombre"}</p><input className="glow-input" value={v.name || ""} onChange={(e) => set("name", e.target.value)} placeholder={v.type === "shalom" ? "Como figura en su DNI" : "Nombre y apellido"} /></div>
            <div><p className="glow-field-label">Celular</p><input className="glow-input" inputMode="tel" value={v.phone || ""} onChange={(e) => set("phone", e.target.value.replace(/[^\d+ ]/g, ""))} placeholder="987 654 321" /></div>
          </div>
          <p className="glow-field-label">Nota <small>(opcional)</small></p>
          <input className="glow-input" value={v.note || ""} onChange={(e) => set("note", e.target.value)} placeholder={v.type === "juliaca" ? "Ej. estaré con polera rosada" : "Algo que debamos saber"} />

          {v.type === "juliaca" && pt && v.date && v.time && (
            <p className="glow-when">📍 {pt.name}<br />🕒 {whenText(v.date, v.time)}</p>
          )}
          <div className="glow-sum">
            <div><span>Productos</span><span>{money(itemsTotal + discount)}</span></div>
            {discount > 0 && <div className="is-gold"><span>{discountLabel}</span><span>−{money(discount)}</span></div>}
            <div><span>Envío</span><span>{v.type === "juliaca" ? "Gratis 🎉" : v.department ? money(shipping) : "—"}</span></div>
            <div className="is-total"><span>Total a yapear</span><b>{money(itemsTotal + shipping)}</b></div>
          </div>
        </>
      )}
      <button className="glow-pay-btn" disabled={!ok} onClick={() => onNext(shipping)} style={{ background: ok ? C.yape : C.line, marginTop: 14 }}>
        {ok || !missing ? "Continuar al pago" : missing}
      </button>
      <button className="glow-link-btn" onClick={onBack} style={{ color: C.plum }}><ChevronLeft size={16} /> Volver al carrito</button>
    </div>
  );
}

export function YapeCheckout({ settings, lines, total: itemsTotal, discount = 0, discountLabel = "Michipuntos", reward = "", useCredit = false, willEarn = 0, customer, onBack, onDone, order }) {
  const [step, setStep] = useState(order ? "done" : "entrega");
  const [delivery, setDelivery] = useState({ type: "" });
  const [shipping, setShipping] = useState(0);
  const total = itemsTotal + shipping;
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [read, setRead] = useState({ op: "", amount: null, toMe: null });
  const [op, setOp] = useState("");
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const noteRef = useRef(null);
  const num = settings.yapeNumber || "";
  const pretty = num.replace(/(\d{3})(?=\d)/g, "$1 ").trim();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(num);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* sin permiso para copiar: el número queda visible igual */
    }
  };

  const useSample = async () => processFile(await makeSampleCapture(total, settings.yapeName));
  const onPick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) processFile(f);
  };
  const processFile = async (f) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setErr("");
    setStep("reading");
    const started = Date.now();
    let r = { op: "", amount: null, toMe: null, app: null, date: null, labeled: false, storeShot: false };
    try {
      r = parseYapeText(await readYapeCapture(f), settings.yapeName);
    } catch {
      /* si la lectura falla, el cliente escribe el número a mano */
    }
    await new Promise((ok) => setTimeout(ok, Math.max(0, 1500 - (Date.now() - started))));
    setRead(r);
    setOp(r.op);
    setStep("review");
  };

  const confirm = async () => {
    if (verdict.block) return;
    setSending(true);
    setErr("");
    try {
      const capture = await fileToDataURL(file, 1400, 0.85);
      const payCheck = {
        app: read.app, amount: read.amount, amountOk: verdict.amountOk, toMe: read.toMe, dateOk: verdict.dateOk,
        date: read.date ? read.date.toISOString().slice(0, 10) : "",
      };
      const o = await createOrder({ items: lines.map((l) => ({ id: l.id, qty: l.qty, size: l.size || "", color: l.color || "" })), yapeOp: op, capture, test: TEST_MODE, reward, delivery, useCredit, payCheck });
      creditsChanged();
      onDone(o);
      setStep("done");
    } catch (e) {
      setErr(e.message || "No se pudo registrar el pedido.");
    } finally {
      setSending(false);
    }
  };

  const download = async () => {
    if (!noteRef.current) return;
    try {
      const url = await toPng(noteRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: "#FFFDF8" });
      const a = document.createElement("a");
      a.href = url;
      a.download = `notita-${order.code}.png`;
      a.click();
    } catch {
      alert("No se pudo descargar la notita. Puedes tomarle captura de pantalla.");
    }
  };

  const whatsapp = () => {
    const items = order.items.map((l) => `• ${l.qty}x ${l.name} — ${money(l.price * l.qty)}`).join("\n");
    const link = order.capture ? `\nCaptura: ${window.location.origin}${order.capture}` : "";
    const msg = `Hola ${settings.storeName}, pagué mi pedido #${order.code} por Yape:\n${items}\n\nTotal: ${money(order.total)}\nNro. de operación: ${order.yapeOp}${link}`;
    window.open(`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const dots = { entrega: 1, pay: 2, upload: 3, reading: 4, review: 5 }[step];
  const verdict = checkYape(read, total);
  const amountOk = verdict.amountOk;

  return (
    <div className="glow-yape">
      {dots && (
        <div className="glow-steps-dots">
          {[1, 2, 3, 4, 5].map((k) => <i key={k} className={k <= dots ? "on" : ""} style={k <= dots ? { background: C.yape } : null} />)}
        </div>
      )}

      {step === "entrega" && (
        <DeliveryStep
          settings={settings}
          customer={customer}
          value={delivery}
          onChange={setDelivery}
          itemsTotal={itemsTotal}
          discount={discount}
          discountLabel={discountLabel}
          onNext={(ship) => { setShipping(ship); setStep("pay"); }}
          onBack={onBack}
        />
      )}

      {step === "pay" && (
        <>
          <p className="glow-yape-label">Monto a yapear</p>
          <p className="glow-yape-total" style={{ color: C.yape }}>{money(total)}</p>
          {settings.yapeQr && (
            <div className="glow-yape-qr" style={{ borderColor: C.yape }}>
              <img src={settings.yapeQr} alt="Código QR de Yape" />
            </div>
          )}
          {num && (
            <div className="glow-yape-num">
              <div>
                <small>Número Yape</small>
                <b>{pretty}</b>
                {settings.yapeName && <span>{settings.yapeName}</span>}
              </div>
              <button onClick={copy} style={{ color: C.yape, borderColor: C.yape }}>{copied ? "¡Copiado!" : "Copiar"}</button>
            </div>
          )}
          <ol className="glow-yape-steps">
            <li>Abre Yape y {settings.yapeQr ? "escanea el QR" : "yapea al número"}{settings.yapeQr && num ? " o yapea al número" : ""}.</li>
            <li>Paga exactamente <b>{money(total)}</b>.</li>
            <li>Guarda la captura del comprobante: la subes en el siguiente paso.</li>
          </ol>
          <button className="glow-pay-btn" onClick={() => setStep("upload")} style={{ background: C.yape }}>Ya yapeé · siguiente</button>
          <button className="glow-link-btn" onClick={() => setStep("entrega")} style={{ color: C.plum }}><ChevronLeft size={16} /> Cambiar entrega</button>
        </>
      )}

      {step === "upload" && (
        <>
          <label className="glow-drop" style={{ color: C.yape }}>
            <ImageIcon size={46} strokeWidth={1.6} />
            <b>Sube la captura de tu Yape</b>
            <small>JPG o PNG · desde tu galería</small>
            <input type="file" accept="image/*" onChange={onPick} hidden />
          </label>
          <p className="glow-tip">Que se vean el <b>monto</b> y el <b>Nro. de operación</b>. Lo leemos automáticamente.</p>
          {TEST_MODE && (
            <button className="glow-pay-btn is-ghost" onClick={useSample} style={{ color: C.aubergine, borderColor: C.aubergine, marginTop: 12 }}>
              🧪 Usar captura de ejemplo (prueba)
            </button>
          )}
          <button className="glow-link-btn" onClick={() => setStep("pay")} style={{ color: C.plum }}><ChevronLeft size={16} /> Volver</button>
        </>
      )}

      {step === "reading" && (
        <>
          <div className="glow-scan">
            <img src={preview} alt="Tu captura" />
            <span />
          </div>
          <p className="glow-reading" style={{ color: C.aubergine }}>Rosalía está leyendo tu comprobante…</p>
        </>
      )}

      {step === "review" && (
        <>
          <div className="glow-review-thumb">
            <img src={preview} alt="" />
            <div>
              <b>Tu captura</b>
              <label style={{ color: C.yape }}>Cambiar<input type="file" accept="image/*" onChange={onPick} hidden /></label>
            </div>
          </div>
          <div className="glow-checks">
            <div className={amountOk === false ? "is-warn" : amountOk ? "is-ok" : ""}>
              <span>Monto</span>
              <span>
                <b>{read.amount != null ? money(read.amount) : "—"}</b>{" "}
                {amountOk ? "✓ coincide" : amountOk === false ? `⚠ el pedido es ${money(total)}` : "no se pudo leer"}
              </span>
            </div>
            {read.toMe != null && (
              <div className={read.toMe ? "is-ok" : "is-warn"}>
                <span>Para</span>
                <span>{read.toMe ? `✓ ${settings.yapeName}` : "⚠ no se reconoce el destinatario"}</span>
              </div>
            )}
            <div className={read.app ? "is-ok" : ""}>
              <span>App</span>
              <span>{read.app ? `✓ ${read.app === "yape" ? "Yape" : "Plin"}` : "no se reconoce"}</span>
            </div>
            {verdict.dateOk != null && (
              <div className={verdict.dateOk ? "is-ok" : "is-warn"}>
                <span>Fecha</span>
                <span>{verdict.dateOk ? "✓ reciente" : "⚠ captura antigua"}</span>
              </div>
            )}
          </div>
          {verdict.block && (
            <div className="glow-pay-block">
              <b>No podemos continuar con esta captura</b>
              <span>{verdict.block}</span>
              <span className="glow-pay-block-help">
                ¿Tu pago es correcto y no lo reconocemos?{" "}
                <a href={`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(`Hola, hice un pago de ${money(total)} y la tienda no reconoce mi captura. ¿Me ayudan?`)}`} target="_blank" rel="noreferrer">Escríbenos por WhatsApp</a>
              </span>
            </div>
          )}
          <label className="glow-field-label">Nro. de operación {read.op ? "(leído de tu captura)" : ""}</label>
          <input
            className="glow-op-input"
            style={{ color: C.yape }}
            inputMode="numeric"
            value={op}
            onChange={(e) => setOp(e.target.value.replace(/\D/g, "").slice(0, 14))}
            placeholder="Escríbelo si no se leyó"
          />
          <p className="glow-hint">Está en tu comprobante de Yape, debajo del monto.</p>
          {err && <p className="glow-err">{err}</p>}
          <button className="glow-pay-btn" onClick={confirm} disabled={op.length < 4 || sending || !!verdict.block} style={{ background: op.length < 4 || verdict.block ? C.line : C.yape, marginTop: 14 }}>
            {sending ? "Enviando…" : "Confirmar y ver mi notita"}
          </button>
        </>
      )}

      {step === "done" && order && (
        <>
          {order.items.some((l) => l.gift) && (() => {
            const g = order.items.find((l) => l.gift);
            return (
              <div className="glow-gift">
                <p className="glow-gift-title">🎁 SORPRESAA!!!</p>
                {g.image && <img src={imgUrl(g.image, 480)} alt={g.name} />}
                <p>Tu regalo es: <b>{g.name}</b></p>
              </div>
            );
          })()}
          <NoteLetter order={order} ref={noteRef} />
          {willEarn > 0 && <p className="glow-earn" style={{ marginTop: 14 }}>🧶 Cuando confirmemos tu pago sumarás <b>{fmtPts(willEarn)} Michipuntos</b></p>}
          <NotifyButton />
          <button className="glow-pay-btn" onClick={download} style={{ background: C.primary, boxShadow: "none", marginTop: 16 }}>Descargar mi notita</button>
          <button className="glow-pay-btn is-ghost" onClick={whatsapp} style={{ color: C.yape, borderColor: C.yape, marginTop: 8 }}>
            <MessageCircle size={18} /> Enviar a la tienda por WhatsApp
          </button>
        </>
      )}
    </div>
  );
}

export function CartDrawer({ lines, total: subtotal, onClose, onSetQty, onClear, onOrder, settings, customer, onJoin }) {
  const [step, setStep] = useState("cart"); // 'cart' | 'yape'
  const [order, setOrder] = useState(null); // pedido ya registrado (muestra la notita)
  const [pts, setPts] = useState(null); // Michipuntos de la clienta
  const [reward, setReward] = useState(""); // clave del canje de Michipuntos o "credito"
  const [wallet, setWallet] = useState(null); // Michi-crédito
  useEffect(() => {
    if (!customer?.token) return;
    getMyPoints().then(setPts).catch(() => {});
    getMyCredits().then(setWallet).catch(() => {});
  }, [customer?.token]);
  const tier = pts?.rewards.find((r) => r.key === reward);
  const creditAmt = reward === "credito" && wallet && subtotal >= CREDIT_MIN ? round2(Math.min(wallet.balance, subtotal * CREDIT_SHARE)) : 0;
  // si cambia el carrito y el beneficio ya no aplica, se quita
  useEffect(() => {
    if ((tier && subtotal < tier.min) || (reward === "credito" && subtotal < CREDIT_MIN)) setReward("");
  }, [subtotal, tier, reward]);
  const discount = reward === "credito" ? creditAmt : tier ? tier.value : 0;
  const discountLabel = reward === "credito" ? "Michi-crédito" : "Michipuntos";
  const total = subtotal - discount;
  const weighted = lines.reduce((s, l) => s + l.qty * l.price * (l.doublePoints ? 2 : 1), 0);
  const willEarn = subtotal ? Math.floor(weighted * (total / subtotal) * (pts?.perSol || 1.25) * (pts?.level.mult || 1)) : 0;
  const yapeReady = !!(settings.yapeNumber || settings.yapeQr);
  useEffect(() => {
    if (lines.length === 0 && !order) setStep("cart");
  }, [lines.length, order]);
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "flex-end", background: "#2e1b2c66", zIndex: 70 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 420, height: "100%", display: "flex", flexDirection: "column", background: C.surface }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShoppingCart size={20} color={C.roseDeep} />
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, margin: 0 }}>{order ? "¡Listo!" : step === "yape" ? "Pagar con Yape" : "Tu pedido"}</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.inkSoft }}><X size={22} /></button>
        </div>

        {step === "yape" ? (
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px 20px" }}>
            <YapeCheckout
              settings={settings}
              lines={lines}
              total={total}
              reward={reward === "credito" ? "" : reward}
              useCredit={reward === "credito"}
              discount={discount}
              discountLabel={discountLabel}
              customer={customer}
              willEarn={customer ? willEarn : 0}
              order={order}
              onBack={() => setStep("cart")}
              onDone={(o) => { setOrder(o); onClear(); }}
            />
          </div>
        ) : (
        <>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px" }}>
          {lines.length === 0 ? (
            <p className="glow-soft" style={{ textAlign: "center", fontSize: 19, marginTop: 40 }}>Tu carrito está vacío.</p>
          ) : (
            lines.map((l) => (
              <div key={l.key || l.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.line}` }}>
                <Thumb src={l.images?.[0]} alt={l.name} size={52} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{l.name}</div>
                  <div style={{ color: C.plum, fontSize: 13 }}>{money(l.price)} c/u</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => onSetQty(l.key || l.id, l.qty - 1)} aria-label="Quitar uno" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.line}`, background: C.bg, color: C.ink, display: "grid", placeItems: "center", cursor: "pointer" }}>
                    <Minus size={14} />
                  </button>
                  <span style={{ minWidth: 20, textAlign: "center", fontWeight: 600 }}>{l.qty}</span>
                  <button onClick={() => onSetQty(l.key || l.id, Math.min(l.qty + 1, l.stock))} disabled={l.qty >= l.stock} aria-label="Agregar uno" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.line}`, background: C.bg, color: l.qty >= l.stock ? C.inkSoft : C.ink, display: "grid", placeItems: "center", cursor: l.qty >= l.stock ? "not-allowed" : "pointer" }}>
                    <Plus size={14} />
                  </button>
                  <button onClick={() => onSetQty(l.key || l.id, 0)} aria-label="Eliminar" style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "none", color: C.roseDeep, display: "grid", placeItems: "center", cursor: "pointer" }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.line}` }}>
          {lines.length > 0 && customer && <RewardPicker info={pts} wallet={wallet} subtotal={subtotal} value={reward} onChange={setReward} />}
          {tier?.surprise && <p className="glow-earn">🎁 Recibirás un regalo misterioso con tu pedido</p>}
          {discount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: C.inkSoft, marginBottom: 4 }}>
              <span>Subtotal {money(subtotal)}</span><span style={{ color: C.antique, fontWeight: 700 }}>{discountLabel} −{money(discount)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ color: C.inkSoft }}>Total <small>(sin envío)</small></span>
            <span style={{ fontSize: 22, fontWeight: 700 }}>{money(total)}</span>
          </div>
          {lines.length > 0 && <p style={{ margin: "0 0 8px", fontSize: 12, color: C.inkSoft }}>📍 Entrega gratis en Juliaca · 🚚 envío Shalom al resto del Perú</p>}
          {lines.length > 0 && (customer ? (
            <p className="glow-earn">🧶 Con esta compra ganarás <b>{fmtPts(willEarn)} Michipuntos</b></p>
          ) : onJoin ? (
            <button className="glow-earn is-join" onClick={onJoin}>🧶 Únete y gana <b>{fmtPts(Math.floor(weighted * 1.25) + 100)} Michipuntos</b> con esta compra</button>
          ) : null)}
          {yapeReady && (
            <button
              className="glow-pay-btn"
              onClick={() => setStep("yape")}
              disabled={lines.length === 0}
              style={{ background: lines.length === 0 ? C.line : C.yape, color: lines.length === 0 ? C.inkSoft : "#fff", marginBottom: 8 }}
            >
              <YapeMark /> Pagar con Yape
            </button>
          )}
          <button
            onClick={() => onOrder(false)}
            disabled={lines.length === 0}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px 0", borderRadius: 12, fontSize: 15, fontWeight: 600,
              border: yapeReady ? `2px solid ${lines.length === 0 ? C.line : C.primary}` : "none",
              background: yapeReady ? C.surface : lines.length === 0 ? C.line : C.primary,
              color: lines.length === 0 ? C.inkSoft : yapeReady ? C.primary : C.primaryInk,
              cursor: lines.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            <MessageCircle size={18} />
            {yapeReady ? "Consultar por WhatsApp" : "Finalizar pedido por WhatsApp"}
          </button>
          {lines.length > 0 && (
            <button onClick={onClear} style={{ width: "100%", marginTop: 8, padding: "8px 0", borderRadius: 12, border: "none", background: "none", color: C.inkSoft, fontWeight: 600, cursor: "pointer" }}>
              Vaciar carrito
            </button>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
}
