![Witch House CRM](public/images/Shapes%2014.png)

# Witch House CRM

> Modern AI-powered customer relationship management system with automated support capabilities.

## 🌟 Features


### Core CRM Features
- 🎫 Advanced ticket management with AI-powered routing
- 📚 Knowledge base with vector search capabilities
- 🗣️ Community forums with rich discussion features
- 📊 Real-time analytics and performance metrics
- 👥 Role-based access control (Admin, Agent, Customer)
- 🏢 Multi-organization support

### AI Capabilities
- 🤖 Automated ticket resolution for common queries
- 🔍 Intelligent ticket categorization and routing
- 💡 AI-powered response suggestions for agents
- 📝 Vector-based knowledge base search
- 🎯 Smart article recommendations

### Modern Tech Stack
- ⚡ Next.js 15 for lightning-fast performance
- 🎨 Beautiful UI with Shadcn components
- 🔐 Supabase for auth, database, and storage
- ✍️ Lexical-powered rich text editing
- 🎭 Dark/light theme support
- 📱 Fully responsive design

## 🚀 Getting Started

### Prerequisites
- Node.js 23+
- Supabase account
- OpenAI API key (for AI features)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/witch-house-crm.git
cd witch-house-crm
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Update `.env.local` with your credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

5. Run the development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 📖 Documentation

- [Project Requirements](docs/Project%20Requirements.md)
- [Directory Structure](docs/directory_structure.md)
- [TODO List](docs/TODO.md)

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS, Shadcn UI
- **Backend**: Supabase (Auth, Database, Storage, Edge Functions)
- **AI/ML**: LangChain, OpenAI, Vector embeddings
- **Editor**: Lexical
- **Infrastructure**: AWS Amplify 2.0

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## 🙏 Acknowledgments

- Shadcn UI for the beautiful component library
- Supabase team for the amazing backend platform
- LangChain for AI agent capabilities
- Next.js team for the incredible framework
