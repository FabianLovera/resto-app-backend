const express = require("express");
const cors = require("cors");

const catalogoRoutes = require("./routes/catalogo.routes");
const pedidosRoutes = require("./routes/pedidos.routes");
const menuRoutes = require("./routes/menu.routes");

const app = express();

// CORS - Permitir frontend
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://tu-frontend.vercel.app' // Esto lo actualizamos después
  ],
  credentials: true
}));

app.use(express.json());

// Rutas
app.use("/api", catalogoRoutes);
app.use("/api", pedidosRoutes);
app.use("/api", menuRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ 
    ok: true, 
    mensaje: "API Restaurante funcionando",
    version: "1.0.0"
  });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, mensaje: "API Restaurante funcionando" });
});

module.exports = app;
