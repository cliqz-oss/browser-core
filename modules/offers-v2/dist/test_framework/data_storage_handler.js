class DataStorageHandler {
  constructor(localStorage) {
    this.localStorage = localStorage;
  }

  saveData(key, data) {
    if (!this.localStorage) {
      return;
    }
    const d = {
      l_updated: Date.now(),
      data,
    }
    this.localStorage.setItem(key, JSON.stringify(d));
  }

  /**
   * will return:
   * {
   *   data: {...} // the data stored,
   *   l_updated: last updated timestamp
   * }
   */
  loadData(key) {
    if (!this.localStorage) {
      return null;
    }
    const data = this.localStorage.getItem(key);
    if (!data) {
      return data;
    }
    return JSON.parse(data)
  }
}
