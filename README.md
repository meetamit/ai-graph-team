# Graph Team UI

A DAG editor with Temporal workflow execution, built with Next.js.

## Features

- **Visual DAG Editor**: Create and edit directed acyclic graphs of instructions
- **Temporal Integration**: Execute workflows reliably with Temporal's orchestration engine
- **Real-time Monitoring**: Monitor execution progress, view logs, and track artifacts

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
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

2. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in the required environment variables:
   - `POSTGRES_URL`: PostgreSQL connection string
   - `AUTH_SECRET`: Random secret for NextAuth

3. **Set up the database**:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

### Database Setup

The application uses PostgreSQL with Drizzle ORM.

## Development

### Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run db:generate`: Generate database migrations
- `npm run db:migrate`: Run database migrations
- `npm run db:push`: Push schema changes to database
- `npm run lint`: Run ESLint

### Adding New Features

1. **Database Changes**: Update `db/schema.ts` and run `npm run db:generate`
2. **API Routes**: Add new routes in `app/api/`
3. **Components**: Create reusable components in `components/`
4. **Hooks**: Add SWR hooks in `hooks/` for client-side data fetching
5. **Validations**: Add Zod schemas in `lib/validations/`

### React Compiler Demo

The application includes several React Compiler demonstrations:

1. **Activity Component**: Shows loading states with automatic optimization
2. **View Transitions**: Smooth page transitions (see `app/(marketing)/page.tsx` → `app/(app)/page.tsx`)
3. **Automatic Memoization**: All components benefit from React Compiler optimizations

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms

The application can be deployed to any platform that supports Next.js:

- Railway
- Render
- AWS Amplify
- Netlify (with serverless functions)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For questions and support:

- Create an issue in the GitHub repository
- Check the documentation
- Review the example implementations

---

**Note**: This is a development version. The Temporal client is currently a dummy implementation. To enable real workflow execution, implement the `TemporalClient` interface as described in the setup instructions.

