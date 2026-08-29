# Arch Linux and Windows Development

## Supported approach

| Developer | Environment |
|---|---|
| Charles Hangoma | Arch Linux, Git, Node.js and Docker Engine/Compose |
| Chitindu Milimbo | Windows with Git, VS Code, WSL 2 and Docker Desktop using WSL backend |

On Windows, keep the project inside the WSL Linux filesystem rather than a Windows-mounted `C:` folder to reduce file-watching, permission, path and performance problems.

## Reproducibility controls

- Pin the Node version (`.nvmrc` or equivalent) after verifying the chosen supported version.
- Use one package manager and lockfile; recommended baseline is npm workspaces.
- Use Docker Compose for PostgreSQL and local supporting services.
- Commit `.editorconfig` and `.gitattributes` with LF line endings.
- Commit `.env.example` with variable names only.
- Use cross-platform Node/package scripts; do not hard-code `/home/...` or `C:\Users\...` paths.
- Do not commit `node_modules`, local databases, secrets or personal IDE state.
- Treat CI’s clean Linux environment as the common integration proof.

## Shared commands

The future repository should expose the same commands on both computers:

```text
npm install
docker compose up
npm run dev
npm run lint
npm run test
npm run build
npm run demo:reset
```

Exact versions and commands are verified during the implementation bootstrap and recorded in its README/ADR.
