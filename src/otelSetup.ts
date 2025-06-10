// otel-setup.js
//
// OpenTelemetry Configuration with Local OTLP Fallback
//
// Environment Variables:
// - USE_LOCAL_OTLP: Set to 'true' or '1' to enable local OTLP mode
// - LOCAL_OTLP_PORT: Port for local OTLP endpoint (default: 14499)
// - DYNATRACE_ENV_URL: Dynatrace environment URL (fallback)
// - DYNATRACE_API_TOKEN: Dynatrace API token (fallback)
// - OTEL_SERVICE_NAME: Override service name (default: from package.json)
// - OTEL_SERVICE_VERSION: Override service version (default: from package.json)
// - NODE_ENV or ENVIRONMENT: Environment name for metadata
//
import { trace, Tracer } from "@opentelemetry/api"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto"
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions"
import {
  BatchSpanProcessor,
  SpanProcessor,
} from "@opentelemetry/sdk-trace-base"

import "dotenv/config"
import {
  defaultResource,
  emptyResource,
  resourceFromAttributes,
} from "@opentelemetry/resources"
import * as opentelemetry from "@opentelemetry/sdk-node"
import fs from "fs"
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http"
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express"

let packageInfo: { name?: string; version?: string } = {}
try {
  const packageJsonPath = "./package.json"
  const packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8")
  packageInfo = JSON.parse(packageJsonContent)
} catch (error) {
  console.warn(
    "Could not read package.json:",
    error instanceof Error ? error.message : error
  )
}

const DYNATRACE_ENV_URL = process.env.DYNATRACE_ENV_URL
const DYNATRACE_API_TOKEN = process.env.DYNATRACE_API_TOKEN

// Local OTLP configuration
const USE_LOCAL_OTLP =
  process.env.USE_LOCAL_OTLP === "true" || process.env.USE_LOCAL_OTLP === "1"
const LOCAL_OTLP_PORT = parseInt(process.env.LOCAL_OTLP_PORT || "14499", 10)
const LOCAL_OTLP_BASE_URL = `http://localhost:${LOCAL_OTLP_PORT}/otlp`

let sdkInstance: opentelemetry.NodeSDK | undefined
let traceSpanProcessor: SpanProcessor | undefined

export const appMetadata = {
  name:
    process.env.OTEL_SERVICE_NAME || packageInfo.name || "openfeature-service",
  version: process.env.OTEL_SERVICE_VERSION || packageInfo.version || "0.1.0",
  environment: process.env.NODE_ENV || process.env.ENVIRONMENT || "development",
  packageName: packageInfo.name,
  packageVersion: packageInfo.version,
  project: "new-parth-project",
  _environment: "66ccc3628c118d9a6da306e0",
}
let configured = false
let tracer: Tracer

export function initializeOpenTelemetry() {
  let tracesExporterUrl: string = ""
  let exporterHeaders: Record<string, string> = {}
  if (configured && tracer) {
    return {
      getTracer: () => tracer,
    }
  }

  if (USE_LOCAL_OTLP) {
    // Use local OTLP endpoint
    tracesExporterUrl = `${LOCAL_OTLP_BASE_URL}/v1/traces`
    exporterHeaders = {}

    console.log(
      `Using local OTLP endpoint: Traces=${tracesExporterUrl}` // Removed metrics from log
    )
    configured = true
  } else if (DYNATRACE_ENV_URL && DYNATRACE_API_TOKEN) {
    // Use Dynatrace
    const DYNATRACE_OTLP_ENDPOINT = `${DYNATRACE_ENV_URL}/api/v2/otlp`
    tracesExporterUrl = `${DYNATRACE_OTLP_ENDPOINT}/v1/traces`
    exporterHeaders["Authorization"] = `Api-Token ${DYNATRACE_API_TOKEN}`

    console.log(
      `Using Dynatrace OTLP endpoint: Traces=${tracesExporterUrl}` // Removed metrics from log
    )
    configured = true
  } else {
    console.log(
      "Neither local OTLP nor Dynatrace endpoints are configured. OpenTelemetry will be no-op."
    )
  }

  if (!configured) {
    return {
      getTracer: () => trace.getTracer("no-op-tracer-not-configured"),
    }
  }

  let dtmetadata = emptyResource()
  for (const name of [
    "dt_metadata_e617c525669e072eebe3d0f08212e8f2.json",
    "/var/lib/dynatrace/enrichment/dt_metadata.json",
    "/var/lib/dynatrace/enrichment/dt_host_metadata.json",
  ]) {
    try {
      const fileContent = fs
        .readFileSync(
          name.startsWith("/var")
            ? name
            : fs.readFileSync(name).toString("utf-8").trim()
        )
        .toString("utf-8")

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
    [ATTR_SERVICE_NAME]: appMetadata.name,
    [ATTR_SERVICE_VERSION]: appMetadata.version,
  })
  const resource = baseResource.merge(dtmetadata).merge(serviceResource)

  const traceExporter = new OTLPTraceExporter({
    url: tracesExporterUrl,
    headers: exporterHeaders,
  })
  traceSpanProcessor = new BatchSpanProcessor(traceExporter)

  sdkInstance = new opentelemetry.NodeSDK({
    resource: resource,
    traceExporter: traceExporter,
    instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()],
  })

  try {
    sdkInstance.start()
    console.log("OpenTelemetry SDK started successfully with Traces export.")

    // Store the tracer reference for future use
    tracer = trace.getTracer(appMetadata.name, appMetadata.version)
  } catch (error: unknown) {
    console.error(
      "Error starting OpenTelemetry SDK:",
      error instanceof Error ? error.message : error
    )
    tracer = trace.getTracer("no-op-tracer-sdk-start-failed")
    return {
      getTracer: () => tracer,
    }
  }

  return {
    getTracer: () => tracer,
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

// Export the setup directly since it's synchronous again
export { otelSetup }
