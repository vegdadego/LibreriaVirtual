import dns from 'node:dns';
import mongoose from 'mongoose';

/**
 * Conecta Mongoose a MongoDB usando la variable de entorno MONGO_URI.
 *
 * Termina el proceso si MONGO_URI no está definida o si la conexión falla.
 * Si DNS_SERVERS está definida (lista separada por comas), Node usa esos
 * servidores DNS en lugar de los del sistema.
 *
 * @returns {Promise<import('mongoose').Mongoose>} Instancia de Mongoose conectada.
 */
export const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ Falta MONGO_URI. Defínela en server/.env (ver server/.env.example).');
    process.exit(1);
  }

  // Las URIs mongodb+srv:// requieren consultas DNS SRV, que algunos resolvedores
  // locales (proxies de VPN, WARP) rechazan con ECONNREFUSED. Permite forzar otro DNS.
  const dnsServers = (process.env.DNS_SERVERS || '')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean);
  if (dnsServers.length) dns.setServers(dnsServers);

  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Conectado: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ Error al conectar a MongoDB: ${error.message}`);
    process.exit(1);
  }
};
