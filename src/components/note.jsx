import React from "react";
import { money } from "../theme.js";
import { CatArt } from "../shop/rosalia.jsx";
import { ORDER_STEP, whenText, imgUrl } from "../lib/util.js";

// Carita de Rosalía (la misma de la portada, recortada a la cabeza).
export function RosaliaFace() {
  return (
    <svg viewBox="56 4 88 108" aria-hidden="true">
      <CatArt variant="face" />
    </svg>
  );
}

// Cartita de venta que recibe el cliente al terminar.
export const NoteLetter = React.forwardRef(function NoteLetter({ order }, ref) {
  const date = new Date(order.createdAt).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
  return (
    <div className="glow-letter" ref={ref}>
      <div className="glow-letter-stamp"><div><RosaliaFace /></div></div>
      <p className="glow-letter-hi">¡Hola!</p>
      <h3 className="glow-letter-title">¡Gracias por<br />tu compra!</h3>
      {order.items.map((l, i) => (
        <div key={`${l.id}-${i}`} className="glow-letter-row">
          {l.image ? <img src={imgUrl(l.image, 200)} alt="" /> : <span className="glow-letter-noimg" />}
          <div>{l.name}<small>{l.gift ? "🎁 SORPRESAA!!!" : `${l.qty} × ${money(l.price)}`}</small></div>
          <b>{l.gift ? "Regalo" : money(l.qty * l.price)}</b>
        </div>
      ))}
      {order.discount > 0 && (
        <div className="glow-letter-disc"><span>Michipuntos canjeados</span><span>−{money(order.discount)}</span></div>
      )}
      {order.creditUsed > 0 && (
        <div className="glow-letter-disc"><span>Michi-crédito</span><span>−{money(order.creditUsed)}</span></div>
      )}
      {order.delivery && (
        <div className="glow-letter-disc" style={{ color: "#6b5a63" }}>
          <span>{order.delivery.type === "juliaca" ? "Entrega en Juliaca" : `Envío Shalom · ${order.delivery.department}`}</span>
          <span>{order.shipping > 0 ? money(order.shipping) : "Gratis"}</span>
        </div>
      )}
      <div className="glow-letter-tot"><span>Total</span><b>{money(order.total)}</b></div>
      <dl className="glow-letter-meta">
        <dt>Pedido</dt><dd>#{order.code} · {date}</dd>
        <dt>Pago</dt><dd>Yape · op. <span>{order.yapeOp}</span></dd>
        {order.delivery && (
          <>
            <dt>Entrega</dt>
            <dd>{order.delivery.type === "juliaca" ? `${order.delivery.point}${order.delivery.date ? " · " + whenText(order.delivery.date, order.delivery.time) : ""}` : `Shalom: ${order.delivery.agency || "agencia"} · ${order.delivery.district || order.delivery.city}${order.delivery.province ? ", " + order.delivery.province : ""}`}</dd>
          </>
        )}
      </dl>
      {(() => {
        const st = order.status === "pendiente" || !order.status ? null : ORDER_STEP[order.status];
        return st ? (
          <span className="glow-letter-verif" style={{ color: st.color, background: st.bg }}><i style={{ background: st.color }} />{st.label}</span>
        ) : (
          <span className="glow-letter-verif"><i />Pago enviado · en verificación</span>
        );
      })()}
      <div className="glow-letter-sign">con cariño, Rosalía</div>
    </div>
  );
});
