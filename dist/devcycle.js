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
exports.initializeDevCycleWithOpenFeature = exports.getOpenFeatureClient = exports.getDevCycleClient = void 0;
const nodejs_server_sdk_1 = require("@devcycle/nodejs-server-sdk");
const server_sdk_1 = require("@openfeature/server-sdk");
const otelSetup_1 = require("./otelSetup");
const dynatraceOtelLogHook_1 = require("./dynatraceOtelLogHook");
const DEVCYCLE_SERVER_SDK_KEY = process.env.DEVCYCLE_SERVER_SDK_KEY;
let devcycleClient;
let openFeatureClient;
const getDevCycleClient = () => devcycleClient;
exports.getDevCycleClient = getDevCycleClient;
const getOpenFeatureClient = () => openFeatureClient;
exports.getOpenFeatureClient = getOpenFeatureClient;
const { getLogger } = (0, otelSetup_1.initializeOpenTelemetry)();
const otelFeatureLogger = getLogger("openfeature-evaluation-logger");
const dynatraceLogHook = new dynatraceOtelLogHook_1.DynatraceOtelLogHook(otelFeatureLogger);
server_sdk_1.OpenFeature.addHooks(dynatraceLogHook); // Add globally
function initializeDevCycleWithOpenFeature() {
    return __awaiter(this, void 0, void 0, function* () {
        devcycleClient = (0, nodejs_server_sdk_1.initializeDevCycle)(DEVCYCLE_SERVER_SDK_KEY, {
            logLevel: "info",
            // Controls the polling interval in milliseconds to fetch new environment config changes
            configPollingIntervalMS: 5 * 1000,
            // Controls the interval between flushing events to the DevCycle servers
            eventFlushIntervalMS: 1000,
        });
        // Pass the DevCycle OpenFeature Provider to OpenFeature, wait for devcycle to be initialized
        yield server_sdk_1.OpenFeature.setProviderAndWait(yield devcycleClient.getOpenFeatureProvider());
        openFeatureClient = server_sdk_1.OpenFeature.getClient();
        return { devcycleClient, openFeatureClient };
    });
}
exports.initializeDevCycleWithOpenFeature = initializeDevCycleWithOpenFeature;
