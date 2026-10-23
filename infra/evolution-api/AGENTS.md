# Evolution API agent notes

Apply these rules when changing the Evolution API deployment or integrating it with Finora.

- Keep `AUTHENTICATION_API_KEY`, per-instance API keys, WhatsApp QR codes, pairing codes, and session files secret. Never put them in browser code, Git, fixtures, screenshots, prompts, or logs.
- Call the Evolution API from trusted backend code only. Store its global key in the backend's secret environment, and expose narrow backend operations to the web dashboard and WhatsApp channel. Do not return the global key to clients.
- Treat webhook payloads, message text, phone numbers, and media as sensitive user data. Validate webhook requests, avoid logging payloads, and persist only data needed for an explicitly requested feature and its retention period.
- Use synthetic data and a dedicated test WhatsApp account for development. Do not connect a user's real account, send messages, or retrieve conversation history without an explicit request.
- Keep instance creation, connection, logout, and deletion available through backend operations so a user can undo a connection. Do not hide Evolution behavior in prompts or UI-only logic.
- Keep local Compose and Railway deployment settings separate. Never expose Postgres or Redis publicly; use private service networking in Railway and HTTPS for public webhooks.
