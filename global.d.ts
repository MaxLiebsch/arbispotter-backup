declare global {
  namespace NodeJS {
    interface Global {
      _mongoClientPool: {[key: string]: Promise};
    }
  }
}

export {};
