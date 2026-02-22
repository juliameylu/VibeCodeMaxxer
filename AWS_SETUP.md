# AWS Setup (App Runner + Cognito + DynamoDB)

## Goal
Low-cost multi-user backend with minimal change from `main`.

## What is implemented
- Existing session-token auth still works.
- Optional Cognito bearer JWT auth is supported (`Authorization: Bearer <jwt>`).
- In-memory planner state is snapshotted to DynamoDB for persistence across restarts.

## 1) Create AWS resources
1. Region: `us-west-2` (or your preferred region).
2. DynamoDB table:
   - Name: `polyjarvis-state`
   - Partition key: `pk` (String)
   - Sort key: `sk` (String)
3. Cognito User Pool:
   - Create app client.
   - Save `COGNITO_USER_POOL_ID` and `COGNITO_APP_CLIENT_ID`.

## 2) App Runner environment variables
```bash
AUTH_MODE=cognito_only
AWS_REGION=us-west-2
AWS_DYNAMO_TABLE=polyjarvis-state
AWS_STATE_PK=planner_state
AWS_STATE_SK=v1
COGNITO_USER_POOL_ID=us-west-2_xxxxx
COGNITO_APP_CLIENT_ID=xxxxxxxxxxxx
SNAPSHOT_FLUSH_MS=2000
```

For local development, use:
```bash
AUTH_MODE=session_or_cognito
```

## 3) IAM permissions for App Runner role
- `dynamodb:GetItem` on the table
- `dynamodb:PutItem` on the table

## 4) Deploy App Runner
1. Source: GitHub repository.
2. Build command: `npm ci`
3. Start command: `npm run backend`
4. Port: `8787`
5. Add env vars above.

## 5) Validate
1. `GET /health` returns backend up.
2. Sign in as two users and verify isolated records.
3. Restart service and confirm data persists.

## Notes
- Snapshot persistence is intentionally simple and low-cost for demo/hackathon usage.
- For high write concurrency, migrate to normalized DynamoDB/Postgres tables.
