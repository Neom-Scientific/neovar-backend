// import { comparePasswords, SignInRoute } from '@/lib/auth/authController';
// import { serialize } from 'cookie';
// import { NextResponse } from 'next/server';
// // import { comparePasswords ,SignInRoute} from '@/lib/auth/authController';

// export async function POST(request) {
//   try {
//     const body = await request.json();
//     const user = await comparePasswords(body.email, body.password);
//     const { access_token, refreshToken ,mode} = await SignInRoute({ ...body, user });
//     const response = NextResponse.json({ access_token, refreshToken, mode }, { status: 200 });
//     response.headers.set('Set-Cookie', serialize('access_token', access_token, {
//       httpOnly: true,
//       path: '/',
//       maxAge: 7 * 24 * 60 * 60 // 7 days
//     }));
//     return response;
//   } catch (error) {
//     return NextResponse.json({ error: error.message || 'Signin failed' }, { status: 401 });
//   }
// }
const { comparePasswords, SignInRoute } = require('../../../lib/authControllers');
const { serialize } = require('cookie');

const signInController = async (req, res) => {
  try {
    const body = req.body;
    const user = await comparePasswords(body.email, body.password);
    const { access_token, refreshToken, mode } = await SignInRoute({ ...body, user });

    res.setHeader('Set-Cookie', serialize('access_token', access_token, {
      httpOnly: true,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    }));

    return res.status(200).json({ access_token, refreshToken, mode });
  } catch (error) {
    return res.status(401).json({ error: error.message || 'Signin failed' });
  }
};

module.exports = signInController;