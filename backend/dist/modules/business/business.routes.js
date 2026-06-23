"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const business_controller_1 = require("./business.controller");
const creator_controller_1 = require("../creator/creator.controller");
const saved_creator_controller_1 = require("./saved-creator.controller");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const business_schema_1 = require("./business.schema");
const upload_1 = require("../../middleware/upload");
const router = (0, express_1.Router)();
const ctrl = new business_controller_1.BusinessController();
const creatorCtrl = new creator_controller_1.CreatorController();
const savedCtrl = new saved_creator_controller_1.SavedCreatorController();
// All business routes require authentication and BUSINESS role
router.use(auth_1.authenticate, (0, auth_1.authorize)('BUSINESS'));
// Creator discovery & saving
router.get('/creators/filter-options', creatorCtrl.getCreatorFilterOptions.bind(creatorCtrl));
router.get('/creators/saved', savedCtrl.listSaved.bind(savedCtrl));
router.get('/creators/saved-ids', savedCtrl.getSavedIds.bind(savedCtrl));
router.get('/creators/:id', creatorCtrl.getCreatorPublicProfile.bind(creatorCtrl));
router.get('/creators', creatorCtrl.listCreators.bind(creatorCtrl));
router.post('/creators/:id/save', savedCtrl.toggle.bind(savedCtrl));
// Campaign invitations
router.post('/campaigns/:campaignId/invite', savedCtrl.inviteCreators.bind(savedCtrl));
// Profile
router.get('/profile', ctrl.getProfile.bind(ctrl));
router.put('/profile', (0, validate_1.validate)(business_schema_1.updateBusinessProfileSchema), ctrl.updateProfile.bind(ctrl));
router.post('/logo', upload_1.uploadImage.single('logo'), ctrl.uploadLogo.bind(ctrl));
exports.default = router;
//# sourceMappingURL=business.routes.js.map