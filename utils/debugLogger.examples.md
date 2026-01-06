# Debug Logger Usage Examples

This document shows how to use the debug logger to replace `console.log` statements throughout your application.

## Basic Usage

### 1. Simple Debug Statements

**Before:**
```javascript
console.log('User logged in:', userId);
console.log('Processing data...', data);
```

**After:**
```javascript
const { debug } = require('./utils/debugLogger');

debug('User logged in:', userId);
debug('Processing data...', data);
```

### 2. Module-Specific Logger (Recommended)

**Best practice for each file:**
```javascript
const { createModuleLogger } = require('./utils/debugLogger');
const log = createModuleLogger('auth'); // Use your module name

// Now use it throughout your file
log.debug('Login attempt', { email: user.email });
log.info('User authenticated successfully');
log.warn('Password reset requested');
log.error('Authentication failed', { reason: 'Invalid credentials' });
```

## Advanced Usage

### 3. Different Log Levels

```javascript
const { createModuleLogger } = require('./utils/debugLogger');
const log = createModuleLogger('forecast');

log.trace('Very detailed debug info');      // Most verbose
log.debug('Debug information');             // General debugging
log.verbose('Verbose output');              // Detailed info
log.http('HTTP request details');           // HTTP-specific
log.info('General information');            // Important info
log.warn('Warning message');                // Warnings
log.error('Error occurred');                // Errors
```

### 4. Logging Objects

```javascript
const log = createModuleLogger('upload');

// Log complex objects with inspection
log.object('Request body', req.body);
log.object('User session', req.session);

// Or pass as additional arguments
log.debug('File uploaded', {
    filename: file.name,
    size: file.size,
    userId: req.session.user.id
});
```

### 5. Function Entry/Exit Tracing

```javascript
const { entering, exiting } = require('./utils/debugLogger');

function processData(data, options) {
    entering('processData', data, options);

    // Your logic here
    const result = performCalculation(data);

    exiting('processData', result);
    return result;
}
```

### 6. Performance Timing

**Simple timing:**
```javascript
const { startTimer } = require('./utils/debugLogger');

const timer = startTimer('Database query');
await db.query('SELECT * FROM users');
timer.end(); // Logs: "⏱️ Database query took 45.23ms"
```

**Timing a function:**
```javascript
const { measureTime } = require('./utils/debugLogger');

const result = await measureTime('R script execution', async () => {
    return await executeRScript(scriptPath, args);
});
```

### 7. HTTP Request/Response Logging

```javascript
const { logRequest, logResponse } = require('./utils/debugLogger');

app.use((req, res, next) => {
    const start = Date.now();

    logRequest(req, { sessionId: req.session?.id });

    res.on('finish', () => {
        res.responseTime = Date.now() - start;
        logResponse(req, res);
    });

    next();
});
```

### 8. Conditional Debugging

```javascript
const { debugIf, debugOnce } = require('./utils/debugLogger');

// Only log if condition is true
debugIf(userId === 1, 'Admin user detected', { userId });

// Log only the first time (useful in loops)
users.forEach(user => {
    debugOnce('processing-users', 'Starting to process users');
    processUser(user);
});
```

### 9. Visual Dividers

```javascript
const { divider } = require('./utils/debugLogger');

divider('START PROCESSING');
// ... your code ...
divider('END PROCESSING');
```

## Real-World Examples

### Example 1: Authentication Route

**Before:**
```javascript
router.post('/login', async (req, res) => {
    console.log('Login attempt:', req.body.email);

    const user = await User.findByEmail(req.body.email);
    console.log('User found:', user);

    if (!user) {
        console.log('User not found');
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('Login successful for:', user.email);
    res.json({ success: true });
});
```

**After:**
```javascript
const { createModuleLogger } = require('../utils/debugLogger');
const log = createModuleLogger('auth-routes');

router.post('/login', async (req, res) => {
    log.info('Login attempt', { email: req.body.email });

    const user = await User.findByEmail(req.body.email);
    log.debug('User lookup result', { found: !!user, email: req.body.email });

    if (!user) {
        log.warn('Login failed - user not found', { email: req.body.email });
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    log.info('Login successful', { userId: user.id, email: user.email });
    res.json({ success: true });
});
```

### Example 2: R Script Execution

