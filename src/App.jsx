import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { WORLDS } from "./worlds.js";
import { claimMyCredit, createProduct, deleteProduct, getAdminProducts, getAdminSettings, getConfig, getMe, getMyCredits, getProducts, getSettings, importProducts, saveFavorites, setAdminPin, setCustomerToken, updateProduct, updateSeasons, updateSettings, uploadImages } from "./api.js";
import { activeSeason } from "./seasons.js";
import { C, money } from "./theme.js";
import { CREDIT_MIN, TEST_MODE, creditsChanged, exitTestMode, loadCustomer, loadFavs, readBrowserProducts, readBrowserSettings, saveCustomer, storeFavs, timeLeft } from "./lib/util.js";
import { BrandName, CatAvatar, CreditCoin, HeartIcon, NavBtn, PageLoader, PawIcon, TruckIcon, catPattern } from "./components/ui.jsx";
import { WorldTabs } from "./shop/worldParts.jsx";
import { HalloweenCat, HalloweenFlock } from "./shop/halloween.jsx";
import { AccountMenu, ClaimModal, JoinModal } from "./account/account.jsx";
import { ShippingInfo, Shop } from "./shop/Shop.jsx";
import { InstallApp } from "./components/InstallApp.jsx";
// Se descargan recién cuando se usan (la tienda carga más rápido).
const ChatBot = lazy(() => import("./ChatBot.jsx"));
const Admin = lazy(() => import("./admin/Admin.jsx").then((m) => ({ default: m.Admin })));
import { refreshPush } from "./components/notify.js";

