/* =========================================================================
   TransAndes ERP · Módulo K — Lógica de la interfaz (JavaScript ES6)
   Implementa los flujos IFML D-K01 a D-K04 del capítulo 11 y las
   interfaces adicionales D-K05 a D-K07. Todos los datos son simulados.
   ========================================================================= */

/* ---------------------------------------------------------------------
   1. Utilidades
   --------------------------------------------------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n) => String(n).padStart(2, "0");

/* Cada página fija su perfil: admin.html (Administrador) y conductor.html (Conductor). */
const ROL_PAGINA = document.body.dataset.rol || "Administrador";
const sesion = { id_usuario: ROL_PAGINA === "Conductor" ? 7 : 1 };
const usuarioActual = () => DB.usuarios.find((u) => u.id_usuario === sesion.id_usuario);
const esAdmin = () => usuarioActual().rol === "Administrador";

function ahora() {
  const d = new Date();
  return `${DEMO_HOY}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fFecha(iso) {
  if (!iso) return "—";
  const [f, h] = iso.split("T");
  const [y, m, d] = f.split("-");
  return `${d}/${m}/${y}${h ? " · " + h : ""}`;
}
function fCorta(iso) {
  if (!iso) return "—";
  const [f, h] = iso.split("T");
  const [, m, d] = f.split("-");
  return `${d}/${m} ${h || ""}`.trim();
}
function fMin(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return `${h} h ${pad(m)} min`;
}
function sumarMin(iso, min) {
  const d = new Date(iso + ":00");
  d.setMinutes(d.getMinutes() + Number(min));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const seCruzan = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;

/* ---------------------------------------------------------------------
   2. Consultas sobre los datos (equivalen a los servicios REST del módulo)
   --------------------------------------------------------------------- */
const sucursal = (id) => DB.sucursales.find((s) => s.id_sucursal === Number(id))?.nombre || "—";
const ruta = (id) => DB.rutas.find((r) => r.id_ruta === Number(id));
const rutaCodigo = (r) => `R-${String(r.id_ruta).padStart(3, "0")}`;
const rutaNombre = (r) => `${sucursal(r.id_sucursal_origen)} → ${sucursal(r.id_sucursal_destino)}`;
const paradasDe = (idRuta) => DB.paradas.filter((p) => p.id_ruta === Number(idRuta)).sort((a, b) => a.orden - b.orden);
const vehiculo = (id) => DB.vehiculos.find((v) => v.id_vehiculo === Number(id));
const conductor = (id) => DB.conductores.find((c) => c.id_conductor === Number(id));
const nombreCond = (c) => (c ? `${c.nombres} ${c.apellidos}` : "—");
const tipoVeh = (id) => DB.tiposVehiculo.find((t) => t.id_tipo_vehiculo === Number(id))?.nombre || "—";
const categoria = (id) => DB.categoriasLicencia.find((c) => c.id_categoria_licencia === Number(id))?.codigo || "—";
const servicio = (id) => DB.servicios.find((s) => s.id_servicio === Number(id));
const usuario = (id) => DB.usuarios.find((u) => u.id_usuario === Number(id))?.nombre || "Sistema";
const asignacionActiva = (idServ) => DB.asignaciones.find((a) => a.id_servicio === Number(idServ) && a.activo);
const encomiendasDe = (idServ) => DB.servicioEncomienda.filter((r) => r.id_servicio === Number(idServ) && r.activo).map((r) => DB.encomiendas.find((e) => e.id_encomienda === r.id_encomienda));
const manifiestoDe = (idServ) => DB.manifiestos.find((m) => m.id_servicio === Number(idServ));
const encomiendaAsignada = (idEnc) => DB.servicioEncomienda.some((r) => r.id_encomienda === idEnc && r.activo && ["Programado", "En curso"].includes(servicio(r.id_servicio)?.estado));

/** RNF-K05 / RNF-K13: la disponibilidad solo depende del estado y del horario. */
function conflictosRecurso(tipo, idRecurso, desde, hasta, excluirServicio) {
  return DB.asignaciones
    .filter((a) => a.activo && a[tipo === "vehiculo" ? "id_vehiculo" : "id_conductor"] === Number(idRecurso) && a.id_servicio !== Number(excluirServicio))
    .map((a) => servicio(a.id_servicio))
    .filter((s) => s && ["Programado", "En curso"].includes(s.estado) && seCruzan(desde, hasta, s.fecha_hora_salida, s.fecha_hora_llegada_estimada));
}
function disponibilidad(tipo, rec, desde, hasta, excluir) {
  if (rec.estado !== "Activo") return { clase: "off", texto: "Inactivo", libre: false };
  const c = conflictosRecurso(tipo, tipo === "vehiculo" ? rec.id_vehiculo : rec.id_conductor, desde, hasta, excluir);
  return c.length ? { clase: "busy", texto: `Ocupado · ${c[0].codigo}`, libre: false, servicio: c[0] } : { clase: "ok", texto: "Disponible", libre: true };
}

function registrarBitacora(tipo_entidad, id_registro, tipo_operacion, detalle) {
  DB.bitacora.unshift({ id_bitacora: DB.bitacora.length + 1, id_usuario: sesion.id_usuario, tipo_entidad, id_registro, tipo_operacion, fecha_hora: ahora(), detalle });
}

/* ---------------------------------------------------------------------
   3. Componentes de interfaz reutilizables
   --------------------------------------------------------------------- */
const BADGE = { Programado: "b-blue", "En curso": "b-amber", Finalizado: "b-green", Cancelado: "b-red", Activo: "b-green", Activa: "b-green", Inactivo: "b-gray", Inactiva: "b-gray" };
const badge = (txt, cls) => `<span class="badge ${cls || BADGE[txt] || "b-gray"}">${esc(txt)}</span>`;
const avail = (d) => `<span class="avail ${d.clase}">${esc(d.texto)}</span>`;

function head(titulo, sub, ifml, acciones = "", crumbs = "") {
  return `${crumbs ? `<div class="crumbs">${crumbs}</div>` : ""}
  <div class="page-head"><div><h1>${titulo}${ifml ? `<span class="ifml-tag">${ifml}</span>` : ""}</h1><p>${sub}</p></div>${acciones ? `<div class="btn-row">${acciones}</div>` : ""}</div>`;
}
function tabla(cols, filas, vacio = "No hay registros que coincidan con los filtros.") {
  if (!filas.length) return `<div class="empty">${vacio}</div>`;
  return `<div class="table-wrap"><table class="data"><thead><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${filas
    .map((f) => `<tr${f.attrs ? " " + f.attrs : ""}>${f.celdas.map((c, i) => `<td data-label="${cols[i]}">${c}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></div>`;
}
const opt = (v, t, sel) => `<option value="${esc(v)}"${String(v) === String(sel) ? " selected" : ""}>${esc(t)}</option>`;
function campo(id, label, control, { req = false, hint = "", full = false } = {}) {
  return `<div class="field${full ? " full" : ""}" id="f-${id}"><label for="${id}">${label}${req ? ' <span class="req">*</span>' : ""}</label>${control}${hint ? `<div class="hint">${hint}</div>` : ""}<div class="error"></div></div>`;
}
function marcarError(id, msg) {
  const f = $(`#f-${id}`);
  if (!f) return;
  f.classList.add("invalid");
  $(".error", f).textContent = msg;
}
function limpiarErrores(form) { $$(".field.invalid", form).forEach((f) => f.classList.remove("invalid")); }

function toast(msg, tipo = "ok") {
  const t = $("#toast");
  t.textContent = msg;
  t.className = `toast show ${tipo}`;
  clearTimeout(t._t);
  t._t = setTimeout(() => (t.className = "toast"), 3200);
}

/** Modal de confirmación; `body` puede incluir campos (p. ej. motivo). */
function confirmar({ titulo, texto, body = "", ok = "Confirmar", peligro = false, alConfirmar }) {
  const m = $("#modal");
  $("#modalTitle").textContent = titulo;
  $("#modalText").textContent = texto;
  $("#modalBody").innerHTML = body;
  const bOk = $("#modalOk");
  bOk.textContent = ok;
  bOk.className = `btn ${peligro ? "danger" : "primary"}`;
  m.classList.add("show");
  const cerrar = () => m.classList.remove("show");
  $("#modalCancel").onclick = cerrar;
  bOk.onclick = () => { if (alConfirmar() !== false) cerrar(); };
  setTimeout(() => ($("#modalBody input, #modalBody textarea") || bOk).focus(), 30);
}

/* ---------------------------------------------------------------------
   4. Navegación por rol (RNF-K03)
   --------------------------------------------------------------------- */
const MENU = {
  Administrador: [
    ["General"], ["inicio", "🏠", "Inicio"],
    ["Operación"], ["servicios", "🗓️", "Servicios de transporte"], ["servicio-nuevo", "➕", "Nuevo servicio"], ["historial", "🕘", "Historial de asignaciones"],
    ["Recursos"], ["vehiculos", "🚌", "Vehículos"], ["conductores", "🪪", "Conductores"],
    ["Rutas"], ["rutas", "🛣️", "Rutas y paradas"],
    ["Auditoría"], ["bitacora", "📋", "Bitácora de transporte"]
  ],
  Conductor: [
    ["General"], ["mis-servicios", "🚌", "Mis servicios"], ["mis-datos", "🪪", "Mis datos"]
  ]
};
const PERMISOS = {
  Administrador: ["inicio", "servicios", "servicio", "servicio-nuevo", "historial", "vehiculos", "conductores", "vehiculo", "conductor", "rutas", "ruta", "bitacora"],
  Conductor: ["mis-servicios", "mis-datos"]
};

function pintarMenu(seccion) {
  const items = MENU[usuarioActual().rol];
  $("#nav").innerHTML = items
    .map((it) => (it.length === 1 ? `<div class="nav-label">${it[0]}</div>` : `<a class="nav-link${activo(it[0], seccion) ? " active" : ""}" href="#/${it[0]}"><span class="nav-ico">${it[1]}</span>${it[2]}</a>`))
    .join("");
  const u = usuarioActual();
  $("#rolePill").textContent = u.rol;
  $("#userName").textContent = u.nombre;
  $("#avatar").textContent = u.iniciales;
  $("#branch").textContent = u.sucursal;
}
function activo(id, sec) {
  if (id === sec) return true;
  if (id === "servicios" && sec === "servicio") return true;
  if (id === "vehiculos" && sec === "vehiculo") return true;
  if (id === "conductores" && sec === "conductor") return true;
  if (id === "rutas" && sec === "ruta") return true;
  return false;
}

/* ---------------------------------------------------------------------
   5. Pantallas
   --------------------------------------------------------------------- */
const filtros = { servicios: {}, vehiculos: {}, conductores: {}, rutas: {}, historial: {}, bitacora: {} };

/* ===== D-K05 · Inicio del Administrador (interfaz adicional) ===== */
function vInicio() {
  const prog = DB.servicios.filter((s) => s.estado === "Programado");
  const curso = DB.servicios.filter((s) => s.estado === "En curso");
  const ahoraIso = ahora();
  const vehLibres = DB.vehiculos.filter((v) => disponibilidad("vehiculo", v, ahoraIso, sumarMin(ahoraIso, 60)).libre).length;
  const pendientes = DB.encomiendas.filter((e) => !encomiendaAsignada(e.id_encomienda)).length;
  const sinRecursos = prog.filter((s) => !asignacionActiva(s.id_servicio));
  const proximos = [...prog, ...curso].sort((a, b) => a.fecha_hora_salida.localeCompare(b.fecha_hora_salida));
  return `${head("Hola, Carla 👋", "Resumen de hoy · Gestión de Transporte y Rutas", "D-K05")}
  <div class="grid g-4">
    <div class="card stat"><b>${prog.length}</b><span>Servicios programados</span></div>
    <div class="card stat"><b>${curso.length}</b><span>Servicios en curso</span></div>
    <div class="card stat"><b>${vehLibres}</b><span>Vehículos disponibles ahora</span></div>
    <div class="card stat warn"><b>${pendientes}</b><span>Encomiendas por asignar</span></div>
  </div>
  ${sinRecursos.map((s) => `<div class="alert warn mt">⚠️ <div><b>${s.codigo}</b> (${rutaNombre(ruta(s.id_ruta))}, ${fFecha(s.fecha_hora_salida)}) aún no tiene vehículo ni conductor. <a href="#/servicio/${s.id_servicio}/asignar">Asignar recursos</a></div></div>`).join("")}
  <div class="card mt"><h2>Accesos directos</h2><div class="btn-row">
    <a class="btn" href="#/servicio-nuevo">Programar servicio</a><a class="btn" href="#/servicios">Asignar recursos y carga</a>
    <a class="btn" href="#/vehiculos">Consultar disponibilidad</a><a class="btn" href="#/rutas">Administrar rutas</a></div></div>
  <div class="card mt"><div class="card-head"><h2>Próximas salidas y servicios en curso</h2><a class="btn sm ghost" href="#/servicios">Ver todos</a></div>
  ${tabla(["Código", "Ruta", "Salida", "Vehículo", "Conductor", "Estado"], proximos.map((s) => {
    const a = asignacionActiva(s.id_servicio);
    return { attrs: `class="clickable" data-go="#/servicio/${s.id_servicio}"`, celdas: [`<b>${s.codigo}</b>`, rutaNombre(ruta(s.id_ruta)), fFecha(s.fecha_hora_salida), a ? vehiculo(a.id_vehiculo).placa : '<span class="muted">Sin asignar</span>', a ? nombreCond(conductor(a.id_conductor)) : '<span class="muted">Sin asignar</span>', badge(s.estado)] };
  }))}</div>`;
}

/* ===== D-K01 · ListaServiciosContainer («List» ListadoServicios, CU-17) ===== */
function vServicios() {
  const f = filtros.servicios;
  const lista = DB.servicios
    .filter((s) => {
      const r = ruta(s.id_ruta), a = asignacionActiva(s.id_servicio) || DB.asignaciones.filter((x) => x.id_servicio === s.id_servicio).slice(-1)[0];
      return (!f.origen || r.id_sucursal_origen == f.origen) && (!f.destino || r.id_sucursal_destino == f.destino) && (!f.fecha || s.fecha_hora_salida.startsWith(f.fecha)) && (!f.estado || s.estado === f.estado) && (!f.vehiculo || a?.id_vehiculo == f.vehiculo) && (!f.conductor || a?.id_conductor == f.conductor);
    })
    .sort((a, b) => b.fecha_hora_salida.localeCompare(a.fecha_hora_salida));
  const sel = (id, label, items, val) => campo(id, label, `<select class="input" id="${id}" data-filtro="servicios.${id.replace("fs-", "")}"><option value="">Todos</option>${items.map(([v, t]) => opt(v, t, val)).join("")}</select>`);
  const suc = DB.sucursales.map((s) => [s.id_sucursal, s.nombre]);
  return `${head("Servicios de transporte", "Búsqueda avanzada y selección del servicio a planificar", "D-K01", `<a class="btn primary" href="#/servicio-nuevo">+ Nuevo servicio</a>`)}
  <div class="card"><div class="filters f6">
    ${sel("fs-origen", "Origen", suc, f.origen)}${sel("fs-destino", "Destino", suc, f.destino)}
    ${campo("fs-fecha", "Fecha de salida", `<input class="input" type="date" id="fs-fecha" data-filtro="servicios.fecha" value="${f.fecha || ""}">`)}
    ${sel("fs-estado", "Estado", DB.estadosServicio.map((e) => [e, e]), f.estado)}
    ${sel("fs-vehiculo", "Vehículo", DB.vehiculos.map((v) => [v.id_vehiculo, v.placa]), f.vehiculo)}
    ${sel("fs-conductor", "Conductor", DB.conductores.map((c) => [c.id_conductor, nombreCond(c)]), f.conductor)}
  </div><div class="btn-row mt"><button class="btn ghost sm" data-act="limpiar" data-k="servicios">Limpiar filtros</button><span class="muted small">${lista.length} servicio(s) encontrados · incluye historial</span></div></div>
  <div class="card mt">${tabla(["Código", "Ruta", "Salida", "Vehículo / Conductor", "Carga", "Estado", ""], lista.map((s) => {
    const a = asignacionActiva(s.id_servicio) || DB.asignaciones.filter((x) => x.id_servicio === s.id_servicio).slice(-1)[0];
    const enc = encomiendasDe(s.id_servicio);
    return {
      celdas: [`<b>${s.codigo}</b>`, rutaNombre(ruta(s.id_ruta)), fFecha(s.fecha_hora_salida),
        a ? `${vehiculo(a.id_vehiculo).placa} · ${nombreCond(conductor(a.id_conductor))}` : '<span class="muted">Sin asignar</span>',
        `${enc.length} enc.`, badge(s.estado),
        `<div class="btn-row">${s.estado === "Programado" ? `<a class="btn sm primary" href="#/servicio/${s.id_servicio}/asignar">Planificar</a>` : ""}<a class="btn sm" href="#/servicio/${s.id_servicio}">Ver</a></div>`]
    };
  }))}</div>`;
}

/* Cabecera común del asistente D-K01 (Recursos → Encomiendas → Manifiesto) */
function pasos(s, actual) {
  const a = asignacionActiva(s.id_servicio), enc = encomiendasDe(s.id_servicio).length, man = manifiestoDe(s.id_servicio);
  const p = [["asignar", "Vehículo y conductor", !!a], ["encomiendas", "Encomiendas", enc > 0], ["manifiesto", "Manifiesto de carga", !!man]];
  return `<div class="steps">${p.map(([k, t, ok], i) => `<a class="step ${k === actual ? "current" : ok ? "done" : ""}" href="#/servicio/${s.id_servicio}/${k}"><i>${ok && k !== actual ? "✓" : i + 1}</i>${t}</a>`).join("")}</div>`;
}
function resumenServicio(s) {
  const r = ruta(s.id_ruta);
  return `<div class="card"><dl class="dl"><dt>Servicio</dt><dd>${s.codigo} ${badge(s.estado)}</dd><dt>Ruta</dt><dd>${rutaNombre(r)} · ${r.distancia_km} km</dd>
  <dt>Salida</dt><dd>${fFecha(s.fecha_hora_salida)}</dd><dt>Llegada estimada</dt><dd>${fFecha(s.fecha_hora_llegada_estimada)}</dd></dl></div>`;
}

/* ===== D-K01 · AsignacionRecursosContainer («Form» FormularioAsignacion, CU-15) ===== */
function vAsignar(id) {
  const s = servicio(id);
  if (!s) return vNoEncontrado();
  const a = asignacionActiva(id);
  const bloqueado = s.estado !== "Programado";
  const vOpts = DB.vehiculos.filter((v) => v.estado === "Activo").map((v) => {
    const d = disponibilidad("vehiculo", v, s.fecha_hora_salida, s.fecha_hora_llegada_estimada, id);
    return opt(v.id_vehiculo, `${v.placa} · ${v.marca} ${v.modelo} — ${d.texto}`, a?.id_vehiculo);
  });
  const cOpts = DB.conductores.filter((c) => c.estado === "Activo").map((c) => {
    const d = disponibilidad("conductor", c, s.fecha_hora_salida, s.fecha_hora_llegada_estimada, id);
    return opt(c.id_conductor, `${nombreCond(c)} (${categoria(c.id_categoria_licencia)}) — ${d.texto}`, a?.id_conductor);
  });
  return `${head("Asignar vehículo y conductor", `Planificación del servicio ${s.codigo}`, "D-K01", "", `<a href="#/servicios">Servicios</a> / ${s.codigo}`)}
  ${pasos(s, "asignar")}
  <div class="grid g-main">
    <div>
      ${resumenServicio(s)}
      <form class="card mt" id="formAsignar" novalidate>
        <h2>${a ? "Reemplazar recursos" : "Formulario de asignación"}</h2>
        ${bloqueado ? `<div class="alert warn">🔒 El servicio está <b>${s.estado}</b>. Solo se asignan o reemplazan recursos en servicios programados (RF-K15).</div>` : ""}
        ${a ? `<div class="alert info">ℹ️ <div>Asignación vigente: <b>${vehiculo(a.id_vehiculo).placa}</b> con <b>${nombreCond(conductor(a.id_conductor))}</b> desde ${fFecha(a.fecha_hora_asignacion)}.</div></div>` : ""}
        <div id="asigError"></div>
        <div class="form-grid">
          ${campo("aVeh", "Vehículo (bus)", `<select class="input" id="aVeh" ${bloqueado ? "disabled" : ""}><option value="">Selecciona un vehículo activo</option>${vOpts.join("")}</select>`, { req: true, full: true, hint: "Solo se listan vehículos activos (RF-K03)." })}
          ${campo("aCond", "Conductor", `<select class="input" id="aCond" ${bloqueado ? "disabled" : ""}><option value="">Selecciona un conductor activo</option>${cOpts.join("")}</select>`, { req: true, full: true })}
          ${a ? campo("aMotivo", "Motivo del cambio", `<input class="input" id="aMotivo" placeholder="Ej.: vehículo enviado a mantenimiento" ${bloqueado ? "disabled" : ""}>`, { req: true, full: true, hint: "Queda registrado en el historial de asignaciones (RF-K16)." }) : ""}
        </div>
        <div class="btn-row mt"><button class="btn primary" type="submit" ${bloqueado ? "disabled" : ""}>${a ? "Confirmar reemplazo" : "Asignar recursos"}</button><a class="btn ghost" href="#/servicio/${id}/encomiendas">Continuar a encomiendas →</a></div>
      </form>
    </div>
    <div class="card"><h2>Disponibilidad en el horario del servicio</h2>
      <p class="muted small" style="margin-top:-6px">Calculada solo con el estado del recurso y los cruces de horario (RNF-K05, RNF-K13).</p>
      ${tabla(["Vehículo", "Disponibilidad"], DB.vehiculos.map((v) => ({ celdas: [`<b>${v.placa}</b> <span class="muted small">${tipoVeh(v.id_tipo_vehiculo)}</span>`, avail(disponibilidad("vehiculo", v, s.fecha_hora_salida, s.fecha_hora_llegada_estimada, id))] })))}
      <div style="height:10px"></div>
      ${tabla(["Conductor", "Disponibilidad"], DB.conductores.map((c) => ({ celdas: [nombreCond(c), avail(disponibilidad("conductor", c, s.fecha_hora_salida, s.fecha_hora_llegada_estimada, id))] })))}
    </div>
  </div>`;
}
function onAsignar(id) {
  const form = $("#formAsignar");
  if (!form) return;
  form.onsubmit = (e) => {
    e.preventDefault();
    limpiarErrores(form);
    $("#asigError").innerHTML = "";
    const s = servicio(id), a = asignacionActiva(id);
    const idV = $("#aVeh").value, idC = $("#aCond").value, motivo = $("#aMotivo")?.value.trim();
    let ok = true;
    if (!idV) { marcarError("aVeh", "Selecciona el vehículo que realizará el servicio."); ok = false; }
    if (!idC) { marcarError("aCond", "Selecciona el conductor responsable."); ok = false; }
    if (a && !motivo) { marcarError("aMotivo", "Indica el motivo del reemplazo."); ok = false; }
    if (!ok) return;
    if (a && a.id_vehiculo == idV && a.id_conductor == idC) { $("#asigError").innerHTML = `<div class="alert warn">⚠️ Los recursos elegidos son los mismos que ya están asignados. No hay cambios que guardar.</div>`; return; }
    // Validación de cruces de horario (RNF-K05)
    const cv = conflictosRecurso("vehiculo", idV, s.fecha_hora_salida, s.fecha_hora_llegada_estimada, id);
    const cc = conflictosRecurso("conductor", idC, s.fecha_hora_salida, s.fecha_hora_llegada_estimada, id);
    if (cv.length || cc.length) {
      const msgs = [];
      if (cv.length) msgs.push(`El vehículo <b>${vehiculo(idV).placa}</b> ya está asignado a <b>${cv[0].codigo}</b> (${fCorta(cv[0].fecha_hora_salida)} – ${fCorta(cv[0].fecha_hora_llegada_estimada)}).`);
      if (cc.length) msgs.push(`El conductor <b>${nombreCond(conductor(idC))}</b> ya está asignado a <b>${cc[0].codigo}</b> (${fCorta(cc[0].fecha_hora_salida)} – ${fCorta(cc[0].fecha_hora_llegada_estimada)}).`);
      $("#asigError").innerHTML = `<div class="alert error">⛔ <div><b>No se puede asignar: hay un cruce de horario.</b><br>${msgs.join("<br>")}<br>Elige un recurso marcado como «Disponible».</div></div>`;
      if (cv.length) marcarError("aVeh", "Vehículo ocupado en ese horario.");
      if (cc.length) marcarError("aCond", "Conductor ocupado en ese horario.");
      return;
    }
    if (a) { a.activo = false; a.fecha_hora_fin = ahora(); }
    DB.asignaciones.push({ id_asignacion: DB.asignaciones.length + 1, id_servicio: Number(id), id_vehiculo: Number(idV), id_conductor: Number(idC), id_usuario: sesion.id_usuario, fecha_hora_asignacion: ahora(), fecha_hora_fin: null, motivo_cambio: a ? motivo : "Asignación inicial", activo: true });
    registrarBitacora("AsignacionRecurso", s.codigo, a ? "Reasignación" : "Asignación", `${vehiculo(idV).placa} / ${nombreCond(conductor(idC))}`);
    toast(`Recursos asignados a ${s.codigo}`);
    location.hash = `#/servicio/${id}/encomiendas`;
  };
}

/* ===== D-K01 · AsignacionEncomiendasContainer («List» EncomiendasPendientes, CU-19) ===== */
function vEncomiendas(id) {
  const s = servicio(id);
  if (!s) return vNoEncontrado();
  const r = ruta(s.id_ruta), a = asignacionActiva(id);
  const asignadas = encomiendasDe(id);
  const pendientes = DB.encomiendas.filter((e) => e.origen === r.id_sucursal_origen && e.destino === r.id_sucursal_destino && !encomiendaAsignada(e.id_encomienda));
  const cap = a ? vehiculo(a.id_vehiculo).capacidad_carga_kg : 0;
  const peso = asignadas.reduce((t, e) => t + e.peso_kg, 0);
  const pct = cap ? Math.min(100, (peso / cap) * 100) : 0;
  const bloqueado = s.estado !== "Programado";
  return `${head("Asignar encomiendas al servicio", `Carga para ${s.codigo} · ${rutaNombre(r)}`, "D-K01", "", `<a href="#/servicios">Servicios</a> / ${s.codigo}`)}
  ${pasos(s, "encomiendas")}
  <div class="alert info">ℹ️ <div>Las encomiendas se registran en el <b>Módulo J</b>. Aquí solo se guarda la relación servicio–encomienda, sin duplicar sus datos (RF-K19, RNF-K09).</div></div>
  <div class="grid g-main">
    <div class="card"><div class="card-head"><h2>Encomiendas pendientes de la ruta</h2>${badge(pendientes.length + " pendientes", "b-amber")}</div>
      <div id="encError"></div>
      ${tabla(["", "Código", "Remitente", "Bultos", "Peso"], pendientes.map((e) => ({ attrs: `class="clickable" data-check="${e.id_encomienda}"`, celdas: [`<input type="checkbox" class="chk-enc" value="${e.id_encomienda}" aria-label="Seleccionar ${e.codigo}" style="width:20px;height:20px" ${bloqueado ? "disabled" : ""}>`, `<b>${e.codigo}</b>`, esc(e.remitente), e.bultos, `${e.peso_kg.toFixed(1)} kg`] })), "No hay encomiendas pendientes con origen y destino de esta ruta.")}
      <div class="btn-row mt"><button class="btn primary" data-act="asignar-enc" data-id="${id}" ${bloqueado || !pendientes.length ? "disabled" : ""}>Asignar seleccionadas</button><span class="muted small" id="selInfo">0 seleccionadas</span></div>
    </div>
    <div>
      <div class="card"><h2>Carga del servicio</h2>
        <dl class="dl"><dt>Vehículo</dt><dd>${a ? `${vehiculo(a.id_vehiculo).placa} · ${cap.toLocaleString("es-PE")} kg` : '<span class="muted">Sin asignar</span>'}</dd><dt>Encomiendas</dt><dd>${asignadas.length}</dd><dt>Peso total</dt><dd>${peso.toFixed(1)} kg</dd></dl>
        <div class="meter mt ${pct > 85 ? "high" : ""}"><span style="width:${pct}%"></span></div><p class="muted small">${cap ? `${pct.toFixed(1)} % de la capacidad de carga` : "Asigna un vehículo para calcular la capacidad"}</p>
      </div>
      <div class="card"><h2>Asignadas a este servicio</h2>
        ${tabla(["Código", "Peso", ""], asignadas.map((e) => ({ celdas: [`<b>${e.codigo}</b><br><span class="muted small">${esc(e.remitente)}</span>`, `${e.peso_kg.toFixed(1)} kg`, bloqueado ? "" : `<button class="btn sm danger" data-act="quitar-enc" data-id="${id}" data-enc="${e.id_encomienda}">Quitar</button>`] })), "Aún no hay encomiendas asignadas.")}
        <div class="btn-row mt"><a class="btn primary" href="#/servicio/${id}/manifiesto">Continuar al manifiesto →</a></div>
      </div>
    </div>
  </div>`;
}
function asignarEncomiendas(id) {
  const s = servicio(id), a = asignacionActiva(id);
  const ids = $$(".chk-enc:checked").map((c) => Number(c.value));
  const box = $("#encError");
  if (!ids.length) { box.innerHTML = `<div class="alert error">⛔ Selecciona al menos una encomienda para asignar.</div>`; return; }
  if (!a) { box.innerHTML = `<div class="alert error">⛔ Primero asigna un vehículo al servicio para validar la capacidad de carga. <a href="#/servicio/${id}/asignar">Ir a asignación</a></div>`; return; }
  const peso = [...encomiendasDe(id), ...ids.map((x) => DB.encomiendas.find((e) => e.id_encomienda === x))].reduce((t, e) => t + e.peso_kg, 0);
  const cap = vehiculo(a.id_vehiculo).capacidad_carga_kg;
  if (peso > cap) { box.innerHTML = `<div class="alert error">⛔ El peso total (${peso.toFixed(1)} kg) supera la capacidad de carga del vehículo (${cap} kg).</div>`; return; }
  ids.forEach((x) => DB.servicioEncomienda.push({ id_servicio: Number(id), id_encomienda: x, id_usuario: sesion.id_usuario, fecha_hora_asignacion: ahora(), activo: true }));
  registrarBitacora("ServicioEncomienda", s.codigo, "Asignación", `${ids.length} encomienda(s) asignada(s)`);
  toast(`${ids.length} encomienda(s) asignada(s) a ${s.codigo}`);
  render();
}

/* ===== D-K01 · «Details» ManifiestoCarga (CU-18) ===== */
function vManifiesto(id) {
  const s = servicio(id);
  if (!s) return vNoEncontrado();
  const r = ruta(s.id_ruta), a = asignacionActiva(id) || DB.asignaciones.filter((x) => x.id_servicio === Number(id)).slice(-1)[0];
  const enc = encomiendasDe(id), man = manifiestoDe(id);
  const peso = enc.reduce((t, e) => t + e.peso_kg, 0), bultos = enc.reduce((t, e) => t + e.bultos, 0);
  const v = a && vehiculo(a.id_vehiculo), c = a && conductor(a.id_conductor);
  const paradas = paradasDe(r.id_ruta).map((p) => p.nombre_parada).join(" · ") || "Sin paradas";
  const num = `MC-${s.codigo.slice(4)}`;
  return `${head("Manifiesto de carga", `Documento oficial previo a la salida de ${s.codigo}`, "D-K01",
    `${man ? `<button class="btn" data-act="imprimir">🖨️ Reimprimir</button>` : `<button class="btn primary" data-act="generar-man" data-id="${id}">Generar manifiesto</button>`}`, `<a href="#/servicios">Servicios</a> / ${s.codigo}`)}
  ${pasos(s, "manifiesto")}
  <div id="manError"></div>
  ${man ? `<div class="alert ok">✅ <div>Manifiesto generado el ${fFecha(man.fecha_hora_generacion)} por ${usuario(man.id_usuario)}. Puede consultarse o reimprimirse en cualquier momento.</div></div>` : `<div class="alert info">ℹ️ Vista previa. Revisa los datos y pulsa «Generar manifiesto».</div>`}
  <div class="card"><div class="doc">
    <div class="doc-head"><div><h3>TransAndes S.A.C. · Manifiesto de carga</h3><span class="muted small">RUC 20481234567 · Sucursal Trujillo</span></div><div style="text-align:right"><b>N.° ${num}</b><br><span class="muted small">${man ? fFecha(man.fecha_hora_generacion) : "Borrador"}</span></div></div>
    <div class="doc-meta">
      <div><small>Servicio</small><b>${s.codigo}</b></div><div><small>Ruta</small><b>${rutaNombre(r)}</b></div><div><small>Paradas</small>${paradas}</div>
      <div><small>Salida</small><b>${fFecha(s.fecha_hora_salida)}</b></div><div><small>Vehículo</small><b>${v ? `${v.placa} · ${v.marca} ${v.modelo}` : "—"}</b></div><div><small>Conductor</small><b>${c ? nombreCond(c) : "—"}</b>${c ? `<br><span class="small">Lic. ${c.numero_licencia} (${categoria(c.id_categoria_licencia)})</span>` : ""}</div>
    </div>
    ${tabla(["N.°", "Código", "Remitente", "Origen → Destino", "Bultos", "Peso"], enc.map((e, i) => ({ celdas: [i + 1, `<b>${e.codigo}</b>`, esc(e.remitente), `${sucursal(e.origen)} → ${sucursal(e.destino)}`, e.bultos, `${e.peso_kg.toFixed(1)} kg`] })), "Sin encomiendas asignadas.")}
    <div class="doc-total"><span>Total bultos: <b>${bultos}</b></span><span>Peso total: <b>${peso.toFixed(1)} kg</b></span></div>
  </div></div>`;
}
function generarManifiesto(id) {
  const s = servicio(id), box = $("#manError");
  if (!asignacionActiva(id)) { box.innerHTML = `<div class="alert error">⛔ No se puede generar: el servicio no tiene vehículo ni conductor asignado. <a href="#/servicio/${id}/asignar">Asignar recursos</a></div>`; return; }
  if (!encomiendasDe(id).length) { box.innerHTML = `<div class="alert error">⛔ No se puede generar: el servicio no tiene encomiendas asignadas. <a href="#/servicio/${id}/encomiendas">Asignar encomiendas</a></div>`; return; }
  DB.manifiestos.push({ id_manifiesto: DB.manifiestos.length + 1, id_servicio: Number(id), id_usuario: sesion.id_usuario, fecha_hora_generacion: ahora(), ruta_archivo: `manifiestos/MC-${s.codigo.slice(4)}.pdf` });
  registrarBitacora("ManifiestoCarga", s.codigo, "Generación", `Manifiesto MC-${s.codigo.slice(4)} generado`);
  toast(`Manifiesto de ${s.codigo} generado`);
  render();
}

/* ===== D-K02 · ListadoRecursosContainer (CU-04, CU-08) ===== */
function tabsRecursos(act) {
  return `<div class="tabs"><a class="tab ${act === "vehiculos" ? "active" : ""}" href="#/vehiculos">🚌 Vehículos</a><a class="tab ${act === "conductores" ? "active" : ""}" href="#/conductores">🪪 Conductores</a></div>`;
}
function periodoDefault(f) {
  if (!f.desde) f.desde = "2026-11-20T20:00";
  if (!f.hasta) f.hasta = "2026-11-21T08:00";
}
function vVehiculos() {
  const f = filtros.vehiculos; periodoDefault(f);
  const q = (f.q || "").toLowerCase();
  const lista = DB.vehiculos.filter((v) => (!q || `${v.placa} ${v.marca} ${v.modelo}`.toLowerCase().includes(q)) && (!f.tipo || v.id_tipo_vehiculo == f.tipo) && (!f.estado || v.estado === f.estado));
  return `${head("Vehículos y conductores", "Flota vehicular y disponibilidad para la programación", "D-K02", `<a class="btn primary" href="#/vehiculo/nuevo">+ Registrar vehículo</a>`)}
  ${tabsRecursos("vehiculos")}
  <div class="card"><div class="filters f5">
    ${campo("fv-q", "Placa, marca o modelo", `<input class="input" id="fv-q" data-filtro="vehiculos.q" value="${esc(f.q || "")}" placeholder="Ej.: ABC-123">`)}
    ${campo("fv-tipo", "Tipo", `<select class="input" id="fv-tipo" data-filtro="vehiculos.tipo"><option value="">Todos</option>${DB.tiposVehiculo.map((t) => opt(t.id_tipo_vehiculo, t.nombre, f.tipo)).join("")}</select>`)}
    ${campo("fv-estado", "Estado", `<select class="input" id="fv-estado" data-filtro="vehiculos.estado"><option value="">Todos</option>${opt("Activo", "Activo", f.estado)}${opt("Inactivo", "Inactivo", f.estado)}</select>`)}
    ${campo("fv-desde", "Disponible desde", `<input class="input" type="datetime-local" id="fv-desde" data-filtro="vehiculos.desde" value="${f.desde}">`)}
    ${campo("fv-hasta", "Hasta", `<input class="input" type="datetime-local" id="fv-hasta" data-filtro="vehiculos.hasta" value="${f.hasta}">`)}
  </div></div>
  <div class="card mt">${tabla(["Placa", "Tipo", "Marca / modelo", "Año", "Carga máx.", "Estado", "Disponibilidad", ""], lista.map((v) => ({
    attrs: `class="clickable" data-go="#/vehiculo/${v.id_vehiculo}"`,
    celdas: [`<b>${v.placa}</b>`, tipoVeh(v.id_tipo_vehiculo), `${v.marca} ${v.modelo}`, v.anio, `${v.capacidad_carga_kg.toLocaleString("es-PE")} kg`, badge(v.estado), avail(disponibilidad("vehiculo", v, f.desde, f.hasta)), `<a class="btn sm" href="#/vehiculo/${v.id_vehiculo}">Ficha</a>`]
  })))}</div>`;
}
function vConductores() {
  const f = filtros.conductores; periodoDefault(f);
  const q = (f.q || "").toLowerCase();
  const lista = DB.conductores.filter((c) => (!q || `${nombreCond(c)} ${c.documento_identidad} ${c.numero_licencia}`.toLowerCase().includes(q)) && (!f.cat || c.id_categoria_licencia == f.cat) && (!f.estado || c.estado === f.estado));
  return `${head("Vehículos y conductores", "Personal de conducción y disponibilidad para la programación", "D-K02", `<a class="btn primary" href="#/conductor/nuevo">+ Registrar conductor</a>`)}
  ${tabsRecursos("conductores")}
  <div class="card"><div class="filters f5">
    ${campo("fc-q", "Nombre, DNI o licencia", `<input class="input" id="fc-q" data-filtro="conductores.q" value="${esc(f.q || "")}" placeholder="Ej.: 45879123">`)}
    ${campo("fc-cat", "Categoría", `<select class="input" id="fc-cat" data-filtro="conductores.cat"><option value="">Todas</option>${DB.categoriasLicencia.map((c) => opt(c.id_categoria_licencia, c.codigo, f.cat)).join("")}</select>`)}
    ${campo("fc-estado", "Estado", `<select class="input" id="fc-estado" data-filtro="conductores.estado"><option value="">Todos</option>${opt("Activo", "Activo", f.estado)}${opt("Inactivo", "Inactivo", f.estado)}</select>`)}
    ${campo("fc-desde", "Disponible desde", `<input class="input" type="datetime-local" id="fc-desde" data-filtro="conductores.desde" value="${f.desde}">`)}
    ${campo("fc-hasta", "Hasta", `<input class="input" type="datetime-local" id="fc-hasta" data-filtro="conductores.hasta" value="${f.hasta}">`)}
  </div></div>
  <div class="card mt">${tabla(["Conductor", "DNI", "Licencia", "Categoría", "Estado", "Disponibilidad", ""], lista.map((c) => ({
    attrs: `class="clickable" data-go="#/conductor/${c.id_conductor}"`,
    celdas: [`<b>${nombreCond(c)}</b>`, c.documento_identidad, c.numero_licencia, categoria(c.id_categoria_licencia), badge(c.estado), avail(disponibilidad("conductor", c, f.desde, f.hasta)), `<a class="btn sm" href="#/conductor/${c.id_conductor}">Ficha</a>`]
  })))}
  <p class="muted small mt">🔒 DNI y licencia completos visibles solo para el rol Administrador (RNF-K12).</p></div>`;
}

/* ===== D-K02 · FichaRecursoContainer («Details» FichaRecurso, CU-03, CU-07) ===== */
function serviciosDeRecurso(tipo, id) {
  return DB.asignaciones.filter((a) => a[tipo === "vehiculo" ? "id_vehiculo" : "id_conductor"] === Number(id)).sort((a, b) => b.fecha_hora_asignacion.localeCompare(a.fecha_hora_asignacion));
}
function vFichaVehiculo(id) {
  const v = vehiculo(id);
  if (!v) return vNoEncontrado();
  const hist = serviciosDeRecurso("vehiculo", id);
  return `${head(`Vehículo ${v.placa}`, `${v.marca} ${v.modelo} · ${tipoVeh(v.id_tipo_vehiculo)}`, "D-K02",
    `<a class="btn" href="#/vehiculo/${id}/editar">✏️ Editar</a><button class="btn ${v.estado === "Activo" ? "danger" : "success"}" data-act="toggle-veh" data-id="${id}">${v.estado === "Activo" ? "Inactivar" : "Activar"}</button>`, `<a href="#/vehiculos">Vehículos</a> / ${v.placa}`)}
  <div id="fichaError"></div>
  <div class="grid g-2">
    <div class="card"><h2>Ficha del vehículo</h2><dl class="dl">
      <dt>Placa</dt><dd>${v.placa}</dd><dt>Tipo</dt><dd>${tipoVeh(v.id_tipo_vehiculo)}</dd><dt>Marca</dt><dd>${v.marca}</dd><dt>Modelo</dt><dd>${v.modelo}</dd>
      <dt>Año</dt><dd>${v.anio}</dd><dt>Capacidad de carga</dt><dd>${v.capacidad_carga_kg.toLocaleString("es-PE")} kg</dd><dt>Estado</dt><dd>${badge(v.estado)}</dd><dt>Fecha de registro</dt><dd>${fFecha(v.fecha_registro)}</dd></dl></div>
    <div class="card"><h2>Servicios asignados</h2>${tabla(["Servicio", "Salida", "Estado"], hist.map((a) => { const s = servicio(a.id_servicio); return { attrs: `class="clickable" data-go="#/servicio/${s.id_servicio}"`, celdas: [`<b>${s.codigo}</b>`, fFecha(s.fecha_hora_salida), badge(a.activo ? s.estado : "Reasignado", a.activo ? "" : "b-gray")] }; }), "Sin servicios registrados.")}</div>
  </div>`;
}
function vFichaConductor(id, propia = false) {
  const c = conductor(id);
  if (!c) return vNoEncontrado();
  const hist = serviciosDeRecurso("conductor", id);
  const acciones = propia ? "" : `<a class="btn" href="#/conductor/${id}/editar">✏️ Editar</a><button class="btn ${c.estado === "Activo" ? "danger" : "success"}" data-act="toggle-cond" data-id="${id}">${c.estado === "Activo" ? "Inactivar" : "Activar"}</button>`;
  return `${head(propia ? "Mis datos" : nombreCond(c), propia ? "Información registrada por la empresa (solo lectura)" : "Ficha del conductor", propia ? "D-K06" : "D-K02", acciones, propia ? "" : `<a href="#/conductores">Conductores</a> / ${nombreCond(c)}`)}
  <div id="fichaError"></div>
  <div class="grid g-2">
    <div class="card"><h2>Datos del conductor</h2><dl class="dl">
      <dt>Nombres</dt><dd>${c.nombres}</dd><dt>Apellidos</dt><dd>${c.apellidos}</dd><dt>DNI</dt><dd>${c.documento_identidad}</dd><dt>N.° de licencia</dt><dd>${c.numero_licencia}</dd>
      <dt>Categoría</dt><dd>${categoria(c.id_categoria_licencia)}</dd><dt>Estado</dt><dd>${badge(c.estado)}</dd><dt>Fecha de registro</dt><dd>${fFecha(c.fecha_registro)}</dd></dl>
      ${propia ? `<p class="muted small mt">Si algún dato es incorrecto, solicita la corrección al administrador de la sucursal (Ley N.° 29733, derecho de rectificación).</p>` : ""}</div>
    <div class="card"><h2>${propia ? "Mis servicios recientes" : "Servicios asignados"}</h2>${tabla(["Servicio", "Ruta", "Salida", "Estado"], hist.map((a) => { const s = servicio(a.id_servicio); return { celdas: [`<b>${s.codigo}</b>`, rutaNombre(ruta(s.id_ruta)), fFecha(s.fecha_hora_salida), badge(a.activo ? s.estado : "Reasignado", a.activo ? "" : "b-gray")] }; }), "Sin servicios registrados.")}</div>
  </div>`;
}
function toggleRecurso(tipo, id) {
  const rec = tipo === "vehiculo" ? vehiculo(id) : conductor(id);
  const nombre = tipo === "vehiculo" ? `el vehículo ${rec.placa}` : `al conductor ${nombreCond(rec)}`;
  const activar = rec.estado !== "Activo";
  if (!activar) {
    // RNF-K04: no se permite si deja servicios programados o en curso sin recurso
    const pend = DB.asignaciones.filter((a) => a.activo && a[tipo === "vehiculo" ? "id_vehiculo" : "id_conductor"] === Number(id)).map((a) => servicio(a.id_servicio)).filter((s) => ["Programado", "En curso"].includes(s.estado));
    if (pend.length) {
      $("#fichaError").innerHTML = `<div class="alert error">⛔ <div><b>No se puede inactivar ${nombre}.</b> Tiene ${pend.length} servicio(s) programado(s) o en curso: ${pend.map((s) => `<a href="#/servicio/${s.id_servicio}/asignar">${s.codigo}</a>`).join(", ")}. Reasigna esos servicios y vuelve a intentarlo.</div></div>`;
      return;
    }
  }
  confirmar({
    titulo: activar ? "Activar recurso" : "Inactivar recurso",
    texto: activar ? `¿Activar ${nombre}? Volverá a estar disponible para nuevas asignaciones.` : `¿Inactivar ${nombre}? No podrá asignarse a nuevos servicios; su historial se conserva (RF-K03, RF-K07).`,
    body: campo("mMotivo", "Motivo", `<input class="input" id="mMotivo" placeholder="Ej.: mantenimiento preventivo">`, { req: true }),
    ok: activar ? "Activar" : "Inactivar", peligro: !activar,
    alConfirmar: () => {
      const m = $("#mMotivo").value.trim();
      if (!m) { marcarError("mMotivo", "Indica el motivo del cambio de estado."); return false; }
      rec.estado = activar ? "Activo" : "Inactivo";
      registrarBitacora(tipo === "vehiculo" ? "Vehiculo" : "Conductor", tipo === "vehiculo" ? rec.placa : rec.documento_identidad, activar ? "Activación" : "Inactivación", m);
      toast(`Estado actualizado: ${rec.estado}`);
      render();
    }
  });
}

/* ===== D-K02 · RegistroRecursoContainer / ActualizacionRecursoContainer (CU-01, CU-02, CU-05, CU-06) ===== */
function vFormVehiculo(id) {
  const v = id ? vehiculo(id) : {};
  if (id && !v) return vNoEncontrado();
  return `${head(id ? `Actualizar vehículo ${v.placa}` : "Registrar vehículo", id ? "Los cambios quedan registrados con usuario, fecha y hora (RNF-K06)" : "Alta de un vehículo en la flota", "D-K02", "", `<a href="#/vehiculos">Vehículos</a> / ${id ? v.placa : "Nuevo"}`)}
  <form class="card" id="formVeh" novalidate style="max-width:760px"><div id="formMsg"></div><div class="form-grid">
    ${campo("vPlaca", "Placa", `<input class="input" id="vPlaca" value="${esc(v.placa || "")}" placeholder="ABC-123" maxlength="7" style="text-transform:uppercase">`, { req: true, hint: "Formato: 3 caracteres, guion y 3 dígitos." })}
    ${campo("vTipo", "Tipo de vehículo", `<select class="input" id="vTipo"><option value="">Selecciona</option>${DB.tiposVehiculo.map((t) => opt(t.id_tipo_vehiculo, t.nombre, v.id_tipo_vehiculo)).join("")}</select>`, { req: true })}
    ${campo("vMarca", "Marca", `<input class="input" id="vMarca" value="${esc(v.marca || "")}" placeholder="Ej.: Volvo">`, { req: true })}
    ${campo("vModelo", "Modelo", `<input class="input" id="vModelo" value="${esc(v.modelo || "")}" placeholder="Ej.: B8R">`, { req: true })}
    ${campo("vAnio", "Año de fabricación", `<input class="input" id="vAnio" type="number" value="${v.anio || ""}" placeholder="2024" min="1990" max="2027">`, { req: true })}
    ${campo("vCap", "Capacidad de carga (kg)", `<input class="input" id="vCap" type="number" value="${v.capacidad_carga_kg || ""}" placeholder="1500" min="1">`, { req: true, hint: "Se usa para validar el peso del manifiesto." })}
    ${campo("vEstado", "Estado", `<select class="input" id="vEstado">${opt("Activo", "Activo", v.estado)}${opt("Inactivo", "Inactivo", v.estado)}</select>`, { req: true })}
  </div><div class="btn-row mt"><button class="btn primary" type="submit">${id ? "Guardar cambios" : "Registrar vehículo"}</button><a class="btn ghost" href="${id ? `#/vehiculo/${id}` : "#/vehiculos"}">Cancelar</a></div>
  <p class="muted small"><span class="req" style="color:var(--red-700)">*</span> Campos obligatorios</p></form>`;
}
function onFormVehiculo(id) {
  const form = $("#formVeh");
  if (!form) return;
  form.onsubmit = (e) => {
    e.preventDefault(); limpiarErrores(form);
    const d = { placa: $("#vPlaca").value.trim().toUpperCase(), tipo: $("#vTipo").value, marca: $("#vMarca").value.trim(), modelo: $("#vModelo").value.trim(), anio: Number($("#vAnio").value), cap: Number($("#vCap").value), estado: $("#vEstado").value };
    let ok = true;
    if (!/^[A-Z0-9]{3}-[0-9]{3}$/.test(d.placa)) { marcarError("vPlaca", "Ingresa una placa válida, por ejemplo ABC-123."); ok = false; }
    else if (DB.vehiculos.some((x) => x.placa === d.placa && x.id_vehiculo !== Number(id))) { marcarError("vPlaca", `La placa ${d.placa} ya está registrada.`); ok = false; }
    if (!d.tipo) { marcarError("vTipo", "Selecciona el tipo de vehículo."); ok = false; }
    if (!d.marca) { marcarError("vMarca", "La marca es obligatoria."); ok = false; }
    if (!d.modelo) { marcarError("vModelo", "El modelo es obligatorio."); ok = false; }
    if (!(d.anio >= 1990 && d.anio <= 2027)) { marcarError("vAnio", "Ingresa un año entre 1990 y 2027."); ok = false; }
    if (!(d.cap > 0)) { marcarError("vCap", "La capacidad debe ser mayor que 0 kg."); ok = false; }
    if (!ok) { $("#formMsg").innerHTML = `<div class="alert error">⛔ Revisa los campos marcados en rojo.</div>`; return; }
    if (id) {
      Object.assign(vehiculo(id), { placa: d.placa, id_tipo_vehiculo: Number(d.tipo), marca: d.marca, modelo: d.modelo, anio: d.anio, capacidad_carga_kg: d.cap, estado: d.estado });
      registrarBitacora("Vehiculo", d.placa, "Actualización", "Datos del vehículo modificados");
      toast(`Vehículo ${d.placa} actualizado`); location.hash = `#/vehiculo/${id}`;
    } else {
      const nid = Math.max(...DB.vehiculos.map((x) => x.id_vehiculo)) + 1;
      DB.vehiculos.push({ id_vehiculo: nid, placa: d.placa, id_tipo_vehiculo: Number(d.tipo), marca: d.marca, modelo: d.modelo, anio: d.anio, capacidad_carga_kg: d.cap, estado: d.estado, fecha_registro: DEMO_HOY });
      registrarBitacora("Vehiculo", d.placa, "Registro", `${d.marca} ${d.modelo}`);
      toast(`Vehículo ${d.placa} registrado`); location.hash = `#/vehiculo/${nid}`;
    }
  };
}
function vFormConductor(id) {
  const c = id ? conductor(id) : {};
  if (id && !c) return vNoEncontrado();
  return `${head(id ? `Actualizar conductor` : "Registrar conductor", id ? nombreCond(c) : "Alta de personal de conducción habilitado", "D-K02", "", `<a href="#/conductores">Conductores</a> / ${id ? nombreCond(c) : "Nuevo"}`)}
  <form class="card" id="formCond" novalidate style="max-width:760px"><div id="formMsg"></div><div class="form-grid">
    ${campo("cNom", "Nombres", `<input class="input" id="cNom" value="${esc(c.nombres || "")}" placeholder="Ej.: Jorge">`, { req: true })}
    ${campo("cApe", "Apellidos", `<input class="input" id="cApe" value="${esc(c.apellidos || "")}" placeholder="Ej.: Salazar Díaz">`, { req: true })}
    ${campo("cDni", "DNI", `<input class="input" id="cDni" inputmode="numeric" maxlength="8" value="${esc(c.documento_identidad || "")}" placeholder="8 dígitos">`, { req: true })}
    ${campo("cLic", "N.° de licencia", `<input class="input" id="cLic" maxlength="9" value="${esc(c.numero_licencia || "")}" placeholder="Q45879123" style="text-transform:uppercase">`, { req: true, hint: "Letra seguida de 8 dígitos (MTC)." })}
    ${campo("cCat", "Categoría de licencia", `<select class="input" id="cCat"><option value="">Selecciona</option>${DB.categoriasLicencia.map((x) => opt(x.id_categoria_licencia, `${x.codigo} · ${x.descripcion}`, c.id_categoria_licencia)).join("")}</select>`, { req: true })}
    ${campo("cEstado", "Estado", `<select class="input" id="cEstado">${opt("Activo", "Activo", c.estado)}${opt("Inactivo", "Inactivo", c.estado)}</select>`, { req: true })}
    <div class="full alert info" style="margin:0">🔒 Los datos personales se tratan conforme a la Ley N.° 29733; solo el Administrador ve DNI y licencia completos (RNF-K12, RNF-K14).</div>
  </div><div class="btn-row mt"><button class="btn primary" type="submit">${id ? "Guardar cambios" : "Registrar conductor"}</button><a class="btn ghost" href="${id ? `#/conductor/${id}` : "#/conductores"}">Cancelar</a></div></form>`;
}
function onFormConductor(id) {
  const form = $("#formCond");
  if (!form) return;
  form.onsubmit = (e) => {
    e.preventDefault(); limpiarErrores(form);
    const d = { nom: $("#cNom").value.trim(), ape: $("#cApe").value.trim(), dni: $("#cDni").value.trim(), lic: $("#cLic").value.trim().toUpperCase(), cat: $("#cCat").value, estado: $("#cEstado").value };
    let ok = true;
    if (!d.nom) { marcarError("cNom", "Los nombres son obligatorios."); ok = false; }
    if (!d.ape) { marcarError("cApe", "Los apellidos son obligatorios."); ok = false; }
    if (!/^\d{8}$/.test(d.dni)) { marcarError("cDni", "El DNI debe tener exactamente 8 dígitos."); ok = false; }
    else if (DB.conductores.some((x) => x.documento_identidad === d.dni && x.id_conductor !== Number(id))) { marcarError("cDni", "Ya existe un conductor con este DNI."); ok = false; }
    if (!/^[A-Z]\d{8}$/.test(d.lic)) { marcarError("cLic", "Formato inválido. Ejemplo: Q45879123."); ok = false; }
    else if (DB.conductores.some((x) => x.numero_licencia === d.lic && x.id_conductor !== Number(id))) { marcarError("cLic", "Esta licencia ya está registrada."); ok = false; }
    if (!d.cat) { marcarError("cCat", "Selecciona la categoría de licencia."); ok = false; }
    if (!ok) { $("#formMsg").innerHTML = `<div class="alert error">⛔ Revisa los campos marcados en rojo.</div>`; return; }
    if (id) {
      Object.assign(conductor(id), { nombres: d.nom, apellidos: d.ape, documento_identidad: d.dni, numero_licencia: d.lic, id_categoria_licencia: Number(d.cat), estado: d.estado });
      registrarBitacora("Conductor", d.dni, "Actualización", "Datos personales o de licencia modificados");
      toast("Conductor actualizado"); location.hash = `#/conductor/${id}`;
    } else {
      const nid = Math.max(...DB.conductores.map((x) => x.id_conductor)) + 1;
      DB.conductores.push({ id_conductor: nid, nombres: d.nom, apellidos: d.ape, documento_identidad: d.dni, numero_licencia: d.lic, id_categoria_licencia: Number(d.cat), id_usuario: null, estado: d.estado, fecha_registro: DEMO_HOY });
      registrarBitacora("Conductor", d.dni, "Registro", `${d.nom} ${d.ape}`);
      toast("Conductor registrado"); location.hash = `#/conductor/${nid}`;
    }
  };
}

