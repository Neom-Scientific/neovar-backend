const express = require('express');
const router = express.Router();

const protectedRouteController = require('../src/controllers/auth/protected-route/protectedRouteController')
const refreshTokenController = require('../src/controllers/auth/refresh-token/refreshTokenController');
const sendOtpController = require('../src/controllers/auth/send-otp/sendOtpController');
const signInController = require('../src/controllers/auth/signin/signInController');
const signOutController = require('../src/controllers/auth/signout/signOutController');
const signUpController = require('../src/controllers/auth/signup/signUpController');
const readCounterController = require('../src/controllers/read-counter-json/readCounterController');
const runAnalysisController = require('../src/controllers/run-analysis/runAnalysisController');
const progressController = require('../src/controllers/progress/progressController');
const serverModeController = require('../src/controllers/server-mode/serverModeController');
const uploadController = require('./controllers/uploads/uploadController');
const mergeController = require('./controllers/merge/mergeController');

router.get('/auth/protected-route',protectedRouteController);
router.post('/auth/refresh-token',refreshTokenController);
router.post('/auth/send-otp', sendOtpController);
router.post('/auth/signin',signInController);
router.post('/auth/signout', signOutController);
router.post('/auth/signup', signUpController);


router.get('/read-counter-json',readCounterController);
router.post('/run-analysis',runAnalysisController);
router.post('/progress',progressController);
router.post('/server-mode',serverModeController);
router.post('/uploads', uploadController.upload.any(), uploadController.uploadController);
router.post('/merge',mergeController)

module.exports = router;