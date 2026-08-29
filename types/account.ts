export interface AccountBalance {
  available: number | null;
  current: number | null;
  isoCurrencyCode: string;
}

export interface BankInstitution {
  id: string;
  name: string;
}

export interface ConnectedAccount {
  id: string;
  name: string;
  officialName: string;
  mask: string;
  type: string;
  subtype: string | null;
  balances: AccountBalance;
  institution: BankInstitution;
  connectedAt?: string;
}
