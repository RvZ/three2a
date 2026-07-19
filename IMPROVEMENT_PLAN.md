# Bug Investigation & Improvement Plan

> **Status:** All findings below (C1–C3, H1–H4, M1–M4, L1–L9) have been
> implemented. This document is kept as the design record / rationale for the
> changes. A headless smoke test (`npm test`) and a full browser boot test were
> run after the fixes with no runtime errors.

A code review of the GTA‑2‑style Three.js game. Findings are grouped by
severity, each with the root cause, the concrete effect in‑game, and a
proposed fix. A phased plan follows at the end.

---

## 🔴 Critical — features that silently do not work

### C1. NPC pedestrians are excluded from **all** collision detection

**Where:** `js/entities/person.js`, `js/managers/collisionManager.js`

`Person` stores its location in `this.mesh.position` and never defines a
`this.position` property. Every collision loop guards with:

```js
if (!pedestrian.position) continue;   // collisionManager.js
```

Because `pedestrian.position` is `undefined` for every NPC, they are skipped
in `checkVehiclePedestrianCollisions()` and `checkPedestrianBuildingCollisions()`.

**Effect:**

- NPCs can never be run over (the "instant kill for NPCs" branch is dead).
- NPCs walk straight through buildings and boundary walls.
- Only the `Player` (which _does_ expose `.position`) ever collides.

**Fix:** Give `Person` a `position` accessor that proxies `this.mesh.position`
(e.g. `get position() { return this.mesh?.position; }`), or set
`this.position = this.mesh.position` in `init()` the way `Player`/`Vehicle` do.
Then confirm the NPC damage path works (see C2).

---

### C2. `Person` has no `takeDamage()`, so NPCs can't be killed

**Where:** `js/managers/collisionManager.js:334`, `js/entities/person.js`

`handleVehiclePedestrianCollision()` calls `pedestrian.takeDamage(100)` for
NPCs, guarded by `else if (pedestrian.takeDamage)`. `Person` defines no such
method, so even after C1 is fixed the NPC would only be pushed, never removed.

**Fix:** Add a `takeDamage()`/`die()` to `Person` that removes the mesh from the
scene, unregisters it from the collision manager, and (optionally) awards
score via the HUD.

---

### C3. The player's wall‑sliding collision response is dead code

**Where:** `js/entities/player.js:260-314`

`Player.handleCollision()` (a nice slide‑along‑walls implementation) and its
helper `Player.checkCollision()` are **never called**. The collision manager
resolves the player through the generic `handlePedestrianBuildingCollision()`,
which simply snaps back to `previousPosition`.

**Effect:** The player hard‑stops on any building edge instead of sliding, and a
whole implemented feature is wasted. `checkCollision()` also just
`return false`, and `Player.checkVehicleCollision()` (player.js:167) is another
`return false` placeholder.

**Fix:** Decide on one collision owner. Recommended: let `CollisionManager`
call `entity.handleCollision()` when an entity defines one, and implement a real
`checkCollision()` (query the manager for building overlap at the current
position). Remove the unused placeholders otherwise.

---

## 🟠 High — noticeable gameplay / correctness bugs

### H1. NPC pedestrians use the vehicle collision radius against buildings

**Where:** `js/managers/collisionManager.js:234, 262`

```js
const entityRadius =
  entity === this.game.player
    ? this.pedestrianCollisionRadius // 0.5
    : this.vehicleCollisionRadius; // 2.0
```

Any pedestrian that is **not** the player (i.e. every NPC) is treated with a
2.0 radius. The check keys off object identity instead of type.

**Fix:** Key off entity type/collision group rather than `=== this.game.player`.
Store an `entityType`/`collisionRadius` on each entity and read it directly.

### H2. Entering/exiting a vehicle is not edge‑triggered (Spacebar)

**Where:** `js/managers/inputManager.js:54`, `js/core/game.js:246`

`Spacebar` sets `actionPressed = true` on every `keydown`. Held keys auto‑repeat,
firing `keydown` many times per second, so holding Space rapidly toggles the
player in and out of the vehicle. The `'b'` debug key already handles this
correctly with a `bPrevious` edge guard — Space should too.

**Fix:** Track a "was pressed last frame" flag for the action button (or only set
`actionPressed` when the key transitions from up→down), mirroring the `b` logic.

### H3. Top‑down camera uses a degenerate up‑vector

**Where:** `js/core/game.js:60-62, 344-354`

The camera sits at `(x, 40, z)` and calls `lookAt(player)` straight down. The
default up vector `(0, 1, 0)` is parallel to the view direction, which is the
classic gimbal‑degenerate case for `lookAt` and yields an unstable orientation
(the `rotation.z = 0` line hints this was hit during development).

