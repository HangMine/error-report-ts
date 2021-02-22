
import { readFileSync } from 'fs';
import { resolve, join, sep } from 'path';
import { Project } from 'src/typings';

interface PathParams {
  basePath: string,
  project: Project,
  versionHash: string
}

type TextParams = PathParams;

interface Params extends PathParams {
  sourcePath: string
}

export const getYarnLockPath = ({ basePath, project, versionHash }: PathParams) => {
  const yarnLockPath = join(basePath, project, versionHash, 'js/yarn.lock');
  return yarnLockPath;
};

export const getYarnLockText = ({ basePath, project, versionHash }: TextParams) => {
  const path = getYarnLockPath({ basePath, project, versionHash });
  const yarnLockText = readFileSync(resolve('projects', project, path), { encoding: 'utf-8' });
  return yarnLockText;
};

export const getPackageInfo = (sourcePath: string) => {
  const arr = sourcePath.split('/');
  const [, packageName, ...packagePath] = arr;
  return {
    packageName, packagePath: packagePath.join('/'),
  };
};

export const getPackageVersion = ({
  sourcePath, basePath, project, versionHash,
}: Params) => {
  try {
    const { packageName } = getPackageInfo(sourcePath);
    const yarnLockText = getYarnLockText({ basePath, project, versionHash });
    const reg = new RegExp(`(?<=([\\s|\\b]${packageName}@.+:)[\\s\\n]*version ").*(?=")`, 'g');
    const version = yarnLockText.match(reg);
    return Array.isArray(version) ? version[0] : version;
  } catch (error) {
    // 兼容没有yarn.lock的情况
    return null;
  }
};