/* ===== D-K03 · ListadoRutasContainer («List» CatalogoRutas, CU-11) ===== */
function vRutas() {
  const f = filtros.rutas;
  const lista = DB.rutas.filter((r) => (!f.origen || r.id_sucursal_origen == f.origen) && (!f.destino || r.id_sucursal_destino == f.destino) && (!f.estado || r.estado === f.estado));
  const suc = DB.sucursales.map((s) => opt(s.id_sucursal, s.nombre));
  const sel = (id, k, label, html, val) => campo(id, label, `<select class="input" id="${id}" data-filtro="rutas.${k}"><option value="">Todos</option>${html.replace(`value="${val}"`, `value="${val}" selected`)}</select>`);
  return `${head("Rutas y paradas", "Catálogo de rutas entre sucursales", "D-K03", `<a class="btn primary" href="#/ruta/nueva">+ Registrar ruta</a>`)}
  <div class="card"><div class="filters f3">${sel("fr-o", "origen", "Origen", suc.join(""), f.origen)}${sel("fr-d", "destino", "Destino", suc.join(""), f.destino)}${sel("fr-e", "estado", "Estado", opt("Activa", "Activa") + opt("Inactiva", "Inactiva"), f.estado)}<button class="btn ghost" data-act="limpiar" data-k="rutas">Limpiar</button></div></div>
  <div class="card mt">${tabla(["Código", "Origen → Destino", "Paradas intermedias", "Distancia", "Tiempo estimado", "Estado", ""], lista.map((r) => ({
    attrs: `class="clickable" data-go="#/ruta/${r.id_ruta}"`,
    celdas: [`<b>${rutaCodigo(r)}</b>`, rutaNombre(r), paradasDe(r.id_ruta).map((p) => p.nombre_parada).join(", ") || "—", `${r.distancia_km} km`, fMin(r.tiempo_estimado_min), badge(r.estado), `<a class="btn sm" href="#/ruta/${r.id_ruta}">Detalle</a>`]
  })))}</div>`;
}

