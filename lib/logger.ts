type LogLevel = "info" | "error";

function formatLog(level: LogLevel, message: string, context?: Record<string, unknown>) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  });
}

function errorToObject(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { value: String(error) };
}

export function logInfo(message: string, context?: Record<string, unknown>) {
  console.info(formatLog("info", message, context));
}

export function logError(message: string, error: unknown, context?: Record<string, unknown>) {
  console.error(formatLog("error", message, { ...context, error: errorToObject(error) }));
}
