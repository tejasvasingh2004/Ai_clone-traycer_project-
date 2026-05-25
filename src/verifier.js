"use strict";
/**
 * Verification module for Traycer-mini
 * Runs TypeScript and ESLint checks on the codebase
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
exports.verifyCode = verifyCode;
var child_process_1 = require("child_process");
var util_1 = require("util");
var promises_1 = require("fs/promises");
var path_1 = require("path");
var chalk_1 = require("chalk");
var ora_1 = require("ora");
var execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Parse TypeScript compiler output and extract error messages
 */
function parseTypeScriptErrors(output) {
    var errors = [];
    var lines = output.split('\n');
    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
        var line = lines_1[_i];
        // Match pattern: filename(line,col): error TS\d+: message
        if (line.match(/.*\(\d+,\d+\):\s*error\s+TS\d+:/)) {
            errors.push(line.trim());
        }
    }
    return errors;
}
/**
 * Parse ESLint JSON output and extract errors and warnings
 */
function parseESLintOutput(jsonOutput) {
    var errors = [];
    var warnings = [];
    try {
        var results = JSON.parse(jsonOutput);
        if (Array.isArray(results)) {
            for (var _i = 0, results_1 = results; _i < results_1.length; _i++) {
                var result = results_1[_i];
                var filePath = result.filePath || 'unknown';
                if (result.messages && Array.isArray(result.messages)) {
                    for (var _a = 0, _b = result.messages; _a < _b.length; _a++) {
                        var message = _b[_a];
                        var location_1 = "".concat(filePath, ":").concat(message.line, ":").concat(message.column);
                        var formattedMessage = "".concat(location_1, " - ").concat(message.message, " (").concat(message.ruleId || 'unknown', ")");
                        if (message.severity === 2) {
                            errors.push(formattedMessage);
                        }
                        else if (message.severity === 1) {
                            warnings.push(formattedMessage);
                        }
                    }
                }
            }
        }
    }
    catch (error) {
        // If JSON parsing fails, return empty arrays
        console.warn(chalk_1.default.yellow('Warning: Failed to parse ESLint output'));
    }
    return { errors: errors, warnings: warnings };
}
/**
 * Check if a file exists
 */
function fileExists(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, promises_1.access)(filePath, promises_1.constants.F_OK)];
                case 1:
                    _b.sent();
                    return [2 /*return*/, true];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Display verification results with formatting
 */
function displayResults(result) {
    console.log(''); // Empty line for spacing
    if (result.errors.length === 0 && result.warnings.length === 0) {
        console.log(chalk_1.default.green('✓ All checks passed!'));
        return;
    }
    if (result.errors.length > 0) {
        console.log(chalk_1.default.red("\u2717 ".concat(result.errors.length, " error").concat(result.errors.length !== 1 ? 's' : '', " found")));
        console.log('');
        console.log(chalk_1.default.red.bold('Errors:'));
        // Group errors by file
        var errorsByFile = new Map();
        for (var _i = 0, _a = result.errors; _i < _a.length; _i++) {
            var error = _a[_i];
            var match = error.match(/^([^:]+):/);
            var file = match ? match[1] : 'unknown';
            if (!errorsByFile.has(file)) {
                errorsByFile.set(file, []);
            }
            errorsByFile.get(file).push(error);
        }
        for (var _b = 0, errorsByFile_1 = errorsByFile; _b < errorsByFile_1.length; _b++) {
            var _c = errorsByFile_1[_b], file = _c[0], fileErrors = _c[1];
            console.log(chalk_1.default.red("\n  ".concat(file, ":")));
            for (var _d = 0, fileErrors_1 = fileErrors; _d < fileErrors_1.length; _d++) {
                var error = fileErrors_1[_d];
                console.log(chalk_1.default.red("    ".concat(error)));
            }
        }
        console.log('');
    }
    if (result.warnings.length > 0) {
        console.log(chalk_1.default.yellow("\u26A0 ".concat(result.warnings.length, " warning").concat(result.warnings.length !== 1 ? 's' : '', " found")));
        console.log('');
        console.log(chalk_1.default.yellow.bold('Warnings:'));
        // Group warnings by file
        var warningsByFile = new Map();
        for (var _e = 0, _f = result.warnings; _e < _f.length; _e++) {
            var warning = _f[_e];
            var match = warning.match(/^([^:]+):/);
            var file = match ? match[1] : 'unknown';
            if (!warningsByFile.has(file)) {
                warningsByFile.set(file, []);
            }
            warningsByFile.get(file).push(warning);
        }
        for (var _g = 0, warningsByFile_1 = warningsByFile; _g < warningsByFile_1.length; _g++) {
            var _h = warningsByFile_1[_g], file = _h[0], fileWarnings = _h[1];
            console.log(chalk_1.default.yellow("\n  ".concat(file, ":")));
            for (var _j = 0, fileWarnings_1 = fileWarnings; _j < fileWarnings_1.length; _j++) {
                var warning = fileWarnings_1[_j];
                console.log(chalk_1.default.yellow("    ".concat(warning)));
            }
        }
        console.log('');
    }
}
/**
 * Run TypeScript and ESLint checks on the codebase
 * Returns verification result with errors and warnings
 */
