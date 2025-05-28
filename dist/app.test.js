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
const app_1 = __importDefault(require("./app"));
const supertest_1 = __importDefault(require("supertest"));
let mockDevCycleClient = {
    onClientInitialized: jest.fn(),
    variableValue: jest.fn(),
    variable: jest.fn(),
};
let mockOpenFeatureClient = {
    getBooleanValue: jest.fn(),
    getStringValue: jest.fn(),
};
jest.mock("./devcycle", () => ({
    initializeDevCycleWithOpenFeature: () => ({
        devcycleClient: mockDevCycleClient,
        openFeatureClient: mockOpenFeatureClient
    }),
    getDevCycleClient: () => mockDevCycleClient,
    getOpenFeatureClient: () => mockOpenFeatureClient,
}));
jest.mock("./utils/logVariation");
describe("greeting", () => {
    const mockVariable = (key, value, type) => {
        mockOpenFeatureClient.getBooleanValue.mockImplementation((variableKey, defaultValue) => {
            return Promise.resolve((type === 'Boolean' && variableKey === key) ? value : defaultValue);
        });
        mockOpenFeatureClient.getStringValue.mockImplementation((variableKey, defaultValue) => {
            return Promise.resolve((type === 'String' && variableKey === key) ? value : defaultValue);
        });
    };
    test.each(["default", "step-1", "step-2", "step-3"])('returns greeting for variable value "%s"', (value) => __awaiter(void 0, void 0, void 0, function* () {
        mockVariable("example-text", value, 'String');
        const app = yield (0, app_1.default)();
        return (0, supertest_1.default)(app)
            .get("/")
            .then((response) => {
            expect(response.statusCode).toBe(200);
            expect(response.text).toMatchSnapshot();
        });
    }));
});
