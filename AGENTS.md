# CAD Toolbox — Coding Agent Instructions

## 1. Mission

CAD Toolbox is a low-cost, SEO-first web application for engineers and manufacturers.

The product will initially provide:

1. Free browser-based CAD viewing
2. STEP/STP file viewing
3. Automated engineering drawing generation
4. PDF/SVG drawing export

The long-term product will expand toward:

- Drawing QA
- Bulk CAD processing
- Manufacturing RFQ automation
- CAD-to-quote workflows
- API/B2B services

Phase 1 must remain deliberately small and reliable.

Do not expand Phase 1 scope without explicit approval.

---

## 2. Phase 1 Target

Target public launch:

24 September 2026

Phase 1 must deliver:

- STEP/STP upload
- Drag-and-drop upload
- File picker
- Browser-based 3D viewing
- Rotate
- Pan
- Zoom
- Fit-to-model
- Front view
- Back view
- Top view
- Bottom view
- Left view
- Right view
- Isometric view
- Shaded rendering
- Edge rendering
- Reset view
- Fullscreen
- Loading/progress state
- Error handling
- Basic mobile warning
- STEP/STP → engineering drawing
- A4/A3 drawing
- Front view
- Top view
- Right view
- Isometric view
- Automatic scale
- Units
- Title block
- Projection symbol
- PDF export
- SVG export
- SEO-ready landing pages

---

## 3. Current Architecture

### Frontend

Use:

- Next.js
- TypeScript
- React
- App Router
- Tailwind CSS
- Three.js

### Browser CAD processing

Use:

- OpenCascade
- `occt-import-js`
- WebAssembly

STEP/STP files should preferably be processed in the browser for viewing.

### Backend

Use:

- Python
- FastAPI

### Drawing generation

Use:

- FreeCAD
- TechDraw
- scripted drawing generation

### Infrastructure

Initial architecture:

- Cloudflare Pages for frontend
- Linux VPS/container for CAD processing
- GitHub for source control
- Temporary file storage

Do not introduce additional infrastructure unless it solves a demonstrated problem.

---

## 4. Architecture Principle

The system should follow:

    User
      ↓
    Cloudflare
      ↓
    Next.js
      ↓
    CAD Viewer
      ↓
    OpenCascade WASM
      ↓
    Three.js
      ↓
    STEP/STP model

For drawing generation:

    User
      ↓
    Next.js
      ↓
    FastAPI
      ↓
    Temporary job
      ↓
    FreeCAD + TechDraw
      ↓
    PDF/SVG
      ↓
    User

Keep the viewer and drawing-generation systems loosely coupled.

---

## 5. CAD Importer Abstraction

Do not tightly couple the application to one OpenCascade package.

Create an abstraction around CAD importing.

Conceptually:

    CadImporter
         ↓
    occt-import-js implementation

This allows the underlying CAD importer to be replaced later without rewriting the viewer.

CAD-specific logic should not be scattered throughout React components.

---

## 6. Three.js Rules

Use native Three.js initially.

Do NOT introduce React Three Fiber unless explicitly approved.

The initial viewer should use:

- Scene
- Perspective camera
- WebGL renderer
- OrbitControls
- Lighting
- Grid where useful
- Meshes
- Edge geometry where appropriate

The viewer must support:

- Orbit
- Pan
- Zoom
- Fit
- Standard engineering views
- Isometric view
- Shaded mode
- Edge mode

Keep rendering code separate from UI code.

---

## 7. Drawing Generation

Drawing generation is server-side.

Use FreeCAD + TechDraw rather than building a custom CAD drawing engine.

Phase 1 drawing:

- A4
- A3
- Front
- Top
- Right
- Isometric
- Automatic view placement
- Automatic scale
- Units
- Title block
- Projection symbol
- PDF
- SVG

Basic dimensions may be added only if they can be implemented reliably without delaying launch.

Do not build a custom hidden-line-removal or projection engine in Phase 1.

Do not recreate FreeCAD TechDraw functionality unnecessarily.

---

## 8. Features NOT in Phase 1

Do not implement the following unless explicitly approved:

