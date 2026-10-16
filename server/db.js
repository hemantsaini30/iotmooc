import mongoose from 'mongoose';

// Cache the connection on `globalThis` so warm serverless invocations reuse it
// instead of opening a new connection for every request.
const cache = globalThis.__mongooseCache || (globalThis.__mongooseCache = { conn: null, promise: null });

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    mongoose.set('strictQuery', true);
    cache.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        autoIndex: false, // indexes are created by `npm run import` (syncIndexes)
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 8000,
      })
      .then((m) => m)
      .catch((err) => {
        cache.promise = null; // allow retry on next request
        throw err;
      });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
