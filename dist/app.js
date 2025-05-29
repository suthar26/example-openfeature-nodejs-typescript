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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const devcycle_1 = require("./devcycle");
const greeting_1 = __importDefault(require("./routes/greeting"));
const logVariation_1 = require("./utils/logVariation");
const server_sdk_1 = require("@openfeature/server-sdk");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const devcycleClient = yield (0, devcycle_1.initializeDevCycleWithOpenFeature)();
        const openFeatureClient = server_sdk_1.OpenFeature.getClient();
        const app = (0, express_1.default)();
        app.use(express_1.default.urlencoded({ extended: false }));
        app.use(express_1.default.json());
        app.use((req, res, next) => {
            res.set({
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Access-Control-Allow-Origin, Content-Type",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
            });
            next();
        });
        app.use((req, res, next) => {
            /**
             * In a real application you would build the user object based on the
             * authenticated user
             */
            req.user = {
                user_id: "user123",
                name: "Jane Doe",
                email: "jane.doe@email.com",
            };
            next();
        });
        /**
         * Return a greeting based on the value of the example-text variable
         */
        app.get("/", greeting_1.default);
        /**
         * Return all variable values for debugging purposes
         */
        app.get("/variables", (req, res) => {
            const variables = devcycleClient.allVariables(req.user);
            res.json(variables);
        });
        /**
         * Log togglebot to the console using the togglebot-spin and togglebot-wink
         * variables to control the output
         */
        (0, logVariation_1.logVariation)(devcycleClient, openFeatureClient);
        return app;
    });
}
exports.default = run;
