
import https from 'https';
import path from 'path';
import { writeFile } from 'fs/promises';
import axios from 'axios';
import { getSourceInfos, SourceInfo } from '../utils/source';
import {
  Env, Obj, Project, ServerLog, ServerLogs,
} from 'src/typings';


const getGitProjectName = (project: Project) => {
  const projectMap = {
    art: 'ideation',
    'material-admin': 'material-admin',
    opt: 'opt',
  };
  return projectMap[project] || 'art';
};

const getStackArrs = (params: { originStackArr: string[], sourceInfos: SourceInfo[], project: Project, ref: string, versionHash: string }) => {
  const {
    originStackArr, sourceInfos, project, ref, versionHash,
  } = params;
  const sourceStackArr: string[] = [];
  const markdownStackArr: string[] = [];

  const getHttpStr = (row: string) => {
    const httpReg = /\(?(https?:\/\/[^)]*)\)?/;
    const httpMatch = row.match(httpReg) || [];
    const httpStr = httpMatch[1];
    return httpStr;
  };

  const getRef = () => ref.replace(/^origin\//, '');

  const getVersionHash = () => versionHash;


  sourceInfos.forEach(item => {
    const {
      source, line, column, stackLine, packageInfo,
    } = item;
    const originRow = originStackArr[+stackLine! + 1] || '';
    if (packageInfo) {
      // 公共模块
      const { name, path: _path, version } = packageInfo;
      item.originUrl = `https://unpkg.com/browse/${name}${version ? `@${version}` : ''}/${_path}#L${line}`;
    } else {
      // 非公共模块
      item.originUrl = `http://gitlab.4dshoetech.local/front-end/${getGitProjectName(project)}/blob/${getVersionHash()}/${source}#L${line}`;
    }
    const httpStr = getHttpStr(originRow);
    const sourceRow = originRow.replace(httpStr, `${source}:${line}:${column}`);
    sourceStackArr.push(sourceRow);
    const markdownRow = originRow.replace(httpStr, `[${source}:${line}:${column}](${item.originUrl})`);
    markdownStackArr.push(markdownRow);
  });
  return [sourceStackArr, markdownStackArr];
};

const writeTemErrorMd5Map = async (data: Obj) => {
  const res = writeFile(path.resolve(__dirname, './tem-error-md5-map.json'), JSON.stringify(data));
  return res;
};

// 两秒内不收集重复的错误，避免同个错误报太多次，导致钉钉1分钟超出20条
const clearTemErrorMd5Map = (timeout = 2000) => {
  setTimeout(() => {
    writeTemErrorMd5Map({});
  }, timeout);
};

const handleServerLog = async (serverLog: ServerLog, basePath = '') => {
  // 单次
  // const errorMd5 = getErrorMd5(serverLog);
  // if (temErrorMd5Map[errorMd5]) return;
  // temErrorMd5Map[errorMd5] = true;
  // await writeTemErrorMd5Map(temErrorMd5Map);

  // ref默认master
  const {
    stack, project = 'art', ref = 'master', env, versionHash,
  } = serverLog;
  const sourceInfos = await getSourceInfos({
    stack, project, basePath, versionHash,
  });

  const originStackArr = stack.split('\n');
  const [sourceStackArr, markdownStackArr] = getStackArrs({
    originStackArr, sourceInfos, project, ref, versionHash,
  });

  const sourceStack = sourceStackArr.join('\n');
  const sitTextTitles = [
    `### 前端告警: ${originStackArr[0]}`,
    `**项目:** ${project}`,
    `**环境:** ${env}`,
  ];
  const prodTextTitles = ['uat', 'production'].includes(env) ? ['异常日志告警'] : [];
  const textTitles = [...prodTextTitles, ...sitTextTitles];

  const markdown = {
    title: '前端告警',
    text: `${textTitles.map(title => `${title} \n\n`).join('')} ${markdownStackArr.map(row => `- ${row}\n\n`).join('')}`,
  };

  return {
    ...serverLog,
    sourceInfos,
    sourceStack,
    markdown,
  };
};

const notifyError = async (params: Obj) => {
  try {
    const res = await axios({
      url: 'https://oapi.dingtalk.com/robot/send?access_token=821ba73676cb87501fb2051cb25bec5484e0fba0193a9baa0c0bea1c6af60c54',
      method: 'post',
      // 为了忽略https证书错误
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        msgtype: 'markdown',
        ...params,
      },
    });
    console.log('--------报警成功----------');
    console.log(res);
  } catch (error) {
    console.error('--------报警失败----------');
    console.error(error);
  }
};


const getStackSource = async () => {
  try {
    if (!process.argv[2]) {
      throw Error('参数为空');
    }
    const serverLogs: ServerLogs = JSON.parse(process.argv[2]);
    const basePath = process.argv[3];
    const handledServerLogs = await Promise.all(serverLogs.map(serverLog => handleServerLog(serverLog, basePath)).filter(item => item));
    const output = JSON.stringify(handledServerLogs);
    // handledServerLogs.forEach(item => notifyError(item.markdown));
    // clearTemErrorMd5Map();
    console.log(output);
  } catch (error) {
    console.log('获取堆栈源信息失败：\n', error);
  }
};

getStackSource();
