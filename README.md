# Ready Set Play

**Play · Learn · Grow**

Ready Set Play is a child-focused activity and reward app designed to encourage kids to spend less time on screens and more time on creative, physical, and thinking-based activities. Children complete small real-world quests, earn points, and unlock rewards. Parents can review activity progress and set a daily screen-time allowance.

## App Preview

The app uses a playful, child-friendly interface with a teal colour palette, activity cards, and an illustrated sign-in screen.

## Key Features

### For Kids
- **Activity quests:** Choose from drawing, dancing, singing, outdoor games, puzzles, daily habits, and other activities.
- **Activity verification:** Submit a photo or video for supported activities. The app checks basic media properties before accepting a submission.
- **Outdoor play check:** Uses browser location services and OpenStreetMap data to check for a nearby park, playground, pitch, recreation ground, or garden before starting an outdoor-play session.
- **Puzzles and daily checklist:** Solve simple questions and track everyday habits.
- **Points and rewards:** Earn points for completed quests and redeem them for family rewards or limited phone breaks.
- **Badges and streaks:** Encourage consistency through achievements and streak tracking.
- **AI Coach (experimental):** An epsilon-greedy, Q-value-based learning component recommends activities and updates activity values using quest rewards.

### For Parents
- **Parent dashboard:** View activity history, points, streaks, and screen-time information.
- **Reports:** Switch between daily, weekly, completed-task, and custom report views.
- **Screen-time allowance:** Set a daily limit and monitor phone-break minutes used.
- **Reward overview:** Review redeemed rewards and the child's available points.
- **AI Coach insights:** View learning steps, exploration rate, learning rate, activity values, and recent rewards.

## How Activity Verification Works

The current implementation uses browser-side checks; it is **not a trained computer-vision model**.

- For photo/video uploads, the app samples a 64 × 64 frame and calculates average RGB colour variance.
- It also checks filenames for a list of AI-related keywords.
- Video activities include a minimum-duration check.
- Outdoor activities use GPS accuracy checks and a nearby-place lookup through the OpenStreetMap Overpass API.
- Puzzle activities are checked against the expected answers; checklist activities require the relevant checklist items.

These checks are basic heuristics and should not be treated as reliable proof that an activity was genuinely completed or that media was AI-generated.

## Technology Stack

- **React 18**
- **TypeScript / TSX** for the React entry point and app component
- **HTML5**
- **CSS**
- **JavaScript** (React hooks and browser APIs)
- **Create React App (`react-scripts`)**
- **Browser Geolocation API**
- **OpenStreetMap Overpass API** for nearby outdoor-place lookup

> Note: Although the project is described as a React, HTML, CSS, and JavaScript app, the supplied source files use `.tsx` and the project includes TypeScript configuration and type packages.

## Project Structure

```text
kidsapp/
├── public/
│   └── index.html          # HTML page template
├── src/
│   ├── App.tsx             # Main app, screens, activities, rewards and logic
│   ├── index.tsx           # React application entry point
│   └── styles.css          # Global/base stylesheet
├── .codesandbox/
│   └── tasks.json          # CodeSandbox install and run tasks
├── package.json            # Dependencies and npm scripts
├── tsconfig.json           # TypeScript configuration
└── .eslintrc.json          # ESLint configuration
```

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (includes npm)
- A code editor such as Visual Studio Code
- Internet access for dependency installation and the outdoor-place lookup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
cd YOUR-REPOSITORY
```

Replace the repository URL with your own GitHub repository URL.

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm start
```

The app should open at:

```text
http://localhost:3000
```

### 4. Create a production build

```bash
npm run build
```

## Available Scripts

| Command | Description |
|---|---|
| `npm start` | Starts the development server |
| `npm run build` | Creates an optimized production build |
| `npm test` | Runs the test runner |
| `npm run eject` | Ejects Create React App configuration (one-way operation) |

## Important Setup and Limitations

Please read these notes before using the project beyond a local demonstration:

1. **Authentication is currently a front-end demonstration.** Email accounts are held in React state only. The Google sign-in screen does not perform real Google OAuth; the app itself states that a Google Cloud client ID and real sign-in integration are still required.
2. **No backend or database is included in the supplied project.** Accounts, points, activity logs, rewards, settings, and learning values are kept in component state and will reset when the page is refreshed.
3. **Parent PIN is hard-coded as `1234`.** This is only a demo gate, not secure authentication. Change it and implement server-side authorization before real deployment.
4. **Media checks are heuristic, not AI detection.** Colour variance and filename keywords can produce false positives and false negatives. They cannot reliably establish whether an image or video is genuine or AI-generated.
5. **Location access requires permission.** Outdoor verification depends on browser geolocation, a suitable GPS signal, internet access, and the Overpass service. Location access generally requires HTTPS or localhost.
6. **Screen-time tracking is app-level reward tracking.** It does not monitor or restrict device-wide screen usage or control other apps.
7. **Child safety and privacy:** Before collecting children's names, email addresses, photos, videos, or location data in a public deployment, add appropriate parental consent, secure storage, access controls, retention policies, and privacy/legal review.

## Future Improvements

- Add a secure backend and database for user accounts, activity history, points, and rewards.
- Implement Google OAuth using a properly configured Google Cloud project.
- Replace demo authentication and the hard-coded parent PIN with secure authentication and role-based authorization.
- Add a trained and evaluated activity/media verification model, with clear limitations and a human review option.
- Improve reporting with persistent daily and weekly summaries.
- Add parental consent and child-focused privacy and safety controls.
- Add device-level screen-time integrations where platform permissions and APIs allow them.

## Project Goal

Ready Set Play aims to make offline activities engaging by turning creativity, movement, learning, and everyday habits into achievable quests. The goal is to help children build healthier screen habits while giving parents a simple way to encourage and follow their progress.

## License

No license file was included in the supplied project. Add a `LICENSE` file if you want to specify how others may use, modify, and distribute this project.
