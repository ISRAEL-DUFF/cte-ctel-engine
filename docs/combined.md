# NIBSS Instant Payments (NIP) — Full Technical Architecture

> This doc gives an end‑to‑end architecture for integrating NIBSS NIP via a sponsoring bank or direct (for licensed FIs). Includes diagrams, sequence flows, API contracts, idempotency/retry, security, monitoring, settlement & reconciliation.

---

## 0) Legend & Assumptions

* **You** = Fintech/PSP Platform
* **SB** = Sponsoring Bank (your direct counterparty)
* **NCS** = NIBSS Central Switch (NIP)
* **CBN‑RTGS** = CBN Real‑Time Gross Settlement (end‑of‑day settlement)
* All calls over mutual TLS; messages are signed; idempotency key used on every payment instruction.
* Message formats: legacy ISO‑8583 (widely used) and/or ISO‑20022 pain/pacs for newer stacks (NPS).

---

## 1) High‑Level Component Diagram

```mermaid
flowchart LR
  subgraph Client[Customer Channels]
    MApp[Mobile App]
    USSD[USSD]
    Web[Merchant Web/SDK]
  end

  subgraph PSP[Your Platform]
    API[Public API Gateway]
    Auth[Auth & IAM]
    Orchestrator[Payment Orchestrator]
    Ledger[Internal Wallet/Ledger]
    FX[Fees & FX Engine]
    Rsk[Risk & Fraud Engine]
    Idem[Idempotency Store]
    EvBus[Event Bus]
    Mon[Obs: Logs/Traces/Metrics]
    Vault[KMS/HSM/Vault]
  end

  subgraph Bank[ Sponsoring Bank Core ]
    BAPI[Bank API Gateway]
    BISO[ISO 8583/20022 Adapter]
    BCore[Core Banking]
    BNip[Bank NIP Connector]
  end

  subgraph NIBSS[NIBSS Central Switch NCS]
    NIP[NIP Switch]
    NE[Name Enquiry]
    BAM[Monitoring/Fraud]
  end

  Client -->|initiate transfer| API
  API --> Auth
  Auth --> Orchestrator
  Orchestrator --> Rsk
  Orchestrator --> Ledger
  Orchestrator -->|Name Enquiry| BAPI
  BAPI --> BNip --> NE
  NE --> BNip --> BAPI --> Orchestrator
  Orchestrator -->|Payment Instruction| BAPI
  BAPI --> BNip --> NIP
  NIP -->|route| BNip
  BNip --> BISO --> BCore
  BCore -->|credit ben| BISO --> BNip --> NIP
  NIP --> BNip --> BAPI --> Orchestrator
  Orchestrator --> EvBus
  EvBus --> Mon
  Vault --- Orchestrator
  Idem --- Orchestrator
```

---

## 2) End‑to‑End Sequence (Happy Path)

```mermaid
sequenceDiagram
  participant U as User
  participant P as Your API/Orchestrator
  participant R as Risk Engine
  participant L as Ledger
  participant SB as Sponsor Bank NIP Connector
  participant N as NIBSS NIP
  participant RB as Receiving Bank

  U->>P: POST /transfers (amount, acctNo, bankCode, narration, idemKey)
  activate P
  P->>R: Pre‑auth & fraud checks (velocity, device, KYC)
  R-->>P: OK
  P->>L: Reserve funds / Place hold
  L-->>P: Hold placed
  P->>SB: Name Enquiry (acctNo, bankCode)
  SB->>N: Name Enquiry
  N->>RB: Query account name/status
  RB-->>N: 200 + accountName
  N-->>SB: accountName
  SB-->>P: accountName
  P->>U: Show beneficiary name, confirm?
  U-->>P: Confirm
  P->>SB: Payment Instruction (ISO8583 or pacs.008)
  SB->>N: Forward payment
  N->>RB: Route to beneficiary bank
  RB-->>N: Credit confirmation (success)
  N-->>SB: Success advice
  SB-->>P: Success advice (authCode, stan)
  P->>L: Finalize: release hold, post entries (debit sender)
  L-->>P: Posted
  P-->>U: Success (txnId, reference)
  deactivate P
```

---

## 3) Error Paths & Reversal Logic (Essentials)

**Common failure modes**

1. **Timeout at RB**: Bank doesn’t respond within SLA (e.g., 15s). → Treat as *unknown*. Keep **hold** on funds, poll Advice/Query Status, or auto‑reverse after T+X minutes if no settlement advice.
2. **Debit success, credit fail**: Your SB returns failure after debit. → Trigger **automatic reversal**; release hold only after reversal confirmation.
3. **Duplicate requests**: Same idemKey re‑sent. → Must be **idempotent**; return prior result.
4. **Name Enquiry mismatch**: Name mismatch above threshold. → Require user re‑confirmation or block.

**Reconciliation strategy**

* Online: immediate status via Advice/Query API.
* EOD: match **your ledger** ↔ **SB file** ↔ **NIBSS report**; investigate exceptions.

---