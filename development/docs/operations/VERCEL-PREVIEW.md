# Vercel frontend preview

The demonstration frontend is available at [web-sikaprimemarketing-proj.vercel.app](https://web-sikaprimemarketing-proj.vercel.app). It is a Vercel-hosted Next.js preview of the `apps/web` package, built on 2026-09-20 from the local main checkout.

## What is online

The public pages, layout, navigation and server-rendered frontend are online over HTTPS. The preview does **not** make the applicant workflow production-ready: there is no public Nest API or PostgreSQL database behind it yet. Catalogue pages can show their safe unavailable state, while sign-in, saved drafts, document upload and submission require the separate API/database deployment described in [GAP-015](../gaps/GAP-015-applicant-production-and-prior-phase-gates.md).

Use fictional data only. Do not enter real applicant, identity, academic or document data into this preview.

## Vercel project settings

| Setting | Value |
|---|---|
| Team | `sikaprimemarketing-proj` |
| Project | `web` |
| Root directory | `development/apps/web` |
| Node.js | `24.x` |
| Install command | `cd ../.. && npm ci --ignore-scripts` |
| Build command | `cd ../.. && npm run build --workspace=@sis/config && npm run build --workspace=apps/web` |

The custom commands are necessary because the frontend imports shared workspace packages. The shared configuration is built before Next.js.

`.vercelignore` excludes local review worktrees from command-line deployments. `.vercel/` and local environment files remain untracked.

## Repeat a manual preview

From `development/apps/web`, authenticate with Vercel, pull the project settings, build, then publish only the prebuilt output:

```sh
npx vercel pull --yes --environment=preview
npx vercel build --yes --target=preview
npx vercel deploy --prebuilt --archive=tgz --yes
```

Inspect the returned deployment URL before presenting it. The first Vercel deployment was automatically assigned the project’s production alias because no prior deployment existed; later deployments should be treated as previews unless deliberately promoted.

## Next deployment boundary

Before live applicant testing, deploy the Nest API and a separate fictional PostgreSQL database, then set Vercel's server-only `API_INTERNAL_URL` for Preview and Production to that API URL. Do not use a local `localhost` URL: Vercel cannot reach this machine. GitHub auto-deploy is also pending because the Vercel account needs its GitHub login connection added first.
