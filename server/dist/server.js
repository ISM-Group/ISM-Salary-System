"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = __importDefault(require("./app"));
dotenv_1.default.config();
const port = Number(process.env.PORT || 5002);
const server = http_1.default.createServer(app_1.default);
server.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});
