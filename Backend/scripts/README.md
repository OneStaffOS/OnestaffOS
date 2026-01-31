# JWT Secret Rotation

Automated JWT secret rotation for enhanced security.

## Overview

The JWT secret is automatically rotated every 24 hours to maintain security best practices. This is handled by the `rotate-jwt-secret.js` script.

## Features

- **Automatic Rotation**: JWT_SECRET is rotated every 24 hours
- **Cryptographically Secure**: Uses Node.js crypto module for pseudo-random generation (512-bit secrets)
- **Automatic Backups**: Creates timestamped backups before each rotation
- **Backup Cleanup**: Keeps only the last 5 backups to save disk space
- **Comprehensive Logging**: All rotations are logged with timestamps

## Setup

### Option 1: Cron Job (Recommended for Production)

Run the setup script to configure automatic rotation:

```bash
cd Backend
./scripts/setup-jwt-rotation-cron.sh
```

This will:
- Set up a cron job to run daily at 2:00 AM
- Create the logs directory
- Test the rotation script
- Show you how to verify and manage the cron job

### Option 2: Node.js Scheduler (Alternative)

Run the script in scheduled mode (keeps process alive):

```bash
cd Backend
node scripts/rotate-jwt-secret.js --schedule
```

You can run this in a process manager like PM2:

```bash
pm2 start scripts/rotate-jwt-secret.js --name jwt-rotator -- --schedule
pm2 save
```

### Option 3: Manual Rotation

Rotate the JWT secret immediately:

```bash
cd Backend
node scripts/rotate-jwt-secret.js
```

## How It Works

1. **Generation**: Creates a 128-character hex string (64 bytes / 512 bits) using `crypto.randomBytes()`
2. **Dual-Key Strategy**: Implements industry-standard graceful rotation
   - Current `JWT_SECRET` → `JWT_SECRET_OLD` (keeps existing sessions valid)
   - New secret → `JWT_SECRET` (used for new logins)
   - AuthGuard verifies tokens against both secrets during grace period
3. **History Tracking**: Saves old and new secrets to `rotation-history/rotation-[timestamp].txt`
4. **Update**: Updates both `JWT_SECRET` and `JWT_SECRET_OLD` in `.env` file
5. **Cleanup**: Removes old rotation history files (keeps only 10 most recent)
6. **Logging**: Records all operations in `logs/jwt-rotation.log`

## Grace Period

- **24-hour transition**: Active sessions remain valid for 24 hours after rotation
- **New logins**: Immediately use the new `JWT_SECRET`
- **Token verification**: Accepts tokens signed with either `JWT_SECRET` or `JWT_SECRET_OLD`
- **After 24h**: Next rotation moves current secret to old, dropping previous old secret

## File Locations

- **Rotation Script**: `Backend/scripts/rotate-jwt-secret.js`
- **Setup Script**: `Backend/scripts/setup-jwt-rotation-cron.sh`
- **Environment File**: `Backend/.env`
- **Rotation History**: `Backend/rotation-history/rotation-[timestamp].txt` (old and new secrets only)
- **Logs**: `Backend/logs/jwt-rotation.log`

## Verification

Check if cron job is active:
```bash
crontab -l | grep jwt
```

View rotation logs:
```bash
tail -f Backend/logs/jwt-rotation.log
```

View rotation history:
```bash
ls -la Backend/rotation-history/
cat Backend/rotation-history/rotation-[timestamp].txt
```

## Security Considerations

- ✅ **No Session Disruption**: Dual-key approach keeps existing sessions valid during 24h grace period
- ✅ **History Tracking**: Only secrets stored in `rotation-history/` (not full .env files)
- ✅ **Excluded from Git**: `rotation-history/` folder is inmediately
- ✅ **Backups Excluded**: `.env.backup.*` files are added to `.gitignore` (never committed)
- ✅ **Cryptographically Secure**: Uses `crypto.randomBytes()` for unpredictable secrets
- ✅ **Logging**: All rotation events are timestamped and logged
- ℹ️ **Grace Period**: Tokens signed with old secret remain valid for 24 hours

## Troubleshooting

### Cron job not running?

Check cron service status:
```bash
# macOS
sudo launchctl list | grep cron

# Linux
systemctl status cron
```

View cron logs:
```bash
# macOS
tail -f /var/log/system.log | grep cron

# Linux
grep CRON /var/log/syslog
```

### Manual intervention needed?

If rotation fails, you can manually generate a new secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Then update `.env` manually.

## Removing the Cron Job

```bash
crontab -e
# Delete the line containing "rotate-jwt-secret.js"
# Save and exit
```

Or use sed:
```bash
crontab -l | grep -v "rotate-jwt-secret.js" | crontab -
```
