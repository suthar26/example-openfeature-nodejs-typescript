"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynatraceOtelLogHook = void 0;
class DynatraceOtelLogHook {
    constructor(otelLogger) {
        this.name = "DynatraceOtelLogHook";
        this.logger = otelLogger;
    }
    after(hookContext, evaluationDetails) {
        const { flagKey, flagValueType, clientMetadata, providerMetadata } = hookContext;
        const { value, variant, reason, errorCode, errorMessage } = evaluationDetails;
        const logAttributes = {
            "feature_flag.key": flagKey,
            "feature_flag.value_type": flagValueType,
            "feature_flag.value": value, // Be cautious with logging sensitive values
            "feature_flag.variant": variant,
            "feature_flag.reason": reason,
            "openfeature.client.name": clientMetadata === null || clientMetadata === void 0 ? void 0 : clientMetadata.name,
            "openfeature.provider.name": providerMetadata === null || providerMetadata === void 0 ? void 0 : providerMetadata.name,
        };
        if (errorCode) {
            logAttributes["feature_flag.error_code"] = errorCode;
        }
        if (errorMessage) {
            logAttributes["feature_flag.error_message"] = errorMessage;
        }
        // The OTel SDK (especially with auto-instrumentations) should automatically
        // pick up the active trace and span context if this hook runs within a traced operation.
        // Dynatrace OneAgent will then see these dt.trace_id and dt.span_id.
        this.logger.emit({
            // severityNumber: SeverityNumber.INFO, // Optional: OTel SeverityNumber
            // severityText: 'INFO', // Optional
            body: `Feature flag '${flagKey}' evaluated. Reason: ${reason}.`,
            attributes: logAttributes,
        });
        // console.log(`Logged evaluation for ${flagKey} via OTel to Dynatrace`);
    }
}
exports.DynatraceOtelLogHook = DynatraceOtelLogHook;
