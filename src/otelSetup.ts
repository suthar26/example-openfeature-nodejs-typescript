// otel-setup.js
import {
  trace,
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
  Tracer,
} from "@opentelemetry/api"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { Resource } from "@opentelemetry/resources"
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions"
import {
  BasicTracerProvider,
  BatchSpanProcessor,
  SpanProcessor,
} from "@opentelemetry/sdk-trace-base"
import "dotenv/config"
import { OtelLogger, LogEvent } from "./dynatraceOtelLogHook"

// For troubleshooting, set OpenTelemetry diagnostics to verbose
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

const DYNATRACE_ENV_URL = process.env.DYNATRACE_ENV_URL
const DYNATRACE_API_TOKEN = process.env.DYNATRACE_API_TOKEN

let openTelemetryTracer: Tracer | undefined
let spanProcessor: SpanProcessor | undefined

export function initializeOpenTelemetry() {
  if (!DYNATRACE_ENV_URL || !DYNATRACE_API_TOKEN) {
    console.log(
      "Dynatrace credentials not found. OpenTelemetry tracing will be no-op."
    )
    return {
      getLogger: (): OtelLogger => ({
        emit: (event: LogEvent) => {
          console.log("OTel No-Op Logger:", event.body, event.attributes)
        },
      }),
      getTracer: () => trace.getTracer("no-op-tracer"),
    }
  }

  console.log("Initializing OpenTelemetry tracing for Dynatrace...")

  const provider = new BasicTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: "openfeature-service",
    }),
  })

  const exporter = new OTLPTraceExporter({
    url: `${DYNATRACE_ENV_URL}/api/v2/otlp/v1/traces`,
    headers: {
      Authorization: `Api-Token ${DYNATRACE_API_TOKEN}`,
    },
  })

  spanProcessor = new BatchSpanProcessor(exporter)
  provider.addSpanProcessor(spanProcessor)
  provider.register() // Register the provider with the API

  openTelemetryTracer = provider.getTracer("openfeature-tracer")
  console.log(
    "OpenTelemetry BasicTracerProvider configured and registered with OTLP exporter."
  )

  return {
    getLogger: (): OtelLogger => ({
      emit: (event: LogEvent) => {
        console.log(
          "OTel Logger (Dynatrace Tracing Configured):",
          event.body,
          event.attributes
        )
      },
    }),
    getTracer: () => openTelemetryTracer!,
  }
}

export async function shutdownOpenTelemetry() {
  if (spanProcessor) {
    try {
      await spanProcessor.shutdown()
      console.log("OpenTelemetry SpanProcessor shutdown successfully.")
    } catch (error) {
      console.error("Error during OpenTelemetry SpanProcessor shutdown:", error)
    }
  }
  // Note: BasicTracerProvider does not have a dedicated shutdown method itself beyond its processors.
}
