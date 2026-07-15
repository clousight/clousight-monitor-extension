# Security Policy

## Reporting a vulnerability

If you believe you've found a security issue in Clousight, please **do not open a
public issue**. Instead, report it privately via GitHub's
[private vulnerability reporting](https://github.com/clousight/clousight-monitor-extension/security/advisories/new).

Please include:

- A description of the issue and its potential impact
- Steps to reproduce
- The version / commit affected

We'll acknowledge your report as soon as possible and keep you updated on the fix.

## Scope notes

Clousight is a zero-backend browser extension. It:

- Stores all configuration locally in `chrome.storage`
- Makes network requests **only** to the public status feeds of the cloud
  providers you enable
- Sends no telemetry and requires no account

If you find behavior that contradicts the above, we consider that a security
issue and want to hear about it.
