"use strict";
/**
 * Review module for Traycer-mini
 * Displays staged code proposals and their diffs
 */
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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewProposals = reviewProposals;
exports.interactiveReview = interactiveReview;
var promises_1 = require("fs/promises");
var path_1 = require("path");
var chalk_1 = require("chalk");
var prompts_1 = require("prompts");
var config_js_1 = require("./config.js");
/**
 * Format diff content with syntax highlighting
 * @param diff - The diff string to format
 * @returns Formatted diff with colors
 */
function formatDiff(diff) {
    return diff
        .split('\n')
        .map(function (line) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
            return chalk_1.default.green(line);
        }
        else if (line.startsWith('-') && !line.startsWith('---')) {
            return chalk_1.default.red(line);
        }
        else if (line.startsWith('@@')) {
            return chalk_1.default.cyan(line);
        }
        else if (line.startsWith('+++') || line.startsWith('---')) {
            return chalk_1.default.gray(line);
        }
        return line;
    })
        .join('\n');
}
/**
 * Review staged code proposals with diffs
 * Displays all staged proposals in a formatted view
 */
function reviewProposals() {
    return __awaiter(this, void 0, void 0, function () {
        var error_1, indexData, indexContent, error_2, proposals, _i, indexData_1, indexEntry, proposalPath, proposalContent, proposal, error_3, i, proposal, totalCount, approvedCount, pendingCount, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 15, , 16]);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, promises_1.stat)(config_js_1.STAGING_DIR)];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    console.log(chalk_1.default.yellow('No staged proposals to review'));
                    return [2 /*return*/];
                case 4:
                    indexData = void 0;
                    _a.label = 5;
                case 5:
                    _a.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, (0, promises_1.readFile)(config_js_1.STAGING_INDEX_FILE, 'utf-8')];
                case 6:
                    indexContent = _a.sent();
                    indexData = JSON.parse(indexContent);
                    return [3 /*break*/, 8];
                case 7:
                    error_2 = _a.sent();
                    console.log(chalk_1.default.yellow('No staged proposals to review'));
                    return [2 /*return*/];
                case 8:
                    // Check if there are any proposals
                    if (!indexData || indexData.length === 0) {
                        console.log(chalk_1.default.yellow('No staged proposals to review'));
                        return [2 /*return*/];
                    }
                    proposals = [];
                    _i = 0, indexData_1 = indexData;
                    _a.label = 9;
                case 9:
                    if (!(_i < indexData_1.length)) return [3 /*break*/, 14];
                    indexEntry = indexData_1[_i];
                    _a.label = 10;
                case 10:
                    _a.trys.push([10, 12, , 13]);
                    proposalPath = (0, path_1.join)(config_js_1.STAGING_DIR, "".concat(indexEntry.id, ".json"));
                    return [4 /*yield*/, (0, promises_1.readFile)(proposalPath, 'utf-8')];
                case 11:
                    proposalContent = _a.sent();
                    proposal = JSON.parse(proposalContent);
                    proposals.push(proposal);
                    return [3 /*break*/, 13];
                case 12:
                    error_3 = _a.sent();
                    console.error(chalk_1.default.red("Error reading proposal ".concat(indexEntry.id, ": ").concat(error_3)));
                    return [3 /*break*/, 13];
                case 13:
                    _i++;
                    return [3 /*break*/, 9];
                case 14:
                    if (proposals.length === 0) {
                        console.log(chalk_1.default.yellow('No valid proposals found'));
                        return [2 /*return*/];
                    }
                    // Display proposals list
                    console.log(chalk_1.default.bold.blue('\n📋 Staged Code Proposals:\n'));
                    proposals.forEach(function (proposal, index) {
                        var statusColor = proposal.approved ? chalk_1.default.green : chalk_1.default.yellow;
                        var statusText = proposal.approved ? 'approved' : 'pending';
                        var operationColor = proposal.operation === 'create' ? chalk_1.default.cyan : chalk_1.default.magenta;
                        console.log("".concat(chalk_1.default.bold("[".concat(index + 1, "]")), " ").concat(chalk_1.default.white(proposal.filePath), " ") +
                            "".concat(operationColor("(".concat(proposal.operation, ")")), " ").concat(statusColor("[".concat(statusText, "]"))));
                    });
                    console.log(''); // Empty line
                    // Display each proposal with diff
                    for (i = 0; i < proposals.length; i++) {
                        proposal = proposals[i];
                        console.log(chalk_1.default.gray('─'.repeat(80)));
                        console.log(chalk_1.default.bold.white("\n\uD83D\uDCC4 File: ".concat(proposal.filePath)));
                        console.log(chalk_1.default.gray("Operation: ".concat(proposal.operation)));
                        console.log(chalk_1.default.gray("Created: ".concat(new Date(proposal.createdAt).toLocaleString())));
                        console.log('');
                        // Display formatted diff
                        console.log(formatDiff(proposal.diff));
                        console.log('');
                        console.log(chalk_1.default.gray('─'.repeat(80)));
                        console.log('');
                    }
                    totalCount = proposals.length;
                    approvedCount = proposals.filter(function (p) { return p.approved; }).length;
                    pendingCount = totalCount - approvedCount;
                    console.log(chalk_1.default.bold.blue('📊 Summary:'));
                    console.log("   Total proposals: ".concat(chalk_1.default.bold(totalCount.toString())));
                    console.log("   Approved: ".concat(chalk_1.default.green(approvedCount.toString())));
                    console.log("   Pending: ".concat(chalk_1.default.yellow(pendingCount.toString())));
                    console.log('');
                    console.log(chalk_1.default.gray('💡 Use \'traycer-mini approve <file>\' to apply changes'));
                    console.log('');
                    return [3 /*break*/, 16];
                case 15:
                    error_4 = _a.sent();
                    if (error_4 instanceof Error) {
                        console.error(chalk_1.default.red("Error reviewing proposals: ".concat(error_4.message)));
                    }
                    else {
                        console.error(chalk_1.default.red('An unknown error occurred while reviewing proposals'));
                    }
                    throw error_4;
                case 16: return [2 /*return*/];
            }
        });
    });
}
/**
 * Interactive review with batch approval
 * Displays all diffs and allows user to select files to approve
 * @returns Array of selected file paths to approve
 */
