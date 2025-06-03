"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.otelSetup = exports.shutdownOpenTelemetry = exports.initializeOpenTelemetry = void 0;
// otel-setup.js
const api_1 = require("@opentelemetry/api");
const api_logs_1 = require("@opentelemetry/api-logs");
const exporter_trace_otlp_proto_1 = require("@opentelemetry/exporter-trace-otlp-proto");
const exporter_metrics_otlp_proto_1 = require("@opentelemetry/exporter-metrics-otlp-proto");
const exporter_logs_otlp_http_1 = require("@opentelemetry/exporter-logs-otlp-http");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const sdk_logs_1 = require("@opentelemetry/sdk-logs");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
require("dotenv/config");
const resources_1 = require("@opentelemetry/resources");
const opentelemetry = __importStar(require("@opentelemetry/sdk-node"));
const fs_1 = __importDefault(require("fs"));
const instrumentation_http_1 = require("@opentelemetry/instrumentation-http");
const instrumentation_express_1 = require("@opentelemetry/instrumentation-express");
// For troubleshooting, set OpenTelemetry diagnostics to verbose
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG)
const DYNATRACE_ENV_URL = process.env.DYNATRACE_ENV_URL;
const DYNATRACE_API_TOKEN = process.env.DYNATRACE_API_TOKEN;
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || "openfeature-service";
const SERVICE_VERSION = process.env.OTEL_SERVICE_VERSION || "0.1.0";
let sdkInstance;
let traceSpanProcessor;
let logRecordProcessor;
let metricReader;
function initializeOpenTelemetry() {
    let tracesExporterUrl = "";
    let metricsExporterUrl = "";
    let logsExporterUrl = "";
    let exporterHeaders = {};
    let configured = false;
    if (DYNATRACE_ENV_URL && DYNATRACE_API_TOKEN) {
        const DYNATRACE_OTLP_ENDPOINT = `${DYNATRACE_ENV_URL}/api/v2/otlp`;
        tracesExporterUrl = `${DYNATRACE_OTLP_ENDPOINT}/v1/traces`;
        metricsExporterUrl = `${DYNATRACE_OTLP_ENDPOINT}/v1/metrics`;
        logsExporterUrl = `${DYNATRACE_OTLP_ENDPOINT}/v1/logs`;
        exporterHeaders["Authorization"] = `Api-Token ${DYNATRACE_API_TOKEN}`;
        console.log(`Initializing OpenTelemetry for direct Dynatrace: Traces=${tracesExporterUrl}, Metrics=${metricsExporterUrl}, Logs=${logsExporterUrl}`);
        configured = true;
    }
    else {
        console.log("Dynatrace URL or API Token not configured. OpenTelemetry will be no-op.");
    }
    if (!configured) {
        return {
            getLogger: () => ({
                emit: (event) => {
                    console.log("OTel No-Op Logger (Not Configured):", event.body, event.attributes);
                },
            }),
            getTracer: () => api_1.trace.getTracer("no-op-tracer-not-configured"),
            getMeter: () => api_1.metrics.getMeter("no-op-meter-not-configured"),
        };
    }
    let dtmetadata = (0, resources_1.emptyResource)();
    for (const name of [
        "dt_metadata_e617c525669e072eebe3d0f08212e8f2.json",
        "/var/lib/dynatrace/enrichment/dt_metadata.json",
        "/var/lib/dynatrace/enrichment/dt_host_metadata.json",
    ]) {
        try {
            const filePath = name.startsWith("/var") ? name : name;
            const fileContent = fs_1.default.readFileSync(filePath).toString("utf-8");
            dtmetadata = dtmetadata.merge((0, resources_1.resourceFromAttributes)(JSON.parse(fileContent.trim())));
            console.log(`Merged Dynatrace metadata from ${name}`);
            break;
        }
        catch (e) {
            // console.debug(`Failed to read Dynatrace metadata from ${name}:`, (e as Error).message) // Optional: for debugging
        }
    }
    const baseResource = (0, resources_1.defaultResource)();
    const serviceResource = (0, resources_1.resourceFromAttributes)({
        [semantic_conventions_1.ATTR_SERVICE_NAME]: SERVICE_NAME,
        [semantic_conventions_1.ATTR_SERVICE_VERSION]: SERVICE_VERSION,
    });
    const resource = baseResource.merge(dtmetadata).merge(serviceResource);
    const traceExporter = new exporter_trace_otlp_proto_1.OTLPTraceExporter({
        url: tracesExporterUrl,
        headers: exporterHeaders,
    });
    traceSpanProcessor = new sdk_trace_base_1.BatchSpanProcessor(traceExporter);
    const logExporter = new exporter_logs_otlp_http_1.OTLPLogExporter({
        url: logsExporterUrl,
        headers: exporterHeaders,
    });
    logRecordProcessor = new sdk_logs_1.BatchLogRecordProcessor(logExporter);
    const metricExporter = new exporter_metrics_otlp_proto_1.OTLPMetricExporter({
        url: metricsExporterUrl,
        headers: exporterHeaders,
        temporalityPreference: sdk_metrics_1.AggregationTemporality.DELTA,
    });
    metricReader = new sdk_metrics_1.PeriodicExportingMetricReader({
        exporter: metricExporter,
    });
    sdkInstance = new opentelemetry.NodeSDK({
        resource: resource,
        traceExporter: traceExporter,
        metricReader: metricReader,
        logRecordProcessors: [logRecordProcessor],
        instrumentations: [new instrumentation_http_1.HttpInstrumentation(), new instrumentation_express_1.ExpressInstrumentation()],
    });
    try {
        sdkInstance.start();
        console.log("OpenTelemetry SDK started successfully with Traces, Metrics, and Logs export.");
        const globalLoggerProvider = new sdk_logs_1.LoggerProvider({
            resource,
            processors: [logRecordProcessor],
        });
        api_logs_1.logs.setGlobalLoggerProvider(globalLoggerProvider);
    }
    catch (error) {
        console.error("Error starting OpenTelemetry SDK:", error instanceof Error ? error.message : error);
        return {
            getLogger: () => ({
                emit: (event) => {
                    console.log("OTel No-Op Logger (SDK Start Failed):", event.body, event.attributes);
                },
            }),
            getTracer: () => api_1.trace.getTracer("no-op-tracer-sdk-start-failed"),
            getMeter: () => api_1.metrics.getMeter("no-op-meter-sdk-start-failed"),
        };
    }
    return {
        getLogger: () => ({
            emit: (event) => {
                const { body, attributes } = event;
                const logger = api_logs_1.logs.getLogger(SERVICE_NAME, SERVICE_VERSION);
                logger.emit({
                    body: body,
                    attributes: attributes,
                });
            },
        }),
        getTracer: () => {
            return api_1.trace.getTracer(SERVICE_NAME, SERVICE_VERSION);
        },
        getMeter: () => {
            return api_1.metrics.getMeter(SERVICE_NAME, SERVICE_VERSION);
        },
    };
}
exports.initializeOpenTelemetry = initializeOpenTelemetry;
function shutdownOpenTelemetry() {
    return __awaiter(this, void 0, void 0, function* () {
        if (sdkInstance) {
            yield sdkInstance
                .shutdown()
                .then(() => console.log("OpenTelemetry SDK shut down successfully."))
                .catch((error) => console.error("Error shutting down OpenTelemetry SDK:", error instanceof Error ? error.message : error));
        }
        else {
            console.log("OpenTelemetry SDK not initialized, no shutdown necessary.");
        }
    });
}
exports.shutdownOpenTelemetry = shutdownOpenTelemetry;
// Auto-initialize OpenTelemetry when this module is required (for --require flag usage)
const otelSetup = initializeOpenTelemetry();
exports.otelSetup = otelSetup;
