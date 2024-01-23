import run from "./app";
import request from "supertest";
import { DVCVariableValue } from "@devcycle/nodejs-server-sdk";

let mockDevCycleClient = {
  onClientInitialized: jest.fn(),
  variableValue: jest.fn(),
};
jest.mock("./devcycle", () => ({
  initializeDevCycleClient: () => mockDevCycleClient,
  getDevCycleClient: () => mockDevCycleClient,
}));
jest.mock("./utils/logVariation");

describe("greeting", () => {
  const mockVariableValue = (variable: string, value: DVCVariableValue) => {
    mockDevCycleClient.variableValue = jest
      .fn()
      .mockImplementation((user, variableName, defaultValue) =>
        variableName === variable ? value : defaultValue
      );
  };

  test.each(["default", "step-1", "step-2", "step-3"])(
    'returns greeting for variable value "%s"',
    async (value) => {
      mockVariableValue("example-text", value);

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
