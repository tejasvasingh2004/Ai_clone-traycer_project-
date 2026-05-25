"use strict";
/**
 * Approval module for Traycer-mini
 * Applies staged code proposals to the actual codebase
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
exports.approveProposal = approveProposal;
exports.approveAll = approveAll;
exports.rejectProposal = rejectProposal;
var promises_1 = require("fs/promises");
var path_1 = require("path");
var chalk_1 = require("chalk");
var ora_1 = require("ora");
var prompts_1 = require("prompts");
var config_js_1 = require("./config.js");
/**
 * Read the staging index file
 * @returns Array of staging index entries
 */
function readStagingIndex() {
    return __awaiter(this, void 0, void 0, function () {
        var content, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, promises_1.readFile)(config_js_1.STAGING_INDEX_FILE, 'utf-8')];
                case 1:
                    content = _a.sent();
                    return [2 /*return*/, JSON.parse(content)];
                case 2:
                    error_1 = _a.sent();
                    // If file doesn't exist, return empty array
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Write the staging index file
 * @param index Array of staging index entries
 */
function writeStagingIndex(index) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, promises_1.writeFile)(config_js_1.STAGING_INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8')];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Find a proposal by file path or proposal ID
 * @param filePathOrProposalId File path or proposal ID to search for
 * @returns Staging index entry if found, null otherwise
 */
function findProposal(filePathOrProposalId) {
    return __awaiter(this, void 0, void 0, function () {
        var index, entry;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, readStagingIndex()];
                case 1:
                    index = _a.sent();
                    entry = index.find(function (e) { return e.id === filePathOrProposalId; });
                    // If not found, try to match by file path
                    if (!entry) {
                        entry = index.find(function (e) { return e.filePath === filePathOrProposalId; });
                    }
                    return [2 /*return*/, entry || null];
            }
        });
    });
}
/**
 * Approve and apply a staged code proposal to the codebase
 * @param filePathOrProposalId File path or proposal ID to approve
 * @param skipConfirmation Skip the confirmation prompt (for batch operations)
 */
function approveProposal(filePathOrProposalId_1) {
    return __awaiter(this, arguments, void 0, function (filePathOrProposalId, skipConfirmation) {
        var entry, proposalPath, proposal, content, error_2, response, spinner, targetDir, index, indexEntry, error_3;
        if (skipConfirmation === void 0) { skipConfirmation = false; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, findProposal(filePathOrProposalId)];
                case 1:
                    entry = _a.sent();
                    if (!entry) {
                        throw new Error("Proposal not found: ".concat(filePathOrProposalId));
                    }
                    proposalPath = (0, path_1.join)(config_js_1.STAGING_DIR, "".concat(entry.id, ".json"));
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, (0, promises_1.readFile)(proposalPath, 'utf-8')];
                case 3:
                    content = _a.sent();
                    proposal = JSON.parse(content);
                    return [3 /*break*/, 5];
                case 4:
                    error_2 = _a.sent();
                    throw new Error("Failed to read proposal file: ".concat(proposalPath));
                case 5:
                    if (!!skipConfirmation) return [3 /*break*/, 7];
                    return [4 /*yield*/, (0, prompts_1.default)({
                            type: 'confirm',
                            name: 'confirmed',
                            message: "Apply this change to ".concat(chalk_1.default.cyan(proposal.filePath), " (").concat(chalk_1.default.yellow(proposal.operation), ")?"),
                            initial: true,
                        })];
                case 6:
                    response = _a.sent();
                    if (!response.confirmed) {
                        console.log(chalk_1.default.yellow('Approval cancelled'));
                        return [2 /*return*/];
                    }
                    _a.label = 7;
                case 7:
                    spinner = (0, ora_1.default)("Applying changes to ".concat(proposal.filePath, "...")).start();
                    _a.label = 8;
                case 8:
                    _a.trys.push([8, 15, , 16]);
                    targetDir = (0, path_1.dirname)(proposal.filePath);
                    return [4 /*yield*/, (0, promises_1.mkdir)(targetDir, { recursive: true })];
                case 9:
                    _a.sent();
                    // Write new content to target file
                    return [4 /*yield*/, (0, promises_1.writeFile)(proposal.filePath, proposal.newContent, 'utf-8')];
                case 10:
                    // Write new content to target file
                    _a.sent();
                    // Update proposal status
                    proposal.approved = true;
                    return [4 /*yield*/, (0, promises_1.writeFile)(proposalPath, JSON.stringify(proposal, null, 2), 'utf-8')];
                case 11:
                    _a.sent();
                    return [4 /*yield*/, readStagingIndex()];
                case 12:
                    index = _a.sent();
                    indexEntry = index.find(function (e) { return e.id === entry.id; });
                    if (!indexEntry) return [3 /*break*/, 14];
                    indexEntry.approved = true;
                    return [4 /*yield*/, writeStagingIndex(index)];
                case 13:
                    _a.sent();
                    _a.label = 14;
                case 14:
                    // Stop spinner and show success
                    spinner.succeed(chalk_1.default.green("\u2713 Applied changes to ".concat(proposal.filePath)));
                    return [3 /*break*/, 16];
                case 15:
                    error_3 = _a.sent();
                    spinner.fail(chalk_1.default.red("Failed to apply changes to ".concat(proposal.filePath)));
                    if (error_3 instanceof Error) {
                        if (error_3.message.includes('EACCES')) {
                            throw new Error("Permission denied: Cannot write to ".concat(proposal.filePath));
                        }
                        else if (error_3.message.includes('ENOSPC')) {
                            throw new Error('No space left on device');
                        }
                        else {
                            throw new Error("Failed to write file: ".concat(error_3.message));
                        }
                    }
                    throw error_3;
                case 16: return [2 /*return*/];
            }
        });
    });
}
/**
 * Approve all pending staged proposals
 */
