import md5 from 'js-md5';
import { ServerLog } from '../typings';

// eslint-disable-next-line import/prefer-default-export
export const getErrorMd5 = (serverLog: ServerLog): string => {
  const {
    stack, project = 'art', ref = 'master', env, versionHash,
  } = serverLog;
  const errorMd5 = md5(`${project}${ref}${env}${stack}`);
  return errorMd5;
};

