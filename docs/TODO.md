# Witch House CRM Project TODO List

## Core Features

### Authentication & Authorization

- [✅] User registration with email
- [✅] User login with email/password
- [✅] Email verification
- [✅] Password reset functionality
- [✅] Role-based access control (Admin, Agent, Customer)
- [✅] Organization-based access control
- [✅] Row Level Security (RLS) policies

### Ticket Management

- [✅] Create tickets with title, description, and priority
- [✅] File attachments support
- [✅] Ticket status management
- [✅] Ticket assignment to agents
- [✅] Internal notes for agents
- [✅] SLA tracking and management
- [✅] Ticket categories and tags
- [ ] Advanced ticket search
- [ ] Ticket templates
- [ ] Bulk ticket actions
- [ ] Custom ticket fields
- [ ] Ticket merging
- [ ] Ticket splitting

### Communication Systems

- [✅] Real-time messaging between agents and customers
- [✅] File attachments in messages
- [ ] Canned responses
- [ ] Email integration for ticket creation/updates
- [ ] Email notifications
- [ ] Chat widget for website integration
- [ ] SMS notifications

### Knowledge Base

- [✅] Article creation and management
- [✅] Article categories
- [✅] Rich text editor support
- [✅] File attachments in articles
- [ ] Article versioning
- [ ] Article feedback system
- [ ] Article search
- [ ] Public/private article visibility
- [ ] Article templates

### Forums

- [✅] Forum categories
- [✅] Topic creation
- [✅] Reply system
- [✅] Rich text editor support
- [ ] Forum moderation tools
- [ ] Forum search
- [ ] Forum subscriptions
- [ ] Forum badges and reputation system

### Analytics & Reporting

- [✅] Basic dashboard with key metrics
- [✅] Ticket statistics
- [✅] Agent performance metrics
- [ ] Custom report builder
- [ ] Scheduled reports
- [ ] Export reports to CSV/PDF
- [ ] Advanced analytics with charts
- [ ] Time-based analytics
- [ ] Customer satisfaction metrics

## Technical Infrastructure

### Administration

- [✅] User management
- [✅] Team management
- [✅] Organization management
- [✅] Role management
- [✅] Category/tag management
- [✅] SLA policy management
- [ ] Custom fields management
- [ ] Workflow automation rules
- [ ] Email template management
- [ ] System settings configuration
- [ ] Audit logs

### API & Integration

- [✅] Supabase integration
- [✅] File storage integration
- [ ] RESTful API endpoints
- [ ] Webhook support
- [ ] OAuth2 authentication
- [ ] Third-party integrations
- [ ] API documentation

### UI/UX Improvements

- [✅] Responsive design
- [✅] Dark/light theme support
- [✅] Real-time updates
- [✅] File drag-and-drop
- [✅] Rich text editing
- [ ] Keyboard shortcuts
- [ ] Progressive Web App (PWA)
- [ ] Multi-language support
- [ ] Accessibility compliance

### Notification System

- [✅] In-app notifications
- [ ] Email notifications
- [ ] Browser notifications
- [ ] Mobile push notifications
- [ ] Notification preferences
- [ ] Notification templates

## AI Features

- [✅] Vector search for knowledge base articles
- [✅] AI-powered ticket categorization
- [✅] AI-powered article suggestions
- [✅] AI chat assistance for agents
- [ ] AI-powered ticket routing
- [ ] AI-generated response suggestions
- [ ] Sentiment analysis for tickets
- [ ] AI-powered customer satisfaction prediction

## Bug Fixes

- [ ] Sanitization of user input for WYSIWYG editor
- [ ] Unable to remove header style from text in WYSIWYG editor
- [ ] Preview markdown causes editor to misbehave
- [ ] The preview modal has two exit buttons
- [✅] "My Tickets" page for customers is stuck in infinite loading

## Current Focus

Priority items that need immediate attention:

1. Fix WYSIWYG editor bugs
2. Complete ticket management features
3. Implement email notification system
