# Security

## Reporting a vulnerability

Please do not open a public issue. Use GitHub's private reporting: **Security → Report a vulnerability** on this repository. You will get an answer within a week.

## What matters here

- **Reader values stay in the browser.** Values and choices live in `localStorage`; the share link carries them in the URL fragment (`#s=…`), which browsers never send to a server. Variables declared `kind: secret` are never put in a share link, a print, a validation or an issue. A path where a secret leaves the browser is a vulnerability.
- **Author mode writes files.** The validations API (and later the editor) only exists in development or with `AT_AUTHOR=1`. It must never be enabled on a public instance without authentication in front of it.
- **Pages contain commands people run as root.** A page that could be made to show a different command than its source (injection through a variable, a glossary entry, a diagram label) is a vulnerability too.