**Fix:** Set `camera.up.set(0, 0, -1)` once after construction so "up" on screen
maps to world −Z, then `lookAt` is well‑defined.

### H4. `exitVehicle()` can drop the player inside a building

**Where:** `js/entities/player.js:223-257`

The player is placed 2 units to the vehicle's right with no collision check, so
exiting next to a wall spawns the player inside it.

**Fix:** Validate the exit position against the collision manager; try the other
side / a small ring of candidate offsets and pick the first clear one.

---

## 🟡 Medium — performance & robustness

### M1. Building collision recomputes bounding boxes every frame

**Where:** `js/managers/collisionManager.js:231`

`new THREE.Box3().setFromObject(building.mesh)` runs for **every vehicle × every
building, every frame** (~20 vehicles × ~100 buildings = thousands of full
traversals/frame). Buildings are static.

**Fix:** Cache each building's `Box3` once at registration. Add a coarse spatial
grid / broad‑phase so only nearby buildings are tested.

### M2. Geometry, material and texture leaks

**Where:** `js/entities/building.js`, `vehicle.js`, `person.js`

Each `Building` generates up to four `CanvasTexture` window maps; nothing is ever
`dispose()`d. Respawns and any future entity removal will leak GPU memory. Sub‑
meshes (antennas, balconies, AC units, skyscraper base) are added straight to the
scene, so they aren't tracked, disposed, or collidable.

**Fix:** Give each entity a `dispose()` that frees geometry/material/texture and
removes meshes from the scene; parent decorative meshes under the entity group.

### M3. `Building.mesh` only covers part of the model

**Where:** `js/entities/building.js:82, 142`

For skyscrapers `this.mesh` is only the tower; for houses only the base. The
wider base / roof are separate scene children, so collisions ignore them.

**Fix:** Group all parts under one `THREE.Group` and use that as the collision
mesh, or compute the box from the full group.

### M4. Player vehicle spawns overlap and ignore the map

**Where:** `js/core/game.js:128-165`

Four vehicles are placed at fixed ±8 offsets around the player regardless of
roads/buildings, and can overlap parked cars, triggering immediate push‑apart
collision resolution on load.

**Fix:** Spawn player vehicles on validated road tiles near the player (reuse the
road/sidewalk math already in `World`).

---

## 🟢 Low — cleanup, polish, dead code

- **L1. Dead code in `game.update()`** (`game.js:236-237`): `previousPosition`
  and `wasMoving` are computed (with a per‑frame `.clone()`) and never used.
- **L2. Double welcome message**: both `Game.init()` (`game.js:117`) and
  `HUD.init()` (`hud.js:112`) show an overlapping welcome banner.
- **L3. Unused input helpers**: `InputManager.getMovementDirection()` /
  `isMoving()` are never used (the player turns rather than strafes).
- **L4. Corrupted emoji** in `HUD.showExitVehicleMessage()` (`hud.js:248`):
  the string contains a replacement/garbage glyph instead of an emoji.
- **L5. `keys.bPrevious`** is read before ever being set — works by falsy
  `undefined`, but should be initialized in `InputManager`.
- **L6. `window.game` global** is used by `CityGenerator` to reach the collision
  manager. Pass the manager/world in explicitly instead of leaning on a global.
- **L7. Vehicle‑vehicle radius is fixed** (`vehicleCollisionRadius*2`) for all
  vehicle sizes; trucks/vans are visibly larger than their collision circle.
- **L8. `package.json` "test"** is a placeholder (`exit 1`) and there is no build
  or lint tooling; the README references a `screenshot.png` and `LICENSE` file
  that aren't in the repo.
- **L9. `generateSounds()` is `async` but never awaited**; sounds may be null for
  the first frames. Harmless today (guards exist) but worth tidying.

---

## Suggested phased plan

**Phase 1 — Make collisions actually work (Critical + H1).**
Fix `Person.position` (C1), add `Person.takeDamage/die` (C2), unify collision
ownership and revive/remove the player slide logic (C3), and fix the NPC radius
(H1). This is the highest gameplay payoff and the changes are localized.

**Phase 2 — Input & camera correctness (H2, H3, H4).**
Edge‑trigger the action button, fix the camera up‑vector, and make vehicle exit
collision‑aware.

**Phase 3 — Performance & lifecycle (M1–M4).**
Cache building boxes + add a broad‑phase grid, add `dispose()` to entities,
group multi‑part meshes, and spawn player vehicles on valid roads.

**Phase 4 — Cleanup & tooling (L1–L9).**
Remove dead code, dedupe the welcome message, fix the emoji, add ESLint +
Prettier and a minimal smoke test, and drop the `window.game` global.

**Suggested first PR:** Phase 1 only — it is self‑contained, restores the core
"drive around a living city" experience, and is easy to review.
