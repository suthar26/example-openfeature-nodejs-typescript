"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shutdownOpenTelemetry = exports.initializeOpenTelemetry = void 0;
// otel-setup.js
const api_1 = require("@opentelemetry/api");
const api_logs_1 = require("@opentelemetry/api-logs");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const exporter_logs_otlp_http_1 = require("@opentelemetry/exporter-logs-otlp-http");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const sdk_logs_1 = require("@opentelemetry/sdk-logs");
require("dotenv/config");
// For troubleshooting, set OpenTelemetry diagnostics to verbose
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
const DYNATRACE_ENV_URL = process.env.DYNATRACE_ENV_URL;
const DYNATRACE_API_TOKEN = process.env.DYNATRACE_API_TOKEN;
const USE_LOCAL_ONEAGENT = !DYNATRACE_ENV_URL; // Default to OneAgent if DYNATRACE_ENV_URL is not set
let openTelemetryTracer;
let openTelemetrySdkLogger;
let traceSpanProcessor;
let logRecordProcessor;
function initializeOpenTelemetry() {
    let tracesExporterUrl = "";
    let logsExporterUrl = "";
    let exporterHeaders = {};
    let configured = false;
    if (USE_LOCAL_ONEAGENT) {
        tracesExporterUrl = "http://localhost:4318/v1/traces";
        logsExporterUrl = "http://localhost:4318/v1/logs";
        console.log(`Initializing OpenTelemetry for local OneAgent: Traces=${tracesExporterUrl}, Logs=${logsExporterUrl}`);
        configured = true;
    }
    else if (DYNATRACE_ENV_URL && DYNATRACE_API_TOKEN) {
        tracesExporterUrl = `${DYNATRACE_ENV_URL}/api/v2/otlp/v1/traces`;
        logsExporterUrl = `${DYNATRACE_ENV_URL}/api/v2/otlp/v1/logs`;
        exporterHeaders["Authorization"] = `Api-Token ${DYNATRACE_API_TOKEN}`;
        console.log(`Initializing OpenTelemetry for direct Dynatrace: Traces=${tracesExporterUrl}, Logs=${logsExporterUrl}`);
        configured = true;
    }
    else {
        console.log("OpenTelemetry target not configured. Tracing and Logging will be no-op.");
    }
    if (!configured) {
        return {
            getLogger: () => ({
                emit: (event) => {
                    console.log("OTel No-Op Logger (Not Configured):", event.body, event.attributes);
                },
            }),
            getTracer: () => api_1.trace.getTracer("no-op-tracer-not-configured"),
        };
    }
    // Shared Resource
    const resource = new resources_1.Resource({
        [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: "openfeature-service",
    });
    // ===== Trace Setup =====
    const traceExporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({
        url: tracesExporterUrl,
        headers: exporterHeaders,
    });
    traceSpanProcessor = new sdk_trace_base_1.BatchSpanProcessor(traceExporter);
    const tracerProvider = new sdk_trace_base_1.BasicTracerProvider({
        resource: resource,
    });
    tracerProvider.addSpanProcessor(traceSpanProcessor);
    tracerProvider.register(); // Register the provider with the API
    openTelemetryTracer = tracerProvider.getTracer("openfeature-tracer");
    console.log("OpenTelemetry TracerProvider configured and registered.");
    // ===== Log Setup =====
    const logExporter = new exporter_logs_otlp_http_1.OTLPLogExporter({
        url: logsExporterUrl,
        headers: exporterHeaders,
    });
    logRecordProcessor = new sdk_logs_1.BatchLogRecordProcessor(logExporter);
    const loggerProvider = new sdk_logs_1.LoggerProvider({
        resource: resource,
    });
    loggerProvider.addLogRecordProcessor(logRecordProcessor);
    api_logs_1.logs.setGlobalLoggerProvider(loggerProvider); // Register a global logger provider
    openTelemetrySdkLogger = api_logs_1.logs.getLogger("openfeature-service-logger"); // Get a named logger
    console.log("OpenTelemetry LoggerProvider configured and registered.");
    return {
        getLogger: () => ({
            emit: (event) => {
                const { body, attributes } = event;
                openTelemetrySdkLogger === null || openTelemetrySdkLogger === void 0 ? void 0 : openTelemetrySdkLogger.emit({
                    body: body,
                    attributes: attributes,
                });
            },
        }),
        getTracer: () => openTelemetryTracer,
    };
}
exports.initializeOpenTelemetry = initializeOpenTelemetry;
function shutdownOpenTelemetry() {
    return __awaiter(this, void 0, void 0, function* () {
        if (traceSpanProcessor) {
            try {
                yield traceSpanProcessor.shutdown();
                console.log("OpenTelemetry SpanProcessor shutdown successfully.");
            }
            catch (error) {
                console.error("Error during OpenTelemetry SpanProcessor shutdown:", error);
            }
        }
        if (logRecordProcessor) {
            try {
                yield logRecordProcessor.shutdown();
                console.log("OpenTelemetry LogRecordProcessor shutdown successfully.");
            }
            catch (error) {
                console.error("Error during OpenTelemetry LogRecordProcessor shutdown:", error);
            }
        }
    });
}
exports.shutdownOpenTelemetry = shutdownOpenTelemetry;
