// src/app.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { testDBConnection } = require("./db");
const cuipoRoutes = require("./routes/cuipoRoutes");

const app = express();
const PORT = process.env.PORT || 5005;

// Configuración mejorada de CORS
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3005',
      process.env.FRONTEND_URL // Agrega tu URL de producción aquí
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origen no permitido por CORS'));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  maxAge: 86400 // Cache de opciones CORS por 24 horas
};

app.use(cors(corsOptions));

// Manejo explícito de errores CORS
app.use((err, req, res, next) => {
  if (err.message === 'Origen no permitido por CORS') {
    return res.status(403).json({ 
      error: 'Acceso prohibido',
      details: 'El dominio de origen no está autorizado'
    });
  }
  next(err);
});

app.use(express.json());

app.use("/api/v1/cuipo", cuipoRoutes);

app.get("/", (req, res) => {
  res.send("✅ Servidor CUIPO corriendo correctamente");
});

app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  await testDBConnection();
});