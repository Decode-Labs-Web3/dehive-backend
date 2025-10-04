"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateServerDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_server_dto_1 = require("./create-server.dto");
class UpdateServerDto extends (0, swagger_1.PartialType)(create_server_dto_1.CreateServerDto) {
}
exports.UpdateServerDto = UpdateServerDto;
//# sourceMappingURL=update-server.dto.js.map