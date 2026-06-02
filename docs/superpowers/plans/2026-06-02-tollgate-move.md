# Move Implementation Plan

**Goal:** Ship the on-chain `tollgate` Sui Move package — generic metered resource, capability-gated withdraw, verifiable `PaymentReceipt` event — plus a mintable `mock_usd` demo coin, deployable to testnet for the project's own Package ID.
**Architecture:** One Sui Move package (`move/tollgate`, edition 2024) with two modules: `tollgate` (the metering + payment + withdraw logic, generic over `Coin<T>`) and `mock_usd` (a 6-decimal demo stablecoin with a `TreasuryCap`-gated mint). All on-chain state is the shared `MeteredResource<T>` object plus an `OwnerCap`; the access credential is the `PaymentReceipt` event.
**Tech Stack:** Sui CLI (Move 2024 edition), `Sui` framework dep pinned to `framework/testnet`.
**Source spec:** docs/superpowers/specs/2026-06-02-tollgate-machine-payable-web-design.md

> Conventions (apply to every task): no placeholders; exact paths; complete code; repeat signatures rather than cross-referencing; never put a key/secret in any file. The repo is the single source of truth — sync before work, commit before done.

---

### Task 1: Scaffold the Move package

**Files:**
- Create: `move/tollgate/Move.toml`
- Create: `move/tollgate/sources/.gitkeep`
- Create: `move/tollgate/tests/.gitkeep`

**Depends on:** —
**Effort:** low
**Provides:** `Move package "tollgate"` with named address `tollgate = 0x0`; build target `sui move build --path move/tollgate`
**Requires:** —

- [ ] **Step 1: Create `Move.toml`**
      ```toml
      [package]
      name = "tollgate"
      edition = "2024.beta"

      [dependencies]
      Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }

      [addresses]
      tollgate = "0x0"
      ```
- [ ] **Step 2: Create placeholders so the dirs are tracked**
      Create `move/tollgate/sources/.gitkeep` (empty) and `move/tollgate/tests/.gitkeep` (empty).
- [ ] **Step 3: Confirm the empty package builds** *(THIS IS THE GATE)*
      Run: `sui move build --path move/tollgate`
      Expected: PASS — output contains `Build successful` (an empty package with only the Sui dep compiles; fetching the framework may take a moment).
- [ ] **Step 4: Commit**
      ```bash
      git add move/tollgate/Move.toml move/tollgate/sources/.gitkeep move/tollgate/tests/.gitkeep
      git commit -m "chore(move): scaffold tollgate Move package"
      ```

---

### Task 2: `mock_usd` demo coin (6-decimal mintable stablecoin)

**Files:**
- Create: `move/tollgate/sources/mock_usd.move`
- Create: `move/tollgate/tests/mock_usd_tests.move`

**Depends on:** Task 1
**Effort:** medium
**Provides:**
- `tollgate::mock_usd::MOCK_USD` (the coin one-time-witness type → coin type string `<pkg>::mock_usd::MOCK_USD`)
- `public entry fun mint(treasury: &mut TreasuryCap<MOCK_USD>, amount: u64, recipient: address, ctx: &mut TxContext)`

**Requires:** `Move package "tollgate"` (Task 1)

