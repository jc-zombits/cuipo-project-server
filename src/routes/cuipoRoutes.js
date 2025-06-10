const express = require("express");
const router = express.Router();
const { 
    uploadExcel, 
    listTables, 
    getTableData, 
    obtenerDatosCPC, 
    obtenerPlantillaDistrito, 
    actualizarPlantillaDistrito } = require("../controllers/cuipoController");

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

module.exports = router;