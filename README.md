<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Space+Grotesk&weight=700&size=34&pause=1000&color=2E8B57&center=true&vCenter=true&width=700&lines=%F0%9F%8C%8D+ECO-QUEST;%F0%9F%8C%BF+Explore.+Discover.+Protect." alt="Eco-Quest animated title" />

AI-powered outdoor exploration meets sustainable living
Discover nature, explore nearby places, take on eco-challenges, and make every outdoor adventure count.
<p>
  <a href="https://eco-quest1-dpor.vercel.app/"><img src="https://img.shields.io/badge/🌿_Live_Demo-Visit_Eco--Quest-238636?style=for-the-badge" alt="Live Demo"></a>
  <a href="https://github.com/ziyadparkar01/EcoQuest"><img src="https://img.shields.io/badge/GitHub-View_Repository-181717?style=for-the-badge&logo=github" alt="GitHub Repository"></a>
</p>

<img src="https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=111111" alt="React">
<img src="https://img.shields.io/badge/Vite-Build_Tool-646CFF?style=flat&logo=vite&logoColor=white" alt="Vite">
<img src="https://img.shields.io/badge/TypeScript-Enabled-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript">
<img src="https://img.shields.io/badge/Google_Gemini-AI-4285F4?style=flat&logo=googlegemini&logoColor=white" alt="Google Gemini">
<img src="https://img.shields.io/badge/Deployed_on-Vercel-000000?style=flat&logo=vercel&logoColor=white" alt="Vercel">

</div>

🌍 About Eco-Quest
Eco-Quest is an interactive nature-exploration experience that brings together AI, location-aware discovery, and playful challenges to encourage people to reconnect with the outdoors.
Whether you're curious about the natural world or looking for a new reason to explore your surroundings, Eco-Quest makes discovery feel like an adventure.
Our mission: Turn curiosity into exploration—and exploration into positive environmental action.

✨ Highlights
<table>
<tr>
<td width="50%" valign="top">

🗺️ Location-aware exploration
Explore map-based locations and discover places that can inspire your next outdoor adventure.
</td>
<td width="50%" valign="top">

🌿 AI-powered discovery
Use AI-assisted interactions to learn more about nature and get useful, engaging information.
</td>
</tr>
<tr>
<td width="50%" valign="top">

🗣️ Voice assistant
Interact with a voice-enabled assistant for a more conversational and immersive experience.
</td>
<td width="50%" valign="top">

🏆 Eco-challenges & rewards
Make exploration more engaging through missions, progress, and achievement-focused experiences.
</td>
</tr>
</table>

Feature availability may depend on the current deployment, browser permissions, and configured API keys.
🎬 See Eco-Quest in action
Live application: eco-quest-2026.vercel.app
Add short screen-recording GIFs of the real application here so visitors can see the actual user experience. Recommended clips: the landing page, map/location interaction, AI discovery, and voice assistant.



📁 Suggested media folder
public/
└── images/
    ├── ecoquest-overview.gif
    ├── ecoquest-map.gif
    └── ecoquest-assistant.gif
For a Vite app, files inside public/images/ can generally be referenced in Markdown using absolute paths such as ![Eco-Quest overview](/images/ecoquest-overview.gif) when the deployed site serves those files. For GitHub README media, a reliable option is to store assets in the repository and reference them with a repository-relative path, for example ![Eco-Quest overview](public/images/ecoquest-overview.gif).
Tip: Record each clip for about 5–10 seconds, crop out browser clutter, keep the file size reasonable, and show only functionality that currently works.
🧰 Built with
Based on the repository's current dependency configuration:
Technology	Role
React	Interactive user interface
Vite	Frontend development and production build
TypeScript	Typed JavaScript development
Google Gemini API	Generative AI integration
Google Maps React	Google Maps integration
Express	Server-side API support
Three.js	3D graphics capabilities
Motion	Animation and transitions
Lucide React	Interface icons
Vercel	Deployment


