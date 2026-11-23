# University Management Platform

A full-stack university management system designed to centralize academic and administrative operations through a role-based web application.

The platform provides dedicated interfaces for students, professors, department coordinators, secretaries, and administrators, allowing each role to access the tools and information relevant to its responsibilities.

## Features

### Authentication and Authorization
- User authentication with JWT.
- Secure cookie-based authentication.
- Password hashing with bcrypt.
- Role-based access control.
- Protected frontend routes and backend API endpoints.

### Student Portal
- Student dashboard.
- Course enrollment information.
- Personal academic schedule.
- Course materials and downloads.
- Current-term grades.
- Attendance summaries and detailed attendance history.
- Academic transcript access.

### Professor Portal
- Professor dashboard.
- Assigned courses and sections.
- Enrolled student lists.
- Assessment management.
- Grade management.
- Teaching schedule.
- Attendance recording and management.

### Department Coordinator
- Department-level academic management.
- Course and section coordination.
- Academic schedule management.
- Department-related monitoring and reporting.

### Secretary
- Academic and administrative operations.
- Student academic records.
- Official transcript management and issuance.

### Administrator
- Centralized platform administration.
- User and role management.
- University-wide management operations.

*Feature availability depends on the implementation and permissions assigned to each role.*

## Technology Stack

### Frontend
- React
- Vite
- JavaScript
- Tailwind CSS
- React Router
- Axios
- Lucide React

### Backend
- Node.js
- Express.js
- JavaScript
- PostgreSQL
- `pg` PostgreSQL client
- JSON Web Tokens (JWT)
- bcrypt

### Database and Infrastructure
- Supabase PostgreSQL
- Environment-based configuration

## Project Structure

```text
university-platform/
│
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   └── layout/
│   │   ├── context/
│   │   ├── pages/
│   │   │   ├── student/
│   │   │   ├── professor/
│   │   │   ├── coordinator/
│   │   │   ├── secretary/
│   │   │   └── admin/
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── app.js
│   └── package.json
│
├── .gitignore
└── README.md
```

The structure above describes the main application organization. Individual files and folders may evolve as development continues.

## Getting Started

### Prerequisites

Make sure you have installed:

- Node.js (LTS recommended)
- npm
- Git
- A PostgreSQL database or Supabase project

### 1. Clone the Repository

```bash
git clone https://github.com/imeneboubekeur/university-.git
cd university-
```

### 2. Install Backend Dependencies

```bash
cd server
npm install
```

### 3. Configure Backend Environment Variables

Create a `.env` file inside the `server/` directory.

Example:

```env
PORT=5000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_secure_jwt_secret
NODE_ENV=development
```

Use the actual environment variable names required by your backend configuration. Never commit real credentials or secret values.

### 4. Start the Backend

From the `server/` directory, run the start command defined in `server/package.json`.

For example, if the project uses a development script:

```bash
npm run dev
```

### 5. Install Frontend Dependencies

Open another terminal:

```bash
cd client
npm install
```

### 6. Configure Frontend Environment Variables

Create a `.env` file inside `client/` if your Vite configuration requires one.

Example:

```env
VITE_API_URL=http://localhost:5000/api
```

Make sure this value matches the API configuration in the project.

### 7. Start the Frontend

From the `client/` directory:

```bash
npm run dev
```

Vite will display the local development URL in the terminal.

## API Architecture

The backend follows a modular Express architecture:

- **Routes:** Define API endpoints.
- **Controllers:** Handle HTTP requests and responses.
- **Middleware:** Handle authentication, authorization, and request processing.
- **Config:** Manage database and application configuration.
- **Services:** Contain reusable application logic.
- **Utils:** Provide shared utility functions.

The frontend communicates with the backend through a centralized Axios instance.

## Security

- JWT-based authentication.
- Password hashing.
- Protected API routes.
- Role-based authorization.
- Environment variables for sensitive configuration.
- Database queries using parameterized SQL.

Never upload `.env` files, database credentials, JWT secrets, private keys, or API tokens to GitHub.

## Development

The application is organized into separate frontend and backend projects:

| Directory | Responsibility |
|---|---|
| `client/` | React frontend |
| `server/` | Express backend |
| `README.md` | Project documentation |
| `.gitignore` | Excludes local and sensitive files |

## Future Improvements

Potential areas for further development include:

- Advanced academic reporting.
- Improved attendance analytics.
- Notifications and announcements.
- More comprehensive administrative dashboards.
- Enhanced academic calendar management.
- Additional testing and deployment automation.

## License

This project is developed for educational and academic management purposes.