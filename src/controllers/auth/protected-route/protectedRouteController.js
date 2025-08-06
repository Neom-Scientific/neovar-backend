// File: src/app/api/protected-route/route.js
// import { authenticateToken } from '@/lib/auth/authController';
// import { NextResponse } from 'next/server';
// import { authenticateToken } from '@/lib/auth/authenticateToken';

const { authenticateRefreshToken } = require("../../../lib/authControllers");

// export async function GET(request) {
//   try {
//     const authHeader = request.headers.get('authorization');
//     const user = authenticateToken(authHeader); // Will throw error if invalid

//     return NextResponse.json({ message: 'Protected data', user }, { status: 200 });
//   } catch (error) {
//     return NextResponse.json({ error: error.message }, { status: 401 });
//   }
// }


const protectedRouteController = (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const user = authenticateRefreshToken(authHeader); // Will throw error if invalid

    res.status(200).json({ message: 'Protected data', user });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

module.exports = protectedRouteController;

// const express = require('express');
// const protectedRoute = require('./protectedRouteController');
// const router = express.Router();

// router.get('/protected-route', protectedRoute);

// module.exports = router;
