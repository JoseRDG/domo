import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import bodyParser from "body-parser";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(bodyParser.json());

// Conexión a PostgreSQL (Supabase)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Middleware de autenticación admin
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (token === "demo-token") return next();
  res.status(401).json({ error: "No autorizado" });
}

// Login demo admin
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (email && password) {
    res.json({ token: "demo-token" });
  } else {
    res.status(400).json({ error: "Faltan credenciales" });
  }
});

// Crear frase (público)
app.post("/frases", async (req, res) => {
  const { texto } = req.body;
  if (!texto) return res.status(400).json({ error: "Falta el texto" });

  try {
    const result = await pool.query(
      "INSERT INTO frases (texto, aprobada, fijada, fecha) VALUES ($1, false, false, NOW()) RETURNING *",
      [texto]
    );
    io.emit("fraseActualizada");
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("ERROR al crear frase:", err.message);
    res.status(500).json({ error: "Error al crear la frase: " + err.message });
  }
});

// Listar todas las frases (admin)
app.get("/frases", auth, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM frases ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("ERROR al obtener frases:", err.message);
    res.status(500).json({ error: "Error al obtener frases" });
  }
});

// Aprobar frase
app.put("/frases/:id/aprobar", auth, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const result = await pool.query(
      "UPDATE frases SET aprobada = TRUE WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "No encontrada" });
    io.emit("fraseActualizada");
    res.json(result.rows[0]);
  } catch (err) {
    console.error("ERROR al aprobar frase:", err.message);
    res.status(500).json({ error: "Error al aprobar frase" });
  }
});

// Fijar frase
app.put("/frases/:id/fijar", auth, async (req, res) => {
  const id = parseInt(req.params.id);
  const { fijada } = req.body;
  try {
    const result = await pool.query(
      "UPDATE frases SET fijada = $1 WHERE id = $2 RETURNING *",
      [fijada, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "No encontrada" });
    io.emit("fraseActualizada");
    res.json(result.rows[0]);
  } catch (err) {
    console.error("ERROR al fijar frase:", err.message);
    res.status(500).json({ error: "Error al fijar frase" });
  }
});

// Eliminar frase
app.delete("/frases/:id", auth, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const result = await pool.query("DELETE FROM frases WHERE id = $1", [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "No encontrada" });
    io.emit("fraseActualizada");
    res.json({ success: true });
  } catch (err) {
    console.error("ERROR al eliminar frase:", err.message);
    res.status(500).json({ error: "Error al eliminar frase" });
  }
});

// Servir frontend estático
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Socket.io
io.on("connection", (socket) => {
  console.log("Cliente conectado");
});

// Puerto
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));