import { OAuth2Client } from "google-auth-library";

export const getUserFromGoogle = async (code: string) => {
  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_LINK
  );

  // Exchange the authorization code for tokens
  const { tokens } = await client.getToken(code);

  // Use the access token to fetch user details
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token as string,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload) {
    return;
  }

  // User information
  const user = {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };

  return user;
};