**Before:**
```javascript
function executeRScript(scriptPath, args) {
    console.log('Executing R script:', scriptPath);
    console.log('Arguments:', args);

    const startTime = Date.now();
    const result = spawn('Rscript', [scriptPath, ...args]);

    result.stdout.on('data', (data) => {
        console.log('R output:', data.toString());
    });

    result.on('close', (code) => {
        const duration = Date.now() - startTime;
        console.log(`Script finished in ${duration}ms with code ${code}`);
    });
}
```

**After:**
```javascript
const { createModuleLogger, startTimer } = require('../utils/debugLogger');
const log = createModuleLogger('r-executor');

function executeRScript(scriptPath, args) {
    log.info('Executing R script', { scriptPath, args });

    const timer = startTimer(`R script: ${path.basename(scriptPath)}`);
    const result = spawn('Rscript', [scriptPath, ...args]);

    result.stdout.on('data', (data) => {
        log.verbose('R script output', { output: data.toString().trim() });
    });

    result.stderr.on('data', (data) => {
        log.warn('R script error output', { error: data.toString().trim() });
    });

    result.on('close', (code) => {
        const duration = timer.end();
        log.info('R script completed', {
            code,
            duration: `${duration.toFixed(2)}ms`,
            success: code === 0
        });
    });
}
```

### Example 3: File Upload Handler

**Before:**
```javascript
router.post('/upload', async (req, res) => {
    console.log('File upload started');
    console.log('Files:', req.files);
    console.log('User:', req.session.user);

    try {
        const uploadedFile = req.files.file;
        console.log('Processing file:', uploadedFile.name);

        // Process file...
        console.log('File saved to:', targetPath);

        res.json({ success: true });
    } catch (error) {
        console.error('Upload failed:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});
```

**After:**
```javascript
const { createModuleLogger, measureTime } = require('../utils/debugLogger');
const log = createModuleLogger('upload-routes');

router.post('/upload', async (req, res) => {
    log.info('File upload started', {
        userId: req.session.user?.id,
        fileCount: Object.keys(req.files || {}).length
    });

    try {
        const uploadedFile = req.files.file;
        log.debug('Processing file', {
            filename: uploadedFile.name,
            size: uploadedFile.size,
            mimetype: uploadedFile.mimetype
        });

        // Process file with timing
        await measureTime('File processing', async () => {
            // Process file...
        });

        log.info('File uploaded successfully', {
            filename: uploadedFile.name,
            targetPath
        });

        res.json({ success: true });
    } catch (error) {
        log.error('Upload failed', {
            error: error.message,
            stack: error.stack,
            userId: req.session.user?.id
        });
        res.status(500).json({ error: 'Upload failed' });
    }
});
```

## Configuration

### Environment Variables

Control the debug logger with environment variables:

```bash
# Set debug level (trace, debug, verbose, http, info, warn, error)
DEBUG_LEVEL=debug

# Enable debug output in production
DEBUG=true

# Use LOG_LEVEL if DEBUG_LEVEL is not set
LOG_LEVEL=info
```

### In your .env file:

```env
# Development
NODE_ENV=development
DEBUG_LEVEL=debug

# Production (only show warnings and errors)
NODE_ENV=production
DEBUG_LEVEL=warn
```

## Log Files

The debug logger creates the following log files in the `logs/` directory:

- `debug.log` - All debug messages and above (10MB max, 5 files)
- `verbose.log` - Verbose messages and above (5MB max, 3 files)

## Best Practices

1. **Use module loggers**: Create one logger per file with `createModuleLogger()`
2. **Use appropriate levels**:
   - `trace` for very detailed debugging
   - `debug` for general debugging
   - `info` for important events
   - `warn` for warnings
   - `error` for errors
3. **Include context**: Always include relevant data (userId, filename, etc.)
4. **Use performance timers**: For operations that might be slow
5. **Don't log sensitive data**: Passwords, tokens, etc.

## Migration Checklist

To migrate from `console.log` to debug logger:

- [ ] Add `const log = createModuleLogger('module-name');` to top of each file
- [ ] Replace `console.log()` with `log.debug()` or `log.info()`
- [ ] Replace `console.error()` with `log.error()`
- [ ] Replace `console.warn()` with `log.warn()`
- [ ] Add timing to slow operations with `measureTime()` or `startTimer()`
- [ ] Add structured data instead of string concatenation
- [ ] Test that logs appear in both console and log files
