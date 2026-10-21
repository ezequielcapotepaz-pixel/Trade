// Render del sitio: inicio (eventos próximos y pasados) y vista de cada evento (#id-del-evento).
(() => {
  const { CONFIG, EVENTS, Api, Cedula } = window;
  const app = document.getElementById("app");
  const FOOD_OPTIONS = ["Sin preferencia", "Vegetariano", "Vegano", "Celíaco", "Otra"];
  const EVENT_LENGTH_MS = 12 * 60 * 60 * 1000; // un evento se considera pasado 12 h después de empezar

  const ERRORS = {
    invalid_name: "Escribí tu nombre y apellido.",
    invalid_cedula: "La cédula no es válida. Revisá los números y el dígito verificador.",
    duplicate: "Esa cédula ya está anotada para este evento.",
    not_found: "No encontramos una inscripción con esa cédula para este evento.",
    invalid_event: "Este evento no acepta inscripciones.",
    invalid_type: "Ese archivo no es una imagen JPG, PNG o WEBP.",
    too_large: "La foto es demasiado grande.",
    storage_full: "No hay más espacio en el modo demo. Configurá Google Sheets para guardar fotos.",
    network: "No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.",
  };

  // ---------- Utilidades ----------

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  // date puede ser "AAAA-MM-DD" (hora a confirmar) o "AAAA-MM-DDTHH:MM".
  const hasTime = (ev) => /T\d/.test(ev.date || "");
  const startOf = (ev) => {
    if (!ev.date) return null;
    if (hasTime(ev)) return new Date(ev.date);
    const [y, m, d] = ev.date.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const isPast = (ev) => {
    const d = startOf(ev);
    if (!d) return false;
    // Sin hora, el evento ocupa todo el día: pasa a "anteriores" a las 6 del día siguiente.
    const length = hasTime(ev) ? EVENT_LENGTH_MS : 30 * 60 * 60 * 1000;
    return Date.now() > d.getTime() + length;
  };

  function formatDay(ev) {
    const d = startOf(ev);
    if (!d) return "Fecha a confirmar";
    const s = d.toLocaleDateString("es-UY", { weekday: "long", day: "numeric", month: "long" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function formatTime(ev) {
    const d = startOf(ev);
    if (!d) return "";
    if (!hasTime(ev)) return "Hora a confirmar";
    return `${d.toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit", hour12: false })} hs`;
  }

  function countdown(ev) {
    const d = startOf(ev);
    if (!d) return "";
    if (isPast(ev)) return "Este evento ya pasó";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    const days = Math.round((day - today) / 86400000);
    if (days <= 0) return hasTime(ev) && Date.now() >= d.getTime() ? "¡Está pasando ahora!" : "¡Es hoy!";
    if (days === 1) return "Es mañana";
    return hasTime(ev) ? "Faltan" : `Faltan ${days} días`;
  }

  // Cuenta regresiva en vivo; tickCountdowns() la actualiza cada segundo.
  function countdownHtml(ev) {
    const d = startOf(ev);
    if (!d) return "";
    // Sin hora no hay a qué contar: solo se muestra cuántos días faltan.
    if (!hasTime(ev) || Date.now() >= d.getTime()) return `<p class="countdown">${esc(countdown(ev))}</p>`;
    const unit = (key, label) =>
      `<div class="cd-unit"><span class="cd-num" data-unit="${key}">00</span><span class="cd-label">${label}</span></div>`;
    return `
      <div class="cd" data-countdown="${esc(ev.id)}" role="timer" aria-label="Cuenta regresiva hasta el evento">
        <p class="countdown" data-cd-label>${esc(countdown(ev))}</p>
        <div class="cd-units">
          ${unit("d", "días")}${unit("h", "horas")}${unit("m", "min")}${unit("s", "seg")}
        </div>
      </div>`;
  }

  function tickCountdowns() {
    app.querySelectorAll("[data-countdown]").forEach((box) => {
      const ev = EVENTS.find((e) => e.id === box.dataset.countdown);
      const left = startOf(ev).getTime() - Date.now();
      if (left <= 0) {
        box.outerHTML = `<p class="countdown">${esc(countdown(ev))}</p>`;
        return;
      }
      const secs = Math.floor(left / 1000);
      const parts = {
        d: Math.floor(secs / 86400),
        h: Math.floor(secs / 3600) % 24,
        m: Math.floor(secs / 60) % 60,
        s: secs % 60,
      };
      for (const [key, value] of Object.entries(parts)) {
        box.querySelector(`[data-unit="${key}"]`).textContent = String(value).padStart(2, "0");
      }
      box.querySelector("[data-cd-label]").textContent = countdown(ev);
    });
  }

  const errorText = (code) => ERRORS[code] || "Algo salió mal. Intentá de nuevo en un rato.";

  function setMsg(el, text, kind) {
    el.textContent = text;
    el.className = `msg ${kind || ""}`;
    el.hidden = !text;
  }

  // ---------- Inicio ----------

  function renderHome() {
    document.title = CONFIG.SITE_NAME;
    const sorted = [...EVENTS].sort((a, b) => (startOf(a) || Infinity) - (startOf(b) || Infinity));
    const upcoming = sorted.filter((e) => !isPast(e));
    const past = sorted.filter(isPast).reverse();

    app.innerHTML = `
      <section aria-labelledby="h-upcoming">
        <div class="section-head">
          <h1 class="block-title" id="h-upcoming">Próximos eventos</h1>
          ${upcoming.length ? `<p class="hint">Elegí un evento para ver los detalles y registrarte</p>` : ""}
        </div>
        ${upcoming.length ? cardsHtml(upcoming) : `<p class="empty">No hay eventos programados por ahora.</p>`}
      </section>
      ${past.length ? `<section><div class="section-head"><h2 class="block-title">Eventos anteriores</h2><p class="hint">Entrá para ver las fotos</p></div>${cardsHtml(past)}</section>` : ""}
    `;
  }

  function infoBodyHtml(ev) {
    return `
      ${countdownHtml(ev)}
      <dl class="facts">
        <dt>Cuándo</dt>
        <dd>${esc(formatDay(ev))}${formatTime(ev) ? `<span class="sub">${esc(formatTime(ev))}</span>` : ""}</dd>
        <dt>Dónde</dt>
        <dd>${esc(ev.place || "Lugar a confirmar")}${ev.address ? `<span class="sub">${esc(ev.address)}</span>` : ""}</dd>
      </dl>
      ${ev.highlights?.length ? `<ul class="chips">${ev.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>` : ""}
      ${ev.note ? `<p class="note">${esc(ev.note)}</p>` : ""}
      ${ev.description ? `<p class="description">${esc(ev.description)}</p>` : ""}
      ${ev.rsvp ? `<p class="going"><strong data-count="${ev.id}">–</strong> <span>confirmados</span></p>` : ""}`;
  }

  // Texto corto para la etiqueta de cada tarjeta.
  function cardStatus(ev) {
    if (isPast(ev)) return "";
    if (!ev.rsvp) return "Próximamente";
    const label = countdown(ev);
    if (label !== "Faltan") return label;
    const day = startOf(ev);
    const today = new Date();
    day.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return `Faltan ${Math.round((day - today) / 86400000)} días`;
  }

  function cardsHtml(list) {
    return `<div class="cards">${list
      .map((ev) => {
        const status = cardStatus(ev);
        const when = hasTime(ev) ? `${formatDay(ev)} · ${formatTime(ev)}` : formatDay(ev);
        return `
        <a class="card" href="#${ev.id}">
          <div class="thumb">
            <img src="${esc(ev.banner)}" alt="" loading="lazy" width="1024" height="1536">
          </div>
          ${status ? `<span class="card-status${ev.rsvp ? "" : " soon"}">${esc(status)}</span>` : ""}
          <h3>${esc(ev.title)}</h3>
          <p>${esc(when)}${ev.place ? ` · ${esc(ev.place)}` : ""}</p>
        </a>`;
      })
      .join("")}</div>`;
  }

  // ---------- Vista de evento ----------

  function renderEvent(ev, focus) {
    document.title = `${ev.title} · ${CONFIG.SITE_NAME}`;
    const rsvpOpen = ev.rsvp && !isPast(ev);

    app.innerHTML = `
      <a class="back" href="#">← Todos los eventos</a>
      <article class="event-view">
        <section class="feature">
          <a class="poster" href="${esc(ev.banner)}" target="_blank" rel="noopener" title="Abrir el afiche completo">
            <img src="${esc(ev.banner)}" alt="${esc(ev.bannerAlt || ev.title)}" width="1024" height="1536">
          </a>
          <div class="info">
            <h1 class="event-title">${esc(ev.title)}</h1>
            ${infoBodyHtml(ev)}
            ${rsvpOpen
              ? rsvpFormHtml(ev)
              : ev.rsvp
                ? `<p class="hint">Las inscripciones para este evento están cerradas.</p>`
                : isPast(ev)
                  ? ""
                  : `<div class="panel paper soon-panel"><h2 class="block-title">Próximamente</h2><p class="hint">Las inscripciones se abren cuando confirmemos fecha y lugar.</p></div>`}
          </div>
        </section>

        ${ev.rsvp ? `
        <section class="panel" aria-labelledby="h-going">
          <div class="section-head" style="margin:0">
            <h2 class="block-title" id="h-going">Quiénes van</h2>
          </div>
          <div id="attendees"><p class="empty">Cargando…</p></div>
        </section>` : ""}

        <section class="panel" id="fotos" aria-labelledby="h-photos">
          <div class="section-head" style="margin:0">
            <h2 class="block-title" id="h-photos">Fotos del evento</h2>
            <p class="hint" id="photo-count"></p>
          </div>
          <form class="upload" id="upload-form">
            <div class="field">
              <label for="photo-by">Tu nombre (opcional)</label>
              <input type="text" id="photo-by" name="by" autocomplete="name" maxlength="80">
            </div>
            <input class="file-input" type="file" id="photo-file" accept="image/*" multiple>
            <label class="btn" for="photo-file" id="photo-btn" tabindex="0" role="button">Subir fotos</label>
          </form>
          <p class="msg" id="photo-msg" hidden></p>
          <div id="gallery"><p class="empty">Cargando…</p></div>
        </section>
      </article>`;

    if (rsvpOpen) bindRsvp(ev);
    if (ev.rsvp) loadAttendees(ev);
    bindPhotos(ev);
    loadPhotos(ev);
    tickCountdowns();
    const target = focus && document.getElementById(focus);
    if (target) {
      target.scrollIntoView();
      if (focus === "rsvp") document.getElementById("rsvp-name").focus({ preventScroll: true });
    } else {
      window.scrollTo(0, 0);
    }
  }

  function rsvpFormHtml(ev) {
    return `
      <div class="panel paper" id="rsvp">
        <h2 class="block-title">Confirmá tu asistencia</h2>
        <form id="rsvp-form" novalidate>
          <div class="field">
            <label for="rsvp-name">Nombre y apellido</label>
            <input type="text" id="rsvp-name" name="name" autocomplete="name" required minlength="3" maxlength="80">
          </div>
          <div class="field">
            <label for="rsvp-cedula">Cédula</label>
            <input type="text" class="mono" id="rsvp-cedula" name="cedula" inputmode="numeric" autocomplete="off" placeholder="1.234.567-2" required>
            <p class="hint">Con dígito verificador. No se muestra en la página.</p>
          </div>
          ${ev.choice ? `
          <fieldset class="field choice">
            <legend>${esc(ev.choice.label)}</legend>
            <div class="choice-options">
              ${ev.choice.options
                .map(
                  (o, i) => `<label class="choice-option"><input type="radio" name="choice" id="rsvp-choice-${i}" value="${esc(o)}" required><span>${esc(o)}</span></label>`
                )
                .join("")}
            </div>
          </fieldset>` : ""}
          ${ev.askFood === false ? "" : `
          <div class="field">
            <label for="rsvp-food">Preferencia de comida</label>
            <select id="rsvp-food" name="food">${FOOD_OPTIONS.map((o) => `<option>${o}</option>`).join("")}</select>
          </div>`}
          <p class="msg" id="rsvp-msg" hidden></p>
          <button class="btn btn-dark" type="submit" id="rsvp-submit">Confirmar asistencia</button>
        </form>
        <details class="cancel">
          <summary>¿No podés ir? Cancelá tu inscripción</summary>
          <form id="cancel-form" novalidate>
            <div class="field">
              <label for="cancel-cedula">Tu cédula</label>
              <input type="text" class="mono" id="cancel-cedula" name="cedula" inputmode="numeric" autocomplete="off" placeholder="1.234.567-2" required>
            </div>
            <p class="msg" id="cancel-msg" hidden></p>
            <button class="btn btn-ghost" type="submit" id="cancel-submit">Cancelar inscripción</button>
          </form>
        </details>
      </div>`;
  }

  function bindCedulaFormatting(input) {
    input.addEventListener("input", () => {
      input.value = Cedula.format(input.value);
    });
  }

  function bindRsvp(ev) {
    const form = document.getElementById("rsvp-form");
    const msg = document.getElementById("rsvp-msg");
    const submit = document.getElementById("rsvp-submit");
    const cedulaInput = document.getElementById("rsvp-cedula");
    bindCedulaFormatting(cedulaInput);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = form.name.value.trim().replace(/\s+/g, " ");
      const cedula = Cedula.normalize(cedulaInput.value);
      if (name.length < 3) return setMsg(msg, ERRORS.invalid_name, "error");
      if (!Cedula.isValid(cedula)) return setMsg(msg, ERRORS.invalid_cedula, "error");
      const choice = ev.choice ? form.querySelector('input[name="choice"]:checked')?.value : "";
      if (ev.choice && !choice) return setMsg(msg, `Elegí una opción: ${ev.choice.label}`, "error");

      submit.disabled = true;
      setMsg(msg, "Guardando…");
      try {
        const res = await Api.register({ event: ev.id, name, cedula, food: form.food?.value || "", choice });
        if (res.ok) {
          form.reset();
          setMsg(msg, `¡Listo, ${name.split(" ")[0]}! Quedaste anotado.`, "ok");
          loadAttendees(ev);
        } else {
          setMsg(msg, errorText(res.error), "error");
        }
      } catch {
        setMsg(msg, ERRORS.network, "error");
      } finally {
        submit.disabled = false;
      }
    });

    const cancelForm = document.getElementById("cancel-form");
    const cancelMsg = document.getElementById("cancel-msg");
    const cancelSubmit = document.getElementById("cancel-submit");
    const cancelInput = document.getElementById("cancel-cedula");
    bindCedulaFormatting(cancelInput);

    cancelForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const cedula = Cedula.normalize(cancelInput.value);
      if (!Cedula.isValid(cedula)) return setMsg(cancelMsg, ERRORS.invalid_cedula, "error");

      cancelSubmit.disabled = true;
      setMsg(cancelMsg, "Cancelando…");
      try {
        const res = await Api.cancel({ event: ev.id, cedula });
        if (res.ok) {
          cancelForm.reset();
          setMsg(cancelMsg, "Tu inscripción quedó cancelada.", "ok");
          loadAttendees(ev);
        } else {
          setMsg(cancelMsg, errorText(res.error), "error");
        }
      } catch {
        setMsg(cancelMsg, ERRORS.network, "error");
      } finally {
        cancelSubmit.disabled = false;
      }
    });
  }

  async function loadAttendees(ev) {
    const box = document.getElementById("attendees");
    if (!box) return;
    try {
      const res = await Api.list(ev.id);
      if (!res.ok) throw new Error(res.error);
      app.querySelectorAll(`[data-count="${ev.id}"]`).forEach((el) => (el.textContent = res.count));
      // En eventos con opción (por ejemplo, el shopping) se muestra cuántos eligieron cada una.
      const tally = ev.choice
        ? `<ul class="tally">${ev.choice.options
            .map((o) => `<li><strong>${res.attendees.filter((a) => a.choice === o).length}</strong> ${esc(o)}</li>`)
            .join("")}</ul>`
        : "";
      const tag = (a) => {
        if (ev.choice) return a.choice ? `<span class="food">${esc(a.choice)}</span>` : "";
        return a.food && a.food !== FOOD_OPTIONS[0] ? `<span class="food">${esc(a.food)}</span>` : "";
      };
      box.innerHTML = res.attendees.length
        ? `${tally}<ol class="attendees">${res.attendees
            .map((a, i) => `<li><span class="n">${i + 1}</span><span class="who">${esc(a.name)}</span>${tag(a)}</li>`)
            .join("")}</ol>`
        : `<p class="empty">Todavía no se anotó nadie. ¡Sé el primero!</p>`;
    } catch {
      box.innerHTML = `<p class="empty">No pudimos cargar la lista. Recargá la página para intentar de nuevo.</p>`;
    }
  }

  // ---------- Fotos ----------

  let photos = [];
  let lbIndex = 0;

  async function loadPhotos(ev) {
    const box = document.getElementById("gallery");
    const count = document.getElementById("photo-count");
    if (!box) return;
    try {
      const res = await Api.photos(ev.id);
      if (!res.ok) throw new Error(res.error);
      photos = res.photos;
      count.textContent = photos.length ? `${photos.length} ${photos.length === 1 ? "foto" : "fotos"}` : "";
      box.innerHTML = photos.length
        ? `<div class="gallery">${photos
            .map(
              (p, i) =>
                `<button type="button" data-i="${i}" aria-label="Ver foto ${i + 1}${p.by ? ` de ${esc(p.by)}` : ""}"><img src="${esc(p.thumb)}" alt="" loading="lazy"></button>`
            )
            .join("")}</div>`
        : `<p class="empty">Todavía no hay fotos. Subí las tuyas y quedan guardadas acá para todos.</p>`;
    } catch {
      box.innerHTML = `<p class="empty">No pudimos cargar las fotos. Recargá la página para intentar de nuevo.</p>`;
    }
  }

  // Achica la foto antes de subirla para que sea rápida y no pase el límite.
  async function resize(file) {
    const max = Api.isDemo ? 1000 : 1800;
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const dataUrl = canvas.toDataURL("image/jpeg", Api.isDemo ? 0.75 : 0.85);
    return { mimeType: "image/jpeg", data: dataUrl.split(",")[1] };
  }

  function bindPhotos(ev) {
    const input = document.getElementById("photo-file");
    const btn = document.getElementById("photo-btn");
    const msg = document.getElementById("photo-msg");
    const byInput = document.getElementById("photo-by");

    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        input.click();
      }
    });

    input.addEventListener("change", async () => {
      const files = [...input.files].filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
      input.value = "";
      if (!files.length) return;

      input.disabled = true;
      btn.setAttribute("aria-disabled", "true");
      let done = 0;
      const failed = [];
      for (const file of files) {
        setMsg(msg, `Subiendo ${done + failed.length + 1} de ${files.length}…`);
        try {
          const img = await resize(file);
          const res = await Api.uploadPhoto({ event: ev.id, by: byInput.value.trim(), ...img });
          if (res.ok) done++;
          else failed.push(errorText(res.error));
        } catch (err) {
          failed.push(err instanceof TypeError && err.message !== "Failed to fetch"
            ? `"${file.name}" no se pudo leer. Probá con una foto JPG o PNG.`
            : ERRORS.network);
        }
      }
      input.disabled = false;
      btn.removeAttribute("aria-disabled");

      if (!failed.length) setMsg(msg, done === 1 ? "Foto subida." : `${done} fotos subidas.`, "ok");
      else setMsg(msg, `${done ? `Se subieron ${done}. ` : ""}${failed.length} no se pudieron subir: ${failed[0]}`, "error");
      loadPhotos(ev);
    });
  }

  // ---------- Visor de fotos ----------

  const lightbox = document.getElementById("lightbox");
  const lbImg = document.getElementById("lb-img");
  const lbCaption = document.getElementById("lb-caption");

  function showPhoto(i) {
    if (!photos.length) return;
    lbIndex = (i + photos.length) % photos.length;
    const p = photos[lbIndex];
    lbImg.src = p.full;
    lbImg.alt = `Foto ${lbIndex + 1} de ${photos.length}`;
    const when = p.at ? new Date(p.at).toLocaleDateString("es-UY", { day: "numeric", month: "short" }) : "";
    lbCaption.textContent = [`${lbIndex + 1} / ${photos.length}`, p.by && `Subida por ${p.by}`, when]
      .filter(Boolean)
      .join(" · ");
  }

  app.addEventListener("click", (e) => {
    const b = e.target.closest(".gallery button");
    if (!b) return;
    showPhoto(Number(b.dataset.i));
    lightbox.showModal();
  });
  document.getElementById("lb-close").addEventListener("click", () => lightbox.close());
  document.getElementById("lb-prev").addEventListener("click", () => showPhoto(lbIndex - 1));
  document.getElementById("lb-next").addEventListener("click", () => showPhoto(lbIndex + 1));
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) lightbox.close();
  });
  lightbox.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") showPhoto(lbIndex - 1);
    if (e.key === "ArrowRight") showPhoto(lbIndex + 1);
  });

  // ---------- Rutas ----------

  function route() {
    if (lightbox.open) lightbox.close();
    const hash = decodeURIComponent(location.hash.slice(1));
    const sections = { "-fotos": "fotos", "-registro": "rsvp" };
    const suffix = Object.keys(sections).find((s) => hash.endsWith(s));
    const id = suffix ? hash.slice(0, -suffix.length) : hash;
    const ev = EVENTS.find((e) => e.id === id);
    if (ev) renderEvent(ev, suffix && sections[suffix]);
    else renderHome();
  }

  document.getElementById("site-name").textContent = CONFIG.SITE_NAME;
  document.getElementById("site-tag").textContent = CONFIG.TAGLINE || "";
  document.getElementById("footer-text").textContent = `${CONFIG.SITE_NAME} · Equipo de Trade Marketing`;
  document.getElementById("demo-bar").hidden = !Api.isDemo;
  window.addEventListener("hashchange", route);
  route();
  tickCountdowns();
  setInterval(tickCountdowns, 1000);
})();
