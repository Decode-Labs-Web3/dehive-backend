"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogAction = exports.enumUserRole = exports.ServerRole = exports.Status = void 0;
var Status;
(function (Status) {
    Status["Online"] = "online";
    Status["Offline"] = "offline";
    Status["Away"] = "away";
    Status["Busy"] = "busy";
})(Status || (exports.Status = Status = {}));
var ServerRole;
(function (ServerRole) {
    ServerRole["OWNER"] = "owner";
    ServerRole["MODERATOR"] = "moderator";
    ServerRole["MEMBER"] = "member";
})(ServerRole || (exports.ServerRole = ServerRole = {}));
var enumUserRole;
(function (enumUserRole) {
    enumUserRole["ADMIN"] = "admin";
    enumUserRole["MODERATOR"] = "moderator";
    enumUserRole["USER"] = "user";
})(enumUserRole || (exports.enumUserRole = enumUserRole = {}));
var AuditLogAction;
(function (AuditLogAction) {
    AuditLogAction["MEMBER_JOIN"] = "member_join";
    AuditLogAction["MEMBER_LEAVE"] = "member_leave";
    AuditLogAction["MEMBER_KICK"] = "member_kick";
    AuditLogAction["MEMBER_BAN"] = "member_ban";
    AuditLogAction["MEMBER_UNBAN"] = "member_unban";
    AuditLogAction["INVITE_CREATE"] = "invite_create";
    AuditLogAction["INVITE_DELETE"] = "invite_delete";
    AuditLogAction["ROLE_UPDATE"] = "role_update";
    AuditLogAction["SERVER_UPDATE"] = "server_update";
})(AuditLogAction || (exports.AuditLogAction = AuditLogAction = {}));
//# sourceMappingURL=enum.js.map