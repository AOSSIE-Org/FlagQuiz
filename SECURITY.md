# Security Policy

Flag Quiz is a purely local web app: it has no backend, no accounts and no network requests at runtime, and all player data stays in the browser's IndexedDB. Security issues can still exist, for example in how imported player files are handled, in the service worker, in the build tooling or in the GitHub workflows.

## Supported Versions

Only the latest version on the `main` branch, deployed at [flagquiz.aossie.org](https://flagquiz.aossie.org/), is supported. The web app updates itself, so fixes reach every user automatically.

## Reporting a Vulnerability

**Please do not report security vulnerabilities in public GitHub issues, pull requests or Discord channels.**

Report them privately by email to [contact@aossie.org](mailto:contact@aossie.org), with "Flag Quiz security" in the subject. Please include:

- a description of the vulnerability and its impact;
- steps to reproduce it (a proof of concept if possible);
- the browser and device used, if relevant;
- any suggested fix.

## What to Expect

- We acknowledge reports within **14 days**.
- We keep you informed while we investigate and fix the issue.
- Once a fix is deployed, we credit you in the release notes (unless you prefer to remain anonymous).

## Scope

In scope: the code in this repository, its build and deployment configuration, and the deployed app at flagquiz.aossie.org.

Out of scope: vulnerabilities in third-party services (GitHub, browsers' text-to-speech services) and in dependencies, unless the way Flag Quiz uses them makes it exploitable — please report those to their maintainers. Known vulnerabilities in dependencies are tracked automatically with OSV-Scanner and Dependabot.
