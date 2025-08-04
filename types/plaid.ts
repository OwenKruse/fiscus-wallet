// Plaid API Type Definitions

export interface PlaidLinkTokenRequest {
  client_id: string;
  secret: string;
  client_name: string;
  country_codes: string[];
  language: string;
  user: {
    client_user_id: string;
  };
  products: string[];
  required_if_supported_products?: string[];
  optional_products?: string[];
  webhook?: string;
  link_customization_name?: string;
}

export interface PlaidLinkTokenResponse {
  link_token: string;
  expiration: string;
  request_id: string;
}

export interface PlaidItemPublicTokenExchangeRequest {
  client_id: string;
  secret: string;
  public_token: string;
}

export interface PlaidItemPublicTokenExchangeResponse {
  access_token: string;
  item_id: string;
  request_id: string;
}

export interface PlaidAccount {
  account_id: string;
  balances: {
    available: number | null;
    current: number;
    iso_currency_code: string | null;
    limit: number | null;
    unofficial_currency_code: string | null;
  };
  mask: string | null;
  name: string;
  official_name: string | null;
  persistent_account_id?: string;
  subtype: string;
  type: 'investment' | 'credit' | 'depository' | 'loan' | 'brokerage' | 'other';
}

export interface PlaidAccountsGetRequest {
  client_id: string;
  secret: string;
  access_token: string;
  options?: {
    account_ids?: string[];
  };
}

export interface PlaidAccountsGetResponse {
  accounts: PlaidAccount[];
  item: PlaidItem;
  request_id: string;
}

export interface PlaidTransaction {
  account_id: string;
  account_owner: string | null;
  amount: number;
  iso_currency_code: string | null;
  unofficial_currency_code: string | null;
  category: string[] | null;
  category_id: string | null;
  check_number: string | null;
  counterparties: PlaidCounterparty[] | null;
  date: string;
  datetime: string | null;
  authorized_date: string | null;
  authorized_datetime: string | null;
  location: PlaidLocation | null;
  name: string;
  merchant_name: string | null;
  merchant_entity_id: string | null;
  logo_url: string | null;
  website: string | null;
  payment_meta: PlaidPaymentMeta;
  payment_channel: 'online' | 'in store' | 'other';
  pending: boolean;
  pending_transaction_id: string | null;
  personal_finance_category: PlaidPersonalFinanceCategory | null;
  personal_finance_category_icon_url: string | null;
  transaction_id: string;
  transaction_code: string | null;
  transaction_type: 'digital' | 'place' | 'special' | 'unresolved';
}

export interface PlaidCounterparty {
  name: string;
  type: 'merchant' | 'financial_institution' | 'payment_app' | 'marketplace' | 'payment_terminal' | 'income_source';
  logo_url: string | null;
  website: string | null;
  entity_id: string | null;
  confidence_level: 'very_high' | 'high' | 'medium' | 'low';
}

export interface PlaidLocation {
  address: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  lat: number | null;
  lon: number | null;
  store_number: string | null;
}

export interface PlaidPaymentMeta {
  by_order_of: string | null;
  payee: string | null;
  payer: string | null;
  payment_method: string | null;
  payment_processor: string | null;
  ppd_id: string | null;
  reason: string | null;
  reference_number: string | null;
}

export interface PlaidPersonalFinanceCategory {
  confidence_level: 'very_high' | 'high' | 'medium' | 'low';
  detailed: string;
  primary: string;
}

export interface PlaidTransactionsGetRequest {
  client_id: string;
  secret: string;
  access_token: string;
  start_date: string;
  end_date: string;
  options?: {
    account_ids?: string[];
    count?: number;
    offset?: number;
    include_original_description?: boolean;
    include_personal_finance_category?: boolean;
  };
}

export interface PlaidTransactionsGetResponse {
  accounts: PlaidAccount[];
  transactions: PlaidTransaction[];
  total_transactions: number;
  item: PlaidItem;
  request_id: string;
}

export interface PlaidItem {
  available_products: string[];
  billed_products: string[];
  consent_expiration_time: string | null;
  error: PlaidError | null;
  institution_id: string | null;
  item_id: string;
  products: string[];
  update_type: 'background' | 'user_present_required';
  webhook: string | null;
}

export interface PlaidError {
  error_type: string;
  error_code: string;
  error_message: string;
  display_message: string | null;
  request_id: string;
  causes: PlaidError[];
  status: number | null;
  documentation_url: string;
  suggested_action: string | null;
}

export interface PlaidInstitution {
  country_codes: string[];
  institution_id: string;
  name: string;
  products: string[];
  routing_numbers: string[];
  oauth: boolean;
  status: PlaidInstitutionStatus | null;
  primary_color: string | null;
  logo: string | null;
  url: string | null;
}

export interface PlaidInstitutionStatus {
  item_logins: PlaidProductStatus;
  transactions_updates: PlaidProductStatus;
  auth: PlaidProductStatus;
  identity: PlaidProductStatus;
  investments_updates: PlaidProductStatus;
  liabilities_updates: PlaidProductStatus;
  liabilities: PlaidProductStatus;
  investments: PlaidProductStatus;
  health_incidents: PlaidHealthIncident[] | null;
}

export interface PlaidProductStatus {
  status: 'healthy' | 'degraded' | 'down';
  last_status_change: string;
  breakdown: {
    success: number;
    error_plaid: number;
    error_institution: number;
    refresh_interval: 'normal' | 'delayed' | 'stopped';
  };
}

export interface PlaidHealthIncident {
  start_date: string;
  end_date: string | null;
  title: string;
  incident_updates: PlaidIncidentUpdate[];
}

export interface PlaidIncidentUpdate {
  description: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  updated_date: string;
}

// Plaid Link specific types
export interface PlaidLinkOptions {
  token: string;
  onSuccess: (public_token: string, metadata: PlaidLinkOnSuccessMetadata) => void;
  onExit?: (err: PlaidLinkError | null, metadata: PlaidLinkOnExitMetadata) => void;
  onEvent?: (eventName: string, metadata: PlaidLinkOnEventMetadata) => void;
  onLoad?: () => void;
  receivedRedirectUri?: string;
}

export interface PlaidLinkOnSuccessMetadata {
  institution: {
    name: string;
    institution_id: string;
  } | null;
  accounts: Array<{
    id: string;
    name: string;
    mask: string | null;
    type: string;
    subtype: string | null;
    verification_status: string | null;
    class_type: string | null;
  }>;
  link_session_id: string;
  transfer_status: string | null;
}

export interface PlaidLinkError {
  error_type: string;
  error_code: string;
  error_message: string;
  display_message: string | null;
}

export interface PlaidLinkOnExitMetadata {
  institution: {
    name: string;
    institution_id: string;
  } | null;
  status: string;
  link_session_id: string;
  request_id: string;
}

export interface PlaidLinkOnEventMetadata {
  error_type: string | null;
  error_code: string | null;
  error_message: string | null;
  exit_status: string | null;
  institution_id: string | null;
  institution_name: string | null;
  institution_search_query: string | null;
  link_session_id: string;
  mfa_type: string | null;
  request_id: string | null;
  timestamp: string;
  view_name: string;
}

// Configuration types
export interface PlaidConfig {
  clientId: string;
  secret: string;
  env: 'sandbox' | 'development' | 'production';
  products: string[];
  countryCodes: string[];
}

// Service response types
export interface PlaidServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: PlaidError;
}

export interface PlaidConnectionResult {
  accessToken: string;
  itemId: string;
  institutionId: string;
  institutionName: string;
  accounts: PlaidAccount[];
}