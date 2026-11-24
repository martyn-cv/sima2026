using System.Security.Cryptography;
using System.Text;

namespace Sima.Api.Servicios;

/// <summary>Segundo factor por código de un solo uso (RFC 6238: HMAC-SHA1, 30 segundos, 6 dígitos), compatible con Google Authenticator, Microsoft Authenticator y Authy.</summary>
public static class Totp
{
    const string Alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    public static string NuevoSecreto() => Base32(RandomNumberGenerator.GetBytes(20));

    public static string Base32(byte[] datos)
    {
        var sb = new StringBuilder();
        int buffer = 0, bits = 0;
        foreach (var b in datos)
        {
            buffer = (buffer << 8) | b; bits += 8;
            while (bits >= 5) { sb.Append(Alfabeto[(buffer >> (bits - 5)) & 31]); bits -= 5; }
        }
        if (bits > 0) sb.Append(Alfabeto[(buffer << (5 - bits)) & 31]);
        return sb.ToString();
    }

    static byte[] DesdeBase32(string s)
    {
        var salida = new List<byte>();
        int buffer = 0, bits = 0;
        foreach (var c in s.ToUpperInvariant().Where(c => Alfabeto.Contains(c)))
        {
            buffer = (buffer << 5) | Alfabeto.IndexOf(c); bits += 5;
            if (bits >= 8) { salida.Add((byte)((buffer >> (bits - 8)) & 255)); bits -= 8; }
        }
        return salida.ToArray();
    }

    public static long Paso(DateTime utc) => (long)(utc - DateTime.UnixEpoch).TotalSeconds / 30;

    public static string Codigo(string secreto, long paso)
    {
        var msg = BitConverter.GetBytes(paso); if (BitConverter.IsLittleEndian) Array.Reverse(msg);
        using var h = new HMACSHA1(DesdeBase32(secreto));
        var d = h.ComputeHash(msg);
        var o = d[^1] & 0x0f;
        var n = ((d[o] & 0x7f) << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3];
        return (n % 1_000_000).ToString("D6");
    }

    /// <summary>Acepta el código del momento y el de 30 segundos antes o después (relojes algo desfasados). Devuelve el paso usado, o null.</summary>
    public static long? Verificar(string secreto, string? codigo, long ultimoPasoUsado)
    {
        codigo = (codigo ?? "").Replace(" ", "");
        if (codigo.Length != 6) return null;
        var ahora = Paso(DateTime.UtcNow);
        for (var p = ahora - 1; p <= ahora + 1; p++)
            if (p > ultimoPasoUsado && CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(Codigo(secreto, p)), Encoding.ASCII.GetBytes(codigo))) return p;
        return null;
    }

    public static string Uri(string correo, string secreto) => $"otpauth://totp/SIMA:{Uri_(correo)}?secret={secreto}&issuer=SIMA&digits=6&period=30";
    static string Uri_(string s) => Uri_Escape(s);
    static string Uri_Escape(string s) => System.Uri.EscapeDataString(s);
}

/// <summary>Cifra los secretos del segundo factor en la base con una llave derivada de la clave de firma. Si se cambia Jwt:Clave, hay que volver a activar el segundo factor.</summary>
public class CifradoSecretos(OpcionesJwt o)
{
    readonly byte[] llave = SHA256.HashData(Encoding.UTF8.GetBytes(o.Clave + "|secretos"));

    public string Cifrar(string texto)
    {
        var nonce = RandomNumberGenerator.GetBytes(12); var datos = Encoding.UTF8.GetBytes(texto);
        var cifrado = new byte[datos.Length]; var tag = new byte[16];
        using var aes = new AesGcm(llave, 16); aes.Encrypt(nonce, datos, cifrado, tag);
        return Convert.ToBase64String(nonce.Concat(tag).Concat(cifrado).ToArray());
    }

    public string Descifrar(string b64)
    {
        var t = Convert.FromBase64String(b64);
        var salida = new byte[t.Length - 28];
        using var aes = new AesGcm(llave, 16); aes.Decrypt(t[..12], t[28..], t[12..28], salida);
        return Encoding.UTF8.GetString(salida);
    }
}
