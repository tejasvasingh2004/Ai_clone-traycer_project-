Step 1 — Install Root Dependencies
Open a terminal in c:\Users\HP\Documents\traycer_clone\ and run:


npm install
Step 2 — Install Dashboard Dependencies
The dashboard is a separate package and needs its own install:


cd dashboard
npm install
cd ..
Step 3 — Set Up Your .env File
Your .env.example already has a Gemini API key hardcoded in it. You need to copy it to .env:


# On Windows (Command Prompt)
copy .env.example .env

# On Windows (PowerShell)
Copy-Item .env.example .env
Your .env file will look like this (Gemini is already configured):


GEMINI_API_KEY=AIzaSyDu0y9ESxNYUIu2IB-BsUlKn2rkw1RoroE
⚠️ Security note: The Gemini API key is currently exposed in .env.example which is committed to git. You should rotate this key and only keep it in .env (which is gitignored).

The app will automatically pick up the Gemini key and use gemini-pro as the model.

Step 4 — Start Everything (Full Stack)
Run both the backend API server and the dashboard together with a single command:


npm run dev:full
This runs concurrently:

🟢 API Server → http://localhost:3001 (Express, wraps the AI agent)
🟣 Dashboard → http://localhost:5173 (React + Vite)
Step 5 — Open the Dashboard
Open your browser and go to:


http://localhost:5173
You should see the Traycer-mini dashboard with the sidebar showing: Dashboard, New Plan, Proposals, Verify, History.

Step 6 — Set up PROJECT_CONTEXT.md (Highly Recommended)
Traycer-mini's Context Engine will automatically read a `PROJECT_CONTEXT.md` file from the root of any repository you import. You should create this file to ground the AI in your project-specific conventions.
Include things like:
- Architectural patterns (e.g., "Use Redux for state")
- Do's and Don'ts (e.g., "Don't use classes, use functional components")
- Third-party libraries to prefer
This will significantly improve AI response quality and prevent generic answers.

Alternative: Start Services Separately
If dev:full has issues, you can start them in two separate terminals:

Terminal 1 — API Server:


npm run server
Terminal 2 — Dashboard:


npm run dashboard
Alternative: CLI Only (No Dashboard)
If you just want to use the CLI without the dashboard:


# Create a plan
npx tsx src/cli.ts plan "Add a hello world function"

# Generate code from the plan
npx tsx src/cli.ts generate plans/<plan-id>.json

# Review proposals
npx tsx src/cli.ts review

# Approve all
npx tsx src/cli.ts approve --all

# Verify
npx tsx src/cli.ts verify
Quick Troubleshooting
Problem	Fix
Cannot find module errors	Run npm install again in root and dashboard/
API server fails to start	Check that port 3001 is free
Dashboard shows blank / can't connect	Make sure the API server is running on 3001
AI errors	Verify your .env has a valid GEMINI_API_KEY (or add OPENAI_API_KEY / ANTHROPIC_API_KEY)
tsx not found	Run npm instal