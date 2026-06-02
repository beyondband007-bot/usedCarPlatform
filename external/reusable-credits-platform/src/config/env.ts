import "dotenv/config";

export type AppEnv = {
  nodeEnv: string;
  host: string;
  port: number;
  logLevel: string;
  mysql: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    connectionLimit: number;
  };
  paymentCallbackSecret: string;
};

function readPort(value: string | undefined): number {
  if (!value) return 3000;

  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return port;
}

function readNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric env value: ${value}`);
  }
  return parsed;
}

export function loadEnv(): AppEnv {
  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    host: process.env.HOST ?? "0.0.0.0",
    port: readPort(process.env.PORT),
    logLevel: process.env.LOG_LEVEL ?? "info",
    mysql: {
      host: process.env.MYSQL_HOST ?? "127.0.0.1",
      port: readNumber(process.env.MYSQL_PORT, 3306),
      database: process.env.MYSQL_DATABASE ?? "credits_platform",
      user: process.env.MYSQL_USER ?? "credits",
      password: process.env.MYSQL_PASSWORD ?? "credits",
      connectionLimit: readNumber(process.env.MYSQL_CONNECTION_LIMIT, 10)
    },
    paymentCallbackSecret: process.env.PAYMENT_CALLBACK_SECRET ?? "local_dev_payment_secret"
  };
}
