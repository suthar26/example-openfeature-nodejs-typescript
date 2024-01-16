const mockClient = {
    variableValue: jest.fn().mockImplementation((user, variableName, defaultValue) => {
        return defaultValue
    })
}

export default {
    initializeDevCycle: jest.fn().mockReturnValue({
        onClientInitialized: jest.fn().mockResolvedValue(mockClient)
    }),
}
