const dns = require('dns');
const mongoose = require('mongoose');
const { ensureAllDemoAccounts } = require('../utils/bootstrapAdmin');

// Ensure reliable DNS servers (Google 8.8.8.8, Cloudflare 1.1.1.1) to resolve MongoDB Atlas SRV records.
// This resolves the common "querySrv EBADRESP" issue on Windows / ISP routers where SRV queries fail.
const configureReliableDns = () => {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4', '1.0.0.1']);
  } catch (err) {
    // Ignore if environment restricts setting DNS servers
  }
};

configureReliableDns();

// Set up connection event listeners once
let listenersRegistered = false;
const setupConnectionListeners = () => {
  if (listenersRegistered) return;
  listenersRegistered = true;

  mongoose.connection.on('connected', () => {
    console.log(`[Database] MongoDB connection established.`);
  });

  mongoose.connection.on('error', (err) => {
    console.error(`[Database Error] MongoDB runtime error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn(`[Database Warning] MongoDB disconnected. Mongoose will attempt automatic reconnection.`);
  });

  mongoose.connection.on('reconnected', () => {
    console.log(`[Database] MongoDB reconnected successfully.`);
  });
};

const connectDB = async (maxRetries = 3, retryDelayMs = 2000) => {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  setupConnectionListeners();

  const primaryUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cineverse_ai';
  // Also prepare IPv4 fallback if localhost is specified
  const fallbackUri = primaryUri.includes('localhost')
    ? primaryUri.replace('localhost', '127.0.0.1')
    : primaryUri;

  const urisToTry = primaryUri !== fallbackUri ? [primaryUri, fallbackUri] : [primaryUri];

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    for (const uri of urisToTry) {
      try {
        const conn = await mongoose.connect(uri, {
          autoIndex: true,
          serverSelectionTimeoutMS: 5000,
        });

        console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
        
        // Ensure initial accounts exist in database
        try {
          await ensureAllDemoAccounts();
        } catch (bootstrapErr) {
          console.warn(`[Database Warning] Demo accounts bootstrap warning: ${bootstrapErr.message}`);
        }

        return conn;
      } catch (err) {
        lastError = err;
        console.warn(`[Database Warning] Attempt ${attempt} to connect to ${uri} failed: ${err.message}`);
      }
    }

    if (attempt < maxRetries) {
      console.log(`[Database] Retrying MongoDB connection in ${retryDelayMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  console.error(`[Database Error] All ${maxRetries} connection attempts failed: ${lastError?.message}`);
  throw lastError;
};

module.exports = connectDB;

