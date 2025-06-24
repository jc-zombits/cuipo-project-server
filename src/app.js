const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { testDBConnection } = require("./db");
const cuipoRoutes = require("./routes/cuipoRoutes");

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3005',
      'http://10.125.8.55:3005', // tu IP en red
    ];
    // Permitir solicitudes sin "origin" (como Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());

app.use("/api/v1/cuipo", cuipoRoutes);

app.get("/", (req, res) => {
  res.send("✅ Servidor CUIPO corriendo correctamente");
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
  await testDBConnection();
});
