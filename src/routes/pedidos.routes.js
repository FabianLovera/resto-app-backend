const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * POST /api/pedidos
 */
router.post("/pedidos", async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id_cliente, id_usuario, delivery, items } = req.body;

    if (!id_cliente || !id_usuario || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, error: "Datos incompletos para el pedido" });
    }

    for (const it of items) {
      if (!it.id_plato || !it.cantidad || it.cantidad <= 0) {
        return res.status(400).json({ ok: false, error: "Items inválidos" });
      }
    }

    await conn.beginTransaction();

    // Insert con estado pendiente por defecto
    const [rPedido] = await conn.query(
      `INSERT INTO pedidos (id_cliente, id_usuario, delivery, estado, fecha_pedido)
       VALUES (?, ?, ?, 'pendiente', NOW())`,
      [id_cliente, id_usuario, delivery ? 1 : 0]
    );

    const id_pedido = rPedido.insertId;

    const values = items.map((it) => [id_pedido, it.id_plato, it.cantidad]);

    await conn.query(
      `INSERT INTO detalle_pedido (id_pedido, id_plato, cantidad)
       VALUES ?`,
      [values]
    );

    await conn.commit();

    res.json({ ok: true, id_pedido });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ ok: false, error: e.message });
  } finally {
    conn.release();
  }
});

/**
 * GET /api/pedidos-dia?fecha=YYYY-MM-DD (opcional)
 */
router.get("/pedidos-dia", async (req, res) => {
  try {
    const fecha = req.query.fecha;
    const where = fecha ? "DATE(p.fecha_pedido) = ?" : "DATE(p.fecha_pedido) = CURDATE()";
    const params = fecha ? [fecha] : [];

    const [pedidos] = await db.query(
      `SELECT
        p.id_pedido,
        p.fecha_pedido,
        p.delivery,
        p.estado,
        c.id_cliente,
        CONCAT(c.nombre_cliente,' ',c.apellido_cliente) AS cliente,
        c.numero_telefono,
        u.nombre_usuario AS usuario
      FROM pedidos p
      JOIN clientes c ON c.id_cliente = p.id_cliente
      JOIN usuarios u ON u.id_usuario = p.id_usuario
      WHERE ${where}
      ORDER BY p.fecha_pedido DESC`,
      params
    );

    if (pedidos.length === 0) return res.json({ ok: true, pedidos: [] });

    const ids = pedidos.map((p) => p.id_pedido);

    const [detalles] = await db.query(
      `SELECT
        d.id_pedido,
        d.id_plato,
        d.cantidad,
        pl.nombre_plato,
        pl.precio_plato
      FROM detalle_pedido d
      JOIN platos pl ON pl.id_plato = d.id_plato
      WHERE d.id_pedido IN (?)
      ORDER BY pl.nombre_plato`,
      [ids]
    );

    const map = new Map();
    pedidos.forEach((p) => map.set(p.id_pedido, { ...p, items: [] }));
    detalles.forEach((d) => map.get(d.id_pedido)?.items.push(d));

    res.json({ ok: true, pedidos: Array.from(map.values()) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * PATCH /api/pedidos/:id/estado
 * Actualizar el estado de un pedido
 */
router.patch("/pedidos/:id/estado", async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    const estadosValidos = ['pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado'];
    
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ ok: false, error: "Estado inválido" });
    }

    const [result] = await db.query(
      "UPDATE pedidos SET estado = ? WHERE id_pedido = ?",
      [estado, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: "Pedido no encontrado" });
    }

    res.json({ ok: true, mensaje: "Estado actualizado" });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/resumen-cocina?fecha=YYYY-MM-DD (opcional)
 */
router.get("/resumen-cocina", async (req, res) => {
  try {
    const fecha = req.query.fecha;
    const where = fecha ? "DATE(p.fecha_pedido) = ?" : "DATE(p.fecha_pedido) = CURDATE()";
    const params = fecha ? [fecha] : [];

    const [rows] = await db.query(
      `SELECT
        pl.id_plato,
        pl.nombre_plato,
        SUM(d.cantidad) AS total_cantidad
      FROM pedidos p
      JOIN detalle_pedido d ON d.id_pedido = p.id_pedido
      JOIN platos pl ON pl.id_plato = d.id_plato
      WHERE ${where}
      GROUP BY pl.id_plato, pl.nombre_plato
      ORDER BY total_cantidad DESC, pl.nombre_plato ASC`,
      params
    );

    res.json({ ok: true, resumen: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;