/* ===== D-K03 · DetalleRutaContainer («Details» DetalleRuta) ===== */
function lineaRuta(r) {
  const p = paradasDe(r.id_ruta);
  const nodos = [[sucursal(r.id_sucursal_origen), "Origen", true], ...p.map((x) => [x.nombre_parada, `Parada ${x.orden}`, false]), [sucursal(r.id_sucursal_destino), "Destino", true]];
  return `<div class="route-line">${nodos.map(([n, t, end]) => `<div class="stop ${end ? "end" : ""}"><i></i><b>${esc(n)}</b><small>${t}</small></div>`).join("")}</div>`;
}
function vRuta(id) {
  const r = ruta(id);
  if (!r) return vNoEncontrado();
  const usos = DB.servicios.filter((s) => s.id_ruta === r.id_ruta);
  const activos = usos.filter((s) => ["Programado", "En curso"].includes(s.estado));
  return `${head(`Ruta ${rutaNombre(r)}`, `${rutaCodigo(r)} · ${r.distancia_km} km · ${fMin(r.tiempo_estimado_min)}`, "D-K03",
    `<a class="btn" href="#/ruta/${id}/paradas">✏️ Editar ruta y paradas</a><button class="btn ${r.estado === "Activa" ? "danger" : "success"}" data-act="toggle-ruta" data-id="${id}">${r.estado === "Activa" ? "Desactivar" : "Activar"}</button>`, `<a href="#/rutas">Rutas</a> / ${rutaCodigo(r)}`)}
  <div class="card"><div class="card-head"><h2>Recorrido</h2>${badge(r.estado)}</div>${lineaRuta(r)}</div>
  <div class="grid g-2 mt">
    <div class="card"><h2>Detalle de la ruta</h2><dl class="dl"><dt>Origen</dt><dd>${sucursal(r.id_sucursal_origen)}</dd><dt>Destino</dt><dd>${sucursal(r.id_sucursal_destino)}</dd>
      <dt>Distancia</dt><dd>${r.distancia_km} km</dd><dt>Tiempo estimado</dt><dd>${fMin(r.tiempo_estimado_min)} (${r.tiempo_estimado_min} min)</dd><dt>Paradas</dt><dd>${paradasDe(id).length}</dd><dt>Registrada</dt><dd>${fFecha(r.fecha_registro)}</dd></dl></div>
    <div class="card"><h2>Servicios que usan la ruta</h2>${activos.length ? `<div class="alert info">ℹ️ ${activos.length} servicio(s) vigente(s). Si desactivas la ruta, se conservan; solo se bloquea su uso en servicios nuevos (RF-K11).</div>` : ""}
      ${tabla(["Servicio", "Salida", "Estado"], usos.slice(0, 5).map((s) => ({ attrs: `class="clickable" data-go="#/servicio/${s.id_servicio}"`, celdas: [`<b>${s.codigo}</b>`, fFecha(s.fecha_hora_salida), badge(s.estado)] })), "Sin servicios registrados.")}</div>
  </div>`;
}
function toggleRuta(id) {
  const r = ruta(id), activar = r.estado !== "Activa";
  confirmar({
    titulo: activar ? "Activar ruta" : "Desactivar ruta",
    texto: activar ? `¿Activar la ruta ${rutaNombre(r)}? Podrá usarse en nuevos servicios.` : `¿Desactivar la ruta ${rutaNombre(r)}? No podrá usarse en nuevos servicios; los existentes se conservan.`,
    ok: activar ? "Activar" : "Desactivar", peligro: !activar,
    alConfirmar: () => { r.estado = activar ? "Activa" : "Inactiva"; registrarBitacora("Ruta", rutaCodigo(r), activar ? "Activación" : "Desactivación", rutaNombre(r)); toast(`Ruta ${r.estado.toLowerCase()}`); render(); }
  });
}

