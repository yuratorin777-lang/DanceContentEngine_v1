# START HERE

## Project path

Recommended local path:
`C:\Users\User\Desktop\DanceContentEngine_v1`

## Next.js — exact CMD command

From the project root:

```cmd
cd /d C:\Users\User\Desktop\DanceContentEngine_v1\apps
npx --yes create-next-app@latest web --ts --eslint --app --src-dir --use-npm --import-alias "@/*"
```

`--yes` removes the interactive npx confirmation. The other flags make the setup deterministic.

If you prefer, from the project root run:
```cmd
CREATE_NEXT.cmd
```

## If npm registry/network is blocked

First diagnose:
```cmd
npm config get registry
npm ping
```

Expected registry:
`https://registry.npmjs.org/`

Do not start changing registries blindly. If access is blocked, report the exact error and choose the smallest workaround.

## Start Next.js

```cmd
cd /d C:\Users\User\Desktop\DanceContentEngine_v1\apps\web
npm run dev
```

## Git

Initialize/connect this project to the existing GitHub repository after the first successful local run.

## Work order

1. Stabilize AI-readable architecture.
2. Owner interview / knowledge extraction.
3. Serpukhov Analyst research.
4. Radar.
5. Content planning.
6. Writing + validation.
7. Local SEO.
8. Analytics.
