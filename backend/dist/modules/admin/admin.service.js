"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const admin_repository_1 = require("./admin.repository");
class AdminService {
    repo;
    constructor() {
        this.repo = new admin_repository_1.AdminRepository();
    }
    getStats() {
        return this.repo.getStats();
    }
    getUsers(page, limit, role, search) {
        return this.repo.getAllUsers(page, limit, role, search);
    }
    getCreators(page, limit, search) {
        return this.repo.getAllCreators(page, limit, search);
    }
    getBusinesses(page, limit, search) {
        return this.repo.getAllBusinesses(page, limit, search);
    }
    getCampaigns(page, limit, status, search) {
        return this.repo.getAllCampaigns(page, limit, status, search);
    }
    verifyUser(userId, verified) {
        return this.repo.updateUserVerification(userId, verified);
    }
    setCampaignStatus(campaignId, status) {
        return this.repo.updateCampaignStatus(campaignId, status);
    }
    removeUser(userId) {
        return this.repo.deleteUser(userId);
    }
}
exports.AdminService = AdminService;
//# sourceMappingURL=admin.service.js.map