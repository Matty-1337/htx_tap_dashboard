# HTX TAP Analytics Dashboard

Restaurant analytics platform for Toast POS data with FastAPI backend (Railway) and Next.js frontend (Vercel).

## Architecture

- **Backend**: FastAPI application deployed on Railway
- **Frontend**: Next.js application deployed on Vercel
- **Storage**: Supabase Storage for CSV data files
- **Authentication**: Simple access code-based login with httpOnly cookies

## Project Structure

```
.
├── main.py                 # FastAPI backend entrypoint
├── htx_tap_analytics.py    # Core analytics functions
├── executive_dashboard.py   # Executive dashboard calculations
├── executive_visualizations.py  # Visualization helpers
├── requirements.txt        # Python dependencies
├── web/                    # Next.js frontend
│   ├── app/
│   │   ├── login/         # Login page
│   │   ├── dashboard/     # Dashboard page
│   │   └── api/           # API routes (login, session, logout)
│   └── middleware.ts      # Auth middleware
└── app.py                 # Streamlit app (legacy, not used in production)
```

## Local Development

### Backend (FastAPI)

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables:
```bash
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export SUPABASE_BUCKET="client-data"
export PORT=8000
```

3. Run the server:
```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### Frontend (Next.js)

1. Navigate to web directory:
```bash
cd web
npm install
```

2. Set environment variables (create `.env.local`):
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
LOGIN_CODE_MELROSE=your-melrose-code
LOGIN_CODE_BESTREGARD=your-bestregard-code
LOGIN_CODE_FANCY=your-fancy-code
COOKIE_SECRET=your-secret-key
```

3. Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Deployment

### Railway (Backend)

1. Connect your GitHub repository to Railway
2. Railway will auto-detect Python and use Nixpacks
3. Set the following environment variables in Railway:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_BUCKET` (default: "client-data")
   - `PORT` (auto-provided by Railway)

4. Start command (auto-detected):
   ```
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

### Vercel (Frontend)

1. Connect your GitHub repository to Vercel
2. Set **Root Directory** to `/web` in Vercel project settings
3. Set the following environment variables in Vercel:
   - `NEXT_PUBLIC_API_BASE_URL` (your Railway backend URL)
   - `LOGIN_CODE_MELROSE`
   - `LOGIN_CODE_BESTREGARD`
   - `LOGIN_CODE_FANCY`
   - `COOKIE_SECRET`

4. Deploy - Vercel will auto-detect Next.js and build

## Environment Variables

### Railway (Backend)

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `SUPABASE_BUCKET` | Storage bucket name | No (default: "client-data") |
| `PORT` | Server port | Auto-provided |

### Vercel (Frontend)

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_BASE_URL` | Railway backend URL | Yes |
| `LOGIN_CODE_MELROSE` | Access code for Melrose client | Yes |
| `LOGIN_CODE_BESTREGARD` | Access code for Bestregard client | Yes |
| `LOGIN_CODE_FANCY` | Access code for Fancy client | Yes |
| `COOKIE_SECRET` | Secret for signing JWT cookies | Yes |

## API Endpoints

### GET /health
Health check endpoint.

**Response:**
```json
{
  "ok": true,
  "timestamp": "2025-01-01T12:00:00"
}
```

### POST /run
Run full analysis for a client.

**Request:**
```json
{
  "clientId": "melrose",
  "params": {
    "upload_to_db": false,
    "report_period": "2025-01"
  }
}
```

**Response:**
```json
{
  "clientId": "melrose",
  "generatedAt": "2025-01-01T12:00:00",
  "kpis": {
    "bottle_conversion_pct": 15.5,
    "food_attachment_rate": 45.2
  },
  "charts": {
    "hourly_revenue": [...]
  },
  "tables": {
    "waste_efficiency": {
      "data": [...],
      "columns": [...],
      "total_rows": 50,
      "returned_rows": 50
    }
  },
  "executionTimeSeconds": 45.2
}
```

## Client Folder Mapping

The backend maps client IDs to Supabase Storage folder names:

- `melrose` → `Melrose/`
- `bestregard` → `Bestregard/`
- `fancy` → `Fancy/`

## Adding a New Client

1. **Backend**: Add entry to `CLIENT_FOLDER_MAP` in `main.py`:
   ```python
   CLIENT_FOLDER_MAP = {
       "melrose": "Melrose",
       "bestregard": "Bestregard",
       "fancy": "Fancy",
       "newclient": "NewClient"  # Add here
   }
   ```

2. **Frontend**: Add option to login dropdown in `web/app/login/page.tsx`:
   ```tsx
   <option value="newclient">New Client</option>
   ```

3. **Vercel**: Add environment variable:
   ```
   LOGIN_CODE_NEWCLIENT=your-access-code
   ```

4. **Supabase**: Create folder `NewClient/` in `client-data` bucket and upload CSV files

## Smoke Test Checklist

### Backend
1. Health check:
   ```bash
   curl http://localhost:8000/health
   ```

2. Run analysis:
   ```bash
   curl -X POST http://localhost:8000/run \
     -H "Content-Type: application/json" \
     -d '{"clientId": "melrose"}'
   ```

### Frontend
1. Navigate to `http://localhost:3000/login`
2. Select a client and enter access code
3. Verify redirect to `/dashboard`
4. Verify dashboard loads with KPIs, chart, and table
5. Test logout functionality

## Notes

- The Streamlit app (`app.py`) is kept for reference but not used in production
- Analytics functions in `htx_tap_analytics.py` are unchanged - only wrapped in FastAPI
- Response payloads are limited to 500 rows per table to prevent huge JSON responses
- Session cookies expire after 30 days
- CORS is configured to allow Vercel deployments (`*.vercel.app`)
