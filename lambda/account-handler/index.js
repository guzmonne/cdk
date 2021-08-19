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
/**
 * onEventHandler creates an account into an AWS Organisation
 * @param event - An event with the following ResourceProperties:
 * @property event.Email - Account email
 * @property event.AccountName - Account name
 * @returns A PhysicalResourceId corresponding to the CreateAccount request's id necessary to
 *          check the status of the creation
 */
function onEventHandler(event) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var _b, awsOrganizationsClient, tags_1, data, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log("Event: %j", event);
                    _b = event.RequestType;
                    switch (_b) {
                        case "Create": return [3 /*break*/, 1];
                        case "Update": return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 6];
                case 1:
                    awsOrganizationsClient = new aws_sdk_1.Organizations({ region: 'us-east-1' });
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 4, , 5]);
                    tags_1 = [];
                    Object.keys(event.ResourceProperties).forEach(function (propertyKey) {
                        if (propertyKey != 'ServiceToken') {
                            tags_1.push({
                                Key: propertyKey, Value: event.ResourceProperties[propertyKey]
                            });
                        }
                    });
                    return [4 /*yield*/, awsOrganizationsClient
                            .createAccount({
                            Email: event.ResourceProperties.Email,
                            AccountName: event.ResourceProperties.AccountName,
                            Tags: tags_1
                        })
                            .promise()];
                case 3:
                    data = _c.sent();
                    console.log("create account: %j", data);
                    return [2 /*return*/, { PhysicalResourceId: (_a = data.CreateAccountStatus) === null || _a === void 0 ? void 0 : _a.Id }];
                case 4:
                    error_1 = _c.sent();
                    throw new Error("Failed to create account: " + error_1);
                case 5: return [2 /*return*/, { PhysicalResourceId: event.PhysicalResourceId, ResourceProperties: event.ResourceProperties }];
                case 6: throw new Error(event.RequestType + " is not a supported operation");
            }
        });
    });
}
exports.onEventHandler = onEventHandler;
/**
 * isCompleteHandler is capable to check if an account creation request has been completed
 * @param event An event containing a PhysicalResourceId corresponding to a CreateAccountRequestId
 * @returns A payload containing the IsComplete Flag requested by cdk Custom Resource fwk to figure out
 *          if the resource has been created or failed to be or if it needs to retry
 */
function isCompleteHandler(event) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var awsOrganizationsClient, describeCreateAccountStatusParams, data, CreateAccountStatus, AccountId, _c, tags_2, tagsUpdateRequestData;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    console.log("Event: %j", event);
                    if (!event.PhysicalResourceId) {
                        throw new Error("Missing PhysicalResourceId parameter.");
                    }
                    awsOrganizationsClient = new aws_sdk_1.Organizations({ region: 'us-east-1' });
                    describeCreateAccountStatusParams = {
                        CreateAccountRequestId: event.PhysicalResourceId
                    };
                    return [4 /*yield*/, awsOrganizationsClient.describeCreateAccountStatus(describeCreateAccountStatusParams).promise()];
                case 1:
                    data = (_d.sent());
                    console.log("Describe account: %j", data);
                    CreateAccountStatus = (_a = data.CreateAccountStatus) === null || _a === void 0 ? void 0 : _a.State;
                    AccountId = (_b = data.CreateAccountStatus) === null || _b === void 0 ? void 0 : _b.AccountId;
                    _c = event.RequestType;
                    switch (_c) {
                        case "Create": return [3 /*break*/, 2];
                        case "Update": return [3 /*break*/, 3];
                        case "Delete": return [3 /*break*/, 6];
                    }
                    return [3 /*break*/, 7];
                case 2: return [2 /*return*/, { IsComplete: CreateAccountStatus === "SUCCEEDED", Data: { AccountId: AccountId } }];
                case 3:
                    if (!AccountId) return [3 /*break*/, 5];
                    console.log("Add tags: type = " + event.ResourceProperties.AccountType);
                    tags_2 = [];
                    Object.keys(event.ResourceProperties).forEach(function (propertyKey) {
                        if (propertyKey != 'ServiceToken')
                            tags_2.push({ Key: propertyKey, Value: event.ResourceProperties[propertyKey] });
                    });
                    return [4 /*yield*/, awsOrganizationsClient
                            .tagResource({
                            ResourceId: AccountId,
                            Tags: tags_2
                        })
                            .promise()];
                case 4:
                    tagsUpdateRequestData = _d.sent();
                    console.log("Updated account tags: %j", tagsUpdateRequestData);
                    _d.label = 5;
                case 5: return [2 /*return*/, { IsComplete: CreateAccountStatus === "SUCCEEDED", Data: { AccountId: AccountId } }];
                case 6: 
                // TODO: figure out what to do here
                throw new Error("DeleteAccount is not a supported operation");
                case 7: return [2 /*return*/];
            }
        });
    });
}
exports.isCompleteHandler = isCompleteHandler;
