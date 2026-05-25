"use strict";
/**
 * Planning module for Traycer-mini
 * Converts natural language tasks into structured plans using AI
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
exports.createPlan = createPlan;
var openai_1 = require("openai");
var sdk_1 = require("@anthropic-ai/sdk");
var generative_ai_1 = require("@google/generative-ai");
var promises_1 = require("fs/promises");
var path_1 = require("path");
var chalk_1 = require("chalk");
var ora_1 = require("ora");
var config_js_1 = require("./config.js");
var generator_js_1 = require("./generator.js");
/**
 * Get all files in the project directory recursively
 * @param dir - Directory to scan
 * @returns Promise<string[]> - Array of file paths relative to dir
 */
function getProjectFiles(dir) {
    return __awaiter(this, void 0, void 0, function () {
        var files;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, promises_1.readdir)(dir, { recursive: true })];
                case 1:
                    files = _a.sent();
                    return [2 /*return*/, files.map(function (f) { return f.toString(); }).filter(function (f) { return !f.includes('node_modules') && !f.includes('.git'); })];
            }
        });
    });
}
/**
 * Slugify a string to create a safe filename
 * @param text - Text to slugify
 * @returns Slugified string
 */
function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50); // Limit length
}
/**
 * Create a structured plan for a coding task using AI
 * @param taskDescription - Natural language description of the coding task
 * @param autoGenerateCode - Whether to automatically generate code after creating the plan
 * @returns Promise<Plan> - The generated plan object
 */