function approveAll() {
    return __awaiter(this, void 0, void 0, function () {
        var index, pendingProposals, results, _i, pendingProposals_1, entry, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, readStagingIndex()];
                case 1:
                    index = _a.sent();
                    pendingProposals = index.filter(function (e) { return !e.approved; });
                    if (pendingProposals.length === 0) {
                        console.log(chalk_1.default.yellow('No pending proposals to approve'));
                        return [2 /*return*/];
                    }
                    console.log(chalk_1.default.cyan("\nApproving ".concat(pendingProposals.length, " pending proposal(s)...\n")));
                    results = {
                        success: [],
                        failed: [],
                    };
                    _i = 0, pendingProposals_1 = pendingProposals;
                    _a.label = 2;
                case 2:
                    if (!(_i < pendingProposals_1.length)) return [3 /*break*/, 7];
                    entry = pendingProposals_1[_i];
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, approveProposal(entry.id, true)];
                case 4:
                    _a.sent(); // Skip confirmation
                    results.success.push(entry.filePath);
                    return [3 /*break*/, 6];
                case 5:
                    error_4 = _a.sent();
                    results.failed.push(entry.filePath);
                    console.error(chalk_1.default.red("Error approving ".concat(entry.filePath, ":")), error_4 instanceof Error ? error_4.message : error_4);
                    return [3 /*break*/, 6];
                case 6:
                    _i++;
                    return [3 /*break*/, 2];
                case 7:
                    // Show summary
                    console.log(chalk_1.default.cyan('\n=== Approval Summary ==='));
                    console.log(chalk_1.default.green("\u2713 Successfully applied: ".concat(results.success.length)));
                    if (results.success.length > 0) {
                        results.success.forEach(function (file) { return console.log(chalk_1.default.green("  - ".concat(file))); });
                    }
                    if (results.failed.length > 0) {
                        console.log(chalk_1.default.red("\u2717 Failed: ".concat(results.failed.length)));
                        results.failed.forEach(function (file) { return console.log(chalk_1.default.red("  - ".concat(file))); });
                    }
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Reject a staged proposal and remove it from staging
 * @param filePathOrProposalId File path or proposal ID to reject
 */
function rejectProposal(filePathOrProposalId) {
    return __awaiter(this, void 0, void 0, function () {
        var entry, proposalPath, index, updatedIndex, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, findProposal(filePathOrProposalId)];
                case 1:
                    entry = _a.sent();
                    if (!entry) {
                        throw new Error("Proposal not found: ".concat(filePathOrProposalId));
                    }
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 6, , 7]);
                    proposalPath = (0, path_1.join)(config_js_1.STAGING_DIR, "".concat(entry.id, ".json"));
                    return [4 /*yield*/, (0, promises_1.unlink)(proposalPath)];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, readStagingIndex()];
                case 4:
                    index = _a.sent();
                    updatedIndex = index.filter(function (e) { return e.id !== entry.id; });
                    return [4 /*yield*/, writeStagingIndex(updatedIndex)];
                case 5:
                    _a.sent();
                    console.log(chalk_1.default.yellow("Rejected proposal for ".concat(entry.filePath)));
                    return [3 /*break*/, 7];
                case 6:
                    error_5 = _a.sent();
                    if (error_5 instanceof Error) {
                        throw new Error("Failed to reject proposal: ".concat(error_5.message));
                    }
                    throw error_5;
                case 7: return [2 /*return*/];
            }
        });
    });
}
