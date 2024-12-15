import jwt from "jsonwebtoken";

export class JWTCodes {
  static generate = (user: { id: string; email: string }, key: string) => {
    const code = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      key
    );

    return { code };
  };

  static decode = (code: string, key: string) => {
    const decoded: any = jwt.verify(code, key);

    const { id, email } = decoded;

    return { id, email };
  };
}
