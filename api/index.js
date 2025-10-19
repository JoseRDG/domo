import express from "express";
import pg from "pg";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
const { Pool } = pg;

// Configuración
app.use(cors());
app.use(express.json());

// Conexión a PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("Servidor funcionando correctamente 🚀");
});

// 📌 RUTA para agregar una frase
app.post("/frases", async (req, res) => {
  const { texto } = req.body;
  if (!texto) return res.status(400).json({ error: "Falta el texto" });

  try {
    await pool.query('INSERT INTO frases (texto, aprobada, fijada, fecha) VALUES ($1, false, false, NOW())', [texto]);
    res.json({ message: "Frase recibida correctamente" });
  } catch (err) {
    console.error("❌ Error al guardar frase:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 📌 RUTA para listar frases pendientes
app.get("/frases/pendientes", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM frases WHERE aprobada = false");
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener frases:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Puerto
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});