# Scripts

This directory contains automation scripts for project setup and maintenance.

## 📁 Structure

```
scripts/
├── backend/          # Backend-specific scripts
│   ├── setup-backblaze.ps1    # Configure Backblaze B2 credentials
│   ├── setup-env.ps1          # Setup backend .env file
│   └── get-base64-key.ps1    # Convert service account to base64
└── README.md        # This file
```

## 🚀 Usage

### Backend Scripts

All backend scripts should be run from the `backend-hono/` directory:

```powershell
# Navigate to backend directory
cd backend-hono

# Run scripts from scripts/backend/
..\scripts\backend\setup-env.ps1
..\scripts\backend\setup-backblaze.ps1
..\scripts\backend\get-base64-key.ps1
```

### Script Descriptions

#### `backend/setup-env.ps1`
Automatically creates `.env` file for backend development:
- Reads Firebase service account JSON
- Encodes to base64
- Generates random secret token
- Creates `.env` with all required variables

**Usage:**
```powershell
cd backend-hono
..\scripts\backend\setup-env.ps1
```

#### `backend/setup-backblaze.ps1`
Adds Backblaze B2 credentials to `.env` file:
- Configures Backblaze Key ID and Application Key
- Sets bucket name, endpoint, and region
- Updates or creates `.env` file

**Usage:**
```powershell
cd backend-hono
..\scripts\backend\setup-backblaze.ps1
```

#### `backend/get-base64-key.ps1`
Converts Firebase service account JSON to base64 string:
- Reads service account file
- Encodes to base64
- Outputs for use in environment variables
- Saves to `serviceAccountKey.base64.txt`

**Usage:**
```powershell
cd backend-hono
..\scripts\backend\get-base64-key.ps1
```

## ⚠️ Requirements

- **PowerShell**: All scripts are PowerShell scripts (`.ps1`)
- **Windows**: Scripts are designed for Windows PowerShell
- **Permissions**: May require execution policy changes:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

## 📝 Notes

- Scripts modify `.env` files - ensure you have backups
- Service account keys are sensitive - never commit them
- All scripts should be run from the appropriate project directory

## 🔗 Related

- **Documentation**: See `../docs/` for detailed guides
- **Environment Setup**: See `../docs/README_ENV.md` for environment variable documentation
