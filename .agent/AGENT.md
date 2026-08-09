# 🧠 Vaxloz Discord Bot – Core Architecture

---

## 🎯 Objective

Build a scalable Discord bot system using:

- Node.js
- discord.js v14
- Modular architecture
- Clean separation of concerns

This system must support long-term expansion:
- onboarding
- economy
- profile
- AI features

---

## 🧱 System Architecture

Flow:

Event → Router → Handler → Service → Database

---

## 📁 Project Structure

src/

  core/
    client.js
    loader.js
    router.js

  config/
    env.js
    roles.js

  events/
    interactionCreate.js

  modules/

    onboarding/
      onboarding.routes.js
      onboarding.handler.js
      onboarding.service.js
      onboarding.ui.js

    economy/        (future)
    profile/        (future)

  services/
    role.service.js
    user.service.js

  utils/
    logger.js
    errorHandler.js

  database/
    connection.js
    models/

  index.js

---

## 🧱 Core Rules

### RULE 1 – Use Role ID (NOT name)

roles:

  artist: "ROLE_ID_1"
  music: "ROLE_ID_2"
  nsfw: "ROLE_ID_3"

Never use role names in logic.

---

### RULE 2 – Separation of Concerns

- events → receive interaction only
- router → route interaction
- handler → control flow
- service → business logic
- utils → helper functions

---

### RULE 3 – No Logic in Events

Event files must not contain business logic.

Example:

interactionCreate → router → handler

---

### RULE 4 – Static Onboarding System

- Do NOT use auto role on join
- Use a fixed onboarding channel
- User must select roles manually

---

### RULE 5 – NSFW Requires Confirmation

Flow:

1. User clicks NSFW button
2. Bot shows confirm UI
3. User confirms
4. Assign role

---

### RULE 6 – Role Mutex (Artist / Music)

When assigning:

- Remove old roles
- Add selected roles

---

### RULE 7 – Ephemeral Response

All interaction replies must be ephemeral.

---

### RULE 8 – Idempotent Logic

- Do not add duplicate roles
- Do not remove non-existing roles

---

### RULE 9 – Permission Safety

Before assigning role:

- Check role exists
- Check bot permission
- Check role hierarchy

---

### RULE 10 – Interaction Routing

- SelectMenu → role handler
- Button → NSFW handler

---

### RULE 11 – Config via ENV

Use environment variables:

TOKEN=
GUILD_ID=
CHANNEL_ONBOARDING=

---

### RULE 12 – Logging System

Must have:

logs/
  error.log
  interaction.log

---

### RULE 13 – Central Error Handler

All errors go through:

handleError(error, context)

---

### RULE 14 – Stateless Design

Onboarding must not depend on database.

---

### RULE 15 – Feature Isolation

modules/

  onboarding/
  economy/
  profile/

Each module is independent.

---

### RULE 16 – Reusable Services

Shared logic must go into:

services/

Example:
role.service.js

---

### RULE 17 – Cooldown Protection

Prevent spam interaction:

- button spam
- select spam

---

### RULE 18 – Auto Loader

Do not manually import everything.

Use loader:

loadEvents()
loadModules()

---

## 🔄 Interaction Flow

User opens onboarding channel

→ selects roles

→ handler processes selection

→ service updates roles

→ response (ephemeral)

---

## 🧩 Onboarding Module Design

### onboarding.routes.js

- handle select menu
- handle button

---

### onboarding.handler.js

Functions:

- handleRoleSelect()
- handleNSFWCheck()
- handleNSFWConfirm()

---

### onboarding.service.js

Responsibilities:

- assign roles
- remove roles
- validate input

---

### onboarding.ui.js

Responsibilities:

- build select menu
- build buttons

---

## 🔧 Shared Services

### role.service.js

- addRoles(member, roles)
- removeRoles(member, roles)

---

## 🚀 Future Expansion

System must support:

- Economy system
- User profiles
- Database (MongoDB / MySQL)
- External API

---

## ⚠️ Anti-Patterns (MUST AVOID)

- Hardcoded role names
- Logic inside event files
- Duplicate logic
- No error handling
- No permission check

---

## ✅ Success Criteria

- Clean structure
- Easy to extend
- No duplicated logic
- Stable role assignment
- Safe interaction handling

---

## 🧠 Tech Stack

- Node.js
- discord.js v14
- dotenv