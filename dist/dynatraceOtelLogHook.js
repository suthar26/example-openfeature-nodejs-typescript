"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynatraceOtelLogHook = void 0;
const api_1 = require("@opentelemetry/api");
class DynatraceOtelLogHook {
    constructor(otelLogger, tracer) {
        this.name = "DynatraceOtelLogHook";
        this.logger = otelLogger;
        this.tracer = tracer;
    }
    before(hookContext) {
        var _a, _b;
        const span = this.tracer.startSpan(`feature_flag.evaluate.${hookContext.flagKey}`);
        if (span) {
            span.setAttribute("feature_flag.key", hookContext.flagKey);
            span.setAttribute("feature_flag.value_type", hookContext.flagValueType);
            if ((_a = hookContext.clientMetadata) === null || _a === void 0 ? void 0 : _a.name) {
                span.setAttribute("openfeature.client.name", hookContext.clientMetadata.name);
            }
            if ((_b = hookContext.providerMetadata) === null || _b === void 0 ? void 0 : _b.name) {
                span.setAttribute("openfeature.provider.name", hookContext.providerMetadata.name);
            }
        }
    }
    after(hookContext, evaluationDetails) {
        const { flagKey, flagValueType, clientMetadata, providerMetadata } = hookContext;
        const { value, variant, reason, errorCode, errorMessage } = evaluationDetails;
        const span = this.tracer.startSpan(`feature_flag.evaluated.${flagKey}`);
        if (span) {
            const logAttributes = {
                "feature_flag.key": flagKey,
                "feature_flag.value_type": flagValueType,
                "feature_flag.value": value,
                "feature_flag.variant": variant,
                "feature_flag.reason": reason,
                "openfeature.client.name": clientMetadata === null || clientMetadata === void 0 ? void 0 : clientMetadata.name,
                "openfeature.provider.name": providerMetadata === null || providerMetadata === void 0 ? void 0 : providerMetadata.name,
            };
            if (errorCode) {
                logAttributes["feature_flag.error_code"] = errorCode;
                span.setAttribute("feature_flag.error_code", errorCode);
            }
            if (errorMessage) {
                logAttributes["feature_flag.error_message"] = errorMessage;
                span.setAttribute("feature_flag.error_message", errorMessage);
            }
            span.setAttribute("feature_flag.value", String(value));
            if (variant) {
                span.setAttribute("feature_flag.variant", variant);
            }
            span.setAttribute("feature_flag.reason", reason || "");
            this.logger.emit({
                body: `Feature flag '${flagKey}' evaluated. Reason: ${reason}.`,
                attributes: logAttributes,
            });
            span.end();
        }
    }
    error(hookContext, err) {
        const span = this.tracer.startSpan(`feature_flag.error.${hookContext.flagKey}`);
        if (span) {
            span.setAttribute("feature_flag.key", hookContext.flagKey);
            span.setAttribute("error.message", err.message);
            span.setAttribute("error.stack", err.stack || "");
            span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: err.message });
            span.end();
            const logAttributes = {
                "feature_flag.key": hookContext.flagKey,
                "feature_flag.value_type": "error",
                "feature_flag.value": false,
                "feature_flag.error_message": err.message,
            };
            this.logger.emit({
                body: `Error during feature flag '${hookContext.flagKey}' evaluation.`,
                attributes: logAttributes,
            });
        }
    }
}
exports.DynatraceOtelLogHook = DynatraceOtelLogHook;
