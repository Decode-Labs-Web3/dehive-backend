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

export interface StreamTokenResponse {
  token: string;
  user_id: string;
  stream_call_id: string; // Stream.io Call ID để join call
  stream_config: StreamConfig;
}
