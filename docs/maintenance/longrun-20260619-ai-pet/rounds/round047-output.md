Round 047 complete.

**Bug found and fixed:** Pet level-up bubble ("鍗囩骇鍟︼紒Lv.X") never appeared. When `bindPetTap` called `savePet(pet)`, the internal `normalizePet` created a new object with the leveled-up state, but `bindPetTap`'s local `pet` variable still pointed to the old object. So `pet.level > oldLevel` was always `false`.

**Fix (2 lines in `work_pet.js`):**
1. `savePet` now returns the normalized pet object
2. `bindPetTap` captures it: `pet = this.savePet(pet)`

All 3 core JS files pass syntax check. Reports written to `rounds/round047-output.md` and `test-results/round047-checks.md`.

