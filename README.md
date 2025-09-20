# Resume Web App

A comprehensive web application for intelligent resume management and job matching, designed to work seamlessly with a Chrome extension for automated job discovery and analysis.

## Features

### 🔐 Authentication & Security
- Secure user registration and login
- Password encryption with bcrypt
- JWT-based session management
- Data privacy controls and GDPR compliance
- HTTPS-ready for production

### 👤 Profile Management
- Comprehensive profile creation with structured fields:
  - Personal information
  - Technical and soft skills
  - Work experience with achievements
  - Education history
  - Projects and certifications
  - Custom tags for additional skills
- User-friendly interface for profile updates
- Data validation and sanitization

### 🎯 AI-Powered Job Matching
- Intelligent matching algorithm comparing user skills with job requirements
- Match score calculation with detailed breakdown
- Identification of matched skills and skill gaps
- AI-generated suggestions for profile improvement
- Job matching history and analytics

### 🔌 Chrome Extension Integration
- RESTful API endpoints for seamless extension communication
- Automatic job posting analysis
- Real-time compatibility scoring
- Centralized data storage and retrieval

### 📊 Dashboard & Analytics
- Comprehensive dashboard showing recent matches
- Job application tracking
- Profile completion status
- Performance metrics and insights

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js with MongoDB adapter
- **Database**: MongoDB with type-safe schemas
- **Validation**: Zod for runtime type checking
- **Forms**: React Hook Form with validation
- **Icons**: Lucide React
- **Security**: bcryptjs, input sanitization, XSS protection

## Prerequisites

- Node.js 18+ 
- MongoDB (local or MongoDB Atlas)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd resume-web-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/resume-web-app
   # or MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/resume-web-app

   # NextAuth.js
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-here-change-in-production

   # JWT
   JWT_SECRET=your-jwt-secret-key-here

   # Gemini AI (required for AI-powered CV enhancement and job analysis)
   # Get your API key from: https://aistudio.google.com/app/apikey
   GEMINI_API_KEY=your-gemini-api-key-here

   # Email (optional, for notifications)
   EMAIL_SERVER_HOST=smtp.gmail.com
   EMAIL_SERVER_PORT=587
   EMAIL_SERVER_USER=your-email@gmail.com
   EMAIL_SERVER_PASSWORD=your-email-password
   EMAIL_FROM=your-email@gmail.com
   ```

4. **Database Setup**
   - Install MongoDB locally or create a MongoDB Atlas account
   - Update `MONGODB_URI` in your `.env.local` file
   - The application will automatically create the necessary collections

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

7. **Test Gemini API Setup (Optional)**
   Visit `http://localhost:3000/api/test-gemini` to verify your API key is working correctly.

## API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

### Profile Endpoints

#### GET `/api/profile`
Retrieve the authenticated user's profile.

#### POST `/api/profile`
Create or update the user's profile.

### Job Matching Endpoints

#### POST `/api/jobs/match`
Analyze job compatibility with user profile.

#### GET `/api/jobs/match`
Retrieve user's job matching history.

### Chrome Extension API

#### POST `/api/extension/analyze`
Analyze job posting from Chrome extension.

#### POST `/api/extension/ai/analyze`
AI-powered job description analysis and keyword extraction.

#### POST `/api/extension/ai/enhance`
AI-powered CV content enhancement for specific sections.

#### POST `/api/extension/cv/download`
Generate and download AI-enhanced CV as PDF.

## AI-Powered Features

The application includes sophisticated AI features powered by Google's Gemini API:

### 🤖 Intelligent Job Analysis
- **Automatic keyword extraction** from job descriptions
- **Skills requirement analysis** and matching
- **ATS optimization suggestions**
- **Company and role-specific insights**

### ✨ Smart CV Enhancement
- **Professional summary optimization** tailored to specific jobs
- **Experience description enhancement** with relevant keywords
- **Skills section optimization** based on job requirements
- **Project descriptions improvement** for better relevance

### 🎯 Personalized Content Generation
- **Job-matched CV creation** using user profile data
- **Natural keyword integration** without stuffing
- **Achievement quantification suggestions**
- **Industry-specific terminology inclusion**

### 🔒 Security & Privacy
- **Server-side API key management** - users never handle API keys
- **Secure data processing** with automatic fallbacks
- **No permanent data storage** in external AI services
- **HTTPS encryption** for all AI communications

## Chrome Extension Integration

The web app provides APIs specifically designed for Chrome extension integration:

1. **Job Analysis**: Send job posting data for real-time compatibility analysis
2. **Authentication**: Session-based or token-based authentication
3. **Data Synchronization**: All analyzed jobs stored and accessible
4. **Profile Management**: Direct users to update profiles

## Security Features

- Input validation and sanitization
- Password encryption with bcrypt
- JWT session management
- XSS and injection protection
- HTTPS enforcement ready

## Deployment

Recommended platforms:
- **Vercel** (Next.js optimized)
- **MongoDB Atlas** (database)
- **AWS/Heroku** (alternatives)

## License

MIT License - see LICENSE file for details.
