"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynatraceOtelLogHook = void 0;
const api_1 = require("@opentelemetry/api");
class DynatraceOtelLogHook {
    constructor(otelLogger, tracer) {
        this.spans = new WeakMap();
        this.name = "DynatraceOtelLogHook";
        this.logger = otelLogger;
        this.tracer = tracer;
    }
    before(hookContext) {
        var _a, _b;
        const span = this.tracer.startSpan(`feature_flag_evaluation.${hookContext.flagKey}`, {
            kind: api_1.SpanKind.SERVER,
        });
        if (span) {
            span.setAttributes({
                "feature_flag.key": hookContext.flagKey,
                "feature_flag.value_type": hookContext.flagValueType,
            });
            if ((_a = hookContext.clientMetadata) === null || _a === void 0 ? void 0 : _a.name) {
                span.setAttributes({
                    "openfeature.client.name": hookContext.clientMetadata.name,
                });
            }
            if ((_b = hookContext.providerMetadata) === null || _b === void 0 ? void 0 : _b.name) {
                span.setAttributes({
                    "openfeature.provider.name": "devcycle",
                });
            }
        }
        this.spans.set(hookContext, span);
    }
    finally(hookContext, evaluationDetails) {
        const { flagKey, flagValueType, clientMetadata, providerMetadata } = hookContext;
        const { value, variant, reason, errorCode, errorMessage } = evaluationDetails;
        const span = this.spans.get(hookContext);
        if (span) {
            const logAttributes = {
                "feature_flag.key": flagKey,
                "feature_flag.value_type": flagValueType,
                "feature_flag.value": value,
                "feature_flag.variant": variant,
                "feature_flag.reason": reason,
                "openfeature.client.name": clientMetadata === null || clientMetadata === void 0 ? void 0 : clientMetadata.name,
                "openfeature.provider.name": providerMetadata === null || providerMetadata === void 0 ? void 0 : providerMetadata.name,
                "trace.id": span.spanContext().traceId,
                "span.id": span.spanContext().spanId,
            };
            if (errorCode) {
                logAttributes["feature_flag.error_code"] = errorCode;
                span.setAttributes({
                    "feature_flag.error_code": errorCode,
                });
            }
            if (errorMessage) {
                logAttributes["feature_flag.error_message"] = errorMessage;
                span.setAttributes({
                    "feature_flag.error_message": errorMessage,
                });
            }
            span.setAttributes({
                "feature_flag.value": String(value),
                "feature_flag.reason": reason || "",
            });
            if (variant) {
                span.setAttributes({
                    "feature_flag.variant": variant,
                });
            }
            this.logger.emit({
                body: `Feature flag '${flagKey}' evaluated. Reason: ${reason}.`,
                attributes: logAttributes,
            });
            span.end();
        }
    }
    error(hookContext, err) {
        const { flagKey } = hookContext;
        const span = this.spans.get(hookContext);
        if (span) {
            span.setAttributes({
                "feature_flag.key": flagKey,
                "error.message": err.message,
                "error.stack": err.stack || "",
            });
            span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: err.message });
            const logAttributes = {
                "feature_flag.key": flagKey,
                "feature_flag.value_type": "error",
                "feature_flag.value": false,
                "feature_flag.error_message": err.message,
                "trace.id": span.spanContext().traceId,
                "span.id": span.spanContext().spanId,
            };
            this.logger.emit({
                body: `Error during feature flag '${flagKey}' evaluation.`,
                attributes: logAttributes,
            });
            span.end();
        }
    }
}
exports.DynatraceOtelLogHook = DynatraceOtelLogHook;
