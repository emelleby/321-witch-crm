<!-- # Witch House CRM Project TODO List

## Core Features

### Authentication & Authorization

- [ ] User registration with email
- [ ] User login with email/password
- [ ] Email verification
- [ ] Password reset functionality
- [ ] Role-based access control (Admin, Agent, Customer)
- [ ] Organization-based access control
- [ ] Row Level Security (RLS) policies
- [ ] Domain validation middleware
  - [ ] Apex domain validation
  - [ ] Organization domain matching
  - [ ] Domain uniqueness checks
- [ ] Organization management service
  - [ ] Organization CRUD operations
  - [ ] Domain verification
  - [ ] User role management
- [ ] Enhanced role-based access control
  - [ ] Role definitions and permissions
  - [ ] Admin role capabilities
  - [ ] User role restrictions
- [ ] Enhanced email verification
  - [ ] Verification token generation
  - [ ] Email templates
  - [ ] Token validation endpoint

### Ticket Management

- [ ] Create tickets with title, description, and priority
- [ ] File attachments support
- [ ] Ticket status management
- [ ] Ticket assignment to agents
- [ ] Internal notes for agents
- [ ] SLA tracking and management
- [ ] Ticket categories and tags
- [ ] Advanced ticket search
- [ ] Ticket templates (Not yet implemented)
- [ ] Bulk ticket actions
- [ ] Custom ticket fields
- [ ] Ticket merging
- [ ] Ticket splitting

### Communication Systems

- [ ] Real-time messaging between agents and customers
- [ ] File attachments in messages
- [ ] Canned responses
- [ ] Email integration for ticket creation/updates
- [ ] Email notifications
- [ ] Chat widget for website integration
- [ ] SMS notifications

### Knowledge Base

- [ ] Article creation and management
- [ ] Article categories
- [ ] Rich text editor support
- [ ] File attachments in articles
- [ ] Article versioning
- [ ] Article feedback system
- [ ] Article search
- [ ] Public/private article visibility
- [ ] Article templates (Not yet implemented)

### Forums

- [ ] Forum categories
- [ ] Topic creation
- [ ] Reply system
- [ ] Rich text editor support
- [ ] Forum moderation tools
- [ ] Forum search
- [ ] Forum subscriptions
- [ ] Forum badges and reputation system

### Analytics & Reporting

- [ ] Basic dashboard with key metrics
- [ ] Ticket statistics
- [ ] Agent performance metrics
- [ ] Custom report builder
- [ ] Scheduled reports
- [ ] Export reports to CSV/PDF
- [ ] Advanced analytics with charts
- [ ] Time-based analytics
- [ ] Customer satisfaction metrics

## Technical Infrastructure

### Database & Schema
- [ ] Set up enhanced database schema
  - [ ] Users table with new fields
  - [ ] Organizations table with domain support
  - [ ] User Organizations junction table
  - [ ] Roles table with permissions
  - [ ] Organization Domains table
- [ ] Implement database migrations
- [ ] Add database constraints
  - [ ] Unique email constraint
  - [ ] Domain format validation
  - [ ] Role assignment rules

### Testing
- [ ] Component unit tests
- [ ] Integration test suite
  - [ ] Domain validation tests
    - [ ] Email domain matching
    - [ ] Apex domain validation
    - [ ] Domain uniqueness
  - [ ] Role assignment tests
    - [ ] Organization creator admin role
    - [ ] Organization joiner user role
    - [ ] Customer role isolation
  - [ ] Database operation tests
    - [ ] Transaction handling
    - [ ] Role assignments
    - [ ] Organization-user relationships
- [ ] Set up test environment
  - [ ] Test database configuration
  - [ ] Mock email service
  - [ ] Test data factories
- [ ] E2E tests for registration flows
  - [ ] Customer registration
  - [ ] Agent with new organization
  - [ ] Agent joining existing org
  - [ ] Validation error handling
  - [ ] Password validation
  - [ ] Organization name validation
  - [ ] Multiple agents same org
  - [ ] Domain validation edge cases
  - [ ] Rate limiting tests
  - [ ] Security measure tests
  - [ ] Role verification tests
  - [ ] Email verification flow
  - [ ] Organization auto-fill behavior
  - [ ] Form field validation timing
  - [ ] Cross-browser compatibility
  - [ ] Mobile responsive behavior

### Administration

- [ ] User management
- [ ] Team management
- [ ] Organization management
- [ ] Role management
- [ ] Category/tag management
- [ ] SLA policy management
- [ ] Custom fields management
- [ ] Workflow automation rules
- [ ] Email template management
- [ ] System settings configuration
- [ ] Audit logs

