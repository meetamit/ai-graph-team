# Temporal Hello World

This project demonstrates a basic Temporal workflow using TypeScript.

## Prerequisites

1. **Temporal Server**: You need to have Temporal Server running locally
   ```bash
   # Start Temporal Server
   temporal server start-dev
   ```

2. **PostgreSQL** (for development): 
   ```bash
   # Using Docker
   docker run --name temporal-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=temporal -p 5432:5432 -d postgres:13
   ```

## Running the Application

### Terminal 1: Start the Worker
```bash
npm run worker
```

### Terminal 2: Run the Client (execute workflow)
```bash
npm run dev
```

## What The Hello Workflow Does

1. **Worker** (`src/worker.ts`): Registers and runs the Temporal worker that executes workflows and activities
2. **Client** (`src/index.ts`): Starts a workflow execution
3. **Workflow** (`src/workflows/hello.workflow.ts`): Defines the business logic flow
4. **Activity** (`src/activities.ts`): Defines the actual work to be performed

The workflow will:
1. Log that it started
2. Call the `greetUser` activity with the name "Temporal User"
3. The activity will wait 1 second and return a greeting
4. The workflow will log the result and return it
5. The client will print the final result
