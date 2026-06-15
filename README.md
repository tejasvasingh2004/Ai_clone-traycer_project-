# Traycer-mini

> A simplified AI-powered code generation workflow tool

Traycer-mini is a TypeScript CLI application that demonstrates a complete AI-assisted development workflow: **planning → generation → review → verification**. It converts natural language task descriptions into structured plans, generates production-ready code using OpenAI GPT-4 or Anthropic Claude, and provides a safe staging environment for reviewing changes before applying them to your codebase.

## ✨ Features

- **✨ AI-powered planning** - Converts natural language task descriptions into structured, actionable development plans
- **🤖 Real code generation** - Uses OpenAI GPT-4 or Anthropic Claude to generate production-ready TypeScript code
- **👀 Interactive diff review** - Preview all changes with unified diffs before applying them to your codebase
- **✅ Selective approval** - Choose which generated files to apply, maintaining full control over your code
- **🔍 Automated verification** - Run TypeScript compilation and ESLint checks to ensure code quality

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **npm** or **yarn**
- **OpenAI API key** OR **Anthropic API key**
- A TypeScript project (for verification features)

## 🚀 Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd traycer-mini
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure API keys**:
   ```bash
   cp .env.example .env
   # Edit .env and add your API key
   ```

4. **Build the project**:
   ```bash
   npm run build
   ```

## ⚙️ Configuration

Traycer-mini requires an API key from one supported provider. Create a `.env` file in the project root:

```env
# Choose one AI provider:
OPENAI_API_KEY=your_openai_api_key_here
# OR
ANTHROPIC_API_KEY=your_anthropic_api_key_here
# OR
GROQ_API_KEY=your_groq_api_key_here

# Optional: specify model (defaults shown below)
# AI_MODEL=llama-3.3-70b-versatile
```

### Model Defaults

- **OpenAI**: `gpt-4o-mini`
- **Anthropic**: `claude-3-5-sonnet-20241022`
- **Google**: `gemini-pro`
- **Groq**: `llama-3.3-70b-versatile`

You can override these defaults by setting the `AI_MODEL` environment variable.

## 📖 Usage

### 1. Plan Command

Create a structured plan from a natural language task description:

```bash
npx tsx src/cli.ts plan "Add login API with JWT authentication"
```

**What it does:**
- Sends your task description to the AI
- Generates a structured plan with actionable steps
- Identifies all files that need to be created or modified
- Saves the plan as JSON in the `plans/` directory

**Example output:**
```json
{
  "taskName": "Add login API with JWT authentication",
  "steps": [
    "Create authentication middleware for JWT validation",
    "Implement login route handler with password verification",
    "Add JWT token generation utility",
    "Create user authentication types and interfaces"
  ],
  "filesToModify": [
    "src/middleware/auth.ts",
    "src/routes/auth.ts",
    "src/utils/jwt.ts",
    "src/types/auth.ts"
  ],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "id": "add-login-api-1234567890"
}
```

### 2. Generate Command

Generate code based on a plan file:

```bash
npx tsx src/cli.ts generate plans/add-login-api-1234567890.json
```

**What it does:**
- Reads the plan file
- For each file in the plan, generates complete TypeScript code using AI
- Creates unified diffs showing all changes
- Saves proposals to the `staging/` directory for review
- Does NOT modify your actual codebase yet

### 3. Review Command

Review staged code proposals with diffs:

```bash
npx tsx src/cli.ts review
```

**What it does:**
- Displays all staged proposals
- Shows unified diffs with color-coded additions (green) and deletions (red)
- Lists which files will be created vs. modified
- Provides approval status for each proposal

**Interactive mode:**
```bash
npx tsx src/cli.ts review --interactive
```

Enables multi-select checkbox interface for batch approval.

### 4. Approve Command

Apply staged proposals to your codebase:

```bash
# Approve a specific file
npx tsx src/cli.ts approve src/routes/auth.ts

# Or approve all pending proposals
npx tsx src/cli.ts approve --all
```

**What it does:**
- Prompts for confirmation before applying changes
- Writes the generated code to the target file
- Creates directories if they don't exist
- Marks the proposal as approved in staging
- Updates your actual codebase

### 5. Verify Command

Run TypeScript and ESLint checks:

```bash
npx tsx src/cli.ts verify
```

**What it does:**
- Runs `tsc --noEmit` to check for TypeScript compilation errors
- Runs ESLint to check for code quality issues
- Displays errors and warnings with file locations
- Returns exit code 1 if errors found, 0 if passed

### 6. Clean Command

Clear all staged proposals:

```bash
npx tsx src/cli.ts clean
```

**What it does:**
- Prompts for confirmation
- Deletes all files in the `staging/` directory
- Useful for starting fresh or clearing rejected proposals

## 🔄 Complete Workflow Example

Here's a complete example of adding user authentication to a project:

