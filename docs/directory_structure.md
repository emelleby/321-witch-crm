# Witch House CRM Directory Structure

## Root Directory

```
├── app/                    # Next.js application routes and pages
├── components/            # Reusable React components
├── docs/                  # Project documentation
├── hooks/                # Custom React hooks
├── lib/                  # Core libraries and utilities
├── public/               # Static assets
├── scripts/              # Utility scripts
├── supabase/             # Supabase configuration and migrations
└── utils/                # Helper functions and utilities
```

## Application Routes

```
app/
├── (protected)/          # Routes requiring authentication
│   ├── admin/           # Admin-only routes
│   ├── agent/           # Agent-specific routes
│   ├── customer/        # Customer-specific routes
│   └── organization/    # Organization management routes
├── login/               # Authentication routes
├── register/           # User registration
├── reset-password/     # Password reset flow
├── forgot-password/    # Password recovery
├── verify-email/       # Email verification
├── forums/             # Public forums
└── error/              # Error pages
```

## Component Organization

```
components/
├── admin/              # Admin-specific components
├── agent/             # Agent workspace components
├── article/           # Knowledge base article components
├── customer/          # Customer portal components
├── editor/            # Rich text editor components
├── forms/             # Reusable form components
├── layout/            # Layout components
├── shared/            # Shared/common components
└── ui/                # UI primitives (Shadcn)
```
