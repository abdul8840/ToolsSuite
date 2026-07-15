# Adding new tools

1. Add catalogue metadata in `backend/src/services/tools.js` (`toolCatalog`).
2. Add a handler with the same slug in `toolHandlers`.
3. Add matching UI metadata in `frontend/src/data/tools.js`.
4. Use `ValidationError` for user input problems.
5. Use `runBinary` for local binaries so missing dependencies return a safe 501 response.
6. Return `{ outPath, filename, mimeType }` from the handler.

The controller handles upload validation, MongoDB logging, download headers, errors and cleanup.
