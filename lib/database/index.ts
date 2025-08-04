// Database utilities exports

export {
  NileDBClient,
  getNileClient,
  closeNileClient,
  type NileConnectionOptions,
} from './nile-client';

export {
  DatabaseConnectionUtils,
  getConnectionUtils,
  closeConnectionUtils,
  withDatabase,
  withTransaction,
  type ConnectionUtilsOptions,
} from './connection-utils';

// Re-export types for convenience
export type {
  NileClient,
  HealthCheck,
  NileConfig,
} from '../../types/nile';