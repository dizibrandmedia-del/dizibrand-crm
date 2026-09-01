# 🚀 Dizibrand CRM — Multi-Business Sales & Lead Management Enterprise CRM

An enterprise-grade, mobile-responsive **Multi-Business Sales & Lead Management CRM** designed to manage and orchestrate the full lead-to-closing lifecycle across multiple corporate brands and lead acquisition channels.

---

## 🌟 Key Features

### 1. Multi-Channel Lead Ingestion & Real-Time Sync
- **Live Google Sheets Sync**: Automated & manual incremental synchronization with composite key deduplication (`CIN + Director + Mobile`).
- **MCA / Excel / CSV Bulk Ingestion**: Advanced parser with Excel serial date conversion and multi-format support.
- **Multi-Source Support**: MCA Database, Facebook, Instagram, LinkedIn, Google Ads, WhatsApp, Referral, Direct Calling, Website.

### 2. Multi-Business Corporate Architecture
- Unified Super Admin control across multiple operating entities:
  - *Dizibrand Media*
  - *Om Swastik Buildhomes*
  - *Sejal Pro Luxury*
  - *Strategic Skill Tech*

### 3. Business Consultant Workspace & Protocols
- **Daily Quotas & Activity Targets**: Calls, WhatsApp outreach, Lead reviews, Follow-ups.
- **Smart Queue & Follow-up Calendar**: Overdue alerts, status updates, and historical remarks preservation.
- **Potential Lead Takeover Engine**: High-intent scoring system for seamless executive escalation.

### 4. Team & RBAC Management
- Role-Based Access Control: `SUPER_ADMIN` and `CONSULTANT`.
- **Edit & Update**: Modify name, email, mobile, quotas, and passwords.
- **Deactivation & Reassignment**: Reassign workloads while preserving all historical call and revenue attribution.
- **Permanent Account Deletion**: Safe deletion with automated lead redistribution.

### 5. Sales & Closing Pipeline
- **Deals & Closing Board**: Pipeline tracking from *Discovery* to *Contract Won*.
- **Proposals & Meetings**: Integrated schedule manager.
- **Scoring Engine**: Dynamic scoring weights based on fit, budget, and decision-maker contact.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Sonner Notifications, Vite
- **Backend**: Node.js 24, Express, SQLite (`node:sqlite`), JWT Authentication, Bcrypt
- **State & Router**: React Router v6, React Context API

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/dizibrandmedia-del/dizibrand-crm.git

# Navigate to project directory
cd dizibrand-crm

# Install dependencies
npm install

# Start the full-stack development server
npm run dev
# or run the backend server daemon
npx tsx server/server.ts
```

### Production Build
```bash
npm run build
npm start
```

---

## 🔒 Default Admin Credentials
- **Email**: `admin@dizibrand.com`
- **Password**: `Admin@123456`

---

## 📄 License
Proprietary & Confidential — **Dizibrand Media Group**. All Rights Reserved.