- [ ] **Step 1: Write the failing test**
      Create `move/tollgate/tests/mock_usd_tests.move`:
      ```move
      #[test_only]
      module tollgate::mock_usd_tests {
          use sui::coin::{Self, Coin, TreasuryCap};
          use sui::test_scenario;
          use tollgate::mock_usd::{Self, MOCK_USD};

          #[test]
          fun test_mint_creates_coin_of_amount() {
              let publisher = @0xA;
              let recipient = @0xB;
              let mut sc = test_scenario::begin(publisher);
              // Initialize the currency via the test-only initializer.
              mock_usd::init_for_testing(test_scenario::ctx(&mut sc));

              test_scenario::next_tx(&mut sc, publisher);
              let mut treasury = test_scenario::take_from_sender<TreasuryCap<MOCK_USD>>(&sc);
              mock_usd::mint(&mut treasury, 5000, recipient, test_scenario::ctx(&mut sc));
              test_scenario::return_to_sender(&sc, treasury);

              test_scenario::next_tx(&mut sc, recipient);
              let coin = test_scenario::take_from_sender<Coin<MOCK_USD>>(&sc);
              assert!(coin::value(&coin) == 5000, 0);
              test_scenario::return_to_sender(&sc, coin);
              test_scenario::end(sc);
          }
      }
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `sui move test --path move/tollgate`
      Expected: FAIL — compile error, `mock_usd` module / `init_for_testing` / `mint` are undefined.
- [ ] **Step 3: Minimal implementation**
      Create `move/tollgate/sources/mock_usd.move`:
      ```move
      module tollgate::mock_usd {
          use sui::coin::{Self, TreasuryCap};

          /// One-time witness for the demo stablecoin.
          public struct MOCK_USD has drop {}

          fun init(witness: MOCK_USD, ctx: &mut TxContext) {
              let (treasury, metadata) = coin::create_currency(
                  witness,
                  6,
                  b"mUSD",
                  b"Tollgate Mock USD",
                  b"Test-only stablecoin for the Tollgate demo (testnet, no real value).",
                  option::none(),
                  ctx,
              );
              transfer::public_freeze_object(metadata);
              transfer::public_transfer(treasury, tx_context::sender(ctx));
          }

          /// Mint `amount` base units to `recipient`. Gated by holding the TreasuryCap.
          public entry fun mint(
              treasury: &mut TreasuryCap<MOCK_USD>,
              amount: u64,
              recipient: address,
              ctx: &mut TxContext,
          ) {
              let coin = coin::mint(treasury, amount, ctx);
              transfer::public_transfer(coin, recipient);
          }

          #[test_only]
          public fun init_for_testing(ctx: &mut TxContext) {
              init(MOCK_USD {}, ctx);
          }
      }
      ```
- [ ] **Step 4: Run to confirm it passes** *(THIS IS THE GATE)*
      Run: `sui move test --path move/tollgate`
      Expected: PASS — output contains `Test result: OK` (1 test passed).
- [ ] **Step 5: Commit**
      ```bash
      git add move/tollgate/sources/mock_usd.move move/tollgate/tests/mock_usd_tests.move
      git commit -m "feat(move): mintable mock_usd demo stablecoin"
      ```

---

### Task 3: `tollgate` module — register, pay, withdraw, receipts

**Files:**
- Create: `move/tollgate/sources/tollgate.move`
- Create: `move/tollgate/tests/tollgate_tests.move`

**Depends on:** Task 2
**Effort:** high
**Provides:**
- `public struct MeteredResource<phantom T> has key` `{ id, owner: address, price: u64, balance: Balance<T> }` (shared object)
- `public struct OwnerCap has key, store` `{ id, resource_id: ID }`
- event `public struct PaymentReceipt has copy, drop` `{ resource_id: ID, payer: address, amount: u64, nonce: vector<u8>, timestamp_ms: u64 }`
- event `public struct ResourceRegistered has copy, drop` `{ resource_id: ID, owner: address, price: u64 }`
- `public entry fun register_resource<T>(price: u64, ctx)`
- `public entry fun pay<T>(resource: &mut MeteredResource<T>, payment: Coin<T>, nonce: vector<u8>, clock: &Clock, ctx)`
- `public entry fun withdraw<T>(resource: &mut MeteredResource<T>, cap: &OwnerCap, amount: u64, ctx)`
- views `price<T>`, `balance_value<T>`, `owner<T>`
- error codes `EInsufficientPayment=0`, `ENotOwner=1`, `EInsufficientBalance=2`

**Requires:** `tollgate::mock_usd::MOCK_USD` (Task 2) — used as the `T` in tests:
```move
// from Task 2:
public struct MOCK_USD has drop {}
public fun init_for_testing(ctx: &mut TxContext)   // test_only
```

- [ ] **Step 1: Write the failing tests**
      Create `move/tollgate/tests/tollgate_tests.move`:
      ```move
      #[test_only]
      module tollgate::tollgate_tests {
          use sui::coin;
          use sui::clock;
          use sui::test_scenario;
          use tollgate::tollgate::{Self, MeteredResource, OwnerCap};
          use tollgate::mock_usd::MOCK_USD;

          const OWNER: address = @0xA;
          const PAYER: address = @0xB;

          #[test]
          fun test_register_pay_credits_balance() {
              let mut sc = test_scenario::begin(OWNER);
              tollgate::register_resource<MOCK_USD>(1000, test_scenario::ctx(&mut sc));

              test_scenario::next_tx(&mut sc, PAYER);
              let mut resource = test_scenario::take_shared<MeteredResource<MOCK_USD>>(&sc);
              assert!(tollgate::price(&resource) == 1000, 0);
              let coin = coin::mint_for_testing<MOCK_USD>(1500, test_scenario::ctx(&mut sc));
              let clk = clock::create_for_testing(test_scenario::ctx(&mut sc));
              tollgate::pay<MOCK_USD>(&mut resource, coin, b"nonce-1", &clk, test_scenario::ctx(&mut sc));
              assert!(tollgate::balance_value(&resource) == 1500, 1);
              clock::destroy_for_testing(clk);
              test_scenario::return_shared(resource);
              test_scenario::end(sc);
          }

          #[test]
          #[expected_failure(abort_code = tollgate::tollgate::EInsufficientPayment)]
          fun test_pay_below_price_aborts() {
              let mut sc = test_scenario::begin(OWNER);
              tollgate::register_resource<MOCK_USD>(1000, test_scenario::ctx(&mut sc));
              test_scenario::next_tx(&mut sc, PAYER);
              let mut resource = test_scenario::take_shared<MeteredResource<MOCK_USD>>(&sc);
              let coin = coin::mint_for_testing<MOCK_USD>(999, test_scenario::ctx(&mut sc));
              let clk = clock::create_for_testing(test_scenario::ctx(&mut sc));
              tollgate::pay<MOCK_USD>(&mut resource, coin, b"nonce-2", &clk, test_scenario::ctx(&mut sc));
              clock::destroy_for_testing(clk);
              test_scenario::return_shared(resource);
              test_scenario::end(sc);
          }

          #[test]
          fun test_withdraw_with_cap_moves_funds() {
              let mut sc = test_scenario::begin(OWNER);
              tollgate::register_resource<MOCK_USD>(1000, test_scenario::ctx(&mut sc));
              // pay in
              test_scenario::next_tx(&mut sc, PAYER);
              let mut resource = test_scenario::take_shared<MeteredResource<MOCK_USD>>(&sc);
              let coin = coin::mint_for_testing<MOCK_USD>(1000, test_scenario::ctx(&mut sc));
              let clk = clock::create_for_testing(test_scenario::ctx(&mut sc));
              tollgate::pay<MOCK_USD>(&mut resource, coin, b"nonce-3", &clk, test_scenario::ctx(&mut sc));
              clock::destroy_for_testing(clk);
              test_scenario::return_shared(resource);
              // withdraw as owner (cap holder)
              test_scenario::next_tx(&mut sc, OWNER);
              let mut resource2 = test_scenario::take_shared<MeteredResource<MOCK_USD>>(&sc);
              let cap = test_scenario::take_from_sender<OwnerCap>(&sc);
              tollgate::withdraw<MOCK_USD>(&mut resource2, &cap, 1000, test_scenario::ctx(&mut sc));
              assert!(tollgate::balance_value(&resource2) == 0, 0);
              test_scenario::return_to_sender(&sc, cap);
              test_scenario::return_shared(resource2);
              test_scenario::end(sc);
          }
      }
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `sui move test --path move/tollgate`
      Expected: FAIL — compile error, `tollgate` module / `MeteredResource` / `register_resource` / `pay` / `withdraw` / views are undefined.
