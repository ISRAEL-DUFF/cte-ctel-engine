
# Wallet Ledger System Architecture

## 💼 What Is a Wallet Ledger?

A **wallet ledger** is your internal system of record that tracks:
- Every credit or debit to a user's wallet
- The source, destination, and reason for the movement
- The current balance at any given point in time (via aggregation)

Think of it like a **bank statement**, but on your backend.

---

## 🧩 Core Components of a Wallet Ledger

### 1. Wallet Table

| Field             | Description                          |
|------------------|--------------------------------------|
| `wallet_id`       | Unique wallet ID                    |
| `user_id`         | Owner of the wallet                 |
| `balance`         | Current NGN balance (optional!)     |
| `status`          | Active, frozen, etc.                |
| `type`            | Customer, agent, float wallet, etc. |
| `created_at`      | Timestamp                           |

> 🔐 **Note:** Some systems don’t store the live balance — they compute it from ledger entries to prevent corruption.

### 2. Ledger Entries Table (Transactions)

| Field               | Description                                      |
|--------------------|--------------------------------------------------|
| `entry_id`          | Unique transaction ID                           |
| `wallet_id`         | Affected wallet                                 |
| `type`              | `credit` or `debit`                             |
| `amount`            | NGN value                                       |
| `narration`         | Description of the transaction                  |
| `reference`         | External/internal reference (e.g. payment ref)  |
| `balance_before`    | Balance before txn (optional)                   |
| `balance_after`     | Balance after txn (optional)                    |
| `txn_type`          | Enum: deposit, withdrawal, fee, transfer, etc.  |
| `status`            | Pending, success, failed, reversed              |
| `created_at`        | Timestamp                                       |

### 3. Ledger Journal (Optional)

Used to store **double-entry** accounting records.

| Field           | Description |
|----------------|-------------|
| `journal_id`    | Linked group of related transactions |
| `debit_entry_id`| Debit leg (e.g., sender) |
| `credit_entry_id`| Credit leg (e.g., receiver) |
| `narration`     | Summary of the event |
| `created_at`    | Timestamp |

> This is useful for **reconciliation**, especially if you want accounting-style balance sheets.

---

## 🔁 Example: Wallet Transfer Flow

1. **Customer A sends ₦1,000 to Customer B**
2. System:
   - Debits Customer A’s wallet (ledger entry)
   - Credits Customer B’s wallet (ledger entry)
   - Links both entries via a journal or reference
3. Updates any `balance` fields if applicable

---

## 🛡️ Integrity & Safety Features

- **Atomicity**: Debit and credit operations must be atomic — use transactions.
- **Reversals**: Don’t delete entries. Add a reversal entry (opposite type, linked).
- **Idempotency**: Always support idempotent `reference_id` to avoid double-charging.
- **Auditing**: Logs of every insert/update, possibly signed records.
- **Snapshots**: Periodic daily balance snapshots for faster reconciliation.

---

## 🗄️ Optional Enhancements

| Feature | Use |
|--------|-----|
| Float Wallets | Separate wallet for agent float/funding |
| Tiered Limits | Enforce wallet-specific limits (daily, monthly) |
| Fee Engine | Auto-insert fee entries as separate debits |
| Reserve Holds | Temporarily lock funds (e.g. card pre-auth) |

---

## 🧰 Tech Tips

- Use **PostgreSQL** for its support of transactions and JSONB if needed.
- Always wrap credit + debit in a **transaction block**.
- If scale grows, separate wallet service from core app (microservice).
- Consider **event sourcing** for advanced use cases (e.g., blockchain-style audit).
