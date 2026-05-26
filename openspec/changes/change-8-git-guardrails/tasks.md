## 1. Setup

- [ ] 1.1 Create `packages/git/` directory structure
- [ ] 1.2 Initialize package.json with core dependency
- [ ] 1.3 Set up TypeScript configuration
- [ ] 1.4 Set up vitest for testing

## 2. Git Rule Pack

- [ ] 2.1 Create `src/packs/git.ts` with git Rule Pack
- [ ] 2.2 Implement rm -rf detection
- [ ] 2.3 Implement git reset --hard detection
- [ ] 2.4 Implement git clean -f detection
- [ ] 2.5 Implement git branch -D detection
- [ ] 2.6 Implement git checkout . detection
- [ ] 2.7 Implement git restore . detection
- [ ] 2.8 Implement git push --force detection

## 3. Safe Command Allowance

- [ ] 3.1 Allow git push (without --force)
- [ ] 3.2 Allow git reset (without --hard)
- [ ] 3.3 Allow git checkout <branch>
- [ ] 3.4 Allow git restore <file>

## 4. Module Exports

- [ ] 4.1 Create `src/index.ts` with public API
- [ ] 4.2 Export gitRulePack

## 5. Testing

- [ ] 5.1 Test each rule with positive matches
- [ ] 5.2 Test each rule with negative matches
- [ ] 5.3 Test safe commands pass through

## 6. Documentation

- [ ] 6.1 Document each git rule
- [ ] 6.2 Add usage examples
