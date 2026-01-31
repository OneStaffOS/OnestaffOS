export type ClientBankAccount = {
  id: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  createdAt: string;
};

export type ClientBankingBalances = {
  available: number;
  onHold: number;
};

export type ClientBankingHold = {
  amount: number;
  accountId: string;
  createdAt: string;
};

export type ClientBankingState = {
  accounts: ClientBankAccount[];
  balances: ClientBankingBalances;
  holds: Record<string, ClientBankingHold>;
};

export type PendingBankingAction =
  | {
      type: 'ADD_FUNDS';
      amount: number;
      accountId: string;
      createdAt: string;
    }
  | {
      type: 'APPROVE_CONTRACT';
      contractId: string;
      amount: number;
      createdAt: string;
    };

const BANK_CODES = ['NBE', 'CIB', 'HSBC', 'QNB', 'CAI', 'EGY'] as const;
const ACCOUNT_REGEX = /^(NBE|CIB|HSBC|QNB|CAI|EGY)-\d{10}$/;

function storageKey(userId: string) {
  return `client-banking:${userId}`;
}

function pendingKey(userId: string) {
  return `client-banking-pending:${userId}`;
}

function defaultState(): ClientBankingState {
  return {
    accounts: [],
    balances: { available: 0, onHold: 0 },
    holds: {},
  };
}

export function getClientBankingState(userId: string): ClientBankingState {
  if (typeof window === 'undefined') return defaultState();
  const raw = localStorage.getItem(storageKey(userId));
  if (!raw) return defaultState();
  try {
    const parsed = JSON.parse(raw);
    return {
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      balances: parsed.balances || { available: 0, onHold: 0 },
      holds: parsed.holds || {},
    };
  } catch {
    return defaultState();
  }
}

export function saveClientBankingState(userId: string, state: ClientBankingState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey(userId), JSON.stringify(state));
}

export function validateBankAccount(accountNumber: string) {
  const trimmed = accountNumber.trim().toUpperCase();
  if (!ACCOUNT_REGEX.test(trimmed)) {
    return {
      ok: false,
      message:
        'Account format must be BANK-1234567890 using: NBE, CIB, HSBC, QNB, CAI, EGY.',
    };
  }
  const bankCode = trimmed.split('-')[0];
  if (!BANK_CODES.includes(bankCode as (typeof BANK_CODES)[number])) {
    return {
      ok: false,
      message: 'Unsupported bank code.',
    };
  }
  return { ok: true, normalized: trimmed, bankCode };
}

export function addBankAccount(
  userId: string,
  accountName: string,
  accountNumber: string,
) {
  const state = getClientBankingState(userId);
  if (state.accounts.length >= 6) {
    return { ok: false, message: 'Maximum of 6 bank accounts allowed.' };
  }
  const validation = validateBankAccount(accountNumber);
  if (!validation.ok) {
    return { ok: false, message: validation.message };
  }
  const normalizedNumber = validation.normalized!;
  if (state.accounts.some((account) => account.accountNumber === normalizedNumber)) {
    return { ok: false, message: 'Bank account already added.' };
  }
  const newAccount: ClientBankAccount = {
    id: `acct-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    bankCode: validation.bankCode!,
    accountNumber: normalizedNumber,
    accountName: accountName.trim(),
    createdAt: new Date().toISOString(),
  };
  const updated = {
    ...state,
    accounts: [...state.accounts, newAccount],
  };
  saveClientBankingState(userId, updated);
  return { ok: true, account: newAccount };
}

export function addFunds(userId: string, amount: number) {
  const state = getClientBankingState(userId);
  const updated: ClientBankingState = {
    ...state,
    balances: {
      ...state.balances,
      available: state.balances.available + amount,
    },
  };
  saveClientBankingState(userId, updated);
  return updated;
}

export function holdFunds(userId: string, contractId: string, amount: number, accountId: string) {
  const state = getClientBankingState(userId);
  if (state.balances.available < amount) {
    return { ok: false, message: 'Insufficient available balance.' };
  }
  // Business rule: move funds from Available -> On Hold at contract creation time.
  const updated: ClientBankingState = {
    ...state,
    balances: {
      available: state.balances.available - amount,
      onHold: state.balances.onHold + amount,
    },
    holds: {
      ...state.holds,
      [contractId]: {
        amount,
        accountId,
        createdAt: new Date().toISOString(),
      },
    },
  };
  saveClientBankingState(userId, updated);
  return { ok: true, state: updated };
}

export function releaseHold(userId: string, contractId: string) {
  const state = getClientBankingState(userId);
  const hold = state.holds[contractId];
  if (!hold) return state;
  // Business rule: canceled/rejected contracts release On Hold funds back to Available.
  const updated: ClientBankingState = {
    ...state,
    balances: {
      available: state.balances.available + hold.amount,
      onHold: Math.max(0, state.balances.onHold - hold.amount),
    },
    holds: { ...state.holds },
  };
  delete updated.holds[contractId];
  saveClientBankingState(userId, updated);
  return updated;
}

export function finalizeHold(userId: string, contractId: string) {
  const state = getClientBankingState(userId);
  const hold = state.holds[contractId];
  if (!hold) return state;
  // Business rule: approved contracts settle On Hold funds (Available already reduced).
  const updated: ClientBankingState = {
    ...state,
    balances: {
      available: state.balances.available,
      onHold: Math.max(0, state.balances.onHold - hold.amount),
    },
    holds: { ...state.holds },
  };
  delete updated.holds[contractId];
  saveClientBankingState(userId, updated);
  return updated;
}

export function getFinalBalance(balances: ClientBankingBalances) {
  return balances.available - balances.onHold;
}

export function storePendingAction(userId: string, action: PendingBankingAction) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(pendingKey(userId), JSON.stringify(action));
}

export function readPendingAction(userId: string): PendingBankingAction | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(pendingKey(userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingBankingAction;
  } catch {
    return null;
  }
}

export function clearPendingAction(userId: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(pendingKey(userId));
}
