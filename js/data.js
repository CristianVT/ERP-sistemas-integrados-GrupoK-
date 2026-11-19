/* =========================================================================
   TransAndes ERP · Módulo K (Gestión de Transporte y Rutas)
   Datos simulados (mock). No se conectan a ninguna base de datos real.
   La estructura replica las entidades del modelo E-R del capítulo 9.2.
   ========================================================================= */

const DEMO_HOY = "2026-11-19"; // fecha de referencia de la demo

const DB = {
  /* ---------- Usuarios (provienen del Módulo J) ---------- */
  usuarios: [
    { id_usuario: 1, nombre: "Carla Mendoza Ruiz", iniciales: "CM", rol: "Administrador", sucursal: "Trujillo" },
    { id_usuario: 7, nombre: "Jorge Salazar Díaz", iniciales: "JS", rol: "Conductor", sucursal: "Trujillo", id_conductor: 1 },
    { id_usuario: 8, nombre: "Mario Castro Peña", iniciales: "MC", rol: "Conductor", sucursal: "Trujillo", id_conductor: 2 },
    { id_usuario: 9, nombre: "Rosa Villanueva Quispe", iniciales: "RV", rol: "Conductor", sucursal: "Trujillo", id_conductor: 3 },
    { id_usuario: 10, nombre: "Luis Alberto Ramos Chávez", iniciales: "LR", rol: "Conductor", sucursal: "Trujillo", id_conductor: 4 },
    { id_usuario: 11, nombre: "Pedro Gutiérrez León", iniciales: "PG", rol: "Conductor", sucursal: "Trujillo", id_conductor: 5 }
  ],

  /* ---------- Catálogos (RNF-K10: se amplían como datos) ---------- */
  sucursales: [
    { id_sucursal: 1, nombre: "Trujillo" },
    { id_sucursal: 2, nombre: "Lima" },
    { id_sucursal: 3, nombre: "Chiclayo" },
    { id_sucursal: 4, nombre: "Piura" },
    { id_sucursal: 5, nombre: "Cajamarca" },
    { id_sucursal: 6, nombre: "Chimbote" }
  ],
  tiposVehiculo: [
    { id_tipo_vehiculo: 1, nombre: "Bus de dos pisos", estado: "Activo" },
    { id_tipo_vehiculo: 2, nombre: "Bus de un piso", estado: "Activo" },
    { id_tipo_vehiculo: 3, nombre: "Camión furgón", estado: "Activo" },
    { id_tipo_vehiculo: 4, nombre: "Minivan", estado: "Activo" }
  ],
  categoriasLicencia: [
    { id_categoria_licencia: 1, codigo: "A-IIb", descripcion: "Vehículos de transporte de pasajeros menores" },
    { id_categoria_licencia: 2, codigo: "A-IIIa", descripcion: "Vehículos de transporte de pasajeros" },
    { id_categoria_licencia: 3, codigo: "A-IIIb", descripcion: "Vehículos de transporte de carga" },
    { id_categoria_licencia: 4, codigo: "A-IIIc", descripcion: "Todas las categorías de transporte" }
  ],
  estadosServicio: ["Programado", "En curso", "Finalizado", "Cancelado"],

  /* ---------- Vehículo ---------- */
  vehiculos: [
    { id_vehiculo: 1, placa: "ABC-123", id_tipo_vehiculo: 1, marca: "Mercedes-Benz", modelo: "Marcopolo G7", anio: 2022, capacidad_carga_kg: 1500, estado: "Activo", fecha_registro: "2025-03-10" },
    { id_vehiculo: 2, placa: "XYZ-908", id_tipo_vehiculo: 1, marca: "Volvo", modelo: "B8R", anio: 2021, capacidad_carga_kg: 1400, estado: "Activo", fecha_registro: "2025-03-10" },
    { id_vehiculo: 3, placa: "T4K-512", id_tipo_vehiculo: 2, marca: "Scania", modelo: "K410", anio: 2020, capacidad_carga_kg: 1200, estado: "Activo", fecha_registro: "2025-05-22" },
    { id_vehiculo: 4, placa: "C7M-301", id_tipo_vehiculo: 3, marca: "Hino", modelo: "Serie 500", anio: 2019, capacidad_carga_kg: 6000, estado: "Activo", fecha_registro: "2025-06-02" },
    { id_vehiculo: 5, placa: "B2H-774", id_tipo_vehiculo: 2, marca: "Mercedes-Benz", modelo: "O500", anio: 2018, capacidad_carga_kg: 1100, estado: "Inactivo", fecha_registro: "2024-11-14" },
    { id_vehiculo: 6, placa: "D9P-440", id_tipo_vehiculo: 4, marca: "Hyundai", modelo: "H350", anio: 2023, capacidad_carga_kg: 900, estado: "Activo", fecha_registro: "2026-01-18" }
  ],

  /* ---------- Conductor ---------- */
  conductores: [
    { id_conductor: 1, nombres: "Jorge", apellidos: "Salazar Díaz", documento_identidad: "45879123", numero_licencia: "Q45879123", id_categoria_licencia: 4, id_usuario: 7, estado: "Activo", fecha_registro: "2025-03-12" },
    { id_conductor: 2, nombres: "Mario", apellidos: "Castro Peña", documento_identidad: "41236587", numero_licencia: "Q41236587", id_categoria_licencia: 4, id_usuario: 8, estado: "Activo", fecha_registro: "2025-03-12" },
    { id_conductor: 3, nombres: "Rosa", apellidos: "Villanueva Quispe", documento_identidad: "47120398", numero_licencia: "Q47120398", id_categoria_licencia: 3, id_usuario: 9, estado: "Activo", fecha_registro: "2025-07-01" },
    { id_conductor: 4, nombres: "Luis Alberto", apellidos: "Ramos Chávez", documento_identidad: "40987654", numero_licencia: "Q40987654", id_categoria_licencia: 4, id_usuario: 10, estado: "Activo", fecha_registro: "2025-08-19" },
    { id_conductor: 5, nombres: "Pedro", apellidos: "Gutiérrez León", documento_identidad: "43561278", numero_licencia: "Q43561278", id_categoria_licencia: 3, id_usuario: 11, estado: "Inactivo", fecha_registro: "2024-12-03" }
  ],

  /* ---------- Ruta y ParadaRuta ---------- */
  rutas: [
    { id_ruta: 1, id_sucursal_origen: 1, id_sucursal_destino: 2, distancia_km: 561, tiempo_estimado_min: 540, estado: "Activa", fecha_registro: "2025-03-01" },
    { id_ruta: 2, id_sucursal_origen: 1, id_sucursal_destino: 3, distancia_km: 209, tiempo_estimado_min: 210, estado: "Activa", fecha_registro: "2025-03-01" },
    { id_ruta: 3, id_sucursal_origen: 2, id_sucursal_destino: 1, distancia_km: 561, tiempo_estimado_min: 540, estado: "Activa", fecha_registro: "2025-03-01" },
    { id_ruta: 4, id_sucursal_origen: 1, id_sucursal_destino: 4, distancia_km: 488, tiempo_estimado_min: 450, estado: "Activa", fecha_registro: "2025-04-15" },
    { id_ruta: 5, id_sucursal_origen: 1, id_sucursal_destino: 5, distancia_km: 296, tiempo_estimado_min: 360, estado: "Inactiva", fecha_registro: "2025-06-20" }
  ],
  paradas: [
    { id_parada: 1, id_ruta: 1, nombre_parada: "Chimbote", orden: 1 },
    { id_parada: 2, id_ruta: 1, nombre_parada: "Huarmey", orden: 2 },
    { id_parada: 3, id_ruta: 1, nombre_parada: "Barranca", orden: 3 },
    { id_parada: 4, id_ruta: 2, nombre_parada: "Paiján", orden: 1 },
    { id_parada: 5, id_ruta: 2, nombre_parada: "Pacasmayo", orden: 2 },
    { id_parada: 6, id_ruta: 3, nombre_parada: "Barranca", orden: 1 },
    { id_parada: 7, id_ruta: 3, nombre_parada: "Huarmey", orden: 2 },
    { id_parada: 8, id_ruta: 3, nombre_parada: "Chimbote", orden: 3 },
    { id_parada: 9, id_ruta: 4, nombre_parada: "Chiclayo", orden: 1 },
    { id_parada: 10, id_ruta: 4, nombre_parada: "Olmos", orden: 2 },
    { id_parada: 11, id_ruta: 5, nombre_parada: "Ciudad de Dios", orden: 1 },
    { id_parada: 12, id_ruta: 5, nombre_parada: "Chilete", orden: 2 }
  ],

  /* ---------- ServicioTransporte ---------- */
  servicios: [
    { id_servicio: 101, codigo: "SRV-2026-0101", id_ruta: 1, estado: "Programado", fecha_hora_salida: "2026-11-20T21:30", fecha_hora_llegada_estimada: "2026-11-21T06:30", fecha_hora_inicio_real: null, fecha_hora_fin_real: null, fecha_creacion: "2026-11-15T10:05" },
    { id_servicio: 102, codigo: "SRV-2026-0102", id_ruta: 1, estado: "Programado", fecha_hora_salida: "2026-11-20T23:00", fecha_hora_llegada_estimada: "2026-11-21T08:00", fecha_hora_inicio_real: null, fecha_hora_fin_real: null, fecha_creacion: "2026-11-15T10:20" },
    { id_servicio: 103, codigo: "SRV-2026-0103", id_ruta: 2, estado: "Programado", fecha_hora_salida: "2026-11-20T08:00", fecha_hora_llegada_estimada: "2026-11-20T11:30", fecha_hora_inicio_real: null, fecha_hora_fin_real: null, fecha_creacion: "2026-11-16T09:12" },
    { id_servicio: 104, codigo: "SRV-2026-0104", id_ruta: 3, estado: "Programado", fecha_hora_salida: "2026-11-21T22:00", fecha_hora_llegada_estimada: "2026-11-22T07:00", fecha_hora_inicio_real: null, fecha_hora_fin_real: null, fecha_creacion: "2026-11-18T16:40" },
    { id_servicio: 100, codigo: "SRV-2026-0100", id_ruta: 2, estado: "Programado", fecha_hora_salida: "2026-11-19T14:00", fecha_hora_llegada_estimada: "2026-11-19T17:30", fecha_hora_inicio_real: null, fecha_hora_fin_real: null, fecha_creacion: "2026-11-14T08:30" },
    { id_servicio: 98, codigo: "SRV-2026-0098", id_ruta: 4, estado: "En curso", fecha_hora_salida: "2026-11-19T06:00", fecha_hora_llegada_estimada: "2026-11-19T13:30", fecha_hora_inicio_real: "2026-11-19T06:07", fecha_hora_fin_real: null, fecha_creacion: "2026-11-12T11:00" },
    { id_servicio: 95, codigo: "SRV-2026-0095", id_ruta: 2, estado: "Finalizado", fecha_hora_salida: "2026-11-18T08:00", fecha_hora_llegada_estimada: "2026-11-18T11:30", fecha_hora_inicio_real: "2026-11-18T08:04", fecha_hora_fin_real: "2026-11-18T11:41", fecha_creacion: "2026-11-10T09:00" },
    { id_servicio: 94, codigo: "SRV-2026-0094", id_ruta: 1, estado: "Finalizado", fecha_hora_salida: "2026-11-17T21:30", fecha_hora_llegada_estimada: "2026-11-18T06:30", fecha_hora_inicio_real: "2026-11-17T21:36", fecha_hora_fin_real: "2026-11-18T06:52", fecha_creacion: "2026-11-09T15:30" },
    { id_servicio: 96, codigo: "SRV-2026-0096", id_ruta: 5, estado: "Cancelado", fecha_hora_salida: "2026-11-17T09:00", fecha_hora_llegada_estimada: "2026-11-17T15:00", fecha_hora_inicio_real: null, fecha_hora_fin_real: null, fecha_creacion: "2026-11-11T10:45" }
  ],

  /* ---------- AsignacionRecurso (historial, RF-K16) ---------- */
  asignaciones: [
    { id_asignacion: 1, id_servicio: 101, id_vehiculo: 2, id_conductor: 2, id_usuario: 1, fecha_hora_asignacion: "2026-11-15T10:12", fecha_hora_fin: "2026-11-16T09:40", motivo_cambio: "Asignación inicial", activo: false },
    { id_asignacion: 2, id_servicio: 101, id_vehiculo: 1, id_conductor: 1, id_usuario: 1, fecha_hora_asignacion: "2026-11-16T09:40", fecha_hora_fin: null, motivo_cambio: "Reemplazo: XYZ-908 pasa al servicio SRV-2026-0102", activo: true },
    { id_asignacion: 3, id_servicio: 102, id_vehiculo: 2, id_conductor: 2, id_usuario: 1, fecha_hora_asignacion: "2026-11-16T09:45", fecha_hora_fin: null, motivo_cambio: "Asignación inicial", activo: true },
    { id_asignacion: 4, id_servicio: 103, id_vehiculo: 3, id_conductor: 3, id_usuario: 1, fecha_hora_asignacion: "2026-11-16T09:20", fecha_hora_fin: null, motivo_cambio: "Asignación inicial", activo: true },
    { id_asignacion: 5, id_servicio: 100, id_vehiculo: 6, id_conductor: 1, id_usuario: 1, fecha_hora_asignacion: "2026-11-14T08:35", fecha_hora_fin: null, motivo_cambio: "Asignación inicial", activo: true },
    { id_asignacion: 6, id_servicio: 98, id_vehiculo: 4, id_conductor: 4, id_usuario: 1, fecha_hora_asignacion: "2026-11-12T11:10", fecha_hora_fin: null, motivo_cambio: "Asignación inicial", activo: true },
    { id_asignacion: 7, id_servicio: 95, id_vehiculo: 3, id_conductor: 3, id_usuario: 1, fecha_hora_asignacion: "2026-11-10T09:05", fecha_hora_fin: "2026-11-18T11:41", motivo_cambio: "Asignación inicial", activo: false },
    { id_asignacion: 8, id_servicio: 94, id_vehiculo: 1, id_conductor: 1, id_usuario: 1, fecha_hora_asignacion: "2026-11-09T15:35", fecha_hora_fin: "2026-11-18T06:52", motivo_cambio: "Asignación inicial", activo: false },
    { id_asignacion: 9, id_servicio: 96, id_vehiculo: 5, id_conductor: 5, id_usuario: 1, fecha_hora_asignacion: "2026-11-11T10:50", fecha_hora_fin: "2026-11-13T17:20", motivo_cambio: "Servicio cancelado: ruta desactivada", activo: false }
  ],

  /* ---------- Encomienda (registrada en el Módulo J; K solo la referencia) ---------- */
  encomiendas: [
    { id_encomienda: 1001, codigo: "ENC-2026-1001", origen: 1, destino: 2, peso_kg: 12.5, bultos: 2, remitente: "Valeria Mendoza Ruiz" },
    { id_encomienda: 1002, codigo: "ENC-2026-1002", origen: 1, destino: 3, peso_kg: 6.8, bultos: 1, remitente: "Comercial Andina SAC" },
    { id_encomienda: 1003, codigo: "ENC-2026-1003", origen: 2, destino: 1, peso_kg: 3.4, bultos: 1, remitente: "Diego Torres Vega" },
    { id_encomienda: 1004, codigo: "ENC-2026-1004", origen: 1, destino: 4, peso_kg: 18.0, bultos: 3, remitente: "Agroexport Norte SAC" },
    { id_encomienda: 1005, codigo: "ENC-2026-1005", origen: 1, destino: 2, peso_kg: 8.2, bultos: 1, remitente: "Lucía Campos Rojas" },
    { id_encomienda: 1006, codigo: "ENC-2026-1006", origen: 1, destino: 2, peso_kg: 25.0, bultos: 3, remitente: "Textiles La Libertad EIRL" },
    { id_encomienda: 1007, codigo: "ENC-2026-1007", origen: 1, destino: 3, peso_kg: 4.1, bultos: 1, remitente: "Renato Flores Vega" },
    { id_encomienda: 1008, codigo: "ENC-2026-1008", origen: 1, destino: 2, peso_kg: 3.0, bultos: 1, remitente: "Ana Lucía Paredes" },
    { id_encomienda: 1009, codigo: "ENC-2026-1009", origen: 1, destino: 2, peso_kg: 14.6, bultos: 2, remitente: "Distribuidora Moche SAC" },
    { id_encomienda: 1010, codigo: "ENC-2026-1010", origen: 1, destino: 3, peso_kg: 9.9, bultos: 2, remitente: "Comercial Andina SAC" }
  ],

  /* ---------- ServicioEncomienda (solo la relación, RF-K19) ---------- */
  servicioEncomienda: [
    { id_servicio: 101, id_encomienda: 1001, id_usuario: 1, fecha_hora_asignacion: "2026-11-18T17:02", activo: true },
    { id_servicio: 101, id_encomienda: 1009, id_usuario: 1, fecha_hora_asignacion: "2026-11-18T17:02", activo: true },
    { id_servicio: 98, id_encomienda: 1004, id_usuario: 1, fecha_hora_asignacion: "2026-11-18T18:30", activo: true },
    { id_servicio: 100, id_encomienda: 1007, id_usuario: 1, fecha_hora_asignacion: "2026-11-18T19:05", activo: true },
    { id_servicio: 103, id_encomienda: 1002, id_usuario: 1, fecha_hora_asignacion: "2026-11-18T19:10", activo: true }
  ],

  /* ---------- ManifiestoCarga ---------- */
  manifiestos: [
    { id_manifiesto: 1, id_servicio: 98, id_usuario: 1, fecha_hora_generacion: "2026-11-19T05:40", ruta_archivo: "manifiestos/MC-2026-0098.pdf" },
    { id_manifiesto: 2, id_servicio: 95, id_usuario: 1, fecha_hora_generacion: "2026-11-18T07:30", ruta_archivo: "manifiestos/MC-2026-0095.pdf" }
  ],

  /* ---------- BitacoraTransporte (RNF-K06) ---------- */
  bitacora: [
    { id_bitacora: 1, id_usuario: 1, tipo_entidad: "ServicioTransporte", id_registro: "SRV-2026-0104", tipo_operacion: "Creación", fecha_hora: "2026-11-18T16:40", detalle: "Servicio Lima → Trujillo programado para 21/11 22:00" },
    { id_bitacora: 2, id_usuario: 1, tipo_entidad: "ServicioEncomienda", id_registro: "SRV-2026-0103", tipo_operacion: "Asignación", fecha_hora: "2026-11-18T19:10", detalle: "1 encomienda asignada (ENC-2026-1002)" },
    { id_bitacora: 3, id_usuario: 7, tipo_entidad: "ServicioTransporte", id_registro: "SRV-2026-0095", tipo_operacion: "Finalización", fecha_hora: "2026-11-18T11:41", detalle: "Servicio finalizado por el conductor" },
    { id_bitacora: 4, id_usuario: 1, tipo_entidad: "Vehiculo", id_registro: "B2H-774", tipo_operacion: "Inactivación", fecha_hora: "2026-11-13T17:15", detalle: "Vehículo retirado por mantenimiento preventivo" },
    { id_bitacora: 5, id_usuario: 1, tipo_entidad: "ServicioTransporte", id_registro: "SRV-2026-0096", tipo_operacion: "Cancelación", fecha_hora: "2026-11-13T17:20", detalle: "Motivo: ruta Trujillo → Cajamarca desactivada" },
    { id_bitacora: 6, id_usuario: 1, tipo_entidad: "AsignacionRecurso", id_registro: "SRV-2026-0101", tipo_operacion: "Reasignación", fecha_hora: "2026-11-16T09:40", detalle: "XYZ-908 / M. Castro → ABC-123 / J. Salazar" },
    { id_bitacora: 7, id_usuario: 10, tipo_entidad: "ServicioTransporte", id_registro: "SRV-2026-0098", tipo_operacion: "Inicio", fecha_hora: "2026-11-19T06:07", detalle: "Servicio iniciado por el conductor" }
  ]
};
