"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessRepository = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
class BusinessRepository {
    async findByUserId(userId) {
        return prisma_1.default.businessProfile.findUnique({
            where: { userId },
            include: {
                user: { select: { id: true, email: true, role: true, isEmailVerified: true } },
            },
        });
    }
    async findById(id) {
        return prisma_1.default.businessProfile.findUnique({
            where: { id },
        });
    }
    async update(userId, data) {
        return prisma_1.default.businessProfile.update({
            where: { userId },
            data,
        });
    }
}
exports.BusinessRepository = BusinessRepository;
//# sourceMappingURL=business.repository.js.map