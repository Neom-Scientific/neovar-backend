// import { NextResponse } from 'next/server';
// import { SignOutRoute } from '@/lib/auth/authController';

// export async function POST(request) {
//   try {
//     const authHeader = request.headers.get('authorization');
//     const token = authHeader?.split(' ')[1];
//     const email = request.headers.get('email'); // Pass user email in header

//     const result = await SignOutRoute(token, email);
//     return NextResponse.json(result, { status: 204 });
//   } catch (error) {
//     return NextResponse.json({ error: error.message || 'Signout failed' }, { status: 500 });
//   }
// }
const { SignOutRoute } = require('../../../lib/authControllers');

const signOutController = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const email = req.headers['email']; // Pass user email in header

    const result = await SignOutRoute(token, email);
    return res.status(204).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Signout failed' });
  }
};

module.exports = signOutController;