/* ===== D-K03 · RegistroRutaContainer («Form» FormularioRuta, CU-09) y ParadasRutaContainer (CU-10) ===== */
let borradorParadas = [];
function vFormRuta(id) {
  const r = id ? ruta(id) : null;
  if (id && !r) return vNoEncontrado();
  const suc = (sel) => DB.sucursales.map((s) => opt(s.id_sucursal, s.nombre, sel)).join("");
  return `${head(id ? `Editar ruta ${rutaCodigo(r)}` : "Registrar ruta", id ? "Actualiza distancia, tiempo y el orden de las paradas" : "Nueva ruta entre sucursales con sus paradas intermedias", "D-K03", "", `<a href="#/rutas">Rutas</a> / ${id ? rutaCodigo(r) : "Nueva"}`)}
  <form id="formRuta" novalidate><div id="formMsg"></div><div class="grid g-main">
    <div class="card"><h2>Datos de la ruta</h2><div class="form-grid">
      ${campo("rOri", "Sucursal de origen", `<select class="input" id="rOri" ${id ? "disabled" : ""}><option value="">Selecciona</option>${suc(r?.id_sucursal_origen)}</select>`, { req: true })}
      ${campo("rDes", "Sucursal de destino", `<select class="input" id="rDes" ${id ? "disabled" : ""}><option value="">Selecciona</option>${suc(r?.id_sucursal_destino)}</select>`, { req: true })}
      ${campo("rKm", "Distancia (km)", `<input class="input" id="rKm" type="number" min="1" value="${r?.distancia_km || ""}" placeholder="561">`, { req: true })}
      ${campo("rMin", "Tiempo estimado (min)", `<input class="input" id="rMin" type="number" min="1" value="${r?.tiempo_estimado_min || ""}" placeholder="540">`, { req: true, hint: "Se usa para calcular la llegada estimada del servicio." })}
    </div>${id ? `<p class="muted small mt">El origen y el destino no se modifican para no alterar los servicios que ya usan la ruta (RNF-K04).</p>` : ""}</div>
    <div class="card"><h2>Paradas intermedias</h2><p class="muted small" style="margin-top:-6px">Usa ↑ ↓ para cambiar el orden.</p>
      <ul class="stop-list" id="listaParadas"></ul>
      <div class="btn-row mt" style="flex-wrap:nowrap"><input class="input" id="nuevaParada" placeholder="Nombre de la parada"><button class="btn" type="button" data-act="add-parada">Agregar</button></div>
    </div>
  </div><div class="btn-row mt"><button class="btn primary" type="submit">${id ? "Guardar cambios" : "Registrar ruta"}</button><a class="btn ghost" href="${id ? `#/ruta/${id}` : "#/rutas"}">Cancelar</a></div></form>`;
}
function pintarParadas(id) {
  const r = id ? ruta(id) : null;
  const ori = r ? sucursal(r.id_sucursal_origen) : sucursal($("#rOri")?.value) , des = r ? sucursal(r.id_sucursal_destino) : sucursal($("#rDes")?.value);
  const ul = $("#listaParadas");
  if (!ul) return;
  ul.innerHTML = `<li class="fixed"><span class="ord">O</span><span class="name">${ori === "—" ? "Origen" : ori}</span><span class="muted small">Origen</span></li>` +
    borradorParadas.map((p, i) => `<li><span class="ord">${i + 1}</span><span class="name">${esc(p)}</span>
      <button type="button" class="icon-btn" data-act="up" data-i="${i}" ${i === 0 ? "disabled" : ""} aria-label="Subir">↑</button>
      <button type="button" class="icon-btn" data-act="down" data-i="${i}" ${i === borradorParadas.length - 1 ? "disabled" : ""} aria-label="Bajar">↓</button>
      <button type="button" class="icon-btn" data-act="del" data-i="${i}" aria-label="Quitar">✕</button></li>`).join("") +
    `<li class="fixed"><span class="ord">D</span><span class="name">${des === "—" ? "Destino" : des}</span><span class="muted small">Destino</span></li>`;
}
function onFormRuta(id) {
  const form = $("#formRuta");
  if (!form) return;
  borradorParadas = id ? paradasDe(id).map((p) => p.nombre_parada) : [];
  pintarParadas(id);
  ["#rOri", "#rDes"].forEach((s) => $(s) && ($(s).onchange = () => pintarParadas(id)));
  $("#nuevaParada").onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); agregarParada(id); } };
  form.onclick = (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const i = Number(b.dataset.i);
    if (b.dataset.act === "add-parada") agregarParada(id);
    if (b.dataset.act === "up") [borradorParadas[i - 1], borradorParadas[i]] = [borradorParadas[i], borradorParadas[i - 1]];
    if (b.dataset.act === "down") [borradorParadas[i + 1], borradorParadas[i]] = [borradorParadas[i], borradorParadas[i + 1]];
    if (b.dataset.act === "del") borradorParadas.splice(i, 1);
    pintarParadas(id);
  };
  form.onsubmit = (e) => {
    e.preventDefault(); limpiarErrores(form);
    const ori = id ? ruta(id).id_sucursal_origen : Number($("#rOri").value), des = id ? ruta(id).id_sucursal_destino : Number($("#rDes").value);
    const km = Number($("#rKm").value), min = Number($("#rMin").value);
    let ok = true;
    if (!ori) { marcarError("rOri", "Selecciona el origen."); ok = false; }
    if (!des) { marcarError("rDes", "Selecciona el destino."); ok = false; }
    if (ori && des && ori === des) { marcarError("rDes", "El destino debe ser distinto del origen."); ok = false; }
    if (!id && ori && des && DB.rutas.some((r) => r.id_sucursal_origen === ori && r.id_sucursal_destino === des)) { marcarError("rDes", "Ya existe una ruta con este origen y destino."); ok = false; }
    if (!(km > 0)) { marcarError("rKm", "Ingresa una distancia mayor que 0."); ok = false; }
    if (!(min > 0)) { marcarError("rMin", "Ingresa un tiempo mayor que 0 minutos."); ok = false; }
    if (!ok) { $("#formMsg").innerHTML = `<div class="alert error">⛔ Revisa los campos marcados en rojo.</div>`; return; }
    let rid = id;
    if (id) { Object.assign(ruta(id), { distancia_km: km, tiempo_estimado_min: min }); DB.paradas = DB.paradas.filter((p) => p.id_ruta !== Number(id)); }
    else { rid = Math.max(...DB.rutas.map((r) => r.id_ruta)) + 1; DB.rutas.push({ id_ruta: rid, id_sucursal_origen: ori, id_sucursal_destino: des, distancia_km: km, tiempo_estimado_min: min, estado: "Activa", fecha_registro: DEMO_HOY }); }
    borradorParadas.forEach((n, i) => DB.paradas.push({ id_parada: DB.paradas.length + 100, id_ruta: Number(rid), nombre_parada: n, orden: i + 1 }));
    registrarBitacora("Ruta", rutaCodigo(ruta(rid)), id ? "Actualización" : "Registro", `${rutaNombre(ruta(rid))} · ${borradorParadas.length} parada(s)`);
    toast(id ? "Ruta actualizada" : "Ruta registrada"); location.hash = `#/ruta/${rid}`;
  };
}
function agregarParada(id) {
  const inp = $("#nuevaParada"), v = inp.value.trim();
  if (!v) { inp.focus(); return; }
  if (borradorParadas.some((p) => p.toLowerCase() === v.toLowerCase())) { toast("Esa parada ya está en la lista", "err"); return; }
  borradorParadas.push(v); inp.value = ""; pintarParadas(id); inp.focus();
}

