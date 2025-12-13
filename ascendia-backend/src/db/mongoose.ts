import mongoose from 'mongoose'
import { MONGODB_URI, MONGODB_DBNAME } from '../config.js'

// Si la variable de entorno MONGODB_URI no está definida, lanzamos un error
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is required (set it in config.ts)')
}

// Conectamos a la base de datos
export async function connectDB() {
  await mongoose.connect(MONGODB_URI!, {
    dbName: MONGODB_DBNAME,
    serverSelectionTimeoutMS: 10_000 // Evitamos esperas largas al conectar a la base de datos (10 segundos)
  })
  mongoose.connection.on('error', (e) => console.error('❌ [DB] error:', e)) // Logueamos errores de conexión
}

// Desconectar de la base de datos
export async function disconnectDB() {
  await mongoose.connection.close()
}

// En entornos de producción, nos aseguramos de desconectar la base de datos al terminar el proceso
process.on('SIGINT', async () => { await disconnectDB(); process.exit(0) })
process.on('SIGTERM', async () => { await disconnectDB(); process.exit(0) })