function verifyCode() {
    return __awaiter(this, void 0, void 0, function () {
        var result, spinner, tsconfigExists, _a, stdout, stderr, output, errors, error_1, execError, output, errors, eslintrcExists, eslintConfigExists, stdout, _b, errors, warnings, error_2, execError, _c, errors, warnings, error_3, errorMessage;
        var _d, _e, _f, _g, _h, _j;
        var _k, _l;
        return __generator(this, function (_m) {
            switch (_m.label) {
                case 0:
                    result = {
                        success: false,
                        errors: [],
                        warnings: []
                    };
                    spinner = null;
                    _m.label = 1;
                case 1:
                    _m.trys.push([1, 13, , 14]);
                    // Check TypeScript
                    spinner = (0, ora_1.default)('Running TypeScript checks...').start();
                    return [4 /*yield*/, fileExists((0, path_1.join)(process.cwd(), 'tsconfig.json'))];
                case 2:
                    tsconfigExists = _m.sent();
                    if (!!tsconfigExists) return [3 /*break*/, 3];
                    spinner.warn('tsconfig.json not found - skipping TypeScript check');
                    return [3 /*break*/, 6];
                case 3:
                    _m.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, execAsync('npx tsc --noEmit', {
                            cwd: process.cwd(),
                            maxBuffer: 1024 * 1024 * 10 // 10MB buffer
                        })];
                case 4:
                    _a = _m.sent(), stdout = _a.stdout, stderr = _a.stderr;
                    output = stdout + stderr;
                    if (output.trim()) {
                        errors = parseTypeScriptErrors(output);
                        (_d = result.errors).push.apply(_d, errors);
                    }
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _m.sent();
                    execError = error_1;
                    if (execError.code === 'ENOENT' || ((_k = execError.message) === null || _k === void 0 ? void 0 : _k.includes('command not found'))) {
                        spinner.warn('TypeScript (tsc) not found - skipping TypeScript check');
                        spinner.info('Install TypeScript with: npm install -D typescript');
                    }
                    else {
                        output = (execError.stdout || '') + (execError.stderr || '');
                        errors = parseTypeScriptErrors(output);
                        (_e = result.errors).push.apply(_e, errors);
                    }
                    return [3 /*break*/, 6];
                case 6:
                    // Check ESLint
                    if (spinner) {
                        spinner.text = 'Running ESLint checks...';
                    }
                    return [4 /*yield*/, fileExists((0, path_1.join)(process.cwd(), '.eslintrc.json'))];
                case 7:
                    eslintrcExists = _m.sent();
                    return [4 /*yield*/, fileExists((0, path_1.join)(process.cwd(), 'eslint.config.js'))];
                case 8:
                    eslintConfigExists = _m.sent();
                    if (!(!eslintrcExists && !eslintConfigExists)) return [3 /*break*/, 9];
                    if (spinner) {
                        spinner.info('ESLint config not found - skipping ESLint check');
                    }
                    return [3 /*break*/, 12];
                case 9:
                    _m.trys.push([9, 11, , 12]);
                    return [4 /*yield*/, execAsync('npx eslint src --ext .ts --format json', {
                            cwd: process.cwd(),
                            maxBuffer: 1024 * 1024 * 10 // 10MB buffer
                        })];
                case 10:
                    stdout = (_m.sent()).stdout;
                    _b = parseESLintOutput(stdout), errors = _b.errors, warnings = _b.warnings;
                    (_f = result.errors).push.apply(_f, errors);
                    (_g = result.warnings).push.apply(_g, warnings);
                    return [3 /*break*/, 12];
                case 11:
                    error_2 = _m.sent();
                    execError = error_2;
                    if (execError.code === 'ENOENT' || ((_l = execError.message) === null || _l === void 0 ? void 0 : _l.includes('command not found'))) {
                        if (spinner) {
                            spinner.warn('ESLint not found - skipping ESLint check');
                            spinner.info('Install ESLint with: npm install -D eslint');
                        }
                    }
                    else {
                        // ESLint returns non-zero exit code when there are errors
                        // But we still get JSON output in stdout
                        if (execError.stdout) {
                            _c = parseESLintOutput(execError.stdout), errors = _c.errors, warnings = _c.warnings;
                            (_h = result.errors).push.apply(_h, errors);
                            (_j = result.warnings).push.apply(_j, warnings);
                        }
                    }
                    return [3 /*break*/, 12];
                case 12:
                    // Stop spinner
                    if (spinner) {
                        spinner.stop();
                    }
                    // Set success flag (true if no errors, warnings are acceptable)
                    result.success = result.errors.length === 0;
                    // Display results
                    displayResults(result);
                    return [2 /*return*/, result];
                case 13:
                    error_3 = _m.sent();
                    if (spinner) {
                        spinner.fail('Verification failed');
                    }
                    errorMessage = error_3 instanceof Error ? error_3.message : String(error_3);
                    console.error(chalk_1.default.red('Error during verification:'), errorMessage);
                    result.success = false;
                    result.errors.push("Verification error: ".concat(errorMessage));
                    return [2 /*return*/, result];
                case 14: return [2 /*return*/];
            }
        });
    });
}
