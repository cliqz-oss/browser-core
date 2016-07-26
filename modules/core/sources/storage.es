import { notImplemented } from "core/platform";
import storage from "platform/storage";

export default class {
	constructor() {
		this.storage = storage;
		this.getItem = this.storage.getItem.bind(this.storage);
		this.setItem = this.storage.setItem.bind(this.storage);
		this.removeItem = this.storage.removeItem.bind(this.storage);
		this.clear = this.storage.clear.bind(this.storage);
	}

	setObject(key, object) {
		this.storage.setItem(key, JSON.stringify(object));
	}

	getObject(key, notFound = false) {
	  const o = storage.getItem(key);
	  if (o) {
	  	return JSON.parse(o);
	  }
	  return notFound;
	}
}