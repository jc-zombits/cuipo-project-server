// src/app.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { testDBConnection } = require("./db");
const cuipoRoutes = require("./routes/cuipoRoutes");

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors({
  origin: 'http://localhost:3005',
  credentials: true,
  //methods: ['GET', 'POST', 'PUT'],
  //allowedHeaders: ['Content-Type']
}));
app.use(express.json());

app.use("/api/v1/cuipo", cuipoRoutes);

app.get("/", (req, res) => {
  res.send("✅ Servidor CUIPO corriendo correctamente");
});

app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  await testDBConnection();
});
