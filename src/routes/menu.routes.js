const express = require("express");
const db = require("../db");

const router = express.Router();

/**
 * Crear o actualizar menú del día
 */
router.post("/menu-dia", async (req, res) => {
  const { fecha, platos } = req.body;

  if (!fecha || !platos || platos.length === 0) {
    return res.status(400).json({ ok: false, error: "Datos incompletos" });
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // Verificar si ya existe menú
    const [menu] = await conn.query(
      "SELECT id_menu FROM menu_del_dia WHERE fecha = ?",
      [fecha]
    );

    let id_menu;

    if (menu.length > 0) {
      id_menu = menu[0].id_menu;
      await conn.query("DELETE FROM menu_detalle WHERE id_menu = ?", [id_menu]);
    } else {
      const [result] = await conn.query(
        "INSERT INTO menu_del_dia (fecha, activo) VALUES (?, 1)",
        [fecha]
      );
      id_menu = result.insertId;
    }

    // Insertar platos
    for (const p of platos) {
      await conn.query(
        "INSERT INTO menu_detalle (id_menu, id_plato, precio) VALUES (?, ?, ?)",
        [id_menu, p.id_plato, p.precio]
      );
    }

    await conn.commit();
    res.json({ ok: true, mensaje: "Menú del día guardado" });

  } catch (err) {
    await conn.rollback();
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    conn.release();
  }
});

/**
 * Obtener menú del día actual
 */
router.get("/menu-dia", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        p.id_plato,
        p.nombre_plato,
        md.precio
      FROM menu_del_dia m
      JOIN menu_detalle md ON md.id_menu = m.id_menu
      JOIN platos p ON p.id_plato = md.id_plato
      WHERE m.fecha = CURDATE()
        AND m.activo = 1
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
