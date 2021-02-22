/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
import { readFileSync } from 'fs';
import { resolve, join, sep } from 'path';
import axios from 'axios';
import Stacktracey from 'stacktracey';
import { NullableMappedPosition, SourceMapConsumer } from 'source-map';
import { getPackageInfo, getPackageVersion } from './parse-yarn-lock';
import { Project } from 'src/typings';

export interface SourceInfo extends NullableMappedPosition {
  stackLine?: string,
  packageInfo?: {
    name: string,
    path: string,
    version: string | null
  },
  originUrl?: string
}

const httpReg = /^(http(s)?:)?\/\//;

const getSourceMap = async ({ path, project }: { path: string, project: Project }) => {
  const isHttp = httpReg.test(path);
  let sourceMap;
  if (isHttp) {
    sourceMap = (await axios(path)).data;
  } else {
    const sourceMapText = readFileSync(resolve('projects', project, path), { encoding: 'utf-8' });
    sourceMap = JSON.parse(sourceMapText);
  }
  return sourceMap;
};

const path2HttpPath = (path = '') => {
  if (path.startsWith(sep)) path = path.replace(sep, '');
  return `http://${path.split(sep).join('/')}`;
};

const getMapPath = (params: { fileName: string, basePath: string, project: Project, versionHash: string }) => {
  const {
    fileName, basePath, project, versionHash,
  } = params;
  const isHttpBasePath = httpReg.test(basePath);
  const mapFileName = `${fileName}.map`;
  let mapPath = basePath ? join(basePath, project, versionHash, 'js', mapFileName) : `${fileName}.map`;
  if (isHttpBasePath) mapPath = path2HttpPath(mapPath);
  // console.log('fileName文件名字：\n', fileName);
  // console.log('mapPath地址：\n', mapPath);
  return mapPath;
};

export const getSourceInfos = async (params: { stack: string, project: Project, basePath: string, versionHash: string }) => {
  const {
    stack, project, basePath, versionHash,
  } = params;
  const sourceInfos: SourceInfo[] = [];
  const stacks = new Stacktracey(stack).items; // 解析错误信息

  for (const [stackLine, item] of Object.entries(stacks)) {
    const {
      file, line, column, fileName,
    } = item;

    if (line === undefined || column === undefined) continue;
    // 排除node_modules的堆栈：chunk-vendors可能包含非node_modules的公共模块,需检查vue-cli3的webpack配置
    // 解析出来的item可能出现没有fileName的情况：比如 at new Promise (<anonymous>) ，通过fileName忽略这种情况
    // if (file.includes('chunk-vendors') || !fileName) continue;
    if (!fileName) continue;

    const sourceMap = await getSourceMap({
      path: getMapPath({
        fileName, basePath, project, versionHash,
      }),
      project,
    });
    const sourceInfo: SourceInfo = await SourceMapConsumer.with(sourceMap, null, consumer => {
      const _sourceInfo = consumer.originalPositionFor({ line, column });
      if (!_sourceInfo || !_sourceInfo.source) {
        return {} as SourceInfo;
      }
      _sourceInfo.source = _sourceInfo.source.replace('webpack:///', '').replace(/\?.*$/, '');
      return _sourceInfo;
    });

    // 设置stackLine，替换原stack时需要用到
    sourceInfo.stackLine = stackLine;

    /*
        排除node_modules的堆栈：需要先请求每一个map文件拿到源文件，比较慢
        有部分情况通过chunk-vendors无法过滤到node_modules,参数如test文件里面的hasNodeModuelsParams
        所以现在采用优先通过chunk-vendors过滤，再使用node_modules二次过滤
        */
    // if (sourceInfo.source.includes('node_modules')) continue;


    if (!sourceInfo.source) continue;

    if (sourceInfo.source.includes('node_modules')) {
      const packageInfo = getPackageInfo(sourceInfo.source);
      const packageVersion = getPackageVersion({
        basePath, project, versionHash, sourcePath: sourceInfo.source,
      });
      sourceInfo.packageInfo = {
        name: packageInfo.packageName,
        path: packageInfo.packagePath,
        version: packageVersion,
      };
    }

    sourceInfos.push(sourceInfo);
  }
  return sourceInfos;
};