function createPlan(taskDescription_1) {
    return __awaiter(this, arguments, void 0, function (taskDescription, autoGenerateCode) {
        var spinner, config, projectFiles, systemPrompt, userPrompt, responseText, openai, completion, anthropic, message, content, genAI, model, prompt_1, result, parsedResponse, timestamp, slugifiedTask, planId, plan, planPath, proposals, error_1, error_2;
        var _a, _b, _c;
        if (autoGenerateCode === void 0) { autoGenerateCode = false; }
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    spinner = (0, ora_1.default)('Creating plan...').start();
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 14, , 15]);
                    config = (0, config_js_1.getAIConfig)();
                    return [4 /*yield*/, getProjectFiles(process.cwd())];
                case 2:
                    projectFiles = _d.sent();
                    systemPrompt = 'You are an expert software architect. Given a coding task and the list of project files, break it down into clear, actionable steps and identify all files that need to be created or modified.\n' +
                        'Return ONLY valid JSON matching this schema: {taskName: string, steps: string[], filesToModify: string[]}\n' +
                        'Each step should be specific and implementable. File paths should be relative to project root.';
                    userPrompt = "Project files:\n".concat(projectFiles.join('\n'), "\n\nTask: ").concat(taskDescription);
                    responseText = '';
                    if (!(config.provider === 'openai')) return [3 /*break*/, 4];
                    openai = new openai_1.default({ apiKey: config.apiKey });
                    return [4 /*yield*/, openai.chat.completions.create({
                            model: config.model,
                            temperature: config.temperature,
                            response_format: { type: 'json_object' },
                            messages: [
                                { role: 'system', content: systemPrompt },
                                { role: 'user', content: userPrompt }
                            ]
                        })];
                case 3:
                    completion = _d.sent();
                    responseText = ((_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '{}';
                    return [3 /*break*/, 8];
                case 4:
                    if (!(config.provider === 'anthropic')) return [3 /*break*/, 6];
                    anthropic = new sdk_1.default({ apiKey: config.apiKey });
                    return [4 /*yield*/, anthropic.messages.create({
                            model: config.model,
                            temperature: config.temperature,
                            max_tokens: 2000,
                            system: systemPrompt,
                            messages: [
                                { role: 'user', content: userPrompt }
                            ]
                        })];
                case 5:
                    message = _d.sent();
                    content = message.content[0];
                    responseText = content.type === 'text' ? content.text : '{}';
                    return [3 /*break*/, 8];
                case 6:
                    if (!(config.provider === 'google')) return [3 /*break*/, 8];
                    genAI = new generative_ai_1.GoogleGenerativeAI(config.apiKey);
                    model = genAI.getGenerativeModel({ model: config.model || 'gemini-1.5-flash' });
                    prompt_1 = "".concat(systemPrompt, "\n\nUser: ").concat(userPrompt);
                    return [4 /*yield*/, model.generateContent({
                            contents: [{ role: 'user', parts: [{ text: prompt_1 }] }],
                            generationConfig: {
                                temperature: (_c = config.temperature) !== null && _c !== void 0 ? _c : 0.7,
                                maxOutputTokens: 2048,
                            },
                        })];
                case 7:
                    result = _d.sent();
                    responseText = result.response.text() || '{}';
                    _d.label = 8;
                case 8:
                    parsedResponse = void 0;
                    try {
                        parsedResponse = JSON.parse(responseText);
                    }
                    catch (error) {
                        spinner.fail(chalk_1.default.red('Failed to parse AI response as JSON'));
                        throw new Error("Invalid JSON response from AI: ".concat(error instanceof Error ? error.message : 'Unknown error'));
                    }
                    // Validate required fields
                    if (!parsedResponse.taskName || !Array.isArray(parsedResponse.steps) || !Array.isArray(parsedResponse.filesToModify)) {
                        spinner.fail(chalk_1.default.red('AI response missing required fields'));
                        throw new Error('AI response must include taskName, steps, and filesToModify');
                    }
                    timestamp = Date.now();
                    slugifiedTask = slugify(parsedResponse.taskName);
                    planId = "".concat(slugifiedTask, "-").concat(timestamp);
                    plan = {
                        id: planId,
                        taskName: parsedResponse.taskName,
                        steps: parsedResponse.steps,
                        filesToModify: parsedResponse.filesToModify,
                        createdAt: new Date().toISOString()
                    };
                    // Ensure plans directory exists
                    (0, config_js_1.ensureDirectories)();
                    planPath = (0, path_1.join)(config_js_1.PLANS_DIR, "".concat(planId, ".json"));
                    return [4 /*yield*/, (0, promises_1.writeFile)(planPath, JSON.stringify(plan, null, 2), 'utf-8')];
                case 9:
                    _d.sent();
                    // Stop spinner and show success
                    spinner.succeed(chalk_1.default.green("Plan created successfully: ".concat(planPath)));
                    if (!autoGenerateCode) return [3 /*break*/, 13];
                    spinner.start('Generating code...');
                    _d.label = 10;
                case 10:
                    _d.trys.push([10, 12, , 13]);
                    return [4 /*yield*/, (0, generator_js_1.generateCode)(planPath)];
                case 11:
                    proposals = _d.sent();
                    spinner.succeed(chalk_1.default.green("Code generation completed: ".concat(proposals.length, " proposal").concat(proposals.length !== 1 ? 's' : '', " created")));
                    return [3 /*break*/, 13];
                case 12:
                    error_1 = _d.sent();
                    spinner.fail(chalk_1.default.red('Code generation failed'));
                    console.error(chalk_1.default.red("Error: ".concat(error_1 instanceof Error ? error_1.message : 'Unknown error')));
                    return [3 /*break*/, 13];
                case 13: return [2 /*return*/, plan];
                case 14:
                    error_2 = _d.sent();
                    spinner.fail(chalk_1.default.red('Failed to create plan'));
                    // Show user-friendly error message
                    if (error_2 instanceof Error) {
                        console.error(chalk_1.default.red("Error: ".concat(error_2.message)));
                    }
                    else {
                        console.error(chalk_1.default.red('An unknown error occurred'));
                    }
                    throw error_2;
                case 15: return [2 /*return*/];
            }
        });
    });
}
