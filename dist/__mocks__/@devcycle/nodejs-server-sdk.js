"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mockClient = {
    variableValue: jest.fn().mockImplementation((user, variableName, defaultValue) => {
        return defaultValue;
    })
};
exports.default = {
    initializeDevCycle: jest.fn().mockReturnValue({
        onClientInitialized: jest.fn().mockResolvedValue(mockClient)
    }),
};
