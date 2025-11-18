# Graph Team UI

A DAG editor with Temporal workflow execution, built with Next.js.

## Features

- **Visual DAG Editor**: Create and edit directed acyclic graphs of prompt instructions and tools
- **Temporal Integration**: Execute workflows reliably with Temporal's orchestration engine
- **Real-time Monitoring**: Monitor execution progress, view logs, and track artifacts

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **UI**: React Flow, Radix UI
- **Database**: PostgreSQL with Drizzle ORM
- **Workflow Engine**: Temporal
- **File Storage**: Vercel Blob or S3-compatible storage
- **Data Fetching**: SWR for client-side, RSC for server-side
- **Validation**: Zod schemas
- **React Compiler**: Enabled for performance optimizations

## Getting Started

### Prerequisites

- Node.js
- PostgreSQL database
- Temporal server

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables <u>in two places</u>>**:
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in the required environment variables:
   - `POSTGRES_URL`: PostgreSQL connection string
   - `AUTH_SECRET`: Random secret for NextAuth

   ```bash
   cp packages/runner/.env.example packages/runner/.env
   ```
   
   Fill in the required environment variables:
   - `OPENAI_API_KEY`: API key for making LLM calls with OpenAI

3. **Set up the database**:
   ```bash
   npm run db:migrate # Only needs to be run upon first setup or when the database schema changes
   ```

   Postgres cheatsheet commands you may need to run:

   ```PostgreSQL
   # Create a new database
   CREATE DATABASE my_new_database;

   # Create a new user
   CREATE USER my_new_user WITH PASSWORD 'secure_password';

   # Grant permissions to a user on a database
   GRANT ALL PRIVILEGES ON DATABASE my_new_database TO my_new_user;
   # Grant permissions to a user on all databases
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO my_new_user;
   # Grant permissions to a user on all sequences
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO my_new_user;

   # Grant superuser privileges to a user
   ALTER USER my_new_user WITH SUPERUSER; # CAUTION: Only do this for development purposes.
   ```
   
4. **Start the Temporal worker**:
   ```bash
   npm run worker
   ```
   
   This will start the Temporal worker that runs nodes in the graph as workflows and activities.

   If you installed Temporal using Docker, you can start it with:
   ```bash
   docker compose up
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```
   
   This will start the development server that runs the Next.js application and integrates with the Temporal worker.

6. **Run the tests**:
   ```bash
   npx playwright install # Only needs to be run once
   npm run test
   ```

7. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

### Database Setup

The application uses PostgreSQL with Drizzle ORM.

## Development

### Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run worker`: Start Temporal worker
- `npm run db:generate`: Generate database migrations
- `npm run db:migrate`: Run database migrations
- `npm run db:push`: Push schema changes to database
- `npm run lint`: Run ESLint
- `npm run storybook`: Start Storybook component explorer
- `npm run build-storybook`: Build static Storybook

### Adding New Features

1. **Database Changes**: Update `db/schema.ts` and run `npm run db:generate`
2. **API Routes**: Add new routes in `app/api/`
3. **Components**: Create reusable components in `components/`
4. **Hooks**: Add SWR hooks in `hooks/` for client-side data fetching

