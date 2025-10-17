export interface StreamInfo {
  callId: string;
  callerToken: string;
  calleeToken: string;
  streamConfig: {
    apiKey: string;
    callType: string;
    callId: string;
    members: Array<{
      user_id: string;
      role: string;
    }>;
    settings: {
      audio: {
        default_device: string;
        is_default_enabled: boolean;
      };
      video: {
        camera_default_on: boolean;
        camera_facing: string;
      };
    };
  };
}

export interface StreamConfig {
  apiKey: string;
  environment: string;
}
