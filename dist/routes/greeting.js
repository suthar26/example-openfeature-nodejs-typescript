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
const devcycle_1 = require("../devcycle");
const greetings = {
    default: {
        header: "Welcome to DevCycle's example app.",
        body: "If you got to the example app on your own, follow our README guide to create the Feature and Variables you need to control this app in DevCycle.",
    },
    "step-1": {
        header: "Welcome to DevCycle's example app.",
        body: "If you got here through the onboarding flow, just follow the instructions to change and create new Variations and see how the app reacts to new Variable values.",
    },
    "step-2": {
        header: "Great! You've taken the first step in exploring DevCycle.",
        body: "You've successfully toggled your very first Variation. You are now serving a different value to your users and you can see how the example app has reacted to this change. Next, go ahead and create a whole new Variation to see what else is possible in this app.",
    },
    "step-3": {
        header: "You're getting the hang of things.",
        body: "By creating a new Variation with new Variable values and toggling it on for all users, you've already explored the fundamental concepts within DevCycle. There's still so much more to the platform, so go ahead and complete the onboarding flow and play around with the feature that controls this example in your dashboard.",
    },
};
exports.default = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const openFeatureClient = (0, devcycle_1.getOpenFeatureClient)();
    const step = yield openFeatureClient.getStringValue("example-text", "default", req.user);
    const { header, body } = greetings[step];
    res.set({ "Content-Type": "text/html" });
    res.send(`<h2>${header}</h2><p>${body}</p><p><a href="/variables">All Variables</a></p>`);
});
