# Arc Planner

<div align="center">

![Arc Planner](https://img.shields.io/badge/Arc-Planner-black?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)

**A modern database schema visualizer and AI-powered architecture analyzer**

[Features](#features) • [Quick Start](#quick-start) • [Configuration](#configuration) • [Usage](#usage) • [Contributing](#contributing)

</div>

---

## Features

- 🗂️ **Schema Visualization** — Parse and visualize SQL database schemas with table relationships
- 🤖 **AI-Powered Analysis** — Get instant insights about your schema using Claude AI
- 🔐 **RLS Policy Support** — Understand Row Level Security policies in plain English
- ⚠️ **Schema Warnings** — Automatic detection of missing primary keys, RLS issues, and isolated tables
- 🌙 **Dark Mode** — Beautiful dark/light theme support
- 📐 **Resizable Panels** — Customize your workspace with draggable panel dividers
- 💬 **Interactive Chat** — Ask questions about your schema and get SQL recommendations

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18.x or later
- [npm](https://www.npmjs.com/), [yarn](https://yarnpkg.com/), [pnpm](https://pnpm.io/), or [bun](https://bun.sh/)
- A [Claude API key](https://console.anthropic.com/) from Anthropic (for AI features)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/arc-planner.git
   cd arc-planner
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

3. **Set up environment variables**

   ```bash
   # Copy the example environment file
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your Claude API key:

   ```env
   CLAUDE_API_KEY=sk-ant-api03-your-api-key-here
   ```

4. **Add your database schema**

   Place your `.sql` files in the `database/` folder:

   ```bash
   # Example
   cp your-schema.sql database/my-project.sql
   ```

5. **Start the development server**

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

6. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

---

## Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

| Variable | Required | Description |
|----------|----------|-------------|
| `CLAUDE_API_KEY` | Yes | Your Anthropic Claude API key for AI features |

### Getting a Claude API Key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up or log in to your account
3. Navigate to **API Keys** in the dashboard
4. Click **Create Key** and copy the generated key
5. Paste it in your `.env.local` file

> ⚠️ **Security Note**: Never commit your `.env.local` file to version control. It's already in `.gitignore`.

---

## Usage

### Adding Database Schemas

Arc Planner reads `.sql` files from the `database/` folder. Simply drop your schema files there:

```
arc-planner/
├── database/
│   ├── example.sql          # Included example (safe to delete)
│   ├── my-production.sql    # Your schema
│   └── my-staging.sql       # Another schema
```

#### Supported SQL Features

Arc Planner parses the following SQL constructs:

- ✅ `CREATE TABLE` statements
- ✅ `PRIMARY KEY` constraints (inline and table-level)
- ✅ `FOREIGN KEY` relationships
- ✅ `UNIQUE` constraints
- ✅ `NOT NULL` constraints
- ✅ `DEFAULT` values
- ✅ `CHECK` constraints
- ✅ Row Level Security (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- ✅ RLS Policies (`CREATE POLICY`)
- ✅ Schema prefixes (`public.`, `auth.`, etc.)

#### Example Schema Format

```sql
-- Basic table with constraints
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table with foreign key
CREATE TABLE public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT
);

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can view own posts" ON public.posts
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
```

### Schema Warnings

Arc Planner automatically detects common issues:

| Warning Type | Description |
|--------------|-------------|
| 🔴 **Error** | Tables missing primary keys |
| 🔴 **Error** | RLS enabled but no policies defined (blocks all access) |
| 🟡 **Warning** | Tables without RLS policies |
| 🔵 **Info** | Isolated tables with no relationships |

Click the 💬 chat icon next to any warning for a detailed AI explanation and fix suggestions.

### AI Chat Features

The AI assistant can help you with:

- Understanding table relationships
- Writing SQL queries for your schema
- Explaining RLS policies in plain English
- Identifying security issues
- Suggesting schema improvements
- Multi-tenancy architecture analysis

**Quick Actions:**
- Click **"Analyze"** in the header for a full schema quality report
- Click warning chat icons for specific issue explanations
- Ask any question about your schema in the chat panel

---

## Project Structure

```
arc-planner/
├── app/
│   ├── api/
│   │   ├── chat/           # Claude AI chat endpoint
│   │   └── databases/      # Database file scanning API
│   ├── globals.css         # Global styles & Streamdown theming
│   ├── layout.tsx          # Root layout with theme provider
│   └── page.tsx            # Main application page
├── components/
│   ├── db-visualizer/      # Core visualization components
│   │   ├── chat-panel.tsx  # AI chat interface
│   │   ├── table-details.tsx
│   │   └── tables-sidebar.tsx
│   ├── theme-provider.tsx  # Dark/light mode
│   └── ui/                 # shadcn/ui components
├── database/               # Your SQL schema files go here
│   └── example.sql         # Example schema for reference
├── hooks/
├── lib/
└── public/
```

---

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **AI**: [Claude API](https://anthropic.com/) (claude-opus-4-5-20251101)
- **Markdown**: [Streamdown](https://github.com/anthropics/streamdown) for streaming markdown
- **Theming**: [next-themes](https://github.com/pacocoursey/next-themes)
- **Resizable Panels**: [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels)

---

## Development

### Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Adding New Features

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Troubleshooting

### "CLAUDE_API_KEY not configured"

Make sure you have:
1. Created `.env.local` in the project root
2. Added your Claude API key: `CLAUDE_API_KEY=sk-ant-api03-...`
3. Restarted the development server

### No databases showing in dropdown

- Check that your `.sql` files are in the `database/` folder
- Ensure files have the `.sql` extension
- Check the browser console for parsing errors

### RLS policies not showing

Arc Planner looks for these patterns:
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- `CREATE POLICY ... ON table_name`

Make sure your SQL follows standard PostgreSQL RLS syntax.

---

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

## Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for beautiful, accessible components
- [Anthropic](https://anthropic.com/) for the Claude AI API
- [Vercel](https://vercel.com/) for Next.js and deployment platform

---

<div align="center">

Made with ❤️ for developers who care about database architecture

</div>
