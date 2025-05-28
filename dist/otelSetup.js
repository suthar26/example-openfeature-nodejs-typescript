"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeOpenTelemetry = void 0;
// otel-setup.js
const api_1 = require("@opentelemetry/api");
require("dotenv/config");
const DYNATRACE_ENV_URL = process.env.DYNATRACE_ENV_URL;
const DYNATRACE_API_TOKEN = process.env.DYNATRACE_API_TOKEN;
// Create a simple tracer that works with the current setup
const tracer = api_1.trace.getTracer("openfeature-tracer");
function initializeOpenTelemetry() {
    if (!DYNATRACE_ENV_URL || !DYNATRACE_API_TOKEN) {
        console.log("Dynatrace credentials not found. OpenTelemetry initialization skipped.");
        return {
            getLogger: () => ({
                emit: (event) => {
                    console.log("OpenTelemetry not initialized:", event.body);
                },
            }),
            getTracer: () => ({
                startSpan: (name) => ({
                    setAttribute: () => { },
                    end: () => { },
                    addEvent: () => { },
                }),
            }),
        };
    }
    console.log("OpenTelemetry tracing initialized.");
    return {
        getLogger: () => ({
            emit: (event) => {
                console.log("Logging to console:", event.body);
            },
        }),
        getTracer: () => tracer,
    };
}
exports.initializeOpenTelemetry = initializeOpenTelemetry;
