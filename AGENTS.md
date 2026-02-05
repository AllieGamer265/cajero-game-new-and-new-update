# AGENTS.md - Guide for Code Agents

## Project Overview
This is "Banco Gamer" - a Spanish-language banking simulator game built with vanilla HTML, CSS, and JavaScript. It's a single-page application that simulates a gaming-themed banking system with cryptocurrency trading, casino games, lotteries, and user management.

**Project Type**: Frontend web application (vanilla JS/HTML/CSS)
**Primary Language**: Spanish (all UI text, comments, and variable names)
**Database**: Firebase Realtime Database
**No build system required** - static files that can be served directly

## Development Commands

### Running the Application
```bash
# Serve locally - any static server will work
python -m http.server 8000
# OR
npx serve .
# OR open index.html directly in browser
```

### No Build/Test Commands
This is a static web application with:
- No package.json (no npm/yarn)
- No build process
- No testing framework
- No linting configuration

To test: Open index.html in a browser and verify functionality manually.

## Code Style Guidelines

### JavaScript Conventions
- **Language**: ES6+ JavaScript (modern features like arrow functions, const/let)
- **Variable Naming**: 
  - camelCase for variables and functions
  - UPPERCASE_SNAKE_CASE for constants
  - Spanish names preferred (e.g., `usuarioActualNombre`, `limpiarNombre`)
- **Functions**: Use function declarations for main functions, arrow functions for callbacks
- **Comments**: Spanish comments throughout explaining functionality
- **Error Handling**: Try-catch blocks for Firebase operations, user-friendly alerts for validation

### HTML Structure
- **Language**: Spanish lang attribute `<html lang="es">`
- **Semantic HTML5**: Use appropriate semantic tags
- **Forms**: Input validation with HTML5 attributes where applicable
- **Accessibility**: Include proper labels and ARIA attributes where needed

### CSS Architecture
- **Methodology**: Component-based with BEM-like naming
- **Organization**: 
  1. Base styles and layout
  2. Component styles (.pantalla, .btn-mini, etc.)
  3. Utility classes (.hidden)
- **Colors**: Gaming theme with vibrant colors (green #27ae60, yellow #f1c40f, red #c0392b)
- **Typography**: Monospace font 'Courier New' for retro gaming feel
- **Responsive**: Mobile-friendly with flexbox

### Firebase Integration
- **Real-time Database**: Used for user data, transactions, and live updates
- **Security**: Basic client-side validation only (no security rules in scope)
- **Data Structure**: 
  ```
  /usuarios/{userId}/
  /mercado/
  /solicitudes/
  /loteria/
  ```
- **Transactions**: Use Firebase transactions for atomic operations
- **Listeners**: Real-time listeners for live data updates

## Key Architecture Patterns

### State Management
- Global variables for current user state
- Firebase real-time listeners for live data synchronization
- LocalStorage for remembering last logged-in user

### Screen Navigation
- `mostrarPantalla(idPantalla)` function handles all screen transitions
- Hidden/show pattern with CSS `.hidden` class
- Separate admin panel with different styling

### Data Validation
- Client-side validation for all user inputs
- Firebase transaction integrity for financial operations
- User-friendly error messages in Spanish

## Feature Areas

### Core Banking
- User registration/login system
- Balance management and transaction history
- Money transfers between users
- Admin panel for user management

### Gaming Features
- **Casino**: Slot machine game with betting system
- **Market**: Cryptocurrency trading with fluctuating prices
- **Store**: Cosmetic items and protective shields
- **Lottery**: Daily drawing system with jackpot
- **Ranking**: Leaderboard with hacking mini-game

### Security Considerations
- Basic PIN-based authentication
- Firewall protection system against hacking
- Admin controls for user management
- Transaction integrity through Firebase transactions

## Development Workflow

### When Adding New Features:
1. Add new HTML elements in appropriate screen section
2. Create corresponding CSS classes following existing patterns
3. Implement JavaScript functions with Spanish naming
4. Add Firebase database operations if data persistence needed
5. Test manually by opening index.html in browser

### When Modifying Existing Features:
1. Locate relevant functions (often grouped by feature area)
2. Follow existing error handling patterns
3. Maintain Spanish language consistency
4. Test both user and admin functionality where applicable

## Important Notes

- **No Hot Reloading**: Manual browser refresh required for changes
- **Firebase Configuration**: API keys are embedded in script.js (consider environment variables for production)
- **Spanish Language**: All user-facing text must be in Spanish
- **Gaming Theme**: Maintain fun, engaging gaming aesthetic throughout
- **Financial Operations**: All money transactions must be atomic and secure

## File Structure
```
/
├── index.html     # Main application HTML
├── script.js      # All JavaScript logic
├── styles.css     # All styling
├── .gitignore     # Git ignore rules
└── AGENTS.md      # This file
```

## Testing Strategy
Since this is a simple web app without a testing framework:
1. Manual testing in browser
2. Test all user flows: registration, login, transactions, games
3. Test admin functionality with admin credentials
4. Verify Firebase connectivity and real-time updates
5. Test responsive design on different screen sizes

Remember: This is a game/simulation, not a real banking application. Focus on user experience and fun functionality rather than enterprise-level security.