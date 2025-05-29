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
exports.logVariation = void 0;
/**
 * Since this is used outside a request context, we define a service user.
 * This can contain properties unique to this service, and allows you to target
 * services in the same way you would target app users.
 */
const SERVICE_USER = {
    user_id: "api-service",
    targetingKey: "api-service", // Can be the same or different from user_id if needed
    // Add other custom properties if your targeting rules require them
};
/**
 * Log togglebot to the console overwriting the previous frame
 */
const logVariation = (devcycleClient, openFeatureClient) => {
    let idx = 0;
    const renderFrame = () => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        // fetch the Variation name from DevCycle
        const features = devcycleClient.allFeatures(SERVICE_USER);
        const { variationName = "Default" } = (_a = features["hello-togglebot"]) !== null && _a !== void 0 ? _a : {};
        // fetch the togglebot variables from OpenFeature
        const wink = yield openFeatureClient.getBooleanValue("togglebot-wink", false, SERVICE_USER);
        const speed = yield openFeatureClient.getStringValue("togglebot-speed", "off", SERVICE_USER);
        const spinChars = speed === "slow" ? "◟◜◝◞" : "◜◠◝◞◡◟";
        const spinner = speed === "off" ? "○" : spinChars[idx % spinChars.length];
        idx = (idx + 1) % spinChars.length;
        const face = wink ? "(○ ‿ ○)" : "(- ‿ ○)";
        const frame = `${spinner} Serving variation: ${variationName} ${face}`;
        const color = speed === "surprise" ? "rainbow" : "blue";
        writeToConsole(frame, color);
        const timeout = ["fast", "surprise", "off-axis"].includes(speed) ? 100 : 500;
        setTimeout(renderFrame, timeout);
    });
    setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
        process.stdout.write("\n");
        yield renderFrame();
    }), 500);
};
exports.logVariation = logVariation;
const COLORS = {
    red: "\x1b[91m",
    green: "\x1b[92m",
    yellow: "\x1b[93m",
    blue: "\x1b[94m",
    magenta: "\x1b[95m",
};
const END_CHAR = "\x1b[0m";
/**
 * Use chalk to apply the given color to the text
 */
const addColor = (text, color) => {
    const colors = Object.assign(Object.assign({}, COLORS), { rainbow: Object.values(COLORS)[Date.now() % 5] });
    return colors.hasOwnProperty(color) ? colors[color] + text + END_CHAR : text;
};
/**
 * Write the text to stdout, with the given colour
 */
const writeToConsole = (text, color) => {
    text = addColor(text, color);
    process.stdout.write("\x1b[K  " + text + "\r");
};