```bash
# Step 1: Create a plan
npx tsx src/cli.ts plan "Add user authentication with email and password"

# Output: ✓ Plan created: plans/add-user-authentication-1705320000000.json

# Step 2: Generate code from the plan
npx tsx src/cli.ts generate plans/add-user-authentication-1705320000000.json

# Output: ✓ Generated 4 code proposals in staging/

# Step 3: Review the generated code
npx tsx src/cli.ts review

# Output: Shows diffs for all 4 files with color-coded changes

# Step 4: Approve specific files (or all)
npx tsx src/cli.ts approve src/types/user.ts
npx tsx src/cli.ts approve src/utils/hash.ts
npx tsx src/cli.ts approve --all

# Output: ✓ Applied changes to src/types/user.ts

# Step 5: Verify code quality
npx tsx src/cli.ts verify

# Output: ✓ All checks passed!

# Step 6: Clean up staging (optional)
npx tsx src/cli.ts clean
```

## 📁 Project Structure

```
traycer-mini/
├── src/
│   ├── cli.ts          # Main CLI entry point with Commander.js
│   ├── planner.ts      # AI-powered planning module
│   ├── generator.ts    # Code generation module
│   ├── reviewer.ts     # Diff review and display
│   ├── approver.ts     # Apply changes to codebase
│   ├── verifier.ts     # TypeScript and ESLint checks
│   ├── config.ts       # Configuration and environment setup
│   └── types.ts        # TypeScript type definitions
├── plans/              # Generated plans (JSON files)
├── staging/            # Temporary staged proposals
├── dist/               # Compiled JavaScript output
├── .env                # Environment variables (API keys)
├── .env.example        # Example environment configuration
├── tsconfig.json       # TypeScript configuration
├── .eslintrc.json      # ESLint configuration
├── package.json        # Project dependencies and scripts
└── README.md           # This file
```

## 🏗️ Architecture

Traycer-mini follows a **staged workflow** architecture with clear separation of concerns:

1. **Planning Phase** (`planner.ts`): AI converts natural language into structured plans
2. **Generation Phase** (`generator.ts`): AI generates code for each file in the plan
3. **Staging Phase**: Generated code is saved to `staging/` directory with diffs
4. **Review Phase** (`reviewer.ts`): Developers review diffs before applying changes
5. **Approval Phase** (`approver.ts`): Selected changes are applied to the codebase
6. **Verification Phase** (`verifier.ts`): Automated quality checks ensure code integrity

### Staging Concept

The staging directory acts as a **safe preview environment**:
- Generated code is never applied automatically
- Developers review diffs and selectively approve changes
- Proposals can be rejected without affecting the codebase
- Full audit trail of what was generated vs. what was applied

## 🛠️ Development

### Available Scripts

```bash
# Run in development mode (no build required)
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run ESLint
npm run lint

# Run TypeScript type checking
npm run typecheck
```

### Development Workflow

```bash
# Make changes to src/ files
# Test with tsx (no build needed)
npx tsx src/cli.ts plan "test task"

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Build for production
npm run build
```

## 🐛 Troubleshooting

### API Key Not Found Error

**Error**: `No API key found. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY`

**Solution**: 
- Ensure `.env` file exists in project root
- Verify API key is correctly set in `.env`
- Check that `.env` is not in `.gitignore` (it should be, but needs to exist locally)

### TypeScript Errors

**Error**: `Cannot find tsconfig.json`

**Solution**:
- Ensure `tsconfig.json` exists in your project root
- Run `npm run build` to verify TypeScript configuration

### Permission Errors

**Error**: `EACCES: permission denied`

**Solution**:
- Check file and directory permissions
- Ensure you have write access to the project directory
- On Unix systems, avoid running with `sudo`

### Rate Limiting

**Error**: `429 Too Many Requests`

**Solution**:
- You've exceeded your API rate limit
- Wait a few minutes before retrying
- Consider upgrading your API plan for higher limits
- Check your API usage dashboard for the provider you are using

### Generated Code Issues

**Problem**: Generated code has syntax errors or doesn't compile

**Solution**:
- Review the generated code in staging before approving
- Reject proposals with issues using the clean command
- Refine your task description to be more specific
- Try regenerating with a different prompt

## ⚠️ Limitations

- **AI-generated code requires review** - Always review diffs before approving changes
- **Best with TypeScript projects** - Designed for TypeScript codebases with proper configuration
- **Requires valid API keys** - Must have access to a supported provider API
- **Prompt quality matters** - Clear, specific task descriptions produce better results
- **Context limitations** - AI models have token limits; very large files may be truncated
- **No git integration** - Does not automatically commit changes (use git manually)

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and add tests if applicable
4. **Run linting and type checks**: `npm run lint && npm run typecheck`
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

Please ensure your code follows the existing style and passes all checks.

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Inspired by [Traycer.AI](https://traycer.ai)** - The full-featured AI coding assistant
- **Built with OpenAI and Anthropic APIs** - Powered by state-of-the-art language models
- **Open source community** - Thanks to all the amazing tools and libraries that made this possible

---

**Made with ❤️ by the Traycer-mini contributors**