# TypeScript Type Definitions

This directory contains custom type definitions and module augmentations for the application.

## Files

### `index.ts`
Main type definitions file containing:
- **User Types**: User, SocketUser
- **Database Types**: Market, Country, Region, AboveMarket, UserForecastProgress
- **Request/Response Types**: ForecastRequest, UploadFileInfo, ValidationResult, ValidationErrorDetail
- **SAML/Auth Types**: SamlProfile, AzureUser
- **Script Execution Types**: ScriptExecutionOptions, ScriptExecutionResult, RScriptOptions, PythonScriptOptions
- **Logging Types**: LogContext, AuthLogDetails, SecurityViolationDetails, FileOperationDetails
- **Validation Schema Types**: ValidationRule, ValidationSchema
- **Report Types**: ReportOptions, ReportData
- **Azure Blob Types**: BlobUploadOptions, BlobDownloadOptions
- **CSV Helper Types**: CsvRow, CsvOptions
- **Error Types**: AppError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError
- **Environment Variables**: EnvironmentVariables
- **Express Session Extensions**: SessionData augmentation

### `express-custom.d.ts`
Express framework augmentations:
- **Express.User**: Extends the default Passport user interface with application-specific fields
- **Express.Request**: Adds custom properties used by middleware:
  - `uploadDuration`: Time taken for file upload
  - `validatedFilePath`: Path to validated uploaded file
  - `validatedFieldName`: Name of the validated field
  - `fileName`: Final name of the uploaded file
  - `fieldName`: Original field name
  - `dataType`: Type of data uploaded

### `socket.io-custom.d.ts`
Socket.IO framework augmentations:
- **Socket.request**: Extends socket request with session data
- **ServerToClientEvents**: Type-safe server-to-client event definitions
  - `progress`: Progress updates during long-running operations
  - `error`: Error notifications
  - `complete`: Completion notifications
- **ClientToServerEvents**: Type-safe client-to-server event definitions
- **InterServerEvents**: Inter-server communication events
- **SocketData**: Custom data attached to each socket connection

### `ambient.d.ts`
Ambient module declarations and utility types:
- **Ambient Modules**: Placeholder for third-party libraries without type definitions
- **Utility Types**:
  - `JSONValue`, `JSONObject`, `JSONArray`: Type-safe JSON handling
  - `AsyncReturnType<T>`: Extract return type from async functions
  - `PartialBy<T, K>`: Make specific properties optional
  - `RequiredBy<T, K>`: Make specific properties required
  - `KeysOfType<T, V>`: Get keys of a specific type

## Usage

### Importing Types

```typescript
// Import from index.ts
import { User, ValidationResult, AppError } from '../types';

// Express augmentations are automatically available
app.get('/upload', (req, res) => {
    const duration = req.uploadDuration; // ✓ Type-safe
    const user = req.session.user; // ✓ Type-safe
});

// Socket.IO augmentations are automatically available
io.on('connection', (socket) => {
    socket.emit('progress', { step: 1, message: 'Starting...' }); // ✓ Type-safe
});
```

### Adding New Types

1. **Application-wide types**: Add to `index.ts`
2. **Express augmentations**: Add to `express-custom.d.ts`
3. **Socket.IO augmentations**: Add to `socket.io-custom.d.ts`
4. **Third-party library types**: Add to `ambient.d.ts`

### Best Practices

1. **Use specific types over `any`**: Always prefer specific types or `unknown` over `any`
2. **Export reusable types**: Export types that are used in multiple files
3. **Document complex types**: Add JSDoc comments for complex type definitions
4. **Group related types**: Keep related types together for better organization
5. **Use module augmentation carefully**: Only augment third-party modules when necessary

## TypeScript Configuration

These type definitions are automatically included via `tsconfig.json`:

```json
{
  "include": [
    "types/**/*.ts",
    // ...
  ]
}
```

## Strict Mode

All type definitions are compatible with strict TypeScript mode:
- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`
- `noUncheckedIndexedAccess: true`

## References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Module Augmentation](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation)
- [Declaration Files](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)
