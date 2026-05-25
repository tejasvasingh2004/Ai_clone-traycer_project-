#!/usr/bin/env node
"use strict";
/**
 * Main CLI entry point for Traycer-mini
 * Orchestrates all commands using Commander.js
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
exports.main = main;
var commander_1 = require("commander");
var chalk_1 = require("chalk");
var prompts_1 = require("prompts");
var promises_1 = require("fs/promises");
var path_1 = require("path");
var planner_js_1 = require("./planner.js");
var generator_js_1 = require("./generator.js");
var reviewer_js_1 = require("./reviewer.js");
var approver_js_1 = require("./approver.js");
var verifier_js_1 = require("./verifier.js");
var config_js_1 = require("./config.js");
/**
 * Check Node.js version requirement
 */
function checkNodeVersion() {
    var requiredVersion = 18;
    var currentVersion = parseInt(process.version.slice(1).split('.')[0]);
    if (currentVersion < requiredVersion) {
        console.error(chalk_1.default.red("Error: Node.js version ".concat(requiredVersion, ".0.0 or higher is required.")));
        console.error(chalk_1.default.red("Current version: ".concat(process.version)));
        process.exit(1);
    }
}
/**
 * Global error handler
 */
function handleError(error, command) {
    var debugMode = process.env.DEBUG === 'true' || process.env.DEBUG === '1';
    console.error(chalk_1.default.red("\n\u2717 Error".concat(command ? " in ".concat(command, " command") : '', ":")));
    if (error instanceof Error) {
        console.error(chalk_1.default.red(error.message));
        if (debugMode && error.stack) {
            console.error(chalk_1.default.gray('\nStack trace:'));
            console.error(chalk_1.default.gray(error.stack));
        }
    }
    else {
        console.error(chalk_1.default.red(String(error)));
    }
    if (!debugMode) {
        console.error(chalk_1.default.gray('\nRun with DEBUG=true for more details'));
    }
    process.exit(1);
}
/**
 * Main CLI program
 */
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var program;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Startup checks
                    checkNodeVersion();
                    (0, config_js_1.ensureDirectories)();
                    program = new commander_1.Command();
                    program
                        .name('traycer-mini')
                        .description('AI-powered code generation workflow tool')
                        .version('1.0.0');
                    // Plan command
                    program
                        .command('plan')
                        .description('Create a structured plan for a coding task')
                        .argument('<task>', 'Natural language description of the coding task')
                        .option('-g, --generate', 'Automatically generate code after creating the plan')
                        .action(function (task, options) { return __awaiter(_this, void 0, void 0, function () {
                        var plan, error_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, (0, planner_js_1.createPlan)(task, options.generate || false)];
                                case 1:
                                    plan = _a.sent();
                                    console.log(chalk_1.default.green.bold('\n✓ Plan created successfully!'));
                                    console.log(chalk_1.default.cyan("\nPlan ID: ".concat(plan.id)));
                                    console.log(chalk_1.default.cyan("Plan file: plans/".concat(plan.id, ".json")));
                                    if (options.generate) {
                                        console.log(chalk_1.default.gray("\n\uD83D\uDCA1 Next step: Run 'traycer-mini review' to see the generated code changes"));
                                    }
                                    else {
                                        console.log(chalk_1.default.gray("\n\uD83D\uDCA1 Next step: Run 'traycer-mini generate plans/".concat(plan.id, ".json' to generate code")));
                                    }
                                    return [3 /*break*/, 3];
                                case 2:
                                    error_1 = _a.sent();
                                    handleError(error_1, 'plan');
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    // Generate command
                    program
                        .command('generate')
                        .description('Generate code based on a plan file')
                        .argument('<plan-path>', 'Path to the plan JSON file')
                        .action(function (planPath) { return __awaiter(_this, void 0, void 0, function () {
                        var error_2, proposals, error_3;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 6, , 7]);
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, (0, promises_1.stat)(planPath)];
                                case 2:
                                    _a.sent();
                                    return [3 /*break*/, 4];
                                case 3:
                                    error_2 = _a.sent();
                                    throw new Error("Plan file not found: ".concat(planPath));
                                case 4: return [4 /*yield*/, (0, generator_js_1.generateCode)(planPath)];
                                case 5:
                                    proposals = _a.sent();
                                    console.log(chalk_1.default.green.bold("\n\u2713 Code generation completed!"));
                                    console.log(chalk_1.default.cyan("Generated ".concat(proposals.length, " proposal").concat(proposals.length !== 1 ? 's' : '')));
                                    console.log(chalk_1.default.gray("\n\uD83D\uDCA1 Next step: Run 'traycer-mini review' to see the changes"));
                                    return [3 /*break*/, 7];
                                case 6:
                                    error_3 = _a.sent();
                                    handleError(error_3, 'generate');
                                    return [3 /*break*/, 7];
                                case 7: return [2 /*return*/];
                            }
                        });
                    }); });
                    // Review command
                    program
                        .command('review')
                        .description('Review staged code proposals with diffs')
                        .option('-i, --interactive', 'Enable interactive approval mode')
                        .action(function (options) { return __awaiter(_this, void 0, void 0, function () {
                        var selectedFiles, _i, selectedFiles_1, file, error_4, error_5;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 13, , 14]);
                                    if (!options.interactive) return [3 /*break*/, 10];
                                    return [4 /*yield*/, (0, reviewer_js_1.interactiveReview)()];
                                case 1:
                                    selectedFiles = _a.sent();
                                    if (!(selectedFiles.length > 0)) return [3 /*break*/, 8];
                                    console.log(chalk_1.default.cyan("\nApproving ".concat(selectedFiles.length, " selected file(s)...\n")));
                                    _i = 0, selectedFiles_1 = selectedFiles;
                                    _a.label = 2;
                                case 2:
                                    if (!(_i < selectedFiles_1.length)) return [3 /*break*/, 7];
                                    file = selectedFiles_1[_i];
                                    _a.label = 3;
                                case 3:
                                    _a.trys.push([3, 5, , 6]);
                                    return [4 /*yield*/, (0, approver_js_1.approveProposal)(file, true)];
                                case 4:
                                    _a.sent(); // Skip individual confirmations
                                    return [3 /*break*/, 6];
                                case 5:
                                    error_4 = _a.sent();
                                    console.error(chalk_1.default.red("Failed to approve ".concat(file, ":")), error_4 instanceof Error ? error_4.message : error_4);
                                    return [3 /*break*/, 6];
                                case 6:
                                    _i++;
                                    return [3 /*break*/, 2];
                                case 7:
                                    console.log(chalk_1.default.green.bold('\n✓ Interactive approval completed!'));
                                    console.log(chalk_1.default.gray("\n\uD83D\uDCA1 Next step: Run 'traycer-mini verify' to check code quality"));
                                    return [3 /*break*/, 9];
                                case 8:
                                    console.log(chalk_1.default.yellow('\nNo files selected for approval'));
                                    _a.label = 9;
                                case 9: return [3 /*break*/, 12];
                                case 10: 
                                // Standard review mode: just show diffs
                                return [4 /*yield*/, (0, reviewer_js_1.reviewProposals)()];
                                case 11:
                                    // Standard review mode: just show diffs
                                    _a.sent();
                                    console.log(chalk_1.default.gray("\uD83D\uDCA1 Next step: Run 'traycer-mini approve <file>' to apply changes"));
                                    _a.label = 12;
                                case 12: return [3 /*break*/, 14];
                                case 13:
                                    error_5 = _a.sent();
                                    handleError(error_5, 'review');
                                    return [3 /*break*/, 14];
                                case 14: return [2 /*return*/];
                            }
                        });
                    }); });
                    // Approve command
                    program
                        .command('approve')
                        .description('Apply a staged proposal to the codebase')
                        .argument('[file]', 'File path or proposal ID to approve')
                        .option('--all', 'Approve all pending proposals')
                        .action(function (file, options) { return __awaiter(_this, void 0, void 0, function () {
                        var error_6;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 6, , 7]);
                                    if (!options.all) return [3 /*break*/, 2];
                                    // Approve all pending proposals
                                    return [4 /*yield*/, (0, approver_js_1.approveAll)()];
                                case 1:
                                    // Approve all pending proposals
                                    _a.sent();
                                    console.log(chalk_1.default.green.bold('\n✓ All pending proposals approved!'));
                                    console.log(chalk_1.default.gray("\n\uD83D\uDCA1 Next step: Run 'traycer-mini verify' to check code quality"));
                                    return [3 /*break*/, 5];
                                case 2:
                                    if (!file) return [3 /*break*/, 4];
                                    // Approve specific file
                                    return [4 /*yield*/, (0, approver_js_1.approveProposal)(file)];
                                case 3:
                                    // Approve specific file
                                    _a.sent();
                                    console.log(chalk_1.default.green.bold('\n✓ Proposal approved successfully!'));
                                    console.log(chalk_1.default.gray("\n\uD83D\uDCA1 Next step: Run 'traycer-mini verify' to check code quality"));
                                    return [3 /*break*/, 5];
                                case 4:
                                    console.error(chalk_1.default.red('Error: Please specify a file path or use --all flag'));
                                    console.log(chalk_1.default.gray('Usage: traycer-mini approve <file>'));
                                    console.log(chalk_1.default.gray('   or: traycer-mini approve --all'));
                                    process.exit(1);
                                    _a.label = 5;
                                case 5: return [3 /*break*/, 7];
                                case 6:
                                    error_6 = _a.sent();
                                    handleError(error_6, 'approve');
                                    return [3 /*break*/, 7];
                                case 7: return [2 /*return*/];
                            }
                        });
                    }); });
                    // Verify command
                    program
                        .command('verify')
                        .description('Run TypeScript and linting checks')
                        .action(function () { return __awaiter(_this, void 0, void 0, function () {
                        var result, error_7;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, (0, verifier_js_1.verifyCode)()];
                                case 1:
                                    result = _a.sent();
                                    if (result.success) {
                                        console.log(chalk_1.default.green.bold('\n✓ Verification passed!'));
                                        process.exit(0);
                                    }
                                    else {
                                        console.log(chalk_1.default.red.bold('\n✗ Verification failed'));
                                        console.log(chalk_1.default.gray('Fix the errors above and run verify again'));
                                        process.exit(1);
                                    }
                                    return [3 /*break*/, 3];
                                case 2:
                                    error_7 = _a.sent();
                                    handleError(error_7, 'verify');
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    // Clean command
                    program
                        .command('clean')
                        .description('Clear all staged proposals')
                        .action(function () { return __awaiter(_this, void 0, void 0, function () {
                        var error_8, response, files, deletedCount, _i, files_1, file, filePath, error_9;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 11, , 12]);
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, (0, promises_1.stat)(config_js_1.STAGING_DIR)];
                                case 2:
                                    _a.sent();
                                    return [3 /*break*/, 4];
                                case 3:
                                    error_8 = _a.sent();
                                    console.log(chalk_1.default.yellow('No staging directory found - nothing to clean'));
                                    return [2 /*return*/];
                                case 4: return [4 /*yield*/, (0, prompts_1.default)({
                                        type: 'confirm',
                                        name: 'confirmed',
                                        message: 'Are you sure you want to delete all staged proposals?',
                                        initial: false,
                                    })];
                                case 5:
                                    response = _a.sent();
                                    if (!response.confirmed) {
                                        console.log(chalk_1.default.yellow('Clean operation cancelled'));
                                        return [2 /*return*/];
                                    }
                                    return [4 /*yield*/, (0, promises_1.readdir)(config_js_1.STAGING_DIR)];
                                case 6:
                                    files = _a.sent();
                                    deletedCount = 0;
                                    _i = 0, files_1 = files;
                                    _a.label = 7;
                                case 7:
                                    if (!(_i < files_1.length)) return [3 /*break*/, 10];
                                    file = files_1[_i];
                                    if (!(file !== '.gitkeep')) return [3 /*break*/, 9];
                                    filePath = (0, path_1.join)(config_js_1.STAGING_DIR, file);
                                    return [4 /*yield*/, (0, promises_1.unlink)(filePath)];
                                case 8:
                                    _a.sent();
                                    deletedCount++;
                                    _a.label = 9;
                                case 9:
                                    _i++;
                                    return [3 /*break*/, 7];
                                case 10:
                                    console.log(chalk_1.default.green("\u2713 Deleted ".concat(deletedCount, " staged proposal").concat(deletedCount !== 1 ? 's' : '')));
                                    return [3 /*break*/, 12];
                                case 11:
                                    error_9 = _a.sent();
                                    handleError(error_9, 'clean');
                                    return [3 /*break*/, 12];
                                case 12: return [2 /*return*/];
                            }
                        });
                    }); });
                    // Parse arguments
                    return [4 /*yield*/, program.parseAsync(process.argv)];
                case 1:
                    // Parse arguments
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// Run main function
main().catch(function (error) {
    handleError(error);
});