- [ ] **Step 3: Minimal implementation**
      Create `move/tollgate/sources/tollgate.move`:
      ```move
      module tollgate::tollgate {
          use sui::balance::{Self, Balance};
          use sui::coin::{Self, Coin};
          use sui::clock::{Self, Clock};
          use sui::event;

          const EInsufficientPayment: u64 = 0;
          const ENotOwner: u64 = 1;
          const EInsufficientBalance: u64 = 2;

          /// A pay-per-call resource. Generic over the payment coin type `T`.
          public struct MeteredResource<phantom T> has key {
              id: UID,
              owner: address,
              price: u64,
              balance: Balance<T>,
          }

          /// Capability authorizing withdrawal from a specific resource.
          public struct OwnerCap has key, store {
              id: UID,
              resource_id: ID,
          }

          /// Emitted on every successful payment — the access credential the middleware verifies.
          public struct PaymentReceipt has copy, drop {
              resource_id: ID,
              payer: address,
              amount: u64,
              nonce: vector<u8>,
              timestamp_ms: u64,
          }

          /// Emitted when a resource is registered.
          public struct ResourceRegistered has copy, drop {
              resource_id: ID,
              owner: address,
              price: u64,
          }

          /// Register a metered resource priced at `price` base units of `T`.
          /// Shares the resource and transfers an OwnerCap to the caller.
          public entry fun register_resource<T>(price: u64, ctx: &mut TxContext) {
              let resource = MeteredResource<T> {
                  id: object::new(ctx),
                  owner: tx_context::sender(ctx),
                  price,
                  balance: balance::zero<T>(),
              };
              let resource_id = object::id(&resource);
              let cap = OwnerCap { id: object::new(ctx), resource_id };
              event::emit(ResourceRegistered { resource_id, owner: tx_context::sender(ctx), price });
              transfer::share_object(resource);
              transfer::public_transfer(cap, tx_context::sender(ctx));
          }

          /// Pay for one call. Asserts `payment >= price`, credits the resource, emits a receipt.
          public entry fun pay<T>(
              resource: &mut MeteredResource<T>,
              payment: Coin<T>,
              nonce: vector<u8>,
              clock: &Clock,
              ctx: &mut TxContext,
          ) {
              let amount = coin::value(&payment);
              assert!(amount >= resource.price, EInsufficientPayment);
              balance::join(&mut resource.balance, coin::into_balance(payment));
              event::emit(PaymentReceipt {
                  resource_id: object::id(resource),
                  payer: tx_context::sender(ctx),
                  amount,
                  nonce,
                  timestamp_ms: clock::timestamp_ms(clock),
              });
          }

          /// Withdraw `amount` from the resource. Gated by a matching OwnerCap.
          public entry fun withdraw<T>(
              resource: &mut MeteredResource<T>,
              cap: &OwnerCap,
              amount: u64,
              ctx: &mut TxContext,
          ) {
              assert!(cap.resource_id == object::id(resource), ENotOwner);
              assert!(balance::value(&resource.balance) >= amount, EInsufficientBalance);
              let coin = coin::take(&mut resource.balance, amount, ctx);
              transfer::public_transfer(coin, tx_context::sender(ctx));
          }

          public fun price<T>(resource: &MeteredResource<T>): u64 { resource.price }
          public fun balance_value<T>(resource: &MeteredResource<T>): u64 { balance::value(&resource.balance) }
          public fun owner<T>(resource: &MeteredResource<T>): address { resource.owner }
      }
      ```
- [ ] **Step 4: Run to confirm it passes** *(THIS IS THE GATE)*
      Run: `sui move test --path move/tollgate`
      Expected: PASS — output contains `Test result: OK` (4 tests passed: 3 tollgate + 1 mock_usd).
- [ ] **Step 5: Commit**
      ```bash
      git add move/tollgate/sources/tollgate.move move/tollgate/tests/tollgate_tests.move
      git commit -m "feat(move): tollgate metered resource, pay, withdraw, receipts"
      ```
