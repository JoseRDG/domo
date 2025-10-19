const express = require('express');
const router = express.Router();
const pool = require('./db'); // Importamos la conexión a PostgreSQL
const jwt = require('jsonwebtoken');

// Middleware para verificar token (admin)
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No autorizado' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
}

/* -------------------- RUTAS PÚBLICAS -------------------- */

// Agregar una nueva frase (frontend público)
router.post('/frases', async (req, res) => {
  const { texto, autor } = req.body;
  if (!texto) return res.status(400).json({ error: 'El texto es obligatorio' });

  try {
    const result = await pool.query(
      'INSERT INTO frases (texto, autor, aprobada) VALUES ($1, $2, false) RETURNING *',
      [texto, autor || null]
    );
    res.json({ mensaje: 'Frase enviada correctamente', frase: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear la frase' });
  }
});

// Obtener frases aprobadas (para frontend público, sin token)
router.get('/frases/aprobadas', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM frases WHERE aprobada = true ORDER BY id DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener frases aprobadas' });
  }
});

/* -------------------- RUTAS PRIVADAS (ADMIN) -------------------- */

// Obtener todas las frases (admin)
router.get('/admin/frases', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM frases ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener las frases');
  }
});

// Aprobar una frase (admin)
router.put('/admin/frases/:id/aprobar', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE frases SET aprobada = true WHERE id = $1', [id]);
    res.send('Frase aprobada ✅');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al aprobar la frase');
  }
});

// Eliminar frase (admin)
router.delete('/admin/frases/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM frases WHERE id = $1', [id]);
    res.send('Frase eliminada 🗑️');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al eliminar la frase');
  }
});

// Fijar frase (admin)
router.put('/admin/frases/:id/fijar', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { fijada } = req.body;
  try {
    await pool.query('UPDATE frases SET fijada = $1 WHERE id = $2', [fijada, id]);
    res.send('Frase actualizada ✅');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al fijar la frase');
  }
});

module.exports = router;