export default function App() {
  const [view, setView] = useState("shop"); // 'shop' | 'admin'
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  // Mundo de la tienda (Michitienda · Glow Skin · Glow Kids); se recuerda.
  const [world, setWorldState] = useState(() => {
    try {
      // ?mundo=kids (accesos directos de la app y enlaces compartidos) manda sobre lo guardado
      const q = new URLSearchParams(window.location.search).get("mundo");
      if (WORLDS[q]) { localStorage.setItem("glow:mundo", q); return q; }
      const w = localStorage.getItem("glow:mundo");
      return WORLDS[w] ? w : "michi";
    } catch {
      return "michi";
    }
  });
  const setWorld = (w) => {
    setWorldState(w);
    try { localStorage.setItem("glow:mundo", w); } catch { /* sin almacenamiento */ }
  };
  const [loadError, setLoadError] = useState("");
  const [customer, setCustomer] = useState(loadCustomer);
  const [joinOpen, setJoinOpen] = useState(false);
  const [googleClientId, setGoogleClientId] = useState("");
  useEffect(() => {
    getConfig()
      .then((c) => {
        setGoogleClientId(c.googleClientId || "");
        if (TEST_MODE && c.testMode === false) exitTestMode(); // tienda publicada: sin modo prueba
      })
      .catch(() => {});
  }, []);
  const [favs, setFavs] = useState(loadFavs);
  // Michi-crédito de la clienta (billetera, créditos por reclamar, aviso de vencimiento)
  const [wallet, setWallet] = useState(null);
  const [claimOpen, setClaimOpen] = useState(null);
  const [expToast, setExpToast] = useState(false);
  const loadWallet = useCallback(() => {
    if (!loadCustomer()?.token) return setWallet(null);
    getMyCredits()
      .then((w) => {
        setWallet(w);
        let seen = false;
        try { seen = sessionStorage.getItem("glow:claim-visto") === "1"; } catch { /* sin almacenamiento */ }
        if (w.toClaim.length && !seen) setClaimOpen(w.toClaim[0]);
        const soon = w.balance > 0 && w.expiresAt && new Date(w.expiresAt).getTime() - Date.now() < 2 * 864e5;
        let toasted = false;
        try { toasted = sessionStorage.getItem("glow:vence-visto") === "1"; } catch { /* sin almacenamiento */ }
        if (soon && !toasted) setExpToast(true);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    window.addEventListener("glow:credits", loadWallet);
    return () => window.removeEventListener("glow:credits", loadWallet);
  }, [loadWallet]);
  const claim = async (id) => {
    const w = await claimMyCredit(id);
    setWallet(w);
  };
  const closeClaim = () => {
    setClaimOpen(null);
    try { sessionStorage.setItem("glow:claim-visto", "1"); } catch { /* sin almacenamiento */ }
  };
  const [panel, setPanel] = useState(null); // null | 'perfil' | 'pedidos' | 'favoritos'
  const [menuOpen, setMenuOpen] = useState(false);

  // Actualiza el cliente conservando su llave de sesión.
  const onCustomer = useCallback((c) => {
    setCustomer((prev) => {
      const next = c ? { ...prev, ...c, token: c.token || prev?.token } : null;
      saveCustomer(next);
      return next;
    });
  }, []);
  const onJoined = useCallback((c) => {
    setCustomerToken(c.token);
    refreshPush();
    onCustomer(c);
    setJoinOpen(false);
    setTimeout(creditsChanged, 0);
    // une los favoritos de este navegador con los de su cuenta
    setFavs((local) => {
      const merged = [...new Set([...(c.favorites || []), ...local])];
      storeFavs(merged);
      if (merged.length !== (c.favorites || []).length) saveFavorites(merged).catch(() => {});
      return merged;
    });
  }, [onCustomer]);
  const logout = () => {
    setWallet(null);
    setCustomerToken("");
    setCustomer(null);
    saveCustomer(null);
    setMenuOpen(false);
    setPanel(null);
    window.google?.accounts?.id?.disableAutoSelect?.();
  };
  // Al abrir la página con la sesión guardada: comprueba que siga vigente.
  useEffect(() => {
    const c = loadCustomer();
    if (!c?.token) {
      if (c) { saveCustomer(null); setCustomer(null); }
      return;
    }
    setCustomerToken(c.token);
    refreshPush();
    getMe()
      .then((me) => {
        onCustomer(me);
        creditsChanged();
        setFavs((local) => {
          const merged = [...new Set([...(me.favorites || []), ...local])];
          storeFavs(merged);
          return merged;
        });
      })
      .catch(() => { setCustomerToken(""); saveCustomer(null); setCustomer(null); });
  }, [onCustomer]);
  const toggleFav = useCallback((id) => {
    setFavs((list) => {
      const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
      storeFavs(next);
      if (loadCustomer()?.token) saveFavorites(next).catch(() => {});
      return next;
    });
  }, []);
  const [page, setPage] = useState("tienda"); // 'tienda' | 'cuenta'
  const [shipInfo, setShipInfo] = useState(false);

  // El panel no se muestra en la tienda: se abre con la dirección …/#admin
  useEffect(() => {
    const sync = () => { if (window.location.hash === "#admin") setView("admin"); };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const leaveAdmin = () => {
    if (window.location.hash === "#admin") history.replaceState(null, "", window.location.pathname + window.location.search);
  };
  // Tras entrar con el PIN: ajustes completos (con PIN) y productos con costo.
  const onAdminAuthed = async () => {
    try {
      const [st, prods] = await Promise.all([getAdminSettings(), getAdminProducts()]);
      setSettings(st);
      setProducts(prods);
    } catch {
      /* si falla, el panel sigue con los datos públicos */
    }
  };
  const openPanel = (section) => {
    setMenuOpen(false);
    leaveAdmin();
    setView("shop");
    if (section === "cuenta") {
      setPanel(null);
      setPage("cuenta");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else setPanel(section);
  };
  useEffect(() => {
    if (!customer && page === "cuenta") setPage("tienda");
  }, [customer, page]);
  const favCount = favs.filter((id) => products.some((p) => p.id === id)).length;
  // La pantalla de carga se muestra al menos 1.6 s para que se vea a Rosalía
  // correr; luego se desvanece sobre la tienda ya cargada.
  const [minDone, setMinDone] = useState(false);
  const [loaderGone, setLoaderGone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinDone(true), 1600);
    return () => clearTimeout(t);
  }, []);
  const ready = !loading && !!settings && minDone;
  // Colores de fondo y cabecera de Glow Skin / Glow Kids (la Michitienda usa los de su portada).
  useEffect(() => {
    const w = WORLDS[world];
    if (view !== "shop" || !w.bg) return;
    const root = document.documentElement;
    root.dataset.world = world;
    root.style.setProperty("--world-bg", w.bg);
    return () => {
      delete root.dataset.world;
      root.style.removeProperty("--world-bg");
    };
  }, [world, view]);

  // Temporada del día (Halloween, Navidad…); fuera de fecha es null.
  const season = useMemo(() => (settings ? activeSeason(settings.seasons) : null), [settings]);
  useEffect(() => {
    const root = document.documentElement;
    if (season && view === "shop") root.dataset.season = season.key;
    else delete root.dataset.season;
  }, [season, view]);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setLoaderGone(true), 600);
    return () => clearTimeout(t);
  }, [ready]);

  // Al abrir la página se piden productos y ajustes al servidor.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [p, s] = await Promise.all([getProducts(TEST_MODE), getSettings()]);
        if (!alive) return;
        setProducts(p);
        setSettings(s);
      } catch {
        if (alive)
          setLoadError(
            "No se pudo conectar con el servidor. Asegúrate de que esté encendido (npm run server)."
          );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Crear / editar / borrar productos y guardar ajustes (todo va a Postgres).
  const saveProduct = async (prod) => {
    if (prod.id) {
      const saved = await updateProduct(prod.id, prod);
      setProducts((arr) => arr.map((p) => (p.id === saved.id ? saved : p)));
    } else {
      const saved = await createProduct(prod);
      setProducts((arr) => [...arr, saved]);
    }
  };
  const removeProduct = async (id) => {
    await deleteProduct(id);
    setProducts((arr) => arr.filter((p) => p.id !== id));
  };
  const saveSettings = async (next) => {
    const saved = await updateSettings(next);
    setSettings(saved);
    setAdminPin(saved.pin); // por si cambió el PIN, seguir autorizados
  };

  // Pasa a la base de datos los productos y ajustes que estaban guardados en
  // este navegador. Las fotos/logo en base64 se suben primero como archivos.
  const importFromBrowser = async () => {
    const list = readBrowserProducts();
    let saved = 0;

    if (list.length > 0) {
      for (const p of list) {
        const dataUrls = p.images.filter(
          (u) => typeof u === "string" && u.startsWith("data:")
        );
        const uploaded = dataUrls.length ? await uploadImages(dataUrls) : [];
        let i = 0;
        p.images = p.images
          .map((u) =>
            typeof u === "string" && u.startsWith("data:") ? uploaded[i++] : u
          )
          .filter(Boolean);
      }
      ({ saved } = await importProducts(list));
      const fresh = await getProducts(); // recarga ya con todo guardado
      setProducts(fresh);
    }

    // Ajustes (nombre, WhatsApp, PIN, logo, eslogan).
    let settingsMigrated = false;
    const b = readBrowserSettings();
    if (b) {
      let logo = b.logo;
      if (typeof logo === "string" && logo.startsWith("data:")) {
        const [url] = await uploadImages([logo]); // sube el logo como archivo
        logo = url;
      }
      const merged = { ...settings, ...b, logo: logo ?? settings.logo };
      const savedSettings = await updateSettings(merged);
      setSettings(savedSettings);
      setAdminPin(savedSettings.pin); // por si el PIN viejo era distinto
      settingsMigrated = true;
    }

    return { saved, settingsMigrated };
  };

  if (loading || !settings) {
    return <PageLoader error={loadError} />;
  }

  // Inicio: vuelve a la tienda y arriba del todo.
  const goHome = () => {
    leaveAdmin();
    setView("shop");
    setPage("tienda");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div style={{ background: `var(--world-bg, ${C.bg})`, color: C.ink, minHeight: "100vh", transition: "background .4s" }}>
      {!loaderGone && <PageLoader leaving={ready} />}
      {TEST_MODE && (
        <div className="glow-testbar">
          🧪 <b>Modo prueba</b> · nada de lo que hagas aquí es real
          <button onClick={exitTestMode}>Salir</button>
        </div>
      )}
      <header className="glow-header" style={{ "--pat": catPattern(C.roseDeep) }}>
        <BrandName name={settings.storeName} onClick={goHome} season={view === "shop" ? season : null} />
        {view === "shop" && <WorldTabs world={world} onPick={(w) => { setWorld(w); setPage("tienda"); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}
        {season?.key === "halloween" && view === "shop" && <HalloweenCat />}

        <nav className="glow-nav">
          {/* 1 · navegación */}
          <div className="glow-nav-links">
            <NavBtn onClick={() => setShipInfo(true)} icon={<TruckIcon />} label="Envíos a todo el Perú" />
          </div>
          <span className="glow-nav-sep" aria-hidden="true" />
          {/* 2 · lo personal: favoritos y cuenta (con su Michi-crédito) */}
          <button className="glow-heart-btn" onClick={() => openPanel("favoritos")} aria-label={`Mis favoritos (${favCount})`} title="Mis favoritos" style={{ color: C.roseDeep }}>
            <HeartIcon filled={favCount > 0} size={19} />
            {favCount > 0 && <span key={favCount} className="glow-heart-count" style={{ background: C.aubergine }}>{favCount}</span>}
          </button>
          {customer ? (
            <div className="glow-account">
              <button className="glow-hello" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu" aria-expanded={menuOpen} title="Tu cuenta">
                <span className="glow-hello-lines">
                  <span className="glow-hello-text">Holiiii, <b>{customer.name}</b></span>
                  {wallet?.balance > 0 && (
                    <span className="glow-hello-credit">
                      <CreditCoin size={14} /> {money(wallet.balance)} de crédito
                      {wallet.expiresAt && <em> · {timeLeft(wallet.expiresAt).split(" ").slice(0, 2).join(" ")}</em>}
                    </span>
                  )}
                </span>
                <CatAvatar customer={customer} />
                {wallet?.balance > 0 && <span className="glow-avatar-dot" aria-hidden="true" />}
              </button>
              {menuOpen && <AccountMenu customer={customer} onPick={openPanel} onLogout={logout} onClose={() => setMenuOpen(false)} />}
            </div>
          ) : (
            (googleClientId || TEST_MODE) && view === "shop" && (
              <button className="glow-join-btn" onClick={() => setJoinOpen(true)} style={{ background: C.aubergine }}>
                <PawIcon /> <span className="glow-mode-label">Únete</span>
              </button>
            )
          )}
        </nav>
      </header>

      {shipInfo && <ShippingInfo settings={settings} onClose={() => setShipInfo(false)} />}
      {claimOpen && view === "shop" && <ClaimModal credit={claimOpen} onClaim={claim} onClose={closeClaim} />}
      {expToast && wallet?.balance > 0 && (
        <div className="glow-toast" role="status">
          ⏰ <span>¡Tu <b>Michi-crédito de {money(wallet.balance)}</b> vence en <b>{timeLeft(wallet.expiresAt)}</b>! Úsalo en tu próxima compra desde S/ {CREDIT_MIN}.</span>
          <button onClick={() => { setExpToast(false); try { sessionStorage.setItem("glow:vence-visto", "1"); } catch { /* sin almacenamiento */ } }} aria-label="Cerrar"><X size={16} /></button>
        </div>
      )}
      {joinOpen && <JoinModal googleClientId={googleClientId} onClose={() => setJoinOpen(false)} onJoined={onJoined} />}

      {view === "shop" ? (
        <Shop
          products={products}
          settings={settings}
          favs={favs}
          onToggleFav={toggleFav}
          panel={panel}
          onPanel={setPanel}
          customer={customer}
          onCustomer={onCustomer}
          onJoin={googleClientId || TEST_MODE ? () => { setPanel(null); setJoinOpen(true); } : null}
          accountPage={page === "cuenta" && !!customer}
          wallet={wallet}
          onClaimCredit={(c) => setClaimOpen(c)}
          season={season}
          world={world}
          onWorld={(w) => { setWorld(w); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        />
      ) : (
        <Suspense fallback={<div style={{ minHeight: "70vh" }} />}>
        <Admin
          onAuthed={onAdminAuthed}
          products={products}
          settings={settings}
          onSaveProduct={saveProduct}
          onRemoveProduct={removeProduct}
          onSaveSettings={saveSettings}
          onSaveSeasons={async (v) => setSettings(await updateSeasons(v))}
          onImportFromBrowser={importFromBrowser}
        />
        </Suspense>
      )}

      {/* Asistente de la tienda (solo para los clientes, no en el panel). */}
      {view === "shop" && <Suspense fallback={null}><ChatBot products={products} settings={settings} /></Suspense>}
      {view === "shop" && <InstallApp />}
      {season?.key === "halloween" && view === "shop" && <HalloweenFlock />}
    </div>
  );
}
