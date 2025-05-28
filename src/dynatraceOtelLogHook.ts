// DynatraceOtelLogHook.ts
import { HookContext, EvaluationDetails, FlagValue } from "@openfeature/js-sdk"

interface LogAttributes {
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

interface LogEvent {
  body: string
  attributes: LogAttributes
}

export interface OtelLogger {
  emit(event: LogEvent): void
}

class DynatraceOtelLogHook {
  private name: string
  private logger: OtelLogger

  constructor(otelLogger: OtelLogger) {
    this.name = "DynatraceOtelLogHook"
    this.logger = otelLogger
  }

  after(
    hookContext: HookContext,
    evaluationDetails: EvaluationDetails<FlagValue>
  ): void {
    const { flagKey, flagValueType, clientMetadata, providerMetadata } =
      hookContext
    const { value, variant, reason, errorCode, errorMessage } =
      evaluationDetails

    const logAttributes: LogAttributes = {
      "feature_flag.key": flagKey,
      "feature_flag.value_type": flagValueType,
      "feature_flag.value": value, // Be cautious with logging sensitive values
      "feature_flag.variant": variant,
      "feature_flag.reason": reason,
      "openfeature.client.name": clientMetadata?.name,
      "openfeature.provider.name": providerMetadata?.name,
    }

    if (errorCode) {
      logAttributes["feature_flag.error_code"] = errorCode
    }
    if (errorMessage) {
      logAttributes["feature_flag.error_message"] = errorMessage
    }

    // The OTel SDK (especially with auto-instrumentations) should automatically
    // pick up the active trace and span context if this hook runs within a traced operation.
    // Dynatrace OneAgent will then see these dt.trace_id and dt.span_id.
    this.logger.emit({
      // severityNumber: SeverityNumber.INFO, // Optional: OTel SeverityNumber
      // severityText: 'INFO', // Optional
      body: `Feature flag '${flagKey}' evaluated. Reason: ${reason}.`,
      attributes: logAttributes,
    } as LogEvent)

    // console.log(`Logged evaluation for ${flagKey} via OTel to Dynatrace`);
  }

  // Implement other hook methods (before, error, finally) if needed
  // error(hookContext: HookContext, err: Error): void {
  //   this.logger.emit({
  //     severityNumber: SeverityNumber.ERROR,
  //     body: `Error during feature flag '${hookContext.flagKey}' evaluation.`,
  //     attributes: {
  //       "feature_flag.key": hookContext.flagKey,
  //       "error.message": err.message,
  //       "error.stack": err.stack,
  //     },
  //   });
  // }
}

export { DynatraceOtelLogHook }
