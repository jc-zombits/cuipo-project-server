const express = require("express");
const router = express.Router();
const authenticate = require('../middleware/auth')
const { 
    uploadExcel, 
    listTables, 
    getTableData, 
    obtenerDatosCPC, 
    obtenerPlantillaDistrito, 
    actualizarPlantillaDistrito,
    obtenerProductosPorProyecto } = require("../controllers/cuipoController");

// Subir archivo Excel
router.post("/upload", authenticate, uploadExcel);

// Listar tablas del esquema
router.get("/tables", authenticate, listTables);

// Ver datos de una tabla específica
router.get("/tables/:tableName", authenticate, getTableData);

// Obtener los datos de la tabla CPC
router.get('/cpc', authenticate, obtenerDatosCPC);

// Obtener los datos de la tabla principal
router.get('/tables/plantilla-principal', authenticate, obtenerPlantillaDistrito);

// Guardar los datos de la plantilla principal
router.post('/plantilla-principal/actualizar', authenticate, actualizarPlantillaDistrito);

// Obtener productos por proyecto
router.get('/productos_por_proyecto/:codigo_sap', authenticate, obtenerProductosPorProyecto);

module.exports = router;