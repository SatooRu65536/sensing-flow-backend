# Sensing Flow Backend
This is the backend service for Sensing Flow application.

## Setup Development Environment
### 1. Install Dependencies
```shell
pnpm install
```

### 2. Create Environment Variables File
```shell
cp .env.example .env.development
```

### 3. Start Database
```shell
docker compose -f docker/compose.yml -p sensing-flow up -d sensing-flow-db
```

You can also use VSCode `Tasks: Run Task` to start the database.

### 4. Migrate Database
```shell
pnpm migrate:dev
```

### 5. Start Development Server
```shell
pnpm dev
```


## Setup Test Environment
### 1. Start Database
```shell
docker compose -f docker/compose.yml -p sensing-flow up -d sensing-flow-db
```
You can also use VSCode `Tasks: Run Task` to start the database.

### 2. Start Localstack
```shell
docker compose -f docker/compose.yml -p sensing-flow up -d localstack
```

### 3. Migrate Database
```shell
pnpm migrate:test
```

### 4. Run Tests
```shell
pnpm test        # run all tests
pnpm test <path> # run tests in a specific file or folder
pnpm test:unit   # run unit tests only
pnpm test:e2e    # run e2e tests only
pnpm test:cov    # run tests with coverage report
```


## Register Users
### 1. Create Environment Variables File
```shell
cp .env.example.rest-client .env
```

### 2. Register Users
If the users are not registered in Cognito yet, run:
```shell
just setup-users
```

If the users are already registered in Cognito, run:
```shell
just register-users
```

⚠️ Note: Currently, admin and developer are registered as pro plan temporarily.


## Setup REST Client
### 1. Create Environment Variables File
```shell
cp .env.example.rest-client .env
```

### 2. Set JWT Secret to .env
Copy the JWT token to clipboard.
```shell
just <plan>
```

Paste the JWT token into `.env` file as the value of `TOKEN`.


## Deploy to AWS
### 1. Configure Custom Domain Certificate
Set up a custom domain certificate in AWS Certificate Manager.

// omit

### 2. Set Certificate ARN to SSM Parameter Store
Set the certificate ARN to SSM Parameter Store with the name `/api-cert-arn/<stage>`.

// omit

### 3. Deploy
```shell
pnpm deploy:<stage>
```