/* ===== D-K04 · CreacionServicioContainer («Form» FormularioServicio, CU-12) ===== */
function vNuevoServicio() {
  const rutas = DB.rutas.filter((r) => r.estado === "Activa");
  return `${head("Programar servicio de transporte", "Creación de un nuevo servicio con sus recursos", "D-K04", "", `<a href="#/servicios">Servicios</a> / Nuevo`)}
  <form id="formServ" novalidate><div id="formMsg"></div><div class="grid g-main">
    <div class="card"><h2>Datos del servicio</h2><div class="form-grid">
      ${campo("sRuta", "Ruta", `<select class="input" id="sRuta"><option value="">Selecciona una ruta activa</option>${rutas.map((r) => opt(r.id_ruta, `${rutaNombre(r)} · ${fMin(r.tiempo_estimado_min)}`)).join("")}</select>`, { req: true, full: true, hint: "Solo rutas activas (RF-K11)." })}
      ${campo("sFecha", "Fecha de salida", `<input class="input" type="date" id="sFecha" min="${DEMO_HOY}" value="2026-11-22">`, { req: true })}
      ${campo("sHora", "Hora de salida", `<input class="input" type="time" id="sHora" value="21:30">`, { req: true })}
      ${campo("sLlegada", "Llegada estimada", `<input class="input" id="sLlegada" readonly value="Selecciona una ruta" style="background:var(--slate-100)">`, { full: true, hint: "Se calcula con el tiempo estimado de la ruta." })}
      ${campo("sVeh", "Vehículo", `<select class="input" id="sVeh"></select>`, { req: true })}
      ${campo("sCond", "Conductor", `<select class="input" id="sCond"></select>`, { req: true })}
    </div><div class="btn-row mt"><button class="btn primary" type="submit">Crear servicio</button><a class="btn ghost" href="#/servicios">Cancelar</a></div></div>
    <div class="card"><h2>Resumen</h2><div id="resumenServ" class="muted">Completa los datos para ver el resumen.</div></div>
  </div></form>`;
}
function onNuevoServicio() {
  const form = $("#formServ");
  if (!form) return;
  const recalcular = () => {
    const r = ruta($("#sRuta").value), f = $("#sFecha").value, h = $("#sHora").value;
    const salida = f && h ? `${f}T${h}` : null, llegada = r && salida ? sumarMin(salida, r.tiempo_estimado_min) : null;
    $("#sLlegada").value = llegada ? fFecha(llegada) : "Selecciona ruta, fecha y hora";
    const vSel = $("#sVeh").value, cSel = $("#sCond").value;
    $("#sVeh").innerHTML = `<option value="">Selecciona</option>` + DB.vehiculos.filter((v) => v.estado === "Activo").map((v) => { const d = llegada ? disponibilidad("vehiculo", v, salida, llegada) : { texto: "", libre: true }; return `<option value="${v.id_vehiculo}" ${d.libre ? "" : "disabled"} ${vSel == v.id_vehiculo ? "selected" : ""}>${v.placa} · ${v.marca}${d.texto ? " — " + d.texto : ""}</option>`; }).join("");
    $("#sCond").innerHTML = `<option value="">Selecciona</option>` + DB.conductores.filter((c) => c.estado === "Activo").map((c) => { const d = llegada ? disponibilidad("conductor", c, salida, llegada) : { texto: "", libre: true }; return `<option value="${c.id_conductor}" ${d.libre ? "" : "disabled"} ${cSel == c.id_conductor ? "selected" : ""}>${nombreCond(c)}${d.texto ? " — " + d.texto : ""}</option>`; }).join("");
    $("#resumenServ").innerHTML = r ? `<dl class="dl"><dt>Ruta</dt><dd>${rutaNombre(r)}</dd><dt>Paradas</dt><dd>${paradasDe(r.id_ruta).map((p) => p.nombre_parada).join(", ") || "—"}</dd><dt>Distancia</dt><dd>${r.distancia_km} km</dd><dt>Salida</dt><dd>${salida ? fFecha(salida) : "—"}</dd><dt>Llegada est.</dt><dd>${llegada ? fFecha(llegada) : "—"}</dd><dt>Estado inicial</dt><dd>${badge("Programado")}</dd></dl><p class="small mt">Los recursos ocupados en ese horario aparecen deshabilitados.</p>` : "Completa los datos para ver el resumen.";
  };
  ["#sRuta", "#sFecha", "#sHora"].forEach((s) => ($(s).onchange = recalcular));
  recalcular();
  form.onsubmit = (e) => {
    e.preventDefault(); limpiarErrores(form);
    const r = ruta($("#sRuta").value), f = $("#sFecha").value, h = $("#sHora").value, v = $("#sVeh").value, c = $("#sCond").value;
    let ok = true;
    if (!r) { marcarError("sRuta", "Selecciona la ruta del servicio."); ok = false; }
    if (!f) { marcarError("sFecha", "Indica la fecha de salida."); ok = false; } else if (f < DEMO_HOY) { marcarError("sFecha", "La fecha no puede ser anterior a hoy."); ok = false; }
    if (!h) { marcarError("sHora", "Indica la hora de salida."); ok = false; }
    if (!v) { marcarError("sVeh", "Selecciona un vehículo disponible."); ok = false; }
    if (!c) { marcarError("sCond", "Selecciona un conductor disponible."); ok = false; }
    if (!ok) { $("#formMsg").innerHTML = `<div class="alert error">⛔ No se pudo crear el servicio. Revisa los campos marcados.</div>`; return; }
    const salida = `${f}T${h}`, llegada = sumarMin(salida, r.tiempo_estimado_min);
    const nid = Math.max(...DB.servicios.map((s) => s.id_servicio)) + 1, codigo = `SRV-2026-${String(nid).padStart(4, "0")}`;
    DB.servicios.push({ id_servicio: nid, codigo, id_ruta: r.id_ruta, estado: "Programado", fecha_hora_salida: salida, fecha_hora_llegada_estimada: llegada, fecha_hora_inicio_real: null, fecha_hora_fin_real: null, fecha_creacion: ahora() });
    DB.asignaciones.push({ id_asignacion: DB.asignaciones.length + 1, id_servicio: nid, id_vehiculo: Number(v), id_conductor: Number(c), id_usuario: sesion.id_usuario, fecha_hora_asignacion: ahora(), fecha_hora_fin: null, motivo_cambio: "Asignación inicial", activo: true });
    registrarBitacora("ServicioTransporte", codigo, "Creación", `${rutaNombre(r)} · ${fFecha(salida)}`);
    toast(`Servicio ${codigo} creado`); location.hash = `#/servicio/${nid}`;
  };
}

