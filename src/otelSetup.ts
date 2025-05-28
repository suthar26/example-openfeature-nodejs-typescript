// otel-setup.js
import {
  LoggerProvider,
  BatchLogRecordProcessor,
} from "@opentelemetry/sdk-logs"
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"
import { logs } from "@opentelemetry/api-logs"
import "dotenv/config"
import { OtelLogger } from "./dynatraceOtelLogHook"

const DYNATRACE_ENV_URL = process.env.DYNATRACE_ENV_URL
const DYNATRACE_API_TOKEN = process.env.DYNATRACE_API_TOKEN

let otelLoggerProvider: LoggerProvider

export function initializeOpenTelemetry() {
  if (!DYNATRACE_ENV_URL || !DYNATRACE_API_TOKEN) {
    console.log(
      "Dynatrace credentials not found. OpenTelemetry initialization skipped."
    )
    return {
      getLogger: () =>
        ({
          emit: (event: any) => {
            // No-op logger when OpenTelemetry is not initialized
            console.log("OpenTelemetry not initialized:", event.body)
          },
        } as unknown as OtelLogger),
    }
  }

  const logExporterOptions = {
    url: `${DYNATRACE_ENV_URL}/api/v2/otlp/v1/logs`,
    headers: {
      Authorization: `Api-Token ${DYNATRACE_API_TOKEN}`,
      "Content-Type": "application/x-protobuf",
      Accept: "application/x-protobuf",
    },
    timeoutMillis: 1000,
    retry: {
      maxAttempts: 3,
      initialBackoffMillis: 1000,
      maxBackoffMillis: 5000,
    },
  }

  console.log(
    `Configuring OTLP Log Exporter for direct send to Dynatrace: ${logExporterOptions.url}`
  )

  const logExporter = new OTLPLogExporter(logExporterOptions)

  otelLoggerProvider = new LoggerProvider()
  otelLoggerProvider.addLogRecordProcessor(
    new BatchLogRecordProcessor(logExporter)
  )

  // Register the global logger provider
  logs.setGlobalLoggerProvider(otelLoggerProvider)

  return {
    getLogger: (name?: string) =>
      logs.getLogger(
        name || "openfeature-hook-logger"
      ) as unknown as OtelLogger,
  }
}
