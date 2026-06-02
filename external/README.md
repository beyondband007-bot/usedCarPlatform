# External Services

This folder contains isolated service projects that are related to, but not merged into, the usedCarPlatform application code.

## reusable-credits-platform

`external/reusable-credits-platform/` is a clean copy of the Reusable Credits Platform service for local development and handoff. It intentionally excludes local-only files from the original runtime folder:

- `.env`
- `.git/`
- `node_modules/`
- `dist/`
- `coverage/`
- runtime logs

Use its own `.env.example`, `package.json`, migrations, and README from inside that folder.
