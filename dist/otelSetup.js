"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeOpenTelemetry = void 0;
// otel-setup.js
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const sdk_logs_1 = require("@opentelemetry/sdk-logs");
const exporter_logs_otlp_http_1 = require("@opentelemetry/exporter-logs-otlp-http");
const api_1 = require("@opentelemetry/api");
const api_logs_1 = require("@opentelemetry/api-logs");
require("dotenv/config");
// Optional: For OTel internal diagnostics
api_1.diag.setLogger(new api_1.DiagConsoleLogger(), api_1.DiagLogLevel.INFO);
const DYNATRACE_ENV_URL = (_a = process.env.DYNATRACE_ENV_URL) !== null && _a !== void 0 ? _a : "";
const DYNATRACE_API_TOKEN = (_b = process.env.DYNATRACE_API_TOKEN) !== null && _b !== void 0 ? _b : "";
let otelLoggerProvider;
function initializeOpenTelemetry() {
    const logExporterOptions = {
        // Add retry and timeout configurations
        timeoutMillis: 1000,
        retry: {
            maxAttempts: 3,
            initialBackoffMillis: 1000,
            maxBackoffMillis: 5000,
        },
    };
    if (DYNATRACE_ENV_URL && DYNATRACE_API_TOKEN) {
        logExporterOptions.url = `${DYNATRACE_ENV_URL}/api/v2/logs/ingest`;
        logExporterOptions.headers = {
            Authorization: `Api-Token ${DYNATRACE_API_TOKEN}`,
        };
        console.log(`Configuring OTLP Log Exporter for direct send to Dynatrace: ${logExporterOptions.url}`);
    }
    else {
        // If no Dynatrace URL/Token, OneAgent might still pick up OTLP locally
        // or you might be exporting to a collector.
        // For local OneAgent OTLP ingestion, it often listens on http://localhost:4318/v1/logs
        // logExporterOptions.url = 'http://localhost:4318/v1/logs'; // Example for local OTel collector/OneAgent
        console.log("Dynatrace URL/Token not set. Logs might be handled by local OneAgent or not exported via OTLP.");
    }
    const logExporter = new exporter_logs_otlp_http_1.OTLPLogExporter(logExporterOptions);
    otelLoggerProvider = new sdk_logs_1.LoggerProvider();
    otelLoggerProvider.addLogRecordProcessor(new sdk_logs_1.BatchLogRecordProcessor(logExporter));
    // Register the global logger provider
    api_logs_1.logs.setGlobalLoggerProvider(otelLoggerProvider);
    const sdk = new sdk_node_1.NodeSDK({
        instrumentations: [(0, auto_instrumentations_node_1.getNodeAutoInstrumentations)()],
    });
    // Start the SDK with error handling
    try {
        sdk.start();
        console.log("OpenTelemetry SDK started successfully. Tracing and Logging initialized.");
    }
    catch (error) {
        console.warn("OpenTelemetry SDK failed to start, continuing without telemetry:", error);
    }
    process.on("SIGTERM", () => {
        try {
            sdk.shutdown();
            console.log("OpenTelemetry SDK shut down successfully.");
        }
        catch (error) {
            console.error("Error shutting down SDK:", error);
        }
        finally {
            process.exit(0);
        }
    });
    return {
        getLogger: (name) => api_logs_1.logs.getLogger(name || "openfeature-hook-logger"),
    };
}
exports.initializeOpenTelemetry = initializeOpenTelemetry;
