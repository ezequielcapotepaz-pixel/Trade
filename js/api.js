// Acceso a los datos: Google Apps Script si hay SCRIPT_URL, si no, modo demo local.
window.Api = (() => {
  const url = window.CONFIG.SCRIPT_URL;
  const isDemo = !url;
  const DEMO_KEY = "eventos-trade-demo";

  // ---------- Google Apps Script ----------

  async function remoteGet(params) {
    const res = await fetch(`${url}?${new URLSearchParams(params)}`);
    if (!res.ok) throw new Error("network");
    return res.json();
  }

  async function remotePost(payload) {
    // text/plain evita el preflight CORS, que Apps Script no responde.
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("network");
    return res.json();
  }

  // ---------- Modo demo (localStorage) ----------

  function demoLoad() {
    try {
      const data = JSON.parse(localStorage.getItem(DEMO_KEY)) || {};
      return { rsvps: data.rsvps || [], photos: data.photos || [] };
    } catch {
      return { rsvps: [], photos: [] };
    }
  }

  function demoSave(data) {
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  const demo = {
    async list(event) {
      const attendees = demoLoad()
        .rsvps.filter((r) => r.event === event)
        .map(({ name, food, choice }) => ({ name, food, choice }));
      return { ok: true, count: attendees.length, attendees };
    },
    async register({ event, name, cedula, food, choice }) {
      const data = demoLoad();
      if (data.rsvps.some((r) => r.event === event && r.cedula === cedula)) {
        return { ok: false, error: "duplicate" };
      }
      data.rsvps.push({ event, name, cedula, food, choice, at: new Date().toISOString() });
      demoSave(data);
      return { ok: true };
    },
    async cancel({ event, cedula }) {
      const data = demoLoad();
      const kept = data.rsvps.filter((r) => !(r.event === event && r.cedula === cedula));
      if (kept.length === data.rsvps.length) return { ok: false, error: "not_found" };
      data.rsvps = kept;
      demoSave(data);
      return { ok: true };
    },
    async photos(event) {
      const photos = demoLoad()
        .photos.filter((p) => p.event === event)
        .map(({ id, src, by, at }) => ({ id, thumb: src, full: src, by, at }));
      return { ok: true, photos };
    },
    async uploadPhoto({ event, by, mimeType, data: base64 }) {
      const data = demoLoad();
      data.photos.push({
        event,
        by,
        id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
        src: `data:${mimeType};base64,${base64}`,
        at: new Date().toISOString(),
      });
      return demoSave(data) ? { ok: true } : { ok: false, error: "storage_full" };
    },
  };

  return {
    isDemo,
    list: (event) => (isDemo ? demo.list(event) : remoteGet({ action: "list", event })),
    register: (d) => (isDemo ? demo.register(d) : remotePost({ action: "register", ...d })),
    cancel: (d) => (isDemo ? demo.cancel(d) : remotePost({ action: "cancel", ...d })),
    photos: (event) => (isDemo ? demo.photos(event) : remoteGet({ action: "photos", event })),
    uploadPhoto: (d) =>
      isDemo ? demo.uploadPhoto(d) : remotePost({ action: "uploadPhoto", ...d }),
  };
})();
