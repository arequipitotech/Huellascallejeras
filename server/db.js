import "dotenv/config";
import mysql from "mysql2/promise";

const requiredEnvironment = ["DB_HOST", "DB_NAME", "DB_USER"];
const missingEnvironment = requiredEnvironment.filter((key) => !process.env[key]);

if (missingEnvironment.length) {
  throw new Error(`Faltan variables de entorno: ${missingEnvironment.join(", ")}`);
}

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || "",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4"
});

export async function testDatabaseConnection() {
  const connection = await pool.getConnection();
  connection.release();
}
