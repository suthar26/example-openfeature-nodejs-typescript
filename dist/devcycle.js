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
exports.initializeDevCycleWithOpenFeature = void 0;
const nodejs_server_sdk_1 = require("@devcycle/nodejs-server-sdk");
const server_sdk_1 = require("@openfeature/server-sdk");
const otelSetup_1 = require("./otelSetup");
const dynatraceOtelLogHook_1 = require("./dynatraceOtelLogHook");
const DEVCYCLE_SERVER_SDK_KEY = process.env.DEVCYCLE_SERVER_SDK_KEY;
if (!DEVCYCLE_SERVER_SDK_KEY) {
    throw new Error("DEVCYCLE_SERVER_SDK_KEY environment variable is required");
}
const { getTracer } = otelSetup_1.otelSetup;
const tracer = getTracer();
const dynatraceLogHook = new dynatraceOtelLogHook_1.DynatraceOtelLogHook(tracer);
function initializeDevCycleWithOpenFeature() {
    return __awaiter(this, void 0, void 0, function* () {
        const devcycleClient = (0, nodejs_server_sdk_1.initializeDevCycle)(DEVCYCLE_SERVER_SDK_KEY, {
            logLevel: "info",
        });
        server_sdk_1.OpenFeature.addHooks(dynatraceLogHook);
        // Pass the DevCycle OpenFeature Provider to OpenFeature, wait for devcycle to be initialized
        yield server_sdk_1.OpenFeature.setProviderAndWait(yield devcycleClient.getOpenFeatureProvider());
        return devcycleClient;
    });
}
exports.initializeDevCycleWithOpenFeature = initializeDevCycleWithOpenFeature;
