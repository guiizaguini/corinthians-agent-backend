import jwt from 'jsonwebtoken';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

function getSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 16) {
        throw new Error(
            'JWT_SECRET não configurada (ou curta demais). Defina ' +
            'uma string com pelo menos 32 chars no Railway.'
        );
    }
    return secret;
}

export function signToken(payload) {
    return jwt.sign(payload, getSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
    return jwt.verify(token, getSecret());
}
