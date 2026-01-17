# Rate Limiting Error Handling Improvements

## Overview
Enhanced the OpenRouter API service with comprehensive rate limiting error handling to provide a better user experience when API quotas are exhausted or rate limits are hit.

## Key Improvements

### 1. **Exponential Backoff with Jitter**
- Implements exponential backoff strategy starting at 2 seconds, doubling with each retry
- Maximum backoff delay capped at 30 seconds
- Adds random jitter (0-1 second) to prevent thundering herd problem
- Configurable via `RATE_LIMIT_CONFIG` object

### 2. **Intelligent Retry Logic**
- **Maximum 3 retry attempts** per model
- Automatic retry for:
  - Rate limiting errors (429)
  - Service unavailable errors (503, 502)
  - Network errors
- **No retry** for:
  - Authentication errors (401, 403)
  - Bad request errors (400)

### 3. **Retry-After Header Support**
- Parses `Retry-After` header from API responses
- Supports both formats:
  - Seconds (e.g., "60")
  - HTTP date (e.g., "Wed, 21 Oct 2025 07:28:00 GMT")
- Respects server-specified retry timing

### 4. **Per-Model Rate Limit Tracking**
- Maintains state for each model independently
- Tracks:
  - Last attempt timestamp
  - Consecutive failure count
  - Next retry time (from Retry-After header)
- Prevents unnecessary requests to rate-limited models

### 5. **Enhanced Error Messages**
Provides clear, actionable error messages:

```
✓ Success with model: google/gemini-2.0-flash-exp:free
⚠ Rate limited (429) on nvidia/nemotron-nano-12b-v2-vl:free. Retry 1/3. Waiting 2s...
⚠ Service temporarily unavailable (503) for google/gemma-3-27b-it:free. Retry 2/3
✗ Authentication error (401): Invalid API key
✗ Rate limit exceeded after 3 attempts. Please try again later or switch to a different model.
```

### 6. **Improved Logging**
- Clear visual indicators (✓, ⚠, ✗) for different states
- Detailed attempt tracking (e.g., "Request attempt 2/3")
- Wait time displayed in human-readable format
- Error body preview (first 200 characters)

### 7. **Custom Error Class**
New `OpenRouterError` class with properties:
- `status`: HTTP status code
- `statusText`: HTTP status text
- `body`: Full error response body
- `retryAfter`: Parsed retry delay in milliseconds
- `isRateLimited`: Boolean flag for rate limit errors

## Configuration

```typescript
const RATE_LIMIT_CONFIG = {
    maxRetries: 3,           // Number of retry attempts
    baseDelay: 2000,         // Initial delay (2 seconds)
    maxDelay: 30000,         // Maximum delay (30 seconds)
    backoffMultiplier: 2,    // Exponential multiplier
};
```

## Usage Example

The service automatically handles rate limiting:

```typescript
// Before: Simple request that fails immediately on rate limit
const result = await generateWithOpenRouter({ model, contents, config });

// After: Automatically retries with exponential backoff
const result = await generateWithOpenRouter({ model, contents, config });
// Logs:
// [OpenRouter] Request attempt 1/3 for model: google/gemini-2.0-flash-exp:free
// [OpenRouter] ⚠ Rate limited (429). Retry 1/3. Waiting 2s...
// [OpenRouter] Request attempt 2/3 for model: google/gemini-2.0-flash-exp:free
// [OpenRouter] ✓ Success with model: google/gemini-2.0-flash-exp:free
```

## Integration with geminiService.ts

Updated the fallback loop to:
- Remove redundant retry logic (now handled by openRouterService)
- Better error detection using `error.isRateLimited` flag
- Stop trying other models on authentication errors
- Provide clearer logging about what's happening

## Benefits

1. **Better User Experience**: Automatic retries mean users don't see immediate failures
2. **Reduced API Spam**: Exponential backoff prevents overwhelming the API
3. **Clearer Debugging**: Enhanced logging makes it easy to diagnose issues
4. **Respects API Limits**: Honors Retry-After headers and tracks per-model state
5. **Fail Fast on Auth**: Immediately stops on authentication errors instead of wasting retries
6. **Production Ready**: Handles edge cases like network errors, malformed responses, etc.

## Testing Recommendations

1. Test with expired/invalid API key (should fail immediately)
2. Test with rate-limited account (should retry and eventually succeed or fail gracefully)
3. Test with network interruption (should retry on network errors)
4. Monitor console logs to verify proper backoff timing
5. Check that multiple concurrent requests don't cause issues

## Future Enhancements

Potential improvements for future iterations:
- Global rate limit tracking across all requests
- User-facing notifications when rate limits are hit
- Automatic model switching when one is consistently rate-limited
- Persistent rate limit state (survive page refreshes)
- Dashboard showing API usage and rate limit status
