import {createReadStream} from 'fs-jetpack';
import rl from 'readline';
import {getDb, insertMany} from './mongo';
export const getDbName = (fileName: string) => fileName.split('_')[0];
export const getColName = (fileName: string) =>
  fileName.split('_')[1].split('-')[0];
export const getTimestamp = (fileName: string) =>
  fileName.split('_')[1].split('-')[1].split('.')[0];

export const getLineReader = (filepath: string) =>
  rl.createInterface({
    input: createReadStream(filepath),
  });

export const processDocs = async (filename: string, docs: any[]) => {
  const dbName = getDbName(filename) as 'arbispotter' | 'crawl-data';
  const colName = getColName(filename);
  const timestamp = getTimestamp(filename);
  const db = await getDb(dbName);
  await insertMany(db, colName + '_recovery', docs);
};

export const recoverDocuments = async (
  filepath: string,
  filename: string,
  docCount: number
) => {
  const reader = getLineReader(filepath);
  const docs = [];
  let cnt = 0;
  for await (const line of reader) {
    cnt++;
    try {
      if (line.trim() === '') continue;
      docs.push(JSON.parse(line.trim()));
    } catch (error) {
      console.log(line.trim());
      console.log('error:', error);
    }
    if (docs.length === docCount) {
      await processDocs(filename, docs);
      docs.length = 0;
    }
  }
  if (docs.length > 0) {
    await processDocs(filename, docs);
    docs.length = 0;
  }
};
// const fileName = 'arbispotter_products-2024-12-05T12-46-27-437Z.json';
// recoverDocuments(
//   `.\\var\\backups\\arbispotter\\${fileName}`,
//   fileName,
//   10
// ).then(() => console.log('done'));