🚀 Run locally
Prerequisites
- Node.js installed
- npm
- A Google Gemini API key for AI features
- A Google Maps API key if map features require one
1. Clone the repository
git clone https://github.com/ziyadparkar01/EcoQuest1.git
cd EcoQuest1
2. Install dependencies
npm install
3. Configure environment variables
Create a .env.local file in the project root. Add the variables required by the project:
GEMINI_API_KEY=your_gemini_api_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
Only configure the keys for services you use. Check the project's .env.example and source code for the exact variable names expected by the current version.
Security: Never commit real API keys or .env.local to GitHub. Variables prefixed with VITE_ are exposed to client-side code after building, so only use them for keys that are safe to expose under the provider's restrictions. Restrict browser keys by allowed website/referrer and API where possible. Keep private AI credentials on the server.

4. Start the development server
npm run dev
Open the local URL shown in your terminal.
5. Create a production build
npm run build
npm run preview
🔑 Environment variables
Variable	Purpose
GEMINI_API_KEY	Gemini API access for server-side AI functionality
VITE_GOOGLE_MAPS_API_KEY	Google Maps browser integration, if enabled


Use .env.example as the source of truth if the required variable names change. Do not publish secret values in documentation.
🧭 Responsible exploration
Eco-Quest encourages discovery while respecting people and the environment.
- Request location, camera, and microphone permissions only when needed.
- Explain why a permission is needed and allow users to decline optional access.
- Stay on public paths and respect restricted areas and local guidance.
- Observe wildlife from a safe distance; do not disturb plants or animals.
- Treat AI-generated identification and facts as helpful suggestions, not guaranteed scientific advice.
- Protect personal data and never expose private API credentials.
🛣️ Roadmap
- [ ] Refine the responsive mobile experience
- [ ] Add real demo GIFs and screenshots
- [ ] Improve map and exploration interactions
- [ ] Expand AI-powered nature discovery
- [ ] Polish voice-assistant interactions
- [ ] Add or refine challenge progress and rewards
- [ ] Improve accessibility and permission guidance
Update the roadmap as features are completed.
## 🤝 Contributing

Contributions, ideas, and improvements are welcome! 🌿

1. **Fork** the [EcoQuest1 repository](https://github.com/ziyadparkar01/EcoQuest1).
2. Create a feature branch:

   ```bash
   git checkout -b feature/your-feature
   ```

3. Commit your changes:

   ```bash
   git add .
   git commit -m "Add your feature"
   ```

4. Push your branch:

   ```bash
   git push origin feature/your-feature
   ```

5. Open a **Pull Request** with a description of your changes.

## 🐛 Issues & Feedback

Found a bug or have an idea to improve Eco-Quest?

- [Report a bug or request a feature](https://github.com/ziyadparkar01/EcoQuest1/issues)
- Include steps to reproduce the issue and screenshots when helpful.

## 📄 License

No license has been specified yet. Add a `LICENSE` file to the repository and update this section once you have chosen a license.

---

<div align="center">

### 🌿 Explore More. Leave a Lighter Footprint.

**Discover nature. Complete challenges. Make an impact.**

<br>

<a href="https://eco-quest-2026.vercel.app/">
  <img src="https://img.shields.io/badge/🌍_EXPLORE_ECO--QUEST-Visit_Live_App-00A878?style=for-the-badge" alt="Explore Eco-Quest">
</a>

<a href="https://github.com/ziyadparkar01/EcoQuest1">
  <img src="https://img.shields.io/badge/💻_VIEW_SOURCE-GitHub-181717?style=for-the-badge&logo=github" alt="View Source Code">
</a>

<br><br>

<img src="https://img.shields.io/badge/Built_with- curiosity_%26_code-2E8B57?style=flat" alt="Built with curiosity and code">

*Making outdoor exploration more interactive, educational, and sustainable.*

</div>
