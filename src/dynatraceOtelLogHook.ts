// DynatraceOtelLogHook.ts
import { HookContext, EvaluationDetails, FlagValue } from "@openfeature/js-sdk"
import {
  trace,
  SpanStatusCode,
  Tracer,
  SpanKind,
  Span,
} from "@opentelemetry/api"

export interface LogAttributes {
  "feature_flag.key": string
  "feature_flag.value_type": string
  "feature_flag.value": FlagValue
  "feature_flag.variant"?: string
  "feature_flag.reason"?: string
  "openfeature.client.name"?: string
  "openfeature.provider.name"?: string
  "feature_flag.error_code"?: string
  "feature_flag.error_message"?: string
  "trace.id"?: string
  "span.id"?: string
}

export interface LogEvent {
  body: string
  attributes: LogAttributes
}

export interface OtelLogger {
  emit(event: LogEvent): void
}

export type HookContextWithSpan = HookContext & {
  span: Span
}

class DynatraceOtelLogHook {
  private name: string
  private logger: OtelLogger
  private tracer: Tracer

  constructor(otelLogger: OtelLogger, tracer: Tracer) {
    this.name = "DynatraceOtelLogHook"
    this.logger = otelLogger
    this.tracer = tracer
  }

  before(hookContext: HookContext) {
    console.log("before", hookContext)
    console.log("tracer", this.tracer)
    console.log("of-trace", trace.getTracer("openfeature-tracer"))
    const span = this.tracer.startSpan(
      `feature_flag.evaluate.${hookContext.flagKey}`,
      {
        kind: SpanKind.SERVER,
      }
    )
    if (span) {
      span.setAttributes({
        "feature_flag.key": hookContext.flagKey,
        "feature_flag.value_type": hookContext.flagValueType,
      })
      if (hookContext.clientMetadata?.name) {
        span.setAttributes({
          "openfeature.client.name": hookContext.clientMetadata.name,
        })
      }
      if (hookContext.providerMetadata?.name) {
        span.setAttributes({
          "openfeature.provider.name": "devcycle",
        })
      }
    }
    return {
      ...hookContext,
      span,
    }
  }

  finally(
    hookContext: HookContextWithSpan,
    evaluationDetails: EvaluationDetails<FlagValue>
  ): void {
    console.log("finally", hookContext)
    console.log("evaluationDetails", evaluationDetails)
    hookContext.span.end()
    const { flagKey, flagValueType, clientMetadata, providerMetadata, span } =
      hookContext
    const { value, variant, reason, errorCode, errorMessage } =
      evaluationDetails

    if (span) {
      const logAttributes: LogAttributes = {
        "feature_flag.key": flagKey,
        "feature_flag.value_type": flagValueType,
        "feature_flag.value": value,
        "feature_flag.variant": variant,
        "feature_flag.reason": reason,
        "openfeature.client.name": clientMetadata?.name,
        "openfeature.provider.name": providerMetadata?.name,
        "trace.id": span.spanContext().traceId,
        "span.id": span.spanContext().spanId,
      }

      if (errorCode) {
        logAttributes["feature_flag.error_code"] = errorCode
        span.setAttributes({
          "feature_flag.error_code": errorCode,
        })
      }
      if (errorMessage) {
        logAttributes["feature_flag.error_message"] = errorMessage
        span.setAttributes({
          "feature_flag.error_message": errorMessage,
        })
      }

      span.setAttributes({
        "feature_flag.value": String(value),
        "feature_flag.reason": reason || "",
      })
      if (variant) {
        span.setAttributes({
          "feature_flag.variant": variant,
        })
      }

      this.logger.emit({
        body: `Feature flag '${flagKey}' evaluated. Reason: ${reason}.`,
        attributes: logAttributes,
      })

      span.end()
    }
  }

  error(hookContext: HookContext, err: Error): void {
    const span = this.tracer.startSpan(
      `feature_flag.error.${hookContext.flagKey}`
    )
    if (span) {
      span.setAttribute("feature_flag.key", hookContext.flagKey)
      span.setAttribute("error.message", err.message)
      span.setAttribute("error.stack", err.stack || "")
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message })
      span.end()

      const logAttributes: LogAttributes = {
        "feature_flag.key": hookContext.flagKey,
        "feature_flag.value_type": "error",
        "feature_flag.value": false,
        "feature_flag.error_message": err.message,
      }

      this.logger.emit({
        body: `Error during feature flag '${hookContext.flagKey}' evaluation.`,
        attributes: logAttributes,
      })
    }
  }
}

export { DynatraceOtelLogHook }
