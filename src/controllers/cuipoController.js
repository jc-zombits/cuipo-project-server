const multer = require("multer");
const path = require("path");
const XLSX = require("xlsx");
const fs = require("fs");
const { pool } = require("../db");

// Configuración de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    if (ext !== ".xlsx" && ext !== ".xlsm") {
      return cb(new Error("Solo se permiten archivos Excel (.xlsx, .xlsm)"));
    }
    cb(null, true);
  },
}).single("file");

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

// Controlador para subir y procesar el archivo Excel
async function uploadExcel(req, res) {
  upload(req, res, async function (err) {
    if (err) return res.status(400).json({ error: err.message });

    if (!req.file) return res.status(400).json({ error: "Archivo no recibido" });

    try {
      const filePath = req.file.path;
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });

      if (worksheet.length === 0) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ error: "El archivo está vacío" });
      }

      const tableName = normalizeName(path.parse(req.file.originalname).name);
      const rawHeaders = Object.keys(worksheet[0]);
      const normalizedHeaders = rawHeaders.map(normalizeName);

      // Construir la sentencia CREATE TABLE con campo ID
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS ${process.env.DB_SCHEMA}."${tableName}" (
          id SERIAL PRIMARY KEY,
          ${normalizedHeaders.map(h => `"${h}" TEXT`).join(", ")}
        );
      `;

      await pool.query(createTableQuery);

      // Insertar los datos (sin incluir el campo id)
      for (let row of worksheet) {
        const values = rawHeaders.map(h => row[h] ?? "").map(val => val.toString().trim());
        const isEmptyRow = values.every(v => v === "");

        if (isEmptyRow) continue; // Salta filas vacías

        const insertQuery = `
          INSERT INTO ${process.env.DB_SCHEMA}."${tableName}" (${normalizedHeaders.map(h => `"${h}"`).join(", ")})
          VALUES (${normalizedHeaders.map((_, i) => `$${i + 1}`).join(", ")});
        `;
        await pool.query(insertQuery, values);
      }

      // Mostrar primeras 10 filas
      const previewQuery = `SELECT * FROM ${process.env.DB_SCHEMA}."${tableName}" LIMIT 10;`;
      const preview = await pool.query(previewQuery);

      // Eliminar archivo temporal
      fs.unlinkSync(filePath);

      return res.status(200).json({
        message: `Archivo ${req.file.originalname} subido correctamente`,
        table: tableName,
        preview: preview.rows,
      });
    } catch (e) {
      console.error("❌ Error al procesar el archivo:", e.message);
      return res.status(500).json({ error: "Error al procesar el archivo" });
    }
  });
}

// Controlador para listar todas las tablas en el esquema sis_cuipo
async function listTables(req, res) {
  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
        AND table_type = 'BASE TABLE';
    `, [process.env.DB_SCHEMA]);

    const tables = result.rows.map(row => row.table_name);

    return res.status(200).json({ tables });
  } catch (error) {
    console.error("❌ Error al listar tablas:", error.message);
    return res.status(500).json({ error: "Error al obtener las tablas" });
  }
}

// Controlador para obtener los datos de una tabla específica
async function getTableData(req, res) {
  const { tableName } = req.params;

  if (!tableName) {
    return res.status(400).json({ error: "Nombre de tabla no proporcionado" });
  }

  try {
    const result = await pool.query(`
      SELECT * FROM ${process.env.DB_SCHEMA}."${tableName}" LIMIT 100;
    `);

    return res.status(200).json({ rows: result.rows });
  } catch (error) {
    console.error("❌ Error al obtener datos de la tabla:", error.message);
    return res.status(500).json({ error: "Error al obtener los datos de la tabla" });
  }
}

