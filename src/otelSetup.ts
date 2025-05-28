// otel-setup.js
import { trace, context, SpanStatusCode } from "@opentelemetry/api"
import "dotenv/config"
import { OtelLogger } from "./dynatraceOtelLogHook"

const DYNATRACE_ENV_URL = process.env.DYNATRACE_ENV_URL
const DYNATRACE_API_TOKEN = process.env.DYNATRACE_API_TOKEN

// Create a simple tracer that works with the current setup
const tracer = trace.getTracer("openfeature-tracer")

export function initializeOpenTelemetry() {
  if (!DYNATRACE_ENV_URL || !DYNATRACE_API_TOKEN) {
    console.log(
      "Dynatrace credentials not found. OpenTelemetry initialization skipped."
    )
    return {
      getLogger: () =>
        ({
          emit: (event: any) => {
            console.log("OpenTelemetry not initialized:", event.body)
          },
        } as unknown as OtelLogger),
      getTracer: () => ({
        startSpan: (name: string) => ({
          setAttribute: () => {},
          end: () => {},
          addEvent: () => {},
        }),
      }),
    }
  }

  console.log("OpenTelemetry tracing initialized.")

  return {
    getLogger: () =>
      ({
        emit: (event: any) => {
          console.log("Logging to console:", event.body)
        },
      } as unknown as OtelLogger),
    getTracer: () => tracer,
  }
}