- CAD editing
- Assembly tree
- BOM
- Section planes
- Measurement tools
- Advanced annotations
- GD&T
- Exploded views
- Collaboration
- User accounts
- Subscription management
- Payment processing
- Complex job queues
- Native SLDPRT generation
- Advanced assembly conversion
- Real-time collaboration

The goal is to launch a useful product, not a complete CAD platform.

---

## 9. STEP → SLDPRT

Do not implement STEP → SLDPRT in Phase 1.

Native SolidWorks files are proprietary and parametric.

If this feature is investigated later, it must be treated as a separate technical and licensing project.

---

## 10. File Security

Uploaded CAD files are untrusted input.

Never:

- Execute uploaded files
- Trust filename extensions
- Trust MIME type alone
- Expose server filesystem paths
- Store user CAD files permanently
- Allow arbitrary filesystem access

Use temporary job directories.

Example:

    /tmp/cad-jobs/{job-id}/

Files should be deleted after processing.

Initial limits should be configurable.

Suggested starting limits:

- Maximum STEP/STP size: 50 MB
- Drawing generation timeout: 120 seconds
- Limit concurrent CAD jobs
- Limit jobs per IP
- Delete temporary files after processing

These are starting values and must be tested before production.

---

## 11. Backend Isolation

FreeCAD must not have unrestricted access to the server filesystem.

CAD processing should operate inside a controlled temporary environment.

Do not allow user-provided input to become arbitrary shell commands.

Never construct shell commands by blindly concatenating user input.

Validate:

- File type
- File size
- File name
- Job ID
- Processing parameters

---

## 12. Error Handling

User-facing errors must be understandable.

Examples:

- "This STEP file could not be opened."
- "This file is larger than the 50 MB limit."
- "The CAD model contains unsupported geometry."
- "Drawing generation timed out."
- "We could not generate the drawing."
- "Your browser does not support the required viewer features."

Never expose:

- Stack traces
- Server filesystem paths
- Internal service names
- Secrets
- Environment variables
- Debug information

Detailed errors may be logged server-side.

---

## 13. Performance

Prefer:

- Browser-side STEP processing for viewing
- Web Workers where appropriate
- Lazy loading
- Minimal dependencies
- Efficient Three.js geometry
- Disposal of unused Three.js resources
- Progress indicators
- Graceful handling of large models

Do not optimise prematurely.

Measure first when performance becomes an issue.

---

## 14. Dependencies

Before adding a dependency, consider:

1. Is it necessary?
2. Can an existing dependency solve the problem?
3. What licence does it use?
4. How large is it?
5. Does it increase browser bundle size?
6. Does it introduce a new runtime?
7. Does it increase infrastructure cost?
8. Does it create a security or maintenance burden?

Prefer established open-source dependencies.

Avoid unnecessary dependencies.

Do not introduce commercial CAD SDKs without explicit approval.

---

## 15. Technologies NOT to Introduce Without Approval

Do not introduce the following simply because they appear attractive:

- Autodesk Platform Services
- CAD Exchanger SDK
- Commercial CAD kernels
- Commercial conversion APIs
- xeokit
- Redis
- Kubernetes
- Microservice architecture
- Supabase
- Firebase
- Paid queues
- Paid storage
- Paid authentication
- Payment processors

These may become appropriate later.

They are not required for the initial MVP.

---

## 16. Database

Do not introduce a database in Phase 1 unless required.

The initial product should work without:

- PostgreSQL
- Supabase
- Firebase
- MongoDB

User accounts, subscriptions and usage tracking can be added after product validation.

---

## 17. Job Queue

Do not introduce Redis or a complex queue initially.

Start with a simple controlled processing mechanism.

Target:

- 1–2 concurrent FreeCAD jobs

Upgrade the architecture only when actual demand requires it.

---

## 18. Frontend Structure

Prefer a structure similar to:

    src/
    ├── app/
    │   ├── page.tsx
    │   └── viewer/
    │       └── page.tsx
    │
    ├── components/
    │   └── cad/
    │       ├── CadViewer.tsx
    │       ├── CadUploader.tsx
    │       ├── CadToolbar.tsx
    │       └── LoadingOverlay.tsx
    │
    └── lib/
        └── cad/
            ├── importer.ts
            ├── geometry.ts
            └── camera.ts

The exact structure can evolve if there is a good reason.

