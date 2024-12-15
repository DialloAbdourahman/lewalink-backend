import jwt from "jsonwebtoken";

export const generateTokens = (user: {
  id: string;
  email: string;
  type: string;
}) => {
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      type: user.type,
    },
    process.env.ACCESS_TOKEN_JWT_KEY as string,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRATION }
  );

  const refreshToken = jwt.sign(
    {
      id: user.id,
    },
    process.env.REFRESH_TOKEN_JWT_KEY as string,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION }
  );

  return { accessToken, refreshToken };
};
