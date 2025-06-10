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
import { appMetadata } from "./otelSetup" // Import app metadata

class DynatraceOtelLogHook implements Hook {
  private name: string
  private tracer: Tracer
  private spans: WeakMap<HookContext, Span> = new WeakMap()

  constructor(tracer: Tracer) {
    this.name = "DynatraceOtelLogHook"
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
        "feature_flag.flagset": hookContext.flagKey,
        "feature_flag.project": appMetadata.project,
        "feature_flag.environment": appMetadata._environment,
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
    const { value, variant, reason, errorCode, errorMessage } =
      evaluationDetails
    const span = this.spans.get(hookContext)

    if (span) {
      if (errorCode) {
        span.setAttributes({
          "feature_flag.error_code": errorCode,
        })
      }
      if (errorMessage) {
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
        // App metadata
        "app.name": appMetadata.name,
        "app.version": appMetadata.version,
        "app.environment": appMetadata._environment,
      })
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message })
      span.end()
    }
  }
}

export { DynatraceOtelLogHook }