// Obtener los datos de la tabla CPC
async function obtenerDatosCPC(req, res) {
  try {
    const { tiene_cpc } = req.query;

    if (!tiene_cpc) {
      // Si no se pasa el parámetro, retorna todo (comportamiento original)
      const result = await pool.query(`
        SELECT codigo, clase_o_subclase
        FROM sis_cuipo.cpc
        WHERE codigo IS NOT NULL AND clase_o_subclase IS NOT NULL
      `);

      const datos = result.rows.map(row => ({
        codigo: row.codigo,
        clase_o_subclase: row.clase_o_subclase,
        codigo_clase_o_subclase: `${row.codigo} - ${row.clase_o_subclase}`,
      }));

      return res.json(datos);
    }

    // Extraer último dígito del tiene_cpc
    const ultimoDigito = tiene_cpc.toString().slice(-1);

    const result = await pool.query(`
      SELECT codigo, clase_o_subclase
      FROM sis_cuipo.cpc
      WHERE codigo IS NOT NULL
        AND clase_o_subclase IS NOT NULL
        AND LEFT(codigo, 1) = $1
    `, [ultimoDigito]);

    const datosFiltrados = result.rows.map(row => ({
      codigo: row.codigo,
      clase_o_subclase: row.clase_o_subclase,
      codigo_clase_o_subclase: `${row.codigo} - ${row.clase_o_subclase}`,
    }));

    res.json(datosFiltrados);
  } catch (error) {
    console.error('Error al obtener datos del CPC:', error);
    res.status(500).json({ error: 'Error al obtener datos del CPC' });
  }
}

// Obtener los datos de la plantilla principal
async function obtenerPlantillaDistrito(req, res) {
  try {
    const result = await pool.query(`
      SELECT *
      FROM sis_cuipo.cuipo_plantilla_distrito_2025_primer_trimestre_plan_b
    `);
    res.json({ rows: result.rows });
  } catch (error) {
    console.error('Error al obtener plantilla distrito:', error);
    res.status(500).json({ error: 'Error al obtener plantilla distrito' });
  }
}

// Guardar los datos de la plantilla principal
async function actualizarPlantillaDistrito(req, res) {
  const updatedRows = req.body.rows;

  try {
    for (const row of updatedRows) {
      await pool.query(`
        UPDATE sis_cuipo.cuipo_plantilla_distrito_2025_primer_trimestre_plan_b
        SET codigo_y_nombre_del_cpc = $1,
            validador_cpc = $2,
            cpc_cuipo = $3
        WHERE id = $4
      `, [row.codigo_y_nombre_del_cpc, row.validador_cpc, row.cpc_cuipo, row.id]);
    }

    res.json({ message: 'Actualización exitosa' });
  } catch (error) {
    console.error('Error al actualizar plantilla:', error);
    res.status(500).json({ error: 'Error al actualizar plantilla' });
  }
}

// Obtener productos por código_sap (para el campo proyecto)
async function obtenerProductosPorProyecto(req, res) {
  let proyecto = req.params.codigo_sap?.trim();

  if (!proyecto) {
    return res.status(400).json({ error: 'El parámetro proyecto es requerido' });
  }

  try {
    console.log('Consulta con código SAP:', proyecto);

    const result = await pool.query(
      `SELECT cod_pdto_y_nombre 
       FROM sis_cuipo.productos_por_proyecto 
       WHERE codigo_sap = $1`,
      [proyecto]
    );

    if (result.rows.length === 0) {
      console.log('Sin resultados para:', proyecto);
      return res.status(200).json([]);
    }

    const productos = result.rows.map(row => ({
      label: row.cod_pdto_y_nombre,
      value: row.cod_pdto_y_nombre
    }));

    return res.json(productos);

  } catch (error) {
    console.error('Error en consulta SQL:', {
      error: error.message,
      proyecto: proyecto,
    });
    return res.status(500).json({ 
      error: 'Error en base de datos',
      detalle: error.message 
    });
  }
}

// controlador para las graficas
async function obtenerEstadisticasPresupuesto(req, res) {
  try {
    const resultado = await pool.query(`
      SELECT 
        nombre,
        fondo,
        proyecto_,
        posicion_presupuestaria,
        SUM(COALESCE(NULLIF(ppto_inicial, '')::numeric, 0)) AS ppto_inicial,
        SUM(COALESCE(NULLIF(total_ppto_actual, '')::numeric, 0)) AS total_ppto_actual
      FROM sis_cuipo.base_de_ejecucion_presupuestal_31032025
      GROUP BY nombre, fondo, proyecto_, posicion_presupuestaria
      ORDER BY proyecto_, posicion_presupuestaria;
    `);

    res.json({ data: resultado.rows });
  } catch (error) {
    console.error('❌ Error al obtener estadísticas de presupuesto:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas de presupuesto' });
  }
}

