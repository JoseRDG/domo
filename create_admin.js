import dotenv from 'dotenv';
import pkg from 'pg';
import bcrypt from 'bcryptjs';

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function upsertAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const plainPassword = process.env.ADMIN_PASSWORD;

  if (!email || !plainPassword) {
    console.error('❌ Falta ADMIN_EMAIL o ADMIN_PASSWORD en .env');
    process.exit(1);
  }

  try {
    const hash = await bcrypt.hash(plainPassword, 10);

    // Comprueba si ya existe
    const exists = await pool.query('SELECT id FROM usuarios WHERE email=$1', [email]);

    if (exists.rowCount > 0) {
      await pool.query('UPDATE usuarios SET password=$1 WHERE email=$2', [hash, email]);
      console.log('✔ Admin existente actualizado');
    } else {
      const nombre = email.split('@')[0];
      await pool.query(
        'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3)',
        [nombre, email, hash]
      );
      console.log('✔ Admin creado correctamente');
    }

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creando/actualizando admin:', err);
    process.exit(1);
  }
}

upsertAdmin();