# Releasing

Maintainer notes for cutting a release. Contributors don't need this.

## Versioning

Semantic Versioning. The version lives in **two** places that must match:

- `package.json` → `version`
- `public/manifest.json` → `version`

## Steps

1. Ensure `main` is green: `npm run check`.
2. Bump the version in `package.json` **and** `public/manifest.json`.
3. Move `CHANGELOG.md`'s `[Unreleased]` entries under a new `## [x.y.z] - YYYY-MM-DD`
   heading and add a fresh empty `[Unreleased]` section.
4. Commit (see the commit-identity note in `CLAUDE.md`) and open a PR; merge once green.
5. Tag the release and push the tag:
   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
6. The **Release** workflow (`.github/workflows/release.yml`) builds the extension,
   zips `dist/`, and attaches `clousight-extension-vX.Y.Z.zip` to a GitHub Release.

## Publishing to stores (manual)

Download the release zip and upload it to the Chrome Web Store / Edge Add-ons
developer dashboards. See [docs/STORE_LISTING.md](docs/STORE_LISTING.md) for the
listing copy, permission justifications, and asset checklist.
