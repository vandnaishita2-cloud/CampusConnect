package campus;

import java.security.SecureRandom;
import java.util.HexFormat;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

/** Password hashing: PBKDF2 with a random salt, stored as "salt:hash". */
public class Auth {
    private static byte[] pbkdf2(String pw, byte[] salt) {
        try {
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
                .generateSecret(new PBEKeySpec(pw.toCharArray(), salt, 65536, 256)).getEncoded();
        } catch (Exception e) { throw new RuntimeException(e); }
    }
    public static String hash(String pw) {
        byte[] salt = new byte[16];
        new SecureRandom().nextBytes(salt);
        return HexFormat.of().formatHex(salt) + ":" + HexFormat.of().formatHex(pbkdf2(pw, salt));
    }
    public static boolean check(String pw, String stored) {
        String[] a = stored.split(":");
        return HexFormat.of().formatHex(pbkdf2(pw, HexFormat.of().parseHex(a[0]))).equals(a[1]);
    }
}
