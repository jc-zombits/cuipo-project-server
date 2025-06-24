const express = require("express");
const router = express.Router();
const { 
    uploadExcel, 
    listTables, 
    getTableData, 
    obtenerDatosCPC, 
    obtenerPlantillaDistrito, 
    actualizarPlantillaDistrito,
    obtenerProductosPorProyecto,
    obtenerEstadisticasPresupuesto,
    obtenerDetalleProyecto,
    obtenerProyectosPorSecretaria } = require("../controllers/cuipoController");

// Subir archivo Excel
router.post("/upload", uploadExcel);

// Listar tablas del esquema
router.get("/tables", listTables);

// Ver datos de una tabla específica
router.get("/tables/:tableName", getTableData);

// Obtener los datos de la tabla CPC
router.get('/cpc', obtenerDatosCPC);

// Obtener los datos de la tabla principal
router.get('/tables/plantilla-principal', obtenerPlantillaDistrito);

// Guardar los datos de la plantilla principal
router.post('/plantilla-principal/actualizar', actualizarPlantillaDistrito);

// Obtener productos por proyecto
router.get('/productos_por_proyecto/:codigo_sap', obtenerProductosPorProyecto);

// Obtener el presupuesto para las graficas
router.get('/estadisticas/plan_distrito', obtenerEstadisticasPresupuesto);

// Obtener estadisticas detalle proyecto
router.get('/estadisticas/detalle_proyecto', obtenerDetalleProyecto);

// Estadisticas por secretarias
router.get('/estadisticas/secretarias', obtenerProyectosPorSecretaria);

module.exports = router;