import clientPool from './mongoPool';
import os from 'os';

export const arbispotter_db = 'arbispotter';
export const crawl_data_db = 'crawler-data';
export const sitemapcollectionName = 'sitemaps';
export const tasksCollectionName = 'tasks';
export const logsCollectionName = 'logs';
export const shopCollectionName = 'shops';
export const hostname = os.hostname();

export const getArbispotterDb = async () => {
  const client = await clientPool[arbispotter_db];
  return client.db();
};

export const getCrawlDataDb = async () => {
  const client = await clientPool[crawl_data_db];
  return client.db();
};

export const getDb = async (dbName: 'arbispotter' | 'crawl-data') => {
  const client = await clientPool[dbName];
  return client.db();
};

export const insertMany = async (db: any, colName: string, docs: any[]) => {
  const collection = db.collection(colName);
  return collection.insertMany(docs);
};
