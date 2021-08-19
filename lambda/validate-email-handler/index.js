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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.isCompleteHandler = exports.onEventHandler = void 0;
var aws_sdk_1 = require("aws-sdk");
aws_sdk_1.config.update({ region: "us-east-1" });
/**
 * onEventHandler sends a verification email
 * @param event - An event with the following ResourceProperties:
 * @property event.email - root email.
 * @returns Returns a PhysicalResourceId
 */
function onEventHandler(event) {
    return __awaiter(this, void 0, void 0, function () {
        var ses;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Event: %j", event);
                    if (!(event.RequestType === "Create")) return [3 /*break*/, 2];
                    ses = new aws_sdk_1.SES();
                    return [4 /*yield*/, ses.verifyEmailIdentity({ EmailAddress: event.ResourceProperties.email }).promise()];
                case 1:
                    _a.sent();
                    return [2 /*return*/, { PhysicalResourceId: 'validateEmail' }];
                case 2:
                    if (event.RequestType === "Delete") {
                        return [2 /*return*/, { PhysicalResourceId: event.PhysicalResourceId }];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
exports.onEventHandler = onEventHandler;
/**
 * isCompleteHandler is a function that checks email has been verified
 * @param event - An event with the following ResourceProperties:
 * @property event.email - Root email.
 * @returns A payload containing the IsComplete Flag requested by cdk Custom Resource
 *          to figure out if the email has been verified and if not retries later
 */
function isCompleteHandler(event) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var email, ses, response;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log("Event: %j", event);
                    if (!event.PhysicalResourceId) {
                        throw new Error("Missing PhysicalResourceId parameter.");
                    }
                    email = event.ResourceProperties.email;
                    if (!(event.RequestType === "Create")) return [3 /*break*/, 2];
                    ses = new aws_sdk_1.SES();
                    return [4 /*yield*/, ses.getIdentityVerificationAttributes({ Identities: [email] }).promise()];
                case 1:
                    response = _b.sent();
                    return [2 /*return*/, {
                            IsComplete: ((_a = response.VerificationAttributes[email]) === null || _a === void 0 ? void 0 : _a.VerificationStatus) === "Success"
                        }];
                case 2:
                    if (event.RequestType === "Delete") {
                        return [2 /*return*/, { IsComplete: true }];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
exports.isCompleteHandler = isCompleteHandler;
