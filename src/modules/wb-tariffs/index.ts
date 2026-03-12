export type WbTariffRow = Record<string, unknown>;

export type WbTariffsModule = {
    syncTariffs: () => Promise<WbTariffRow[]>;
};

export function createWbTariffsModule(): WbTariffsModule {
    return {
        syncTariffs: async () => {
            return [];
        },
    };
}
