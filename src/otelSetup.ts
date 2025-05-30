// otel-setup.js
import {
  trace,
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
  Tracer,
  AttributeValue,
} from "@opentelemetry/api"
import {
  logs,
  Logger as ApiLogsLogger,
  LogAttributes as OtelLogAttributes,
} from "@opentelemetry/api-logs"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"
import { Resource } from "@opentelemetry/resources"
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions"
import {
  BasicTracerProvider,
  BatchSpanProcessor,
  SpanProcessor,
} from "@opentelemetry/sdk-trace-base"
import {
  LoggerProvider,
  BatchLogRecordProcessor,
  LogRecordProcessor,
} from "@opentelemetry/sdk-logs"
import "dotenv/config"
import { OtelLogger, LogEvent } from "./dynatraceOtelLogHook"

// For troubleshooting, set OpenTelemetry diagnostics to verbose
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

const DYNATRACE_ENV_URL = process.env.DYNATRACE_ENV_URL
const DYNATRACE_API_TOKEN = process.env.DYNATRACE_API_TOKEN

let openTelemetryTracer: Tracer | undefined
let openTelemetrySdkLogger: ApiLogsLogger | undefined
let traceSpanProcessor: SpanProcessor | undefined
let logRecordProcessor: LogRecordProcessor | undefined

export function initializeOpenTelemetry() {
  let tracesExporterUrl: string = ""
  let logsExporterUrl: string = ""
  let exporterHeaders: Record<string, string> = {}
  let configured = false

  if (DYNATRACE_ENV_URL && DYNATRACE_API_TOKEN) {
    tracesExporterUrl = `${DYNATRACE_ENV_URL}/api/v2/otlp/v1/traces`
    logsExporterUrl = `${DYNATRACE_ENV_URL}/api/v2/otlp/v1/logs`
    exporterHeaders["Authorization"] = `Api-Token ${DYNATRACE_API_TOKEN}`
    console.log(
      `Initializing OpenTelemetry for direct Dynatrace: Traces=${tracesExporterUrl}, Logs=${logsExporterUrl}`
    )
    configured = true
  } else {
    console.log(
      "OpenTelemetry target not configured. Tracing and Logging will be no-op."
    )
  }

  if (!configured) {
    return {
      getLogger: (): OtelLogger => ({
        emit: (event: LogEvent) => {
          console.log(
            "OTel No-Op Logger (Not Configured):",
            event.body,
            event.attributes
          )
        },
      }),
      getTracer: () => trace.getTracer("no-op-tracer-not-configured"),
    }
  }

  // Shared Resource
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "openfeature-service",
  })

  // ===== Trace Setup =====
  const traceExporter = new OTLPTraceExporter({
    url: tracesExporterUrl,
    headers: exporterHeaders,
  })
  traceSpanProcessor = new BatchSpanProcessor(traceExporter)
  const tracerProvider = new BasicTracerProvider({
    resource: resource,
  })
  tracerProvider.addSpanProcessor(traceSpanProcessor)
  tracerProvider.register() // Register the provider with the API

  openTelemetryTracer = tracerProvider.getTracer("openfeature-tracer")
  console.log("OpenTelemetry TracerProvider configured and registered.")

  // ===== Log Setup =====
  const logExporter = new OTLPLogExporter({
    url: logsExporterUrl,
    headers: exporterHeaders,
  })
  logRecordProcessor = new BatchLogRecordProcessor(logExporter)
  const loggerProvider = new LoggerProvider({
    resource: resource,
  })
  loggerProvider.addLogRecordProcessor(logRecordProcessor)
  logs.setGlobalLoggerProvider(loggerProvider) // Register a global logger provider
  openTelemetrySdkLogger = logs.getLogger("openfeature-service-logger") // Get a named logger
  console.log("OpenTelemetry LoggerProvider configured and registered.")

  return {
    getLogger: (): OtelLogger => ({
      emit: (event: LogEvent) => {
        const { body, attributes } = event
        openTelemetrySdkLogger?.emit({
          body: body,
          attributes: attributes as unknown as OtelLogAttributes,
        })
      },
    }),
    getTracer: () => openTelemetryTracer!,
  }
}

export async function shutdownOpenTelemetry() {
  if (traceSpanProcessor) {
    try {
      await traceSpanProcessor.shutdown()
      console.log("OpenTelemetry SpanProcessor shutdown successfully.")
    } catch (error) {
      console.error("Error during OpenTelemetry SpanProcessor shutdown:", error)
    }
  }
  if (logRecordProcessor) {
    try {
      await logRecordProcessor.shutdown()
      console.log("OpenTelemetry LogRecordProcessor shutdown successfully.")
    } catch (error) {
      console.error(
        "Error during OpenTelemetry LogRecordProcessor shutdown:",
        error
      )
    }
  }
}
