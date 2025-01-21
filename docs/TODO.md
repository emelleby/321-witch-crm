# Witch House CRM Project TODO List

## Authentication & Authorization

- [✅] User registration with email
- [✅] User login with email/password
- [✅] Email verification
- [✅] Password reset functionality
- [✅] Role-based access control (Admin, Agent, Customer)
- [✅] Organization-based access control
- [✅] Row Level Security (RLS) policies

## Ticket System

- [✅] Create tickets with title, description, and priority
- [✅] File attachments support
- [✅] Ticket status management (Open, Closed, etc.)
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

## Communication

- [✅] Real-time messaging between agents and customers
- [✅] File attachments in messages
- [ ] Canned responses
- [ ] Email integration for ticket creation and updates
- [ ] Email notifications
- [ ] Chat widget for website integration
- [ ] SMS notifications
- [ ] Sanitization of user input for WYSIWYG editor
- [ ] Fix bug where unable to remove header style from text in WYSIWYG editor
- [ ] Preview markdown causes the editor to spazz out and go all over the place.

## Knowledge Base

- [✅] Article creation and management
- [✅] Article categories
- [✅] Rich text editor support
- [✅] File attachments in articles
- [ ] Article versioning
- [ ] Article feedback system
- [ ] Article search
- [ ] Public/private article visibility
- [ ] Article templates

## Forums

- [✅] Forum categories
- [✅] Topic creation
- [✅] Reply system
- [✅] Rich text editor support
- [ ] Forum moderation tools
- [ ] Forum search
- [ ] Forum subscriptions
- [ ] Forum badges and reputation system

## Reporting & Analytics

- [✅] Basic dashboard with key metrics
- [✅] Ticket statistics
- [✅] Agent performance metrics
- [ ] Custom report builder
- [ ] Scheduled reports
- [ ] Export reports to CSV/PDF
- [ ] Advanced analytics with charts
- [ ] Time-based analytics
- [ ] Customer satisfaction metrics

## Administration

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

## Integration & API

- [✅] Supabase integration
- [✅] File storage integration
- [ ] RESTful API endpoints
- [ ] Webhook support
- [ ] OAuth2 authentication
- [ ] Third-party integrations (Slack, etc.)
- [ ] API documentation

## User Experience

- [✅] Responsive design
- [✅] Dark/light theme support
- [✅] Real-time updates
- [✅] File drag-and-drop
- [✅] Rich text editing
- [ ] Keyboard shortcuts
- [ ] Progressive Web App (PWA)
- [ ] Multi-language support
- [ ] Accessibility compliance

## Notifications

- [✅] In-app notifications
- [ ] Email notifications
- [ ] Browser notifications
- [ ] Mobile push notifications
- [ ] Notification preferences
- [ ] Notification templates

## Extra Features (Not in Original Requirements)

- [✅] Vector search for knowledge base articles
- [✅] AI-powered ticket categorization
- [✅] AI-powered article suggestions
- [✅] AI chat assistance for agents
- [ ] AI-powered ticket routing
- [ ] AI-generated response suggestions
- [ ] Sentiment analysis for tickets
- [ ] AI-powered customer satisfaction prediction
- [ ] React Native mobile app

# Future Thoughts by Josh

Once we have all the above features implemented, we should start thinking about
the following:

### Expanded CRM

## Sales Pipeline and Customer Relationship Management

- [ ] Sales pipeline with stages and metrics
- [ ] Upload sales calls and use AI to transcribe, summarize, extract insights,
      and generate follow-up actions
- [ ] AI-powered sales assistant
- [ ] AI generate sales pitches and proposals and emails based on customer
      information and history
