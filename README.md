# TransAndes ERP · Módulo K — Gestión de Transporte y Rutas

Prototipo de alta fidelidad (HTML5 + CSS3 + JavaScript ES6) del **Módulo K (Grupo K)** del
Sistema de Gestión de Transporte y Encomiendas con IA (J-I-K). Implementa los diagramas IFML
D-K01 a D-K04 del capítulo 11 y las interfaces adicionales D-K05 a D-K07.

**Todos los datos son simulados (mock).** No se conecta a ninguna base de datos.

## Cómo ejecutarlo

Hay una página por perfil (doble clic para abrir, no requiere instalación):

- **`admin.html`** → Administrador (Carla Mendoza Ruiz): todas las funciones del módulo.
- **`conductor.html`** → Conductor (Jorge Salazar Díaz): «Mis servicios» y «Mis datos» (RNF-K03).

Para verlo en móvil: DevTools (F12) → modo dispositivo, o publicarlo con GitHub Pages.

## Guion sugerido para la demo (≈ 3 min)

1. Inicio → alerta de `SRV-2026-0104` sin recursos → **Asignar recursos**.
2. En `Servicios` → `SRV-2026-0102` → **Planificar** → elegir `ABC-123` → error por **cruce de horario** (RNF-K05).
3. `SRV-2026-0101` → Encomiendas → marcar 2 → **Asignar** → Manifiesto → **Generar** (RF-K18/K19).
4. `Vehículos` → `ABC-123` → **Inactivar** → bloqueado por servicios vigentes (RNF-K04).
5. `Rutas` → `Trujillo → Lima` → **Editar ruta y paradas** (subir/bajar paradas).
6. `Nuevo servicio` → la llegada estimada se calcula sola y los recursos ocupados se deshabilitan.
7. Abrir **`conductor.html`** → `SRV-2026-0100` → **Iniciar servicio** (RF-K20).
8. En `admin.html` → `Bitácora de transporte` → se ven los registros de la sesión (RNF-K06).

> Los datos son simulados y viven en memoria de cada página: lo que haga el conductor no aparece en la página del administrador (no hay base de datos).

## Estructura

```
modulo-k/
├── admin.html        Interfaz del Administrador
├── conductor.html    Interfaz del Conductor
├── css/styles.css    Estilos y diseño responsive (≤ 860 px = móvil)
├── js/data.js        Datos mock con la estructura del modelo E-R (cap. 9.2)
├── js/app.js         Enrutador, pantallas, validaciones y lógica de interfaz
└── capturas/         Capturas de escritorio y móvil usadas en el documento (Fig. 12.27–12.52)
```

## Pantallas por IFML

| IFML | Ruta | Pantallas |
|---|---|---|
| D-K01 | `#/servicios`, `#/servicio/:id/asignar`, `/encomiendas`, `/manifiesto` | Listado con búsqueda avanzada, asignación de recursos, encomiendas, manifiesto |
| D-K02 | `#/vehiculos`, `#/conductores`, `#/vehiculo/:id`, `#/vehiculo/nuevo`, … | Listado con disponibilidad, ficha, registro, edición, activar/inactivar |
| D-K03 | `#/rutas`, `#/ruta/:id`, `#/ruta/nueva`, `#/ruta/:id/paradas` | Catálogo, detalle con recorrido, registro, paradas |
| D-K04 | `#/servicio-nuevo`, `#/servicio/:id`, `#/historial` | Creación, detalle/modificación, control de ejecución, cancelación, historial |
| D-K05 | `#/inicio` | Inicio del Administrador |
| D-K06 | `#/mis-servicios`, `#/mis-datos` | Vista del Conductor |
| D-K07 | `#/bitacora` | Bitácora de transporte |
