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
exports.generateCode = generateCode;
/**
 * Code generation module for Traycer-mini
 * Uses AI to generate code based on plan steps
 */
require("dotenv/config");
var openai_1 = require("openai");
var sdk_1 = require("@anthropic-ai/sdk");
var generative_ai_1 = require("@google/generative-ai");
var promises_1 = require("fs/promises");
var path_1 = require("path");
var diff_1 = require("diff");
var chalk_1 = require("chalk");
var ora_1 = require("ora");
var config_js_1 = require("./config.js");
/**
 * Convert file path to safe filename for staging
 * @param filePath - Original file path
 * @returns Sanitized filename
 */
function sanitizeFilename(filePath) {
    return filePath
        .replace(/\\/g, '-')
        .replace(/\//g, '-')
        .replace(/[^a-zA-Z0-9.-]/g, '_');
}
/**
 * Generate code based on a plan file
 * @param planPath - Path to the plan JSON file
 * @returns Array of staged proposals
 */
function generateCode(planPath) {
    return __awaiter(this, void 0, void 0, function () {
        var spinner, planContent, plan, config, stagedProposals, openaiClient, anthropicClient, googleClient, _loop_1, _i, _a, filePath, stagingIndex, indexContent, _b, _c, stagedProposals_1, proposal, error_1;
        var _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    spinner = (0, ora_1.default)('Reading plan...').start();
                    _g.label = 1;
                case 1:
                    _g.trys.push([1, 12, , 13]);
                    return [4 /*yield*/, (0, promises_1.readFile)(planPath, 'utf-8')];
                case 2:
                    planContent = _g.sent();
                    plan = JSON.parse(planContent);
                    // 2. Validate plan structure
                    if (!plan.taskName || !plan.steps || !plan.filesToModify) {
                        throw new Error('Invalid plan structure: missing required fields (taskName, steps, filesToModify)');
                    }
                    if (!Array.isArray(plan.steps) || !Array.isArray(plan.filesToModify)) {
                        throw new Error('Invalid plan structure: steps and filesToModify must be arrays');
                    }
                    spinner.succeed(chalk_1.default.green("Plan loaded: ".concat(plan.taskName)));
                    config = (0, config_js_1.getAIConfig)();
                    console.log(chalk_1.default.blue("Using ".concat(config.provider, " (").concat(config.model, ")")));
                    // 4. Ensure staging directory exists
                    (0, config_js_1.ensureDirectories)();
                    stagedProposals = [];
                    openaiClient = null;
                    anthropicClient = null;
                    googleClient = null;
                    if (config.provider === 'openai') {
                        openaiClient = new openai_1.default({ apiKey: config.apiKey });
                    }
                    else if (config.provider === 'google') {
                        googleClient = new generative_ai_1.GoogleGenerativeAI(config.apiKey);
                    }
                    else if (config.provider === 'anthropic') {
                        anthropicClient = new sdk_1.default({ apiKey: config.apiKey });
                    }
                    _loop_1 = function (filePath) {
                        var relevantSteps, stepsToUse, fileExists, existingContent, _h, systemPrompt, userPrompt, generatedCode, response, response, content, model, prompt_1, result, codeBlockRegex, match, diffContent, lines, timestamp, sanitizedFilename, proposalId, proposal, proposalPath, error_2;
                        return __generator(this, function (_j) {
                            switch (_j.label) {
                                case 0:
                                    spinner.start(chalk_1.default.cyan("Generating code for ".concat(filePath, "...")));
                                    _j.label = 1;
                                case 1:
                                    _j.trys.push([1, 14, , 15]);
                                    relevantSteps = plan.steps.filter(function (step) {
                                        var _a;
                                        return step.toLowerCase().includes(filePath.toLowerCase()) ||
                                            step.toLowerCase().includes(((_a = filePath.split('/').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '');
                                    });
                                    stepsToUse = relevantSteps.length > 0 ? relevantSteps : plan.steps;
                                    fileExists = false;
                                    existingContent = '';
                                    _j.label = 2;
                                case 2:
                                    _j.trys.push([2, 5, , 6]);
                                    return [4 /*yield*/, (0, promises_1.access)(filePath)];
                                case 3:
                                    _j.sent();
                                    return [4 /*yield*/, (0, promises_1.readFile)(filePath, 'utf-8')];
                                case 4:
                                    existingContent = _j.sent();
                                    fileExists = true;
                                    return [3 /*break*/, 6];
                                case 5:
                                    _h = _j.sent();
                                    fileExists = false;
                                    return [3 /*break*/, 6];
                                case 6:
                                    systemPrompt = 'You are an expert TypeScript developer. Generate clean, production-ready code. ' +
                                        'Return ONLY the complete file content, no explanations or markdown code blocks.';
                                    userPrompt = "Task: ".concat(plan.taskName, "\n\n");
                                    userPrompt += "Steps to implement:\n".concat(stepsToUse.map(function (step, i) { return "".concat(i + 1, ". ").concat(step); }).join('\n'), "\n\n");
                                    userPrompt += "File: ".concat(filePath, "\n");
                                    userPrompt += "Operation: ".concat(fileExists ? 'Modify existing file' : 'Create new file', "\n\n");
                                    if (fileExists) {
                                        userPrompt += "Current file content:\n```typescript\n".concat(existingContent, "\n```\n\n");
                                    }
                                    userPrompt += "Generate the complete TypeScript code for this file. Return only the code, no explanations.";
                                    generatedCode = '';
                                    if (!(config.provider === 'openai' && openaiClient)) return [3 /*break*/, 8];
                                    return [4 /*yield*/, openaiClient.chat.completions.create({
                                            model: config.model,
                                            messages: [
                                                { role: 'system', content: systemPrompt },
                                                { role: 'user', content: userPrompt }
                                            ],
                                            temperature: config.temperature,
                                        })];
                                case 7:
                                    response = _j.sent();
                                    generatedCode = ((_e = (_d = response.choices[0]) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.content) || '';
                                    return [3 /*break*/, 12];
                                case 8:
                                    if (!(config.provider === 'anthropic' && anthropicClient)) return [3 /*break*/, 10];
                                    return [4 /*yield*/, anthropicClient.messages.create({
                                            model: config.model,
                                            max_tokens: 4000,
                                            temperature: config.temperature,
                                            system: systemPrompt,
                                            messages: [
                                                { role: 'user', content: userPrompt }
                                            ],
                                        })];
                                case 9:
                                    response = _j.sent();
                                    content = response.content[0];
                                    if (content.type === 'text') {
                                        generatedCode = content.text;
                                    }
                                    return [3 /*break*/, 12];
                                case 10:
                                    if (!(config.provider === 'google' && googleClient)) return [3 /*break*/, 12];
                                    model = googleClient.getGenerativeModel({ model: config.model || "gemini-1.5-flash" });
                                    prompt_1 = "".concat(systemPrompt, "\n\nUser: ").concat(userPrompt);
                                    return [4 /*yield*/, model.generateContent({
                                            contents: [{ role: "user", parts: [{ text: prompt_1 }] }],
                                            generationConfig: {
                                                temperature: (_f = config.temperature) !== null && _f !== void 0 ? _f : 0.7,
                                                maxOutputTokens: 4096,
                                            },
                                        })];
                                case 11:
                                    result = _j.sent();
                                    generatedCode = result.response.text() || '';
                                    _j.label = 12;
                                case 12:
                                    // 8. Extract generated code (trim whitespace, remove markdown code fences)
                                    generatedCode = generatedCode.trim();
                                    codeBlockRegex = /^```(?:typescript|ts|javascript|js)?\n([\s\S]*?)\n```$/;
                                    match = generatedCode.match(codeBlockRegex);
                                    if (match) {
                                        generatedCode = match[1].trim();
                                    }
                                    diffContent = void 0;
                                    if (fileExists) {
                                        // Use diff.createPatch for existing files
                                        diffContent = (0, diff_1.createPatch)(filePath, existingContent, generatedCode, 'existing', 'proposed');
                                    }
                                    else {
                                        lines = generatedCode.split('\n');
                                        diffContent = "--- /dev/null\n+++ ".concat(filePath, "\n@@ -0,0 +1,").concat(lines.length, " @@\n");
                                        diffContent += lines.map(function (line) { return "+".concat(line); }).join('\n');
                                    }
                                    timestamp = Date.now();
                                    sanitizedFilename = sanitizeFilename(filePath);
                                    proposalId = "".concat(plan.id, "-").concat(sanitizedFilename, "-").concat(timestamp);
                                    proposal = {
                                        id: proposalId,
                                        planId: plan.id,
                                        filePath: filePath,
                                        newContent: generatedCode,
                                        diff: diffContent,
                                        operation: fileExists ? 'modify' : 'create',
                                        approved: false,
                                        createdAt: new Date().toISOString(),
                                    };
                                    proposalPath = (0, path_1.join)(config_js_1.STAGING_DIR, "".concat(proposalId, ".json"));
                                    return [4 /*yield*/, (0, promises_1.writeFile)(proposalPath, JSON.stringify(proposal, null, 2), 'utf-8')];
                                case 13:
                                    _j.sent();
                                    // 12. Add proposal to array
                                    stagedProposals.push(proposal);
                                    // 13. Update spinner to show completion
                                    spinner.succeed(chalk_1.default.green("\u2713 Generated code for ".concat(filePath)));
                                    return [3 /*break*/, 15];
                                case 14:
                                    error_2 = _j.sent();
                                    spinner.fail(chalk_1.default.red("\u2717 Failed to generate code for ".concat(filePath)));
                                    console.error(chalk_1.default.red("Error: ".concat(error_2 instanceof Error ? error_2.message : String(error_2))));
                                    throw error_2;
                                case 15: return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, _a = plan.filesToModify;
                    _g.label = 3;
                case 3:
                    if (!(_i < _a.length)) return [3 /*break*/, 6];
                    filePath = _a[_i];
                    return [5 /*yield**/, _loop_1(filePath)];
                case 4:
                    _g.sent();
                    _g.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6:
                    stagingIndex = [];
                    _g.label = 7;
                case 7:
                    _g.trys.push([7, 9, , 10]);
                    return [4 /*yield*/, (0, promises_1.readFile)(config_js_1.STAGING_INDEX_FILE, 'utf-8')];
                case 8:
                    indexContent = _g.sent();
                    stagingIndex = JSON.parse(indexContent);
                    return [3 /*break*/, 10];
                case 9:
                    _b = _g.sent();
                    // File doesn't exist or is invalid, start with empty array
                    stagingIndex = [];
                    return [3 /*break*/, 10];
                case 10:
                    // Append new proposal IDs with metadata
                    for (_c = 0, stagedProposals_1 = stagedProposals; _c < stagedProposals_1.length; _c++) {
                        proposal = stagedProposals_1[_c];
                        stagingIndex.push({
                            id: proposal.id,
                            planId: proposal.planId,
                            filePath: proposal.filePath,
                            createdAt: proposal.createdAt,
                        });
                    }
                    // Write back to staging/index.json
                    return [4 /*yield*/, (0, promises_1.writeFile)(config_js_1.STAGING_INDEX_FILE, JSON.stringify(stagingIndex, null, 2), 'utf-8')];
                case 11:
                    // Write back to staging/index.json
                    _g.sent();
                    // 15. Show success summary
                    console.log(chalk_1.default.green.bold("\n\u2713 Generated ".concat(stagedProposals.length, " code proposal").concat(stagedProposals.length === 1 ? '' : 's', " in staging/")));
                    console.log(chalk_1.default.blue("\nNext step: Run 'traycer-mini review' to see the changes"));
                    // 16. Return array of staged proposals
                    return [2 /*return*/, stagedProposals];
                case 12:
                    error_1 = _g.sent();
                    spinner.fail(chalk_1.default.red('Failed to generate code'));
                    if (error_1 instanceof Error) {
                        if (error_1.message.includes('ENOENT')) {
                            console.error(chalk_1.default.red("\nError: Plan file not found at ".concat(planPath)));
                        }
                        else if (error_1.message.includes('JSON')) {
                            console.error(chalk_1.default.red("\nError: Invalid JSON in plan file"));
                        }
                        else if (error_1.message.includes('API')) {
                            console.error(chalk_1.default.red("\nError: AI API error - ".concat(error_1.message)));
                        }
                        else {
                            console.error(chalk_1.default.red("\nError: ".concat(error_1.message)));
                        }
                    }
                    else {
                        console.error(chalk_1.default.red("\nUnexpected error: ".concat(String(error_1))));
                    }
                    throw error_1;
                case 13: return [2 /*return*/];
            }
        });
    });
}