/* ===== D-K04 · DetalleServicio, ControlEjecucion e HistorialAsignaciones (CU-13, CU-14, CU-16, CU-20) ===== */
function flujoEstado(s) {
  const orden = ["Programado", "En curso", "Finalizado"];
  if (s.estado === "Cancelado") return `<div class="status-flow"><div class="sf-node done"><i>✓</i>Programado</div><div class="sf-node cancel"><i>✕</i>Cancelado</div></div>`;
  const idx = orden.indexOf(s.estado);
  return `<div class="status-flow">${orden.map((e, i) => `<div class="sf-node ${i < idx || s.estado === "Finalizado" ? "done" : i === idx ? "current" : ""}"><i>${i < idx || s.estado === "Finalizado" ? "✓" : i + 1}</i>${e}</div>`).join("")}</div>`;
}
function vServicio(id) {
  const s = servicio(id);
  if (!s) return vNoEncontrado();
  const r = ruta(s.id_ruta), a = asignacionActiva(id), enc = encomiendasDe(id), prog = s.estado === "Programado";
  const hist = DB.asignaciones.filter((x) => x.id_servicio === Number(id)).sort((x, y) => y.fecha_hora_asignacion.localeCompare(x.fecha_hora_asignacion));
  return `${head(`Servicio ${s.codigo}`, `${rutaNombre(r)} · salida ${fFecha(s.fecha_hora_salida)}`, "D-K04",
    prog ? `<a class="btn" href="#/servicio/${id}/asignar">Planificar recursos y carga</a>` : `<a class="btn" href="#/servicio/${id}/manifiesto">Ver manifiesto</a>`, `<a href="#/servicios">Servicios</a> / ${s.codigo}`)}
  <div class="grid g-main">
    <div>
      <form class="card" id="formModServ" novalidate><div class="card-head"><h2>Datos del servicio</h2>${badge(s.estado)}</div>
        ${prog ? "" : `<div class="alert warn">🔒 Solo se puede modificar mientras el servicio está «Programado» (RF-K13).</div>`}
        <div id="formMsg"></div>
        <div class="form-grid">
          ${campo("mRuta", "Ruta", `<select class="input" id="mRuta" ${prog ? "" : "disabled"}>${DB.rutas.filter((x) => x.estado === "Activa" || x.id_ruta === s.id_ruta).map((x) => opt(x.id_ruta, rutaNombre(x), s.id_ruta)).join("")}</select>`, { full: true })}
          ${campo("mFecha", "Fecha de salida", `<input class="input" type="date" id="mFecha" value="${s.fecha_hora_salida.slice(0, 10)}" ${prog ? "" : "disabled"}>`)}
          ${campo("mHora", "Hora de salida", `<input class="input" type="time" id="mHora" value="${s.fecha_hora_salida.slice(11)}" ${prog ? "" : "disabled"}>`)}
        </div>
        <dl class="dl mt"><dt>Llegada estimada</dt><dd>${fFecha(s.fecha_hora_llegada_estimada)}</dd><dt>Inicio real</dt><dd>${fFecha(s.fecha_hora_inicio_real)}</dd><dt>Fin real</dt><dd>${fFecha(s.fecha_hora_fin_real)}</dd><dt>Creado</dt><dd>${fFecha(s.fecha_creacion)}</dd></dl>
        ${prog ? `<div class="btn-row mt"><button class="btn primary" type="submit">Guardar modificación</button></div>` : ""}
      </form>
      <div class="card"><h2>Historial de asignaciones</h2>
        ${tabla(["Desde", "Vehículo", "Conductor", "Motivo", "Vigencia"], hist.map((x) => ({ celdas: [fFecha(x.fecha_hora_asignacion), vehiculo(x.id_vehiculo).placa, nombreCond(conductor(x.id_conductor)), esc(x.motivo_cambio), x.activo ? badge("Vigente", "b-green") : `<span class="muted small">Hasta ${fCorta(x.fecha_hora_fin)}</span>`] })), "El servicio aún no tiene asignaciones.")}
      </div>
    </div>
    <div>
      <div class="card"><h2>Control de ejecución</h2>${flujoEstado(s)}
        ${s.estado === "Programado" ? `<p class="small muted">El inicio y la finalización los registra el conductor asignado desde su vista «Mis servicios» (RF-K20, RNF-K03).</p><button class="btn danger" data-act="cancelar-serv" data-id="${id}">Cancelar servicio</button>` : ""}
        ${s.estado === "En curso" ? `<div class="alert info">🚌 Servicio en ruta desde ${fFecha(s.fecha_hora_inicio_real)}.</div>` : ""}
        ${s.estado === "Finalizado" ? `<div class="alert ok">✅ Finalizado el ${fFecha(s.fecha_hora_fin_real)}.</div>` : ""}
        ${s.estado === "Cancelado" ? `<div class="alert error">Servicio cancelado. Los recursos fueron liberados y el registro se conserva (RNF-K07).</div>` : ""}
      </div>
      <div class="card"><h2>Recursos y carga</h2><dl class="dl">
        <dt>Vehículo</dt><dd>${a ? `${vehiculo(a.id_vehiculo).placa} · ${vehiculo(a.id_vehiculo).marca}` : '<span class="muted">Sin asignar</span>'}</dd>
        <dt>Conductor</dt><dd>${a ? nombreCond(conductor(a.id_conductor)) : '<span class="muted">Sin asignar</span>'}</dd>
        <dt>Encomiendas</dt><dd>${enc.length} · ${enc.reduce((t, e) => t + e.peso_kg, 0).toFixed(1)} kg</dd>
        <dt>Manifiesto</dt><dd>${manifiestoDe(id) ? badge("Generado", "b-green") : badge("Pendiente", "b-amber")}</dd></dl></div>
    </div>
  </div>`;
}
function onServicio(id) {
  const form = $("#formModServ");
  if (!form) return;
  form.onsubmit = (e) => {
    e.preventDefault(); limpiarErrores(form);
    const s = servicio(id), r = ruta($("#mRuta").value), f = $("#mFecha").value, h = $("#mHora").value;
    if (!f || f < DEMO_HOY) { marcarError("mFecha", "Ingresa una fecha válida (no anterior a hoy)."); return; }
    if (!h) { marcarError("mHora", "Ingresa la hora de salida."); return; }
    const salida = `${f}T${h}`, llegada = sumarMin(salida, r.tiempo_estimado_min), a = asignacionActiva(id);
    if (a) {
      const cv = conflictosRecurso("vehiculo", a.id_vehiculo, salida, llegada, id), cc = conflictosRecurso("conductor", a.id_conductor, salida, llegada, id);
      if (cv.length || cc.length) { $("#formMsg").innerHTML = `<div class="alert error">⛔ Con el nuevo horario, ${cv.length ? `el vehículo se cruza con ${cv[0].codigo}` : `el conductor se cruza con ${cc[0].codigo}`}. Cambia el horario o reasigna los recursos.</div>`; return; }
    }
    Object.assign(s, { id_ruta: r.id_ruta, fecha_hora_salida: salida, fecha_hora_llegada_estimada: llegada });
    registrarBitacora("ServicioTransporte", s.codigo, "Modificación", `Nueva salida ${fFecha(salida)}`);
    toast(`Servicio ${s.codigo} modificado`); render();
  };
}
function cancelarServicio(id) {
  const s = servicio(id);
  confirmar({
    titulo: `Cancelar ${s.codigo}`, texto: "El servicio pasará a «Cancelado», se liberarán el vehículo y el conductor y se conservará el registro histórico.",
    body: campo("mMotivo", "Motivo de la cancelación", `<textarea class="input" id="mMotivo" placeholder="Ej.: bloqueo de vía en Panamericana Norte"></textarea>`, { req: true }),
    ok: "Cancelar servicio", peligro: true,
    alConfirmar: () => {
      const m = $("#mMotivo").value.trim();
      if (!m) { marcarError("mMotivo", "El motivo es obligatorio."); return false; }
      s.estado = "Cancelado";
      const a = asignacionActiva(id); if (a) { a.activo = false; a.fecha_hora_fin = ahora(); a.motivo_cambio += ` · Cancelado: ${m}`; }
      DB.servicioEncomienda.filter((x) => x.id_servicio === Number(id)).forEach((x) => (x.activo = false));
      registrarBitacora("ServicioTransporte", s.codigo, "Cancelación", `Motivo: ${m}`);
      toast(`${s.codigo} cancelado; recursos liberados`); render();
    }
  });
}

