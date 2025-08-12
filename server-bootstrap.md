You are an expert Node.js + TypeScript backend developer.  
Generate a complete minimal backend project scaffold ready for prototyping.  
The code should be production-structured but lightweight for quick testing.  

**Requirements:**
- Use Node.js with TypeScript.
- Include an `Express` server.
- Set up a `tsconfig.json` for modern ESNext syntax.
- Include `package.json` with scripts:
  - `dev` (run with ts-node-dev)
  - `build` (compile TypeScript to `dist`)
  - `start` (run compiled code)
- Include example `.env` support (dotenv) and load it in the server.
- Include one sample route (`GET /health`) returning `{ status: "ok" }`.
- Project structure:
/src
index.ts
routes/
health.ts
tsconfig.json
package.json
.env.example


- Code should be clean, with proper TypeScript types.
- Add comments explaining each section for quick modification.
- Provide the full project files in a single answer so I can copy them directly.

Do not skip any files.

