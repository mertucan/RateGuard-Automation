# RateGuard - Development Plan (TODO)

## Phase 1: Core Backend Setup and Data Fetching
- [x] TCMB EVDS API data fetching script (`veri_cekme_tcmb.py`) setup.
- [x] Sensitive data (API Keys) hidden via `.env` structure and `.gitignore`.
- [x] Setup instructions in `Instructions.md`.
- [x] Backend API (Flask) initialized.
- [x] TCMB data fetching script converted to service module / API endpoint.

## Phase 2: Database and Data Models
- [x] Supabase/PostgreSQL project created.
- [x] Required tables designed (Companies, Contracts, Financial Data, etc.).
- [x] Python CRUD operations integrated with Supabase.

## Phase 3: Calculation and PDF Generation
- [x] Inflation and FX-based contract amount calculation logic.
- [x] Automated addendum PDF generation with `reportlab` (Turkish character support).

## Phase 4: AI (LLM) Integration
- [x] Gemini API integration.
- [x] AI-generated professional email drafts for contract renewals.
- [x] **AI Tone Detection**: Gemini analyzes client communications and detects tone (resmi, samimi, profesyonel, notr, cozumcu).
- [x] **Auto-update company communication_language** based on tone analysis.

## Phase 5: Frontend Panel
- [x] React (Vite) frontend project initialized.
- [x] Dashboard, Renewal Review, and Client Management pages created.
- [x] Admin panel dashboard with charts (Recharts) integration.
- [x] Frontend-Backend API communication (Vite proxy + api.js).
- [x] Client management, contract tracking, and "Pending Approvals" pages.
- [x] Dark mode support and theme system.
- [x] Analytics page with historical data visualization (FX, inflation charts).

## Phase 6: Authentication & Authorization
- [x] **User Authentication (Auth)**: Login/Register system with password hashing (Werkzeug).
- [x] **Login-first flow**: App redirects to login page when not authenticated.
- [x] **Role-based Registration**: Company Admin registration with automatic company creation, role dropdown on register page.
- [x] **Auth Middleware**: Backend `@login_required` and `@role_required` decorators for API endpoint protection.
- [x] **Role-Based Access Control (RBAC)**: Navigation and page access filtered by user role (super_admin, company_admin, finance, sales, client).
- [x] **Auth Context**: Frontend AuthContext with persistent login state via localStorage.
- [x] **Protected Routes**: Frontend route protection based on user role.

## Phase 7: Multi-Role System & Communication
- [x] **Role-specific Dashboards**: Each role sees relevant content (Super Admin sees all, Client sees their contracts, etc.).
- [x] **Team Management Page**: Company Admins can add/remove finance, sales, and client team members.
- [x] **Chat System**: Real-time per-contract messaging between Sales and Client users via communications table.
- [x] **Chat Panel**: Frontend ChatPanel component with role badges, message bubbles, and auto-polling.
- [x] **AI Tone Analysis Button**: Trigger Gemini to analyze contract chat and update company communication profile.

## Phase 8: Notifications, Audit & Email
- [x] **Notification System**: In-app notifications for contract expiry (30/15/7 days) with NotificationBell component.
- [x] **Email Notifications**: SMTP email service for contract expiry alerts and approval confirmations.
- [x] **Approval Emails with PDF**: When contracts are approved, PDF addendum is automatically emailed to the client.
- [x] **Audit Log**: All contract approvals, rejections, and drafts are logged with user info, timestamps, and details.
- [x] **Audit Log Page**: Frontend page to view audit trail with filtering by entity type.
- [x] **Check Expiring Contracts Endpoint**: API endpoint to scan and create notifications for expiring contracts.

## Phase 9: Branding & Polish
- [x] **Branding**: Product name standardized as RateGuard across public and app surfaces.
- [x] **Login/Register Cleanup**: Removed out-of-context text ("Sovereign Intelligence", "Establish Node", "terminal key", etc.).
- [x] **Modern Auth UI**: Clean, minimal login and register pages consistent with app theme.
- [x] **Turkish Font Support**: PDF generation uses Arial/DejaVu/Liberation fonts for proper Turkish character rendering.

## Phase 10: Automation & Deployment
- [ ] Daily cron job (08:00) setup for background tasks (contract expiry check, market data fetch).
- [ ] Query to detect contracts with ≤30 days until expiry.
- [ ] Raw data normalization for the calculation engine.
- [ ] End-to-end system testing.
- [ ] Cloud deployment (Vercel, Render, Heroku, etc.).

---

## Suggestions (Future Improvements)

### Completed Improvements
- [x] **Calculation Rule Fix**: Per-contract `inflation_base_rule` instead of global TUFE+UFE average.
- [x] **Pending Filter**: Approved/rejected contracts excluded from "pending" lists.
- [x] **Email Composer Controlled State**: `value` + `onChange` instead of `defaultValue`.
- [x] **Analytics Error States**: User-friendly messages for empty data or API errors.
- [x] **Client Management Delete Modal**: Custom delete confirmation modal with toast notifications.
- [x] **Mobile Responsiveness**: Hamburger menu, responsive KPI cards, tables, and forms.
- [x] **File-Based Cache**: `.cache/` directory JSON backup to prevent in-memory cache loss on Flask reload.
- [x] **PDF Saved Values**: Draft/approved contracts use saved `new_amount` and `applied_adjustment` in PDF.
- [x] **Approval Workflow**: Multi-stage approval mechanism (calculate → draft → admin approval → send to client).
- [x] **Notification System**: Contract expiry notifications (30/15/7 days) via in-app and email.
- [x] **User Authentication**: Login/register with role-based access control.
- [x] **RBAC**: Role-based page and feature access (super_admin, company_admin, finance, sales, client).
- [x] **Audit Log**: Financial transparency log tracking who approved/rejected contracts, when, and with what parameters.

### Medium Priority
- [ ] **Rich Text Editor**: TinyMCE or similar for manual editing of AI-generated email drafts before sending.
- [x] **Multi-Currency Support**: USD, EUR, or TRY-based contracts with automatic FX conversion.
- [x] **Contract History & Versioning**: Track each renewal cycle and visualize price change history.
- [ ] **Dashboard Customization**: Drag-and-drop KPI cards, charts, and widgets.
- [ ] **Batch Operations**: Multi-select contracts for bulk PDF generation and approval.
- [x] **Export**: Export contract lists and analytics data to CSV/Excel format.

### Low Priority / Advanced
- [ ] **Multi-Language Support (i18n)**: Turkish/English UI toggle; AI-generated PDFs and emails in client's language.
- [ ] **Instant Notification Integrations**: Slack or Microsoft Teams alerts for critical clients beyond in-app notifications.
- [ ] **Webhook Integration**: Automatic external system (CRM) notifications on contract status change.
- [ ] **Advanced Reporting**: Monthly/quarterly automated reports (total contract value, average increase, risk distribution).
- [ ] **API Rate Limiting & Logging**: Rate limiter and structured logging for the backend API.
- [ ] **CI/CD Pipeline**: GitHub Actions for automated testing, linting, and deployment.