function interactiveReview() {
    return __awaiter(this, void 0, void 0, function () {
        var error_5, indexData, indexContent, error_6, proposals, _i, indexData_2, indexEntry, proposalPath, proposalContent, proposal, error_7, pendingProposals, choices, response, error_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 17, , 18]);
                    // First, display all proposals
                    return [4 /*yield*/, reviewProposals()];
                case 1:
                    // First, display all proposals
                    _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, (0, promises_1.stat)(config_js_1.STAGING_DIR)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    error_5 = _a.sent();
                    return [2 /*return*/, []];
                case 5:
                    indexData = void 0;
                    _a.label = 6;
                case 6:
                    _a.trys.push([6, 8, , 9]);
                    return [4 /*yield*/, (0, promises_1.readFile)(config_js_1.STAGING_INDEX_FILE, 'utf-8')];
                case 7:
                    indexContent = _a.sent();
                    indexData = JSON.parse(indexContent);
                    return [3 /*break*/, 9];
                case 8:
                    error_6 = _a.sent();
                    return [2 /*return*/, []];
                case 9:
                    if (!indexData || indexData.length === 0) {
                        return [2 /*return*/, []];
                    }
                    proposals = [];
                    _i = 0, indexData_2 = indexData;
                    _a.label = 10;
                case 10:
                    if (!(_i < indexData_2.length)) return [3 /*break*/, 15];
                    indexEntry = indexData_2[_i];
                    _a.label = 11;
                case 11:
                    _a.trys.push([11, 13, , 14]);
                    proposalPath = (0, path_1.join)(config_js_1.STAGING_DIR, "".concat(indexEntry.id, ".json"));
                    return [4 /*yield*/, (0, promises_1.readFile)(proposalPath, 'utf-8')];
                case 12:
                    proposalContent = _a.sent();
                    proposal = JSON.parse(proposalContent);
                    proposals.push(proposal);
                    return [3 /*break*/, 14];
                case 13:
                    error_7 = _a.sent();
                    // Skip corrupted proposals
                    return [3 /*break*/, 14];
                case 14:
                    _i++;
                    return [3 /*break*/, 10];
                case 15:
                    pendingProposals = proposals.filter(function (p) { return !p.approved; });
                    if (pendingProposals.length === 0) {
                        console.log(chalk_1.default.yellow('No pending proposals to approve'));
                        return [2 /*return*/, []];
                    }
                    choices = pendingProposals.map(function (proposal) { return ({
                        title: "".concat(proposal.filePath, " (").concat(proposal.operation, ")"),
                        value: proposal.filePath,
                        selected: false,
                    }); });
                    return [4 /*yield*/, (0, prompts_1.default)({
                            type: 'multiselect',
                            name: 'files',
                            message: 'Select files to approve (use space to select, enter to confirm):',
                            choices: choices,
                            hint: '- Space to select. Return to submit',
                        })];
                case 16:
                    response = _a.sent();
                    // Handle user cancellation (Ctrl+C)
                    if (response.files === undefined) {
                        console.log(chalk_1.default.yellow('\nInteractive review cancelled'));
                        return [2 /*return*/, []];
                    }
                    return [2 /*return*/, response.files];
                case 17:
                    error_8 = _a.sent();
                    if (error_8 instanceof Error) {
                        console.error(chalk_1.default.red("Error in interactive review: ".concat(error_8.message)));
                    }
                    else {
                        console.error(chalk_1.default.red('An unknown error occurred during interactive review'));
                    }
                    throw error_8;
                case 18: return [2 /*return*/];
            }
        });
    });
}
