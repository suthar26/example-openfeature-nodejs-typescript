"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynatraceOtelLogHook = void 0;
const api_1 = require("@opentelemetry/api");
const otelSetup_1 = require("./otelSetup"); // Import app metadata
class DynatraceOtelLogHook {
    constructor(tracer) {
        this.spans = new WeakMap();
        this.name = "DynatraceOtelLogHook";
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
                "feature_flag.flagset": hookContext.flagKey,
                "feature_flag.project": otelSetup_1.appMetadata.project,
                "feature_flag.environment": otelSetup_1.appMetadata._environment,
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
        const { value, variant, reason, errorCode, errorMessage } = evaluationDetails;
        const span = this.spans.get(hookContext);
        if (span) {
            if (errorCode) {
                span.setAttributes({
                    "feature_flag.error_code": errorCode,
                });
            }
            if (errorMessage) {
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
                // App metadata
                "app.name": otelSetup_1.appMetadata.name,
                "app.version": otelSetup_1.appMetadata.version,
                "app.environment": otelSetup_1.appMetadata._environment,
            });
            span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: err.message });
            span.end();
        }
    }
}
exports.DynatraceOtelLogHook = DynatraceOtelLogHook;
