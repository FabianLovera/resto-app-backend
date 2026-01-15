const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /api/clientes
router.get("/clientes", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id_cliente, nombre_cliente, apellido_cliente, numero_telefono FROM clientes ORDER BY id_cliente DESC"
    );
    res.json({ ok: true, clientes: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/clientes
router.post("/clientes", async (req, res) => {
  try {
    const { nombre_cliente, apellido_cliente, numero_telefono } = req.body;

    if (!nombre_cliente || !apellido_cliente || !numero_telefono) {
      return res.status(400).json({ ok: false, error: "Faltan datos del cliente" });
    }

    const [r] = await db.query(
      `INSERT INTO clientes (nombre_cliente, apellido_cliente, numero_telefono)
       VALUES (?, ?, ?)`,
      [nombre_cliente, apellido_cliente, numero_telefono]
    );

    res.json({ ok: true, id_cliente: r.insertId });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/platos
router.get("/platos", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id_plato, nombre_plato, precio_plato FROM platos ORDER BY nombre_plato"
    );
    res.json({ ok: true, platos: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/usuarios (para seleccionar el usuario que registra)
router.get("/usuarios", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id_usuario, nombre_usuario FROM usuarios ORDER BY nombre_usuario"
    );
    res.json({ ok: true, usuarios: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});


module.exports = router;