---

## 19. Component Responsibilities

### CadUploader

Responsible for:

- File picker
- Drag/drop
- File validation
- File size validation
- Loading state

It should not contain Three.js rendering logic.

### CadViewer

Responsible for:

- Three.js scene
- Camera
- Renderer
- Controls
- CAD geometry display
- Rendering modes

It should not contain SEO content or backend business logic.

### CadToolbar

Responsible for:

- Standard views
- Fit
- Reset
- Shaded/edge mode
- Fullscreen

### CAD importer

Responsible for:

- Initialising OpenCascade
- Loading STEP/STP
- Converting CAD geometry into renderable geometry
- Returning structured geometry data

---

## 20. TypeScript

Use TypeScript throughout the frontend.

Avoid:

    any

unless there is a documented reason.

Prefer:

- Interfaces
- Types
- Explicit return types for complex functions
- Narrow error handling
- Typed API responses

CAD geometry types should be defined centrally.

---

## 21. React Rules

Keep React components reasonably small.

Avoid giant components containing:

- UI
- Three.js
- file parsing
- API calls
- business logic

Separate concerns.

Use React state for UI state.

Keep Three.js mutable objects in appropriate refs rather than triggering unnecessary React renders.

---

## 22. WebAssembly Rules

OpenCascade WASM is a critical part of the application.

Treat WASM loading as asynchronous.

Handle:

- Initialisation
- Loading state
- Failure
- Unsupported browser
- Worker lifecycle
- Memory cleanup where applicable

Do not assume the WASM module is immediately available during server-side rendering.

CAD viewer code must be client-side where required.

---

## 23. Next.js Rules

The application uses the Next.js App Router.

CAD viewer components that depend on:

- `window`
- WebGL
- Three.js
- WebAssembly

must be treated as client-side functionality.

Avoid accidentally executing browser-only code during server rendering.

---

## 24. SEO

SEO is a major product acquisition channel.

The website should eventually contain pages targeting searches such as:

- STEP viewer
- STP viewer
- CAD viewer
- online CAD viewer
- STEP file viewer
- STEP to PDF
- STEP to drawing
- engineering drawing generator
- 3-view drawing generator
- CAD drawing generator
- CNC drawing generator

Do not generate hundreds of low-quality SEO pages automatically.

Each page must provide genuine utility.

---

## 25. Product Funnel

The core funnel is:

    Google
      ↓
    Free CAD tool
      ↓
    Upload STEP
      ↓
    View model
      ↓
    Generate drawing
      ↓
    Download PDF/SVG
      ↓
    Advanced tools
      ↓
    Paid user

The free viewer is primarily an acquisition mechanism.

The long-term commercial value comes from:

- Drawing automation
- Drawing QA
- Manufacturing workflows
- RFQ automation
- Bulk processing
- API/B2B

---

## 26. Analytics

Track meaningful product events rather than only pageviews.

Important events include:

- Page viewed
- Viewer opened
- File selected
- File loaded
- File load failed
- Drawing generation requested
- Drawing generated
- Drawing failed
- PDF downloaded
- SVG downloaded

The most important funnel is:

    CAD files opened
        ↓
    Drawings generated
        ↓
    Downloads
        ↓
    Paid conversion

Do not optimise purely for traffic.

---

## 27. Cost Control

This is a low-cost startup project.

Every technical decision should consider operating cost.

Prefer:

- Free/open-source software
- Browser processing
- Small VPS
- Static frontend hosting
- Temporary storage
- Minimal infrastructure

Do not add paid infrastructure without demonstrating why it is required.

---

## 28. Licensing

Maintain awareness of the licences of:

- OpenCascade
- occt-import-js
- Three.js
- FreeCAD
- TechDraw
- All future dependencies

When adding a dependency:

1. Identify its licence.
2. Check compatibility.
3. Record it where appropriate.
4. Avoid copying proprietary source code.
5. Do not redistribute software in a way that violates its licence.

Maintain:

    docs/licensing.md

when the project becomes sufficiently mature.

---

## 29. Git

Use small, logical commits.

Good examples:

    feat: add CAD viewer shell
    feat: load STEP files with OpenCascade
    feat: add standard camera views
    feat: add drawing generation endpoint
    fix: dispose Three.js geometry after model replacement

