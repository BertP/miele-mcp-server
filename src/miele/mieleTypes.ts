export interface MieleDevice {
  ident: {
    typ: {
      value_raw: number;
      value_localized: string;
    };
    mac: string;
    serialNumber: string;
    deviceIdentLabel: {
      fabNumber: string;
      techType: string;
    };
  };
  state: {
    status: {
      value_raw: number;
      value_localized: string;
    };
    programType: {
      value_raw: number;
      value_localized: string;
    };
    programPhase: {
      value_raw: number;
      value_localized: string;
    };
    remainingTime: [number, number];
    startTime: [number, number];
    [key: string]: any;
  };
  [key: string]: any;
}

export type MieleDevicesResponse = Record<string, MieleDevice>;

export interface MieleDeviceAction {
  processAction?: number;
  programId?: number;
  colors?: number;
  [key: string]: any;
}

export type MieleActionsResponse = MieleDeviceAction;