/* ===== D-K04 · HistorialAsignacionesContainer (vista general, CU-16) ===== */
function vHistorial() {
  const f = filtros.historial;
  const lista = DB.asignaciones.filter((a) => (!f.servicio || a.id_servicio == f.servicio) && (!f.vehiculo || a.id_vehiculo == f.vehiculo) && (!f.conductor || a.id_conductor == f.conductor)).sort((a, b) => b.fecha_hora_asignacion.localeCompare(a.fecha_hora_asignacion));
  return `${head("Historial de asignaciones", "Auditoría de asignaciones y reasignaciones de vehículo y conductor", "D-K04")}
  <div class="card"><div class="filters f3">
    ${campo("fh-s", "Servicio", `<select class="input" id="fh-s" data-filtro="historial.servicio"><option value="">Todos</option>${DB.servicios.map((s) => opt(s.id_servicio, s.codigo, f.servicio)).join("")}</select>`)}
    ${campo("fh-v", "Vehículo", `<select class="input" id="fh-v" data-filtro="historial.vehiculo"><option value="">Todos</option>${DB.vehiculos.map((v) => opt(v.id_vehiculo, v.placa, f.vehiculo)).join("")}</select>`)}
    ${campo("fh-c", "Conductor", `<select class="input" id="fh-c" data-filtro="historial.conductor"><option value="">Todos</option>${DB.conductores.map((c) => opt(c.id_conductor, nombreCond(c), f.conductor)).join("")}</select>`)}
    <button class="btn ghost" data-act="limpiar" data-k="historial">Limpiar</button></div></div>
  <div class="card mt">${tabla(["Fecha", "Servicio", "Vehículo", "Conductor", "Motivo", "Registrado por", "Vigencia"], lista.map((a) => ({
    attrs: `class="clickable" data-go="#/servicio/${a.id_servicio}"`,
    celdas: [fFecha(a.fecha_hora_asignacion), `<b>${servicio(a.id_servicio).codigo}</b>`, vehiculo(a.id_vehiculo).placa, nombreCond(conductor(a.id_conductor)), esc(a.motivo_cambio), usuario(a.id_usuario), a.activo ? badge("Vigente", "b-green") : badge("Cerrada", "b-gray")]
  })))}</div>`;
}

