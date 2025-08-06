// import { NextResponse } from 'next/server';
// import { RefreshTokenRoute } from '@/lib/auth/authController';

// export async function POST(request) {
//   try {
//     const authHeader = request.headers.get('authorization');
//     const token = authHeader?.split(' ')[1];
//     const response = await RefreshTokenRoute(token);
//     return NextResponse.json(response, { status: 200 });
//   } catch (error) {
//     return NextResponse.json({ error: error.message || 'Refresh failed' }, { status: 403 });
//   }
// }

const { RefreshTokenRoute } = require('../../../lib/authControllers');

const refreshTokenController = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const response = await RefreshTokenRoute(token);
    res.status(200).json(response);
  } catch (error) {
    res.status(403).json({ error: error.message || 'Refresh failed' });
  }
};

module.exports = refreshTokenController;

// const express = require('express');
// const refreshTokenController = require('./refreshTokenController');
// const router = express.Router();

// router.post('/refresh-token', refreshTokenController);

// module.exports = router;