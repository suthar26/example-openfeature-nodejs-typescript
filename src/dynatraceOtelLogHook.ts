// DynatraceOtelLogHook.ts
import { HookContext, EvaluationDetails, FlagValue } from "@openfeature/js-sdk"
import { trace, SpanStatusCode, Tracer } from "@opentelemetry/api"

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
}

export interface LogEvent {
  body: string
  attributes: LogAttributes
}

export interface OtelLogger {
  emit(event: LogEvent): void
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

  before(hookContext: HookContext): void {
    const span = this.tracer.startSpan(
      `feature_flag.evaluate.${hookContext.flagKey}`
    )
    if (span) {
      span.setAttribute("feature_flag.key", hookContext.flagKey)
      span.setAttribute("feature_flag.value_type", hookContext.flagValueType)
      if (hookContext.clientMetadata?.name) {
        span.setAttribute(
          "openfeature.client.name",
          hookContext.clientMetadata.name
        )
      }
      if (hookContext.providerMetadata?.name) {
        span.setAttribute(
          "openfeature.provider.name",
          hookContext.providerMetadata.name
        )
      }
    }
  }

  after(
    hookContext: HookContext,
    evaluationDetails: EvaluationDetails<FlagValue>
  ): void {
    const { flagKey, flagValueType, clientMetadata, providerMetadata } =
      hookContext
    const { value, variant, reason, errorCode, errorMessage } =
      evaluationDetails

    const span = this.tracer.startSpan(`feature_flag.evaluated.${flagKey}`)
    if (span) {
      const logAttributes: LogAttributes = {
        "feature_flag.key": flagKey,
        "feature_flag.value_type": flagValueType,
        "feature_flag.value": value,
        "feature_flag.variant": variant,
        "feature_flag.reason": reason,
        "openfeature.client.name": clientMetadata?.name,
        "openfeature.provider.name": providerMetadata?.name,
      }

      if (errorCode) {
        logAttributes["feature_flag.error_code"] = errorCode
        span.setAttribute("feature_flag.error_code", errorCode)
      }
      if (errorMessage) {
        logAttributes["feature_flag.error_message"] = errorMessage
        span.setAttribute("feature_flag.error_message", errorMessage)
      }

      span.setAttribute("feature_flag.value", String(value))
      if (variant) {
        span.setAttribute("feature_flag.variant", variant)
      }
      span.setAttribute("feature_flag.reason", reason || "")

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
