import persistentMapFactory from '../persistence/map';

// eslint-disable-next-line import/prefer-default-export
export async function service() {
  const PersistentMap = await persistentMapFactory();

  service.moduleFactory = async (moduleName) => {
    const storage = new PersistentMap(moduleName);
    await storage.init();
    return storage;
  };

  return {};
}
