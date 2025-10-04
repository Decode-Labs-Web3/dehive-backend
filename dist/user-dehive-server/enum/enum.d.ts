export declare enum Status {
    Online = "online",
    Offline = "offline",
    Away = "away",
    Busy = "busy"
}
export declare enum ServerRole {
    OWNER = "owner",
    MODERATOR = "moderator",
    MEMBER = "member"
}
export declare enum AuditLogAction {
    MEMBER_JOIN = "member_join",
    MEMBER_LEAVE = "member_leave",
    MEMBER_KICK = "member_kick",
    MEMBER_BAN = "member_ban",
    MEMBER_UNBAN = "member_unban",
    INVITE_CREATE = "invite_create",
    INVITE_DELETE = "invite_delete",
    ROLE_UPDATE = "role_update",
    SERVER_UPDATE = "server_update"
}
