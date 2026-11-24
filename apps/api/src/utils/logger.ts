import winston from 'winston';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const consoleFormat = printf(({ level, message, timestamp, stack, requestId }) => {
  const reqInfo = requestId ? ` [Req: ${requestId}]` : '';
  return `${timestamp} [${level}]${reqInfo}: ${stack || message}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    process.env.NODE_ENV === 'production' ? json() : combine(colorize(), consoleFormat)
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