### API & Integration

- [ ] Supabase integration
- [ ] File storage integration
- [ ] RESTful API endpoints
- [ ] Webhook support
- [ ] OAuth2 authentication
- [ ] Third-party integrations
- [ ] API documentation

### UI/UX Improvements

- [ ] Responsive design
- [ ] Dark/light theme support
- [ ] Real-time updates
- [ ] File drag-and-drop
- [ ] Rich text editing
- [ ] Keyboard shortcuts
- [ ] Progressive Web App (PWA)
- [ ] Multi-language support
- [ ] Accessibility compliance

### Notification System

- [ ] In-app notifications
- [ ] Email notifications
- [ ] Browser notifications
- [ ] Mobile push notifications
- [ ] Notification preferences
- [ ] Notification templates

### Documentation
- [ ] Create mermaid diagrams
  - [ ] Registration flow
  - [ ] Organization management
  - [ ] Role assignment
  - [ ] Auth schema
  - [ ] Registration API
- [ ] Add API documentation
  - [ ] Registration endpoints
  - [ ] Organization endpoints
  - [ ] Role management endpoints
- [ ] Write development guides
  - [ ] Setup instructions
  - [ ] Testing guidelines
  - [ ] Deployment process

### Error Handling & Edge Cases
- [ ] Implement error handling
  - [ ] Domain validation errors
  - [ ] Role assignment conflicts
  - [ ] Transaction failures
- [ ] Add edge case handling
  - [ ] Last admin removal prevention
  - [ ] Domain ownership transfer
  - [ ] Organization state transitions
- [ ] Create error logging system
  - [ ] Error tracking
  - [ ] Audit logging
  - [ ] Performance monitoring

## AI Features

- [ ] Vector search for knowledge base articles
- [ ] AI-powered ticket categorization
- [ ] AI-powered article suggestions
- [ ] AI chat assistance for agents
- [ ] AI-powered ticket routing
- [ ] AI-generated response suggestions
- [ ] Sentiment analysis for tickets
- [ ] AI-powered customer satisfaction prediction

## Bug Fixes

- [ ] Sanitization of user input for WYSIWYG editor
- [ ] Render html correctly in ticket description field in ticket details page
- [ ] Unable to remove header style from text in WYSIWYG editor
- [ ] Preview markdown causes editor to misbehave
- [ ] The preview modal has two exit buttons
- [ ] "My Tickets" page for customers is stuck in infinite loading

## Current Focus

Priority items that need immediate attention:

1. Modularize codebase for testability and maintainability:
   - Break down large components into smaller, reusable pieces
   - Extract business logic into separate service layers
   - Create clear boundaries between UI, business logic, and data layers
   - Implement proper dependency injection patterns
   - Convert client-side components to SSR where possible

2. Implement comprehensive test suite:
   - Unit tests for business logic and utilities
   - Component tests using React Testing Library
   - Integration tests for API endpoints and data flow
   - E2E tests using Playwright for critical user journeys
   - Test coverage reporting and monitoring

3. Optimize for Server-Side Rendering:
   - Audit and convert client components to server components where possible
   - Implement proper data fetching patterns
   - Optimize loading and error states
   - Ensure proper hydration strategies

4. Refactor for maintainability:
   - Implement consistent error handling
   - Add proper logging and monitoring
   - Document component and function interfaces
   - Create reusable hooks and utilities

5. Improve development workflow:
   - Set up CI/CD pipelines
   - Implement automated testing
   - Add linting and formatting checks
   - Create development guidelines

6. Integration and Schema Updates:
   - [ ] Implement integration tests for registration and organization management
   - [ ] Complete database schema setup
   - [ ] Set up email verification service

### E2E Test Fixes
- [ ] Organization Field Issues
  - [ ] Fix visibility toggle for organization fields
  - [ ] Add proper loading states
  - [ ] Increase selector timeouts
  - [ ] Add better wait conditions
- [ ] Form Validation
  - [ ] Implement field validation display
  - [ ] Add password requirement messages
  - [ ] Show organization validation errors
  - [ ] Add proper error states
- [ ] Navigation and Feedback
  - [ ] Fix registration success redirect
  - [ ] Implement toast notifications
  - [ ] Add loading indicators
  - [ ] Handle error states
- [ ] Test Infrastructure
  - [ ] Improve test isolation
  - [ ] Add visual regression tests
  - [ ] Add component-level tests
  - [ ] Implement better cleanup
  - [ ] Add test data factories -->