/* ===== D-K07 · Bitácora de transporte (interfaz adicional, RNF-K06) ===== */
function vBitacora() {
  const f = filtros.bitacora;
  const ents = [...new Set(DB.bitacora.map((b) => b.tipo_entidad))], ops = [...new Set(DB.bitacora.map((b) => b.tipo_operacion))];
  const lista = DB.bitacora.filter((b) => (!f.ent || b.tipo_entidad === f.ent) && (!f.op || b.tipo_operacion === f.op)).sort((a, b) => b.fecha_hora.localeCompare(a.fecha_hora));
  return `${head("Bitácora de transporte", "Quién, qué y cuándo se modificó cada registro del módulo", "D-K07")}
  <div class="card"><div class="filters f3">
    ${campo("fb-e", "Entidad", `<select class="input" id="fb-e" data-filtro="bitacora.ent"><option value="">Todas</option>${ents.map((x) => opt(x, x, f.ent)).join("")}</select>`)}
    ${campo("fb-o", "Operación", `<select class="input" id="fb-o" data-filtro="bitacora.op"><option value="">Todas</option>${ops.map((x) => opt(x, x, f.op)).join("")}</select>`)}
    <div></div><button class="btn ghost" data-act="limpiar" data-k="bitacora">Limpiar</button></div></div>
  <div class="card mt">${tabla(["Fecha y hora", "Usuario", "Entidad", "Registro", "Operación", "Detalle"], lista.map((b) => ({ celdas: [fFecha(b.fecha_hora), usuario(b.id_usuario), b.tipo_entidad, `<b>${esc(b.id_registro)}</b>`, badge(b.tipo_operacion, "b-blue"), esc(b.detalle)] })))}
  <p class="muted small mt">Los registros de bitácora son de solo lectura y no se eliminan (RNF-K07).</p></div>`;
}

/* ===== D-K06 · Mis servicios (vista del Conductor, RF-K20) ===== */
function vMisServicios() {
  const u = usuarioActual(), c = conductor(u.id_conductor);
  const mias = DB.asignaciones.filter((a) => a.activo && a.id_conductor === c.id_conductor).map((a) => servicio(a.id_servicio));
  const pasados = DB.asignaciones.filter((a) => !a.activo && a.id_conductor === c.id_conductor).map((a) => servicio(a.id_servicio)).filter((s) => s.estado === "Finalizado");
  const activos = mias.filter((s) => ["En curso", "Programado"].includes(s.estado)).sort((a, b) => (a.estado === "En curso" ? -1 : b.estado === "En curso" ? 1 : a.fecha_hora_salida.localeCompare(b.fecha_hora_salida)));
  const tarjeta = (s) => {
    const r = ruta(s.id_ruta), a = asignacionActiva(s.id_servicio), v = a && vehiculo(a.id_vehiculo), enc = encomiendasDe(s.id_servicio);
    const hoy = s.fecha_hora_salida.startsWith(DEMO_HOY);
    let accion = "";
    if (s.estado === "Programado") accion = hoy ? `<button class="btn success" data-act="iniciar" data-id="${s.id_servicio}">▶ Iniciar servicio</button>` : `<button class="btn" disabled>▶ Iniciar servicio</button><span class="muted small">Disponible el día de salida</span>`;
    if (s.estado === "En curso") accion = `<button class="btn primary" data-act="finalizar" data-id="${s.id_servicio}">■ Finalizar servicio</button>`;
    return `<div class="svc-card"><div class="top"><div><span class="muted small">${s.codigo}</span><h3>${rutaNombre(r)}</h3></div>${badge(s.estado)}</div>
      ${lineaRuta(r)}
      <dl class="dl mt"><dt>Salida</dt><dd>${fFecha(s.fecha_hora_salida)}</dd><dt>Llegada estimada</dt><dd>${fFecha(s.fecha_hora_llegada_estimada)}</dd><dt>Vehículo</dt><dd>${v ? `${v.placa} · ${v.marca} ${v.modelo}` : "—"}</dd><dt>Carga</dt><dd>${enc.length} encomiendas · ${enc.reduce((t, e) => t + e.peso_kg, 0).toFixed(1)} kg</dd>${s.fecha_hora_inicio_real ? `<dt>Inicio real</dt><dd>${fFecha(s.fecha_hora_inicio_real)}</dd>` : ""}</dl>
      <div class="btn-row mt">${accion}</div></div>`;
  };
  return `${head(`Hola, ${c.nombres} 👋`, "Tus servicios asignados", "D-K06")}
  <div class="grid g-2"><div class="card stat"><b>${activos.length}</b><span>Servicios pendientes o en curso</span></div><div class="card stat"><b>${pasados.length}</b><span>Servicios finalizados recientemente</span></div></div>
  <div class="mt">${activos.length ? activos.map(tarjeta).join("") : `<div class="card empty">No tienes servicios asignados por ahora.</div>`}</div>
  ${pasados.length ? `<div class="card mt"><h2>Finalizados</h2>${tabla(["Servicio", "Ruta", "Inicio real", "Fin real"], pasados.map((s) => ({ celdas: [`<b>${s.codigo}</b>`, rutaNombre(ruta(s.id_ruta)), fFecha(s.fecha_hora_inicio_real), fFecha(s.fecha_hora_fin_real)] })))}</div>` : ""}`;
}
function cambiarEjecucion(id, accion) {
  const s = servicio(id);
  confirmar({
    titulo: accion === "iniciar" ? "Iniciar servicio" : "Finalizar servicio",
    texto: accion === "iniciar" ? `Se registrará la hora real de salida de ${s.codigo} y su estado pasará a «En curso».` : `Se registrará la hora real de llegada de ${s.codigo} y su estado pasará a «Finalizado».`,
    ok: accion === "iniciar" ? "Sí, iniciar" : "Sí, finalizar",
    alConfirmar: () => {
      if (accion === "iniciar") { s.estado = "En curso"; s.fecha_hora_inicio_real = ahora(); }
      else { s.estado = "Finalizado"; s.fecha_hora_fin_real = ahora(); const a = asignacionActiva(id); if (a) { a.activo = false; a.fecha_hora_fin = ahora(); } }
      registrarBitacora("ServicioTransporte", s.codigo, accion === "iniciar" ? "Inicio" : "Finalización", `Registrado por el conductor`);
      toast(`${s.codigo}: ${s.estado}`); render();
    }
  });
}

/* ===== Pantallas de soporte ===== */
function vDenegado() {
  return `<div class="card denied"><div class="big">🔒</div><h1 style="font-size:22px;margin:8px 0">Acceso denegado</h1><p class="muted">Tu perfil «${usuarioActual().rol}» no tiene permiso para esta función (RNF-K03).</p><a class="btn primary" href="#/${esAdmin() ? "inicio" : "mis-servicios"}">Volver al inicio</a></div>`;
}
function vNoEncontrado() { return `<div class="card denied"><div class="big">🔎</div><h1 style="font-size:22px;margin:8px 0">Registro no encontrado</h1><a class="btn" href="#/inicio">Volver</a></div>`; }

/* ---------------------------------------------------------------------
   6. Enrutador (hash) y eventos globales
   --------------------------------------------------------------------- */
function render() {
  const partes = (location.hash.replace(/^#\/?/, "") || "").split("/");
  let [sec, id, sub] = partes;
  if (!sec) sec = esAdmin() ? "inicio" : "mis-servicios";
  pintarMenu(sec);
  const app = $("#app");
  let html = "", after = null;

  if (!PERMISOS[usuarioActual().rol].includes(sec)) html = vDenegado();
  else switch (sec) {
    case "inicio": html = vInicio(); break;
    case "servicios": html = vServicios(); break;
    case "servicio-nuevo": html = vNuevoServicio(); after = onNuevoServicio; break;
    case "servicio":
      if (sub === "asignar") { html = vAsignar(id); after = () => onAsignar(id); }
      else if (sub === "encomiendas") html = vEncomiendas(id);
      else if (sub === "manifiesto") html = vManifiesto(id);
      else { html = vServicio(id); after = () => onServicio(id); }
      break;
    case "historial": html = vHistorial(); break;
    case "vehiculos": html = vVehiculos(); break;
    case "conductores": html = vConductores(); break;
    case "vehiculo":
      if (id === "nuevo") { html = vFormVehiculo(); after = () => onFormVehiculo(); }
      else if (sub === "editar") { html = vFormVehiculo(id); after = () => onFormVehiculo(id); }
      else html = vFichaVehiculo(id);
      break;
    case "conductor":
      if (id === "nuevo") { html = vFormConductor(); after = () => onFormConductor(); }
      else if (sub === "editar") { html = vFormConductor(id); after = () => onFormConductor(id); }
      else html = vFichaConductor(id);
      break;
    case "rutas": html = vRutas(); break;
    case "ruta":
      if (id === "nueva") { html = vFormRuta(); after = () => onFormRuta(); }
      else if (sub === "paradas") { html = vFormRuta(id); after = () => onFormRuta(id); }
      else html = vRuta(id);
      break;
    case "bitacora": html = vBitacora(); break;
    case "mis-servicios": html = vMisServicios(); break;
    case "mis-datos": html = vFichaConductor(usuarioActual().id_conductor, true); break;
    default: html = vNoEncontrado();
  }
  app.innerHTML = html;
  if (after) after();
  $("#sidebar").classList.remove("open");
  $("#overlay").classList.remove("show");
}

document.addEventListener("click", (e) => {
  const go = e.target.closest("[data-go]");
  if (go && !e.target.closest("a, button, input, select")) { location.hash = go.dataset.go; return; }
  const chkRow = e.target.closest("[data-check]");
  if (chkRow && !e.target.closest("input")) { const c = $("input", chkRow); if (!c.disabled) { c.checked = !c.checked; c.dispatchEvent(new Event("change", { bubbles: true })); } }
  const b = e.target.closest("[data-act]");
  if (!b || b.closest("#formRuta")) return;
  const id = b.dataset.id;
  switch (b.dataset.act) {
    case "limpiar": filtros[b.dataset.k] = {}; render(); break;
    case "asignar-enc": asignarEncomiendas(id); break;
    case "quitar-enc": {
      const rel = DB.servicioEncomienda.find((x) => x.id_servicio === Number(id) && x.id_encomienda === Number(b.dataset.enc) && x.activo);
      if (rel) { rel.activo = false; registrarBitacora("ServicioEncomienda", servicio(id).codigo, "Retiro", DB.encomiendas.find((e) => e.id_encomienda === rel.id_encomienda).codigo); toast("Encomienda retirada del servicio"); render(); }
      break;
    }
    case "generar-man": generarManifiesto(id); break;
    case "imprimir": window.print(); break;
    case "toggle-veh": toggleRecurso("vehiculo", id); break;
    case "toggle-cond": toggleRecurso("conductor", id); break;
    case "toggle-ruta": toggleRuta(id); break;
    case "cancelar-serv": cancelarServicio(id); break;
    case "iniciar": cambiarEjecucion(id, "iniciar"); break;
    case "finalizar": cambiarEjecucion(id, "finalizar"); break;
  }
});

document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.dataset.filtro) { const [k, campo] = el.dataset.filtro.split("."); filtros[k][campo] = el.value; render(); return; }
  if (el.classList.contains("chk-enc")) {
    const n = $$(".chk-enc:checked").length;
    $("#selInfo").textContent = `${n} seleccionada(s)`;
    el.closest("tr").classList.toggle("selected", el.checked);
  }
});
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.dataset.filtro && el.type === "text" || (el.dataset.filtro && !el.type)) {
    clearTimeout(el._t);
    el._t = setTimeout(() => { const [k, c] = el.dataset.filtro.split("."); filtros[k][c] = el.value; const pos = el.selectionStart; render(); const n = $(`#${el.id}`); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }, 250);
  }
});

$("#menuBtn").onclick = () => { $("#sidebar").classList.add("open"); $("#overlay").classList.add("show"); };
$("#overlay").onclick = () => { $("#sidebar").classList.remove("open"); $("#overlay").classList.remove("show"); };
document.addEventListener("keydown", (e) => { if (e.key === "Escape") $("#modal").classList.remove("show"); });

window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
render();
