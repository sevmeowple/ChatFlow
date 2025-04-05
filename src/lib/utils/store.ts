import { Store, load } from "@tauri-apps/plugin-store";

class StoreManager {

    async getStore(name: string) {
        const store = await load(name);
        return store;
    }

}

const storeManager = new StoreManager();
export { storeManager };