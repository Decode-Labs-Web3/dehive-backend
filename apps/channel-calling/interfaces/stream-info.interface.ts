export interface StreamConfig {
  apiKey: string;
  environment: string;
}

export interface StreamTokenResponse {
  token: string;
  user_id: string;
  stream_call_id: string;
  stream_config: StreamConfig;
}
