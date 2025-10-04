export declare enum ChannelType {
    TEXT = "TEXT",
    VOICE = "VOICE"
}
export declare class CreateChannelDto {
    name: string;
    type: ChannelType;
    topic?: string;
}
