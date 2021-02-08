export type Obj = { [p in string | number]: unknown };
export type Project = 'art' | 'material-admin' | 'opt';
export type Env = 'staging' | 'uat' | 'production';

export interface ServerLog {
  stack: string,
  level: number,
  sourceStack: string,
  project: Project,
  userAgent: string,
  versionHash: string,
  env: Env,
  message: string,
  componentTree: string,
  ref: string,
  file: string,
  name: string,
  position: string
}

export type ServerLogs = ServerLog[];

