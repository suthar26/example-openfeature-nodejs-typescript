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
exports.otelSetup = exports.shutdownOpenTelemetry = exports.initializeOpenTelemetry = exports.appMetadata = void 0;
// otel-setup.js
//
// OpenTelemetry Configuration with Local OTLP Fallback
//
// Environment Variables:
// - USE_LOCAL_OTLP: Set to 'true' or '1' to enable local OTLP mode
// - LOCAL_OTLP_PORT: Port for local OTLP endpoint (default: 14499)
// - DYNATRACE_ENV_URL: Dynatrace environment URL (fallback)
// - DYNATRACE_API_TOKEN: Dynatrace API token (fallback)
// - OTEL_SERVICE_NAME: Override service name (default: from package.json)
// - OTEL_SERVICE_VERSION: Override service version (default: from package.json)
// - NODE_ENV or ENVIRONMENT: Environment name for metadata
//
const api_1 = require("@opentelemetry/api");
const exporter_trace_otlp_proto_1 = require("@opentelemetry/exporter-trace-otlp-proto");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
require("dotenv/config");
const resources_1 = require("@opentelemetry/resources");
const opentelemetry = __importStar(require("@opentelemetry/sdk-node"));
const fs_1 = __importDefault(require("fs"));
const instrumentation_http_1 = require("@opentelemetry/instrumentation-http");
const instrumentation_express_1 = require("@opentelemetry/instrumentation-express");
let packageInfo = {};
try {
    const packageJsonPath = "./package.json";
    const packageJsonContent = fs_1.default.readFileSync(packageJsonPath, "utf-8");
    packageInfo = JSON.parse(packageJsonContent);
}
catch (error) {
    console.warn("Could not read package.json:", error instanceof Error ? error.message : error);
}
const DYNATRACE_ENV_URL = process.env.DYNATRACE_ENV_URL;
const DYNATRACE_API_TOKEN = process.env.DYNATRACE_API_TOKEN;
// Local OTLP configuration
const USE_LOCAL_OTLP = process.env.USE_LOCAL_OTLP === "true" || process.env.USE_LOCAL_OTLP === "1";
const LOCAL_OTLP_PORT = parseInt(process.env.LOCAL_OTLP_PORT || "14499", 10);
const LOCAL_OTLP_BASE_URL = `http://localhost:${LOCAL_OTLP_PORT}/otlp`;
let sdkInstance;
let traceSpanProcessor;
exports.appMetadata = {
    name: process.env.OTEL_SERVICE_NAME || packageInfo.name || "openfeature-service",
    version: process.env.OTEL_SERVICE_VERSION || packageInfo.version || "0.1.0",
    environment: process.env.NODE_ENV || process.env.ENVIRONMENT || "development",
    packageName: packageInfo.name,
    packageVersion: packageInfo.version,
    project: "new-parth-project",
    _environment: "66ccc3628c118d9a6da306e0",
};
let configured = false;
let tracer;
function initializeOpenTelemetry() {
    let tracesExporterUrl = "";
    let exporterHeaders = {};
    if (configured && tracer) {
        return {
            getTracer: () => tracer,
        };
    }
    if (USE_LOCAL_OTLP) {
        // Use local OTLP endpoint
        tracesExporterUrl = `${LOCAL_OTLP_BASE_URL}/v1/traces`;
        exporterHeaders = {};
        console.log(`Using local OTLP endpoint: Traces=${tracesExporterUrl}` // Removed metrics from log
        );
        configured = true;
    }
    else if (DYNATRACE_ENV_URL && DYNATRACE_API_TOKEN) {
        // Use Dynatrace
        const DYNATRACE_OTLP_ENDPOINT = `${DYNATRACE_ENV_URL}/api/v2/otlp`;
        tracesExporterUrl = `${DYNATRACE_OTLP_ENDPOINT}/v1/traces`;
        exporterHeaders["Authorization"] = `Api-Token ${DYNATRACE_API_TOKEN}`;
        console.log(`Using Dynatrace OTLP endpoint: Traces=${tracesExporterUrl}` // Removed metrics from log
        );
        configured = true;
    }
    else {
        console.log("Neither local OTLP nor Dynatrace endpoints are configured. OpenTelemetry will be no-op.");
    }
    if (!configured) {
        return {
            getTracer: () => api_1.trace.getTracer("no-op-tracer-not-configured"),
        };
    }
    let dtmetadata = (0, resources_1.emptyResource)();
    for (const name of [
        "dt_metadata_e617c525669e072eebe3d0f08212e8f2.json",
        "/var/lib/dynatrace/enrichment/dt_metadata.json",
        "/var/lib/dynatrace/enrichment/dt_host_metadata.json",
    ]) {
        try {
            const fileContent = fs_1.default
                .readFileSync(name.startsWith("/var")
                ? name
                : fs_1.default.readFileSync(name).toString("utf-8").trim())
                .toString("utf-8");
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
        [semantic_conventions_1.ATTR_SERVICE_NAME]: exports.appMetadata.name,
        [semantic_conventions_1.ATTR_SERVICE_VERSION]: exports.appMetadata.version,
    });
    const resource = baseResource.merge(dtmetadata).merge(serviceResource);
    const traceExporter = new exporter_trace_otlp_proto_1.OTLPTraceExporter({
        url: tracesExporterUrl,
        headers: exporterHeaders,
    });
    traceSpanProcessor = new sdk_trace_base_1.BatchSpanProcessor(traceExporter);
    sdkInstance = new opentelemetry.NodeSDK({
        resource: resource,
        traceExporter: traceExporter,
        instrumentations: [new instrumentation_http_1.HttpInstrumentation(), new instrumentation_express_1.ExpressInstrumentation()],
    });
    try {
        sdkInstance.start();
        console.log("OpenTelemetry SDK started successfully with Traces export.");
        // Store the tracer reference for future use
        tracer = api_1.trace.getTracer(exports.appMetadata.name, exports.appMetadata.version);
    }
    catch (error) {
        console.error("Error starting OpenTelemetry SDK:", error instanceof Error ? error.message : error);
        tracer = api_1.trace.getTracer("no-op-tracer-sdk-start-failed");
        return {
            getTracer: () => tracer,
        };
    }
    return {
        getTracer: () => tracer,
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