// Controlador detalle proyecto
async function obtenerDetalleProyecto(req, res) {
  const { proyecto } = req.query;

  try {
    const values = [];
    let whereClause = '';

    if (proyecto) {
      whereClause = 'WHERE proyecto_ = $1';
      values.push(proyecto);
    }

    const query = `
      SELECT 
        proyecto_,
        SUM(COALESCE(NULLIF(total_ppto_actual, '')::numeric, 0)) AS total_ppto_actual,
        SUM(COALESCE(NULLIF(disponibilidad, '')::numeric, 0)) AS disponibilidad,
        SUM(COALESCE(NULLIF(pagos, '')::numeric, 0)) AS pagos,
        SUM(COALESCE(NULLIF(disponible_neto, '')::numeric, 0)) AS disponible_neto
      FROM sis_cuipo.base_de_ejecucion_presupuestal_31032025
      ${whereClause}
      GROUP BY proyecto_
      ORDER BY proyecto_;
    `;

    const resultado = await pool.query(query, values);

    res.json({ data: resultado.rows });
  } catch (error) {
    console.error('❌ Error al obtener detalle de proyecto:', error);
    res.status(500).json({ message: 'Error al obtener detalle de proyecto' });
  }
}

// controllers/secretariaController.js

async function obtenerProyectosPorSecretaria(req, res) {
  try {
    // Consulta para obtener el conteo de proyectos por secretaría
    const queryProyectos = `
      SELECT 
        secretaria,
        COUNT(DISTINCT proyecto_) AS total_proyectos,
        SUM(COALESCE(NULLIF(ppto_inicial, '')::numeric, 0)) AS ppto_inicial_total,
        SUM(COALESCE(NULLIF(disponible_neto, '')::numeric, 0)) AS disponible_neto_total,
        AVG(COALESCE(NULLIF(_ejecucion, '')::numeric, 0)) AS ejecucion_promedio
      FROM sis_cuipo.cuipo_plantilla_distrito_2025_primer_trimestre_plan_b
      GROUP BY secretaria
      ORDER BY secretaria;
    `;

    // Consulta para obtener detalles por secretaría (cuando se filtra)
    const queryDetalles = `
      SELECT 
        proyecto_,
        SUM(COALESCE(NULLIF(ppto_inicial, '')::numeric, 0)) AS ppto_inicial,
        SUM(COALESCE(NULLIF(disponible_neto, '')::numeric, 0)) AS disponible_neto,
        AVG(COALESCE(NULLIF(_ejecucion, '')::numeric, 0)) AS ejecucion_porcentaje
      FROM sis_cuipo.cuipo_plantilla_distrito_2025_primer_trimestre_plan_b
      WHERE secretaria = $1
      GROUP BY proyecto_
      ORDER BY proyecto_;
    `;

    const { secretaria } = req.query;

    if (secretaria) {
      // Si hay filtro por secretaría, devolver los detalles
      const resultado = await pool.query(queryDetalles, [secretaria]);
      res.json({
        tipo: 'detalle',
        data: resultado.rows
      });
    } else {
      // Sin filtro, devolver el resumen por secretarías
      const resultado = await pool.query(queryProyectos);
      res.json({
        tipo: 'resumen',
        data: resultado.rows
      });
    }

  } catch (error) {
    console.error('Error al obtener datos por secretaría:', error);
    res.status(500).json({ message: 'Error al obtener datos por secretaría' });
  }
}

module.exports = {
  uploadExcel,
  listTables,
  getTableData,
  obtenerDatosCPC,
  obtenerPlantillaDistrito,
  actualizarPlantillaDistrito,
  obtenerProductosPorProyecto,
  obtenerEstadisticasPresupuesto,
  obtenerDetalleProyecto,
  obtenerProyectosPorSecretaria
}