Do not make giant commits containing unrelated changes.

Never commit:

- `.env`
- secrets
- uploaded CAD files
- generated PDFs
- generated SVGs
- temporary processing files
- unnecessary large binaries

---

## 30. Environment Variables

Secrets and environment-specific values must use environment variables.

Never hard-code:

- API keys
- passwords
- tokens
- VPS credentials
- database credentials

Never commit production secrets.

---

## 31. Testing

Before considering a feature complete:

- Run TypeScript checks
- Run lint
- Run relevant tests
- Build the application where practical
- Test error conditions

CAD processing should eventually be tested against a fixture set containing:

- Simple block
- Cylinder
- Bracket
- Plate
- Complex mechanical part
- Large model
- Invalid STEP
- Empty/invalid file
- Unsupported geometry

---

## 32. CAD Test Fixtures

Test CAD files should be stored separately from user uploads.

Use:

    tests/fixtures/

Do not commit proprietary customer CAD files.

Only use:

- Public-domain files
- Openly licensed files
- Internally generated test geometry
- Files for which we have permission

---

## 33. Mobile

Phase 1 is desktop-first.

The viewer should still provide a usable mobile experience where practical.

If the device is unsuitable for large CAD models, provide a clear warning rather than allowing the application to fail silently.

---

## 34. Accessibility

Important controls should have:

- Accessible labels
- Keyboard focus where practical
- Useful button names
- Visible state changes

Do not rely exclusively on colour to communicate status.

---

## 35. UI Design

The interface should feel like an engineering tool.

Priorities:

1. Clear
2. Professional
3. Fast
4. Minimal
5. Trustworthy

Avoid unnecessary animation.

Avoid excessive gradients and decorative UI.

The CAD model should be the visual focus.

---

## 36. Major Architecture Changes

Before making a major architectural change, identify:

1. Why the change is needed
2. What problem it solves
3. Which files/components are affected
4. Implementation cost
5. Operational cost
6. Licensing implications
7. Whether the change can be reversed

Do not silently replace the agreed architecture.

If the change is not required for the current task, prefer the existing architecture.

---

## 37. Agent Behaviour

Coding agents should:

- Read this file before making significant changes.
- Inspect existing code before creating new code.
- Reuse existing components where appropriate.
- Avoid unnecessary rewrites.
- Keep changes focused.
- Explain significant trade-offs.
- Preserve working functionality.
- Prefer reversible decisions.
- Prefer low-cost solutions.
- Test before declaring a task complete.

If blocked, diagnose the actual problem first.

Do not replace the architecture merely because an implementation is difficult.

---

## 38. Decision Priority

When several technical options are available, prioritise:

1. Reliability
2. Simplicity
3. Low implementation cost
4. Low operating cost
5. Licensing compatibility
6. Security
7. Performance
8. Maintainability
9. Future extensibility

Do not choose a technology because it is fashionable.

Choose the simplest solution that can realistically support the first 1,000 users.

---

## 39. Current Build Status

Phase:

    Phase 1 — MVP

Target launch:

    24 September 2026

Current status:

    [x] Windows development environment
    [x] WSL2 / Ubuntu
    [x] VS Code
    [x] Git
    [x] Node.js
    [x] pnpm
    [x] Next.js project created

    [ ] CAD Toolbox homepage
    [ ] Three.js viewer
    [ ] OpenCascade STEP import
    [ ] Standard camera views
    [ ] Upload UX
    [ ] FreeCAD installation
    [ ] TechDraw generation
    [ ] A4/A3 templates
    [ ] PDF/SVG export
    [ ] FastAPI endpoint
    [ ] Frontend/backend integration
    [ ] File security limits
    [ ] SEO pages
    [ ] Analytics
    [ ] CAD test suite
    [ ] Production deployment
    [ ] Public launch

Update this section as major milestones are completed.

---

## 40. Golden Rule

Do not overbuild.

The objective is to get a reliable CAD Toolbox MVP into users' hands quickly.

Build:

    Viewer
        +
    STEP import
        +
    Drawing generation
        +
    PDF/SVG
        +
    SEO

Then measure actual usage.

Only build additional infrastructure or features when real user demand justifies them.