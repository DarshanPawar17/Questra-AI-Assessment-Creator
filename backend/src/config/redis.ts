import Redis, { RedisOptions } from 'ioredis';

export const getRedisConnectionOptions = (): RedisOptions => {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: null, // Required by BullMQ
  };
};

export const createRedisClient = (): Redis => {
  const options = getRedisConnectionOptions();
  const client = new Redis(options);
  
  client.on('connect', () => {
    console.log(`Redis connected to ${options.host}:${options.port}`);
  });

  client.on('error', (err) => {
    console.error('Redis error:', err);
  });

  return client;
};
