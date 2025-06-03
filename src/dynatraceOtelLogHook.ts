import {
  HookContext,
  EvaluationDetails,
  FlagValue,
  BeforeHookContext,
} from "@openfeature/core"
import { Hook } from "@openfeature/server-sdk"
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

class DynatraceOtelLogHook implements Hook {
  private name: string
  private logger: OtelLogger
  private tracer: Tracer
  private spans: WeakMap<HookContext, Span> = new WeakMap()

  constructor(otelLogger: OtelLogger, tracer: Tracer) {
    this.name = "DynatraceOtelLogHook"
    this.logger = otelLogger
    this.tracer = tracer
  }

  before(hookContext: BeforeHookContext) {
    const span = this.tracer.startSpan(
      `feature_flag_evaluation.${hookContext.flagKey}`,
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
    this.spans.set(hookContext, span)
  }

  finally(
    hookContext: HookContext,
    evaluationDetails: EvaluationDetails<FlagValue>
  ): void {
    const { flagKey, flagValueType, clientMetadata, providerMetadata } =
      hookContext
    const { value, variant, reason, errorCode, errorMessage } =
      evaluationDetails
    const span = this.spans.get(hookContext)

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

  error(hookContext: HookContext, err: Error) {
    const { flagKey } = hookContext
    const span = this.spans.get(hookContext)
    if (span) {
      span.setAttributes({
        "feature_flag.key": flagKey,
        "error.message": err.message,
        "error.stack": err.stack || "",
      })
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message })

      const logAttributes: LogAttributes = {
        "feature_flag.key": flagKey,
        "feature_flag.value_type": "error",
        "feature_flag.value": false,
        "feature_flag.error_message": err.message,
        "trace.id": span.spanContext().traceId,
        "span.id": span.spanContext().spanId,
      }

      this.logger.emit({
        body: `Error during feature flag '${flagKey}' evaluation.`,
        attributes: logAttributes,
      })
      span.end()
    }
  }
}

export { DynatraceOtelLogHook }
