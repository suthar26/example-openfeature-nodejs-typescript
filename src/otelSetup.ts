// otel-setup.js
import { trace, metrics as apiMetrics } from "@opentelemetry/api"
import {
  logs,
  Logger as ApiLogsLogger,
  LogAttributes as OtelLogAttributes,
} from "@opentelemetry/api-logs"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto"
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto"
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions"
import {
  BatchSpanProcessor,
  SpanProcessor,
} from "@opentelemetry/sdk-trace-base"
import {
  LoggerProvider,
  BatchLogRecordProcessor,
  LogRecordProcessor,
} from "@opentelemetry/sdk-logs"
import {
  PeriodicExportingMetricReader,
  AggregationTemporality,
} from "@opentelemetry/sdk-metrics"
import "dotenv/config"
import { OtelLogger, LogEvent } from "./dynatraceOtelLogHook"
import {
  defaultResource,
  resourceFromAttributes,
  emptyResource,
} from "@opentelemetry/resources"
import * as opentelemetry from "@opentelemetry/sdk-node"
import fs from "fs"
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http"
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express"

// For troubleshooting, set OpenTelemetry diagnostics to verbose
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG)

const DYNATRACE_ENV_URL = process.env.DYNATRACE_ENV_URL
const DYNATRACE_API_TOKEN = process.env.DYNATRACE_API_TOKEN
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || "openfeature-service"
const SERVICE_VERSION = process.env.OTEL_SERVICE_VERSION || "0.1.0"

let sdkInstance: opentelemetry.NodeSDK | undefined
let traceSpanProcessor: SpanProcessor | undefined
let logRecordProcessor: LogRecordProcessor | undefined
let metricReader: PeriodicExportingMetricReader | undefined

export function initializeOpenTelemetry() {
  let tracesExporterUrl: string = ""
  let metricsExporterUrl: string = ""
  let logsExporterUrl: string = ""
  let exporterHeaders: Record<string, string> = {}
  let configured = false

  if (DYNATRACE_ENV_URL && DYNATRACE_API_TOKEN) {
    const DYNATRACE_OTLP_ENDPOINT = `${DYNATRACE_ENV_URL}/api/v2/otlp`

    tracesExporterUrl = `${DYNATRACE_OTLP_ENDPOINT}/v1/traces`
    metricsExporterUrl = `${DYNATRACE_OTLP_ENDPOINT}/v1/metrics`
    logsExporterUrl = `${DYNATRACE_OTLP_ENDPOINT}/v1/logs`
    exporterHeaders["Authorization"] = `Api-Token ${DYNATRACE_API_TOKEN}`

    console.log(
      `Initializing OpenTelemetry for direct Dynatrace: Traces=${tracesExporterUrl}, Metrics=${metricsExporterUrl}, Logs=${logsExporterUrl}`
    )
    configured = true
  } else {
    console.log(
      "Dynatrace URL or API Token not configured. OpenTelemetry will be no-op."
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
      getMeter: () => apiMetrics.getMeter("no-op-meter-not-configured"),
    }
  }

  let dtmetadata = emptyResource()
  for (const name of [
    "dt_metadata_e617c525669e072eebe3d0f08212e8f2.json",
    "/var/lib/dynatrace/enrichment/dt_metadata.json",
    "/var/lib/dynatrace/enrichment/dt_host_metadata.json",
  ]) {
    try {
      const filePath = name.startsWith("/var") ? name : name
      const fileContent = fs.readFileSync(filePath).toString("utf-8")
      dtmetadata = dtmetadata.merge(
        resourceFromAttributes(JSON.parse(fileContent.trim()))
      )
      console.log(`Merged Dynatrace metadata from ${name}`)
      break
    } catch (e: unknown) {
      // console.debug(`Failed to read Dynatrace metadata from ${name}:`, (e as Error).message) // Optional: for debugging
    }
  }

  const baseResource = defaultResource()
  const serviceResource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
  })
  const resource = baseResource.merge(dtmetadata).merge(serviceResource)

  const traceExporter = new OTLPTraceExporter({
    url: tracesExporterUrl,
    headers: exporterHeaders,
  })
  traceSpanProcessor = new BatchSpanProcessor(traceExporter)

  const logExporter = new OTLPLogExporter({
    url: logsExporterUrl,
    headers: exporterHeaders,
  })
  logRecordProcessor = new BatchLogRecordProcessor(logExporter)

  const metricExporter = new OTLPMetricExporter({
    url: metricsExporterUrl,
    headers: exporterHeaders,
    temporalityPreference: AggregationTemporality.DELTA,
  })

  metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
  })

  sdkInstance = new opentelemetry.NodeSDK({
    resource: resource,
    traceExporter: traceExporter,
    metricReader: metricReader,
    logRecordProcessors: [logRecordProcessor],
    instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()],
  })

  try {
    sdkInstance.start()
    console.log(
      "OpenTelemetry SDK started successfully with Traces, Metrics, and Logs export."
    )

    const globalLoggerProvider = new LoggerProvider({
      resource,
      processors: [logRecordProcessor],
    })
    logs.setGlobalLoggerProvider(globalLoggerProvider)
  } catch (error: unknown) {
    console.error(
      "Error starting OpenTelemetry SDK:",
      error instanceof Error ? error.message : error
    )
    return {
      getLogger: (): OtelLogger => ({
        emit: (event: LogEvent) => {
          console.log(
            "OTel No-Op Logger (SDK Start Failed):",
            event.body,
            event.attributes
          )
        },
      }),
      getTracer: () => trace.getTracer("no-op-tracer-sdk-start-failed"),
      getMeter: () => apiMetrics.getMeter("no-op-meter-sdk-start-failed"),
    }
  }

  return {
    getLogger: (): OtelLogger => ({
      emit: (event: LogEvent) => {
        const { body, attributes } = event
        const logger = logs.getLogger(SERVICE_NAME, SERVICE_VERSION)
        logger.emit({
          body: body,
          attributes: attributes as unknown as OtelLogAttributes,
        })
      },
    }),
    getTracer: () => {
      return trace.getTracer(SERVICE_NAME, SERVICE_VERSION)
    },
    getMeter: () => {
      return apiMetrics.getMeter(SERVICE_NAME, SERVICE_VERSION)
    },
  }
}

export async function shutdownOpenTelemetry() {
  if (sdkInstance) {
    await sdkInstance
      .shutdown()
      .then(() => console.log("OpenTelemetry SDK shut down successfully."))
      .catch((error: unknown) =>
        console.error(
          "Error shutting down OpenTelemetry SDK:",
          error instanceof Error ? error.message : error
        )
      )
  } else {
    console.log("OpenTelemetry SDK not initialized, no shutdown necessary.")
  }
}

// Auto-initialize OpenTelemetry when this module is required (for --require flag usage)
const otelSetup = initializeOpenTelemetry()
export { otelSetup }
