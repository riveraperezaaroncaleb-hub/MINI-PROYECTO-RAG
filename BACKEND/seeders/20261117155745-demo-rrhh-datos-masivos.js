'use strict';

const NOMBRES = [
  'Ana', 'Carlos', 'María', 'Luis', 'Laura', 'Javier', 'Marta', 'Diego',
  'Elena', 'Pablo', 'Lucía', 'Miguel', 'Sara', 'Andrés', 'Paula', 'Jorge',
  'Carmen', 'Álvaro', 'Isabel', 'Daniel', 'Natalia', 'Rubén', 'Patricia',
  'Sergio', 'Cristina', 'Fernando'
];

const APELLIDOS = [
  'García', 'Martínez', 'López', 'González', 'Rodríguez', 'Fernández',
  'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez',
  'Díaz', 'Reyes', 'Morales', 'Cruz', 'Ortiz', 'Vega', 'Rojas', 'Medina',
  'Aguilar', 'Herrera', 'Cabrera', 'Moreno', 'Jiménez'
];

const DEPARTAMENTOS = [
  'Ingeniería', 'Finanzas', 'Marketing', 'Operaciones', 'Soporte',
  'Legal', 'Producto', 'Ventas', 'Calidad', 'Logística'
];

const PUESTOS = {
  Ingeniería: ['Desarrollador', 'DevOps', 'QA Engineer', 'Arquitecto'],
  Finanzas: ['Analista financiero', 'Contador', 'Tesorero'],
  Marketing: ['Especialista en marketing', 'Diseñador', 'Community manager'],
  Operaciones: ['Coordinador de operaciones', 'Analista de procesos'],
  Soporte: ['Técnico de soporte', 'Especialista en ayuda'],
  Legal: ['Abogado', 'Asistente legal'],
  Producto: ['Product owner', 'Analista de producto', 'UX researcher'],
  Ventas: ['Ejecutivo de ventas', 'Account manager'],
  Calidad: ['Inspector de calidad', 'Analista de calidad'],
  Logística: ['Coordinador logístico', 'Almacenista']
};

const TIPOS_SOLICITUD = ['Vacaciones', 'Permiso'];
const ESTADOS = ['Aprobada', 'Pendiente', 'Rechazada'];
const TIPOS_INCAPACIDAD = ['Enfermedad', 'Accidente', 'Control médico', 'Maternidad'];
const ENTIDADES = ['EPS Sur', 'ARL Andes', 'Seguro Futura', 'IPS Central'];

const TOTAL_COLABORADORES = 50;
const TOTAL_RRHH = 2;
const PERIODO = String(new Date().getFullYear());

let semilla = 20261117;

function aleatorio() {
  semilla = (Math.imul(semilla, 1664525) + 1013904223) >>> 0;
  return semilla / 4294967296;
}

function entero(min, max) {
  return min + Math.floor(aleatorio() * (max - min + 1));
}

function elemento(lista) {
  return lista[entero(0, lista.length - 1)];
}

function fechaHaceDias(dias) {
  const fecha = new Date();
  fecha.setUTCHours(0, 0, 0, 0);
  fecha.setUTCDate(fecha.getUTCDate() - dias);
  return fecha.toISOString().slice(0, 10);
}

function marcaTiempoHaceDias(dias) {
  return new Date(Date.now() - dias * 86400000).toISOString();
}

function construirUsuarios() {
  const usuarios = [];
  const total = TOTAL_COLABORADORES + TOTAL_RRHH;

  for (let id = 1; id <= total; id += 1) {
    const indice = id - 1;
    const esRrhh = id <= TOTAL_RRHH;
    const departamento = esRrhh
      ? 'Recursos Humanos'
      : DEPARTAMENTOS[indice % DEPARTAMENTOS.length];
    const fechaIngreso = fechaHaceDias(entero(30, 1825));

    usuarios.push({
      id,
      nombre: `${NOMBRES[indice % NOMBRES.length]} ${APELLIDOS[Math.floor(indice / NOMBRES.length)]}`,
      edad: entero(23, 60),
      departamento,
      puesto: esRrhh ? 'Analista de RRHH' : elemento(PUESTOS[departamento]),
      fecha_ingreso: fechaIngreso,
      jefe_id: esRrhh ? null : (indice % 2 === 0 ? 1 : 2),
      rol: esRrhh ? 'RRHH' : 'colaborador',
      createdAt: `${fechaIngreso}T00:00:00.000Z`,
      updatedAt: new Date().toISOString()
    });
  }

  return usuarios;
}

function construirSaldos(usuarios) {
  return usuarios.map((usuario, indice) => {
    const diasTomados = entero(0, 10);

    return {
      id: indice + 1,
      colaborador_id: usuario.id,
      periodo: PERIODO,
      dias_asignados: 15,
      dias_tomados: diasTomados,
      dias_disponibles: 15 - diasTomados
    };
  });
}

function construirSolicitudes(usuarios) {
  const solicitudes = [];
  let id = 1;

  for (const usuario of usuarios.filter((item) => item.rol === 'colaborador')) {
    const cantidad = entero(1, 2);

    for (let indice = 0; indice < cantidad; indice += 1) {
      const inicio = entero(1, 90);
      const fin = Math.max(0, inicio - entero(1, 5));
      const estado = elemento(ESTADOS);

      solicitudes.push({
        id: id += 1,
        colaborador_id: usuario.id,
        tipo: elemento(TIPOS_SOLICITUD),
        fecha_inicio: fechaHaceDias(inicio),
        fecha_fin: fechaHaceDias(fin),
        estado,
        aprobador_id: estado === 'Pendiente' ? null : entero(1, TOTAL_RRHH),
        creada_en: marcaTiempoHaceDias(inicio + entero(0, 3))
      });
    }
  }

  return solicitudes;
}

function construirIncapacidades(usuarios) {
  return usuarios
    .filter((item) => item.rol === 'colaborador')
    .filter((_item, indice) => indice % 5 === 0)
    .map((usuario, indice) => ({
      id: indice + 1,
      colaborador_id: usuario.id,
      tipo: elemento(TIPOS_INCAPACIDAD),
      fecha_inicio: fechaHaceDias(entero(1, 90)),
      dias: entero(1, 15),
      entidad: elemento(ENTIDADES)
    }));
}

function construirMovimientos(usuarios) {
  return usuarios.map((usuario, indice) => ({
    id: indice + 1,
    colaborador_id: usuario.id,
    tipo: 'Alta',
    fecha: usuario.fecha_ingreso,
    motivo: `Ingreso de ${usuario.nombre} al área de ${usuario.departamento}.`
  }));
}

module.exports = {
  async up(queryInterface) {
    const usuarios = construirUsuarios();

    const datos = [
      ['Usuarios', usuarios],
      ['saldos_vacaciones', construirSaldos(usuarios)],
      ['solicitudes', construirSolicitudes(usuarios)],
      ['incapacidades', construirIncapacidades(usuarios)],
      ['movimientos_personal', construirMovimientos(usuarios)]
    ];

    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const [tabla, registros] of datos) {
        await queryInterface.bulkInsert(tabla, registros, {
          transaction,
          ignoreDuplicates: true
        });
      }
    });
  },

  async down(queryInterface) {
    const tablas = [
      'solicitudes',
      'incapacidades',
      'saldos_vacaciones',
      'movimientos_personal',
      'Usuarios'
    ];

    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const tabla of tablas) {
        await queryInterface.bulkDelete(tabla, null, { transaction });
      }
    });
  }
};
