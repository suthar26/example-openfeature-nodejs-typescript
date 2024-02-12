import run from "./app";
import request from "supertest";
import { DVCVariableValue } from "@devcycle/nodejs-server-sdk";
import { DVCVariableInterface } from "@devcycle/js-cloud-server-sdk/src/types";

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

  const mockVariable = (key: string, value: DVCVariableValue, type: DVCVariableInterface['type']) => {
    mockOpenFeatureClient.getBooleanValue.mockImplementation((variableKey: string, defaultValue: Boolean) => {
        return Promise.resolve((type === 'Boolean' && variableKey === key) ? value : defaultValue)
    });
    mockOpenFeatureClient.getStringValue.mockImplementation((variableKey: string, defaultValue: string) => {
        return Promise.resolve((type === 'String' && variableKey === key) ? value : defaultValue)
    });
  };

  test.each(["default", "step-1", "step-2", "step-3"])(
    'returns greeting for variable value "%s"',
    async (value) => {
      mockVariable("example-text", value, 'String');

      const app = await run();

      return request(app)
        .get("/")
        .then((response) => {
          expect(response.statusCode).toBe(200);
          expect(response.text).toMatchSnapshot();
        });
    }
  );
});
