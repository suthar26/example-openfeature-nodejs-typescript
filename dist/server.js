"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
let port = 5002;
let remainingAttempts = 3;
(0, app_1.default)().then((app) => {
    const server = app.listen(port, () => {
        console.log(`Example app listening on port ${port}`);
    });
    server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
            console.log(`Port ${port} is already in use.`);
            if (remainingAttempts-- > 0) {
                port++;
                setTimeout(() => server.listen(port), 500);
            }
        }
    });
});
