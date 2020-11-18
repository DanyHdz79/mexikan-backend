import { SECRET_KEY } from "../config/constant";
import jwt from "jsonwebtoken";

// methods for Json Web Tokens managment

class JWT {
    private secretKey = SECRET_KEY as string;

    sign(data:any):string {
        return jwt.sign({ user: data.id }, this.secretKey, { expiresIn: 24 * 60 * 60 });
    }

    verify(token:string):string {
        try {
            return jwt.verify(token, this.secretKey) as string;
        } catch (error) {
            return "La autenticación del token es inválida, por favor inicia sesión"
        }
    }

    decode(token:string) {
        return jwt.verify(token, this.secretKey) as string;
    }

}

export default JWT;