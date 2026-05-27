# Questra - AI Assessment Creator 🚀

Questra is a production-ready, full-stack web application designed for educators to draft, compile, and distribute structured academic evaluations. Utilizing the Google Gemini AI engine, Questra processes reference documents, textbook passages, or syllabi to instantly generate curriculum-aligned questions and print-ready PDFs.

---

## ✨ Key Features

- **AI-Powered Assessment Drafting**:
  - Upload files (`.pdf`, `.docx`, `.txt`) or select assets from your library.
  - Set difficulty tiers (`Easy`, `Moderate`, `Hard`) and customize question counts.
  - Automatically draft structured Multiple Choice (MCQ), True/False, and Descriptive question types.
- **Parallel PDF Compilation**:
  - Compiles distinct **Student Copy** (with checkbox options and blank writing lines) and **Teacher Answer Key & Rubrics** PDFs in parallel.
- **My Library (Study Materials)**:
  - Persistent, cloud-hosted document manager for curriculum resources, reference sheets, and textbook guidelines.
- **Classroom Groups & Management**:
  - Organizes students into classrooms/groups.
  - Distribute generated papers, configure due dates, and monitor class assignments.
- **AI Teacher's Toolkit**:
  - Generate customized grading rubrics or time-blocked lesson plans.
- **System Settings**:
  - Profile updating, default subject/grade pre-populating, secure password change, account cleanup, and JSON account backup export.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **State Management**: Zustand
- **Icons**: Lucide React
- **Styling**: Vanilla CSS Design Tokens (Glassmorphic panels, rich gradients)
- **Real-Time Communication**: Socket.io Client

### Backend
- **Framework**: Express (Node.js)
- **Database**: MongoDB (Mongoose ODM)
- **Task Queuing**: BullMQ (with redis backend, supports lightweight mock fallback queue)
- **Real-Time Logging**: Socket.io Server
- **Document Extractors**: PDF-Parse, Mammoth (.docx parser)
- **PDF Compiler**: PDFKit

---

## 💻 Local Setup & Installation

Follow these steps to run the application locally on your machine.

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- MongoDB (Running locally or a MongoDB Atlas cloud URI)
- *Optional*: Redis (Required only if `USE_MOCK_QUEUE` is set to `false`)

---

### 1. Setup Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend/` directory:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_uri
   JWT_SECRET=your_jwt_secret_key
   GEMINI_API_KEY=your_gemini_api_key
   USE_MOCK_QUEUE=true
   ```
   *(Note: Setting `USE_MOCK_QUEUE=true` processes generation tasks in-memory, bypassing the need for Redis).*
4. Start the backend development server:
   ```bash
   npm run dev
   ```

---

### 2. Setup Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file in the `frontend/` directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```
4. Start the frontend Next.js server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to **[http://localhost:3000](http://localhost:3000)**.

---

## 📂 Project Architecture

```text
├── backend/
│   ├── src/
│   │   ├── config/       # DB, Socket, and Auth configurations
│   │   ├── models/       # Mongoose Schemas (User, Assignment, Group, Library)
│   │   ├── routes/       # Express Route Handlers (Auth, Assignment, Groups, Toolkit, Library)
│   │   ├── services/     # AI Prompts & PDF compiler services
│   │   ├── workers/      # BullMQ background task workers
│   │   └── server.ts     # Express initialization & Socket binding
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/          # Next.js Pages & global routing
│   │   ├── components/   # Roster tables, Modals, Dashboards, Editors
│   │   ├── lib/          # API fetch helper client
│   │   └── store/        # Zustand global store hooks
│   └── package.json
```

---

## 🔒 Security & Environment Configuration

Ensure that you keep your `.env` files local and **never** commit credentials directly to version control. An example template is provided in the repository as `.env.example`.
