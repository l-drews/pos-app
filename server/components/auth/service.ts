import { eq } from "drizzle-orm";
import { SignJWT } from "jose";
import { type db, tables } from "~~/server/utils/drizzle";
import { verifyPassword } from "~~/server/utils/password";
import { NotFoundError, ValidationError } from "~~/server/utils/errors";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "my secret token",
);
const JWT_EXPIRY = "30d";

export class AuthService {
  constructor(private db: db) {}

  async login(username: string, password: string) {
    const userLogin = await this.db
      .select()
      .from(tables.userLogins)
      .where(eq(tables.userLogins.username, username))
      .get();

    if (!userLogin) {
      throw new NotFoundError("User", username);
    }

    const valid = verifyPassword(password, userLogin.password);
    if (!valid) {
      throw new ValidationError("Invalid password");
    }

    const user = await this.db
      .select()
      .from(tables.users)
      .where(eq(tables.users.uuid, userLogin.userUuid))
      .get();

    if (!user) {
      throw new NotFoundError("User", userLogin.userUuid);
    }

    const token = await new SignJWT({ uuid: user.uuid })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(JWT_EXPIRY)
      .setIssuedAt()
      .sign(JWT_SECRET);

    return { accessToken: token };
  }
}
