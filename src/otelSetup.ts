// otel-setup.js
import { NodeSDK } from "@opentelemetry/sdk-node"
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node"
import {
  LoggerProvider,
  BatchLogRecordProcessor, // Use BatchLogRecordProcessor for production
  // SimpleLogRecordProcessor, // Use for quick testing/dev
} from "@opentelemetry/sdk-logs"
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"
import { DiagConsoleLogger, DiagLogLevel, diag } from "@opentelemetry/api"
import { logs } from "@opentelemetry/api-logs"
import "dotenv/config"
import { OtelLogger } from "./dynatraceOtelLogHook"

// Optional: For OTel internal diagnostics
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO)

const DYNATRACE_ENV_URL = process.env.DYNATRACE_ENV_URL ?? ""
const DYNATRACE_API_TOKEN = process.env.DYNATRACE_API_TOKEN ?? ""

let otelLoggerProvider: LoggerProvider

export function initializeOpenTelemetry() {
  const logExporterOptions: any = {
    // Add retry and timeout configurations
    timeoutMillis: 1000,
    retry: {
      maxAttempts: 3,
      initialBackoffMillis: 1000,
      maxBackoffMillis: 5000,
    },
  }

  if (DYNATRACE_ENV_URL && DYNATRACE_API_TOKEN) {
    logExporterOptions.url = `${DYNATRACE_ENV_URL}/api/v2/logs/ingest`
    logExporterOptions.headers = {
      Authorization: `Api-Token ${DYNATRACE_API_TOKEN}`,
    }
    console.log(
      `Configuring OTLP Log Exporter for direct send to Dynatrace: ${logExporterOptions.url}`
    )
  } else {
    // If no Dynatrace URL/Token, OneAgent might still pick up OTLP locally
    // or you might be exporting to a collector.
    // For local OneAgent OTLP ingestion, it often listens on http://localhost:4318/v1/logs
    // logExporterOptions.url = 'http://localhost:4318/v1/logs'; // Example for local OTel collector/OneAgent
    console.log(
      "Dynatrace URL/Token not set. Logs might be handled by local OneAgent or not exported via OTLP."
    )
  }

  const logExporter = new OTLPLogExporter(logExporterOptions)

  otelLoggerProvider = new LoggerProvider()
  otelLoggerProvider.addLogRecordProcessor(
    new BatchLogRecordProcessor(logExporter)
  )

  // Register the global logger provider
  logs.setGlobalLoggerProvider(otelLoggerProvider)

  const sdk = new NodeSDK({
    instrumentations: [getNodeAutoInstrumentations()],
  })

  // Start the SDK with error handling
  try {
    sdk.start()
    console.log(
      "OpenTelemetry SDK started successfully. Tracing and Logging initialized."
    )
  } catch (error) {
    console.warn(
      "OpenTelemetry SDK failed to start, continuing without telemetry:",
      error
    )
  }

  process.on("SIGTERM", () => {
    try {
      sdk.shutdown()
      console.log("OpenTelemetry SDK shut down successfully.")
    } catch (error) {
      console.error("Error shutting down SDK:", error)
    } finally {
      process.exit(0)
    }
  })

  return {
    getLogger: (name?: string) =>
      logs.getLogger(
        name || "openfeature-hook-logger"
      ) as unknown as OtelLogger,
